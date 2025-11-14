// Idea musing scheduler - runs daily to generate musings for idea seeds
import { config } from '../../config'
import { IdeaMusingsService } from '../idea-musings'
import { SeedsService } from '../seeds'
import { IdeaMusingAutomation } from '../automation/idea-musing'
import { AutomationRegistry } from '../automation/registry'
import { SettingsService } from '../settings'
import { createOpenRouterClient } from '../openrouter/client'
import db from '../../db/connection'
import log from 'loglevel'

const logScheduler = log.getLogger('Scheduler:IdeaMusing')

/**
 * IdeaMusingScheduler - Timer service that runs daily to generate musings
 * 
 * This service:
 * 1. Runs once per day at configured time (default: 2 AM UTC)
 * 2. Identifies idea seeds for each user
 * 3. Filters out seeds shown in last 2 days
 * 4. Selects up to 10 most interesting seeds
 * 5. Generates musings and stores them
 */
export class IdeaMusingScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private isProcessing = false
  private automation: IdeaMusingAutomation | null = null

  /**
   * Start the scheduler
   * 
   * Checks every hour if it's time to run, then runs daily
   */
  start(): void {
    if (this.isRunning) {
      logScheduler.debug('Idea musing scheduler is already running')
      return
    }

    // Get automation instance
    const registry = AutomationRegistry.getInstance()
    const automation = registry.getByName('idea-musing')
    if (!automation || !(automation instanceof IdeaMusingAutomation)) {
      logScheduler.error('Idea musing automation not found in registry')
      return
    }
    this.automation = automation

    logScheduler.info(`Starting idea musing scheduler (runs daily at ${config.ideaMusing.scheduleTime} UTC)`)

    this.isRunning = true

    // Check immediately if it's time to run
    this.checkAndRun()

    // Check every hour if it's time to run
    const checkIntervalMs = 60 * 60 * 1000 // 1 hour
    this.intervalId = setInterval(() => {
      this.checkAndRun()
    }, checkIntervalMs)
  }

  /**
   * Stop the scheduler
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        resolve()
        return
      }

      logScheduler.info('Stopping idea musing scheduler...')

      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }

      this.isRunning = false

      // Wait for any in-progress processing to complete
      const checkProcessing = setInterval(() => {
        if (!this.isProcessing) {
          clearInterval(checkProcessing)
          logScheduler.info('Idea musing scheduler stopped')
          resolve()
          return
        }
      }, 100)

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkProcessing)
        logScheduler.warn('Idea musing scheduler stopped (timeout)')
        resolve()
      }, 5000)
    })
  }

  /**
   * Check if it's time to run and execute if so
   */
  private checkAndRun(): void {
    if (this.isProcessing) {
      return
    }

    const now = new Date()
    const [scheduleHour, scheduleMinute] = config.ideaMusing.scheduleTime.split(':').map(Number)
    
    // Check if current time matches schedule time (within 1 hour window)
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()
    
    // Ensure scheduleHour and scheduleMinute are defined
    if (scheduleHour === undefined || scheduleMinute === undefined) {
      return
    }
    
    // Run if we're at the scheduled time (within 5 minute window to account for timing)
    const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (scheduleHour * 60 + scheduleMinute))
    if (timeDiff <= 5) {
      // Check if we've already run today
      this.shouldRunToday().then(shouldRun => {
        if (shouldRun) {
          this.generateDailyMusings()
        }
      }).catch(error => {
        logScheduler.error('Error checking if should run today:', error)
      })
    }
  }

  /**
   * Check if we should run today (haven't run yet today)
   */
  private async shouldRunToday(): Promise<boolean> {
    // Check if any musings were created today
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

    const count = await db('idea_musings')
      .where('created_at', '>=', today)
      .where('created_at', '<', tomorrow)
      .count('* as count')
      .first()

    return (count?.count as number) === 0
  }

  /**
   * Generate daily musings for all users
   * Can be called manually or by scheduler
   */
  async generateDailyMusings(): Promise<void> {
    if (this.isProcessing) {
      logScheduler.debug('Idea musing generation already in progress, skipping...')
      return
    }

    if (!this.automation) {
      logScheduler.error('Automation not available')
      return
    }

    this.isProcessing = true

    try {
      logScheduler.info('Starting daily idea musing generation...')

      // Get all users
      const users = await db('users').select('id')

      if (users.length === 0) {
        logScheduler.debug('No users found, skipping musing generation')
        return
      }

      // Get seeds that were shown in last N days
      const excludeDays = config.ideaMusing.excludeDays
      const excludedSeedIds = await IdeaMusingsService.getSeedsShownInLastDays(excludeDays)

      let totalMusingsCreated = 0

      // Process each user
      for (const user of users) {
        try {
          // Get user settings (for API key)
          const settings = await SettingsService.getByUserId(user.id)
          
          if (!settings.openrouter_api_key) {
            logScheduler.debug(`Skipping user ${user.id}: no OpenRouter API key configured`)
            continue
          }

          // Get all seeds for user
          const allSeeds = await SeedsService.getByUser(user.id)
          
          if (allSeeds.length === 0) {
            continue
          }

          // Filter out excluded seeds
          const candidateSeeds = allSeeds.filter(seed => !excludedSeedIds.has(seed.id))

          if (candidateSeeds.length === 0) {
            logScheduler.debug(`No candidate seeds for user ${user.id} (all shown recently)`)
            continue
          }

          // Create OpenRouter client
          const openrouterClient = createOpenRouterClient(
            settings.openrouter_api_key,
            settings.openrouter_model || undefined
          )

          // Create automation context
          const context = {
            openrouter: openrouterClient,
            userId: user.id,
          }

          // Identify idea seeds
          const ideaSeeds = await this.automation.identifyIdeaSeeds(candidateSeeds, context)

          if (ideaSeeds.length === 0) {
            logScheduler.debug(`No idea seeds found for user ${user.id}`)
            continue
          }

          // Limit to max musings per day
          const maxMusings = config.ideaMusing.maxMusingsPerDay
          const seedsToProcess = ideaSeeds.slice(0, maxMusings)

          logScheduler.info(`Processing ${seedsToProcess.length} idea seeds for user ${user.id}`)

          // Generate musings for each seed
          const today = new Date()
          today.setUTCHours(0, 0, 0, 0)

          for (const seed of seedsToProcess) {
            try {
              const musing = await this.automation.generateMusing(seed, context)
              
              if (musing) {
                await IdeaMusingsService.create(seed.id, musing.templateType, musing.content)
                await IdeaMusingsService.recordShown(seed.id, today)
                totalMusingsCreated++
                logScheduler.info(`Created musing for seed ${seed.id} (template: ${musing.templateType})`)
              } else {
                logScheduler.warn(`Failed to generate musing for seed ${seed.id}`)
              }
            } catch (error) {
              logScheduler.error(`Error generating musing for seed ${seed.id}:`, error)
              // Continue with next seed
            }
          }
        } catch (error) {
          logScheduler.error(`Error processing user ${user.id}:`, error)
          // Continue with next user
        }
      }

      logScheduler.info(`Daily idea musing generation complete. Created ${totalMusingsCreated} musings.`)
    } catch (error) {
      logScheduler.error('Error in idea musing scheduler:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Check if the scheduler is currently running
   */
  isActive(): boolean {
    return this.isRunning
  }
}

// Create singleton instance
let schedulerInstance: IdeaMusingScheduler | null = null

/**
 * Get the singleton scheduler instance
 */
export function getIdeaMusingScheduler(): IdeaMusingScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new IdeaMusingScheduler()
  }
  return schedulerInstance
}

