// Pressure evaluation scheduler - periodically checks pressure points and triggers re-evaluation
import db from '../../db/connection'
import { config } from '../../config'
import { PressurePointsService } from '../pressure'
import { SeedsService } from '../seeds'
import { AutomationRegistry } from '../automation/registry'

/**
 * PressureEvaluationScheduler - Timer service that periodically evaluates pressure points
 * 
 * This service runs on an interval (QUEUE_CHECK_INTERVAL) and:
 * 1. Checks all pressure points that exceed their automation's threshold
 * 2. For each exceeded pressure point, triggers the automation's handlePressure method
 * 3. This typically results in adding the seed to the automation queue for re-processing
 * 
 * The scheduler is started when the server starts and stopped during graceful shutdown.
 */
export class PressureEvaluationScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private isProcessing = false

  /**
   * Start the scheduler
   * 
   * Begins periodic evaluation of pressure points at the configured interval.
   */
  start(): void {
    if (this.isRunning) {
      console.log('Pressure evaluation scheduler is already running')
      return
    }

    const intervalMs = config.queue.checkInterval
    console.log(`Starting pressure evaluation scheduler (interval: ${intervalMs}ms)`)

    this.isRunning = true

    // Run immediately on start, then on interval
    this.evaluatePressurePoints()

    this.intervalId = setInterval(() => {
      this.evaluatePressurePoints()
    }, intervalMs)
  }

  /**
   * Stop the scheduler
   * 
   * Stops periodic evaluation and clears the interval timer.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        resolve()
        return
      }

      console.log('Stopping pressure evaluation scheduler...')

      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }

      this.isRunning = false

      // Wait for any in-progress evaluation to complete
      const checkProcessing = setInterval(() => {
        if (!this.isProcessing) {
          clearInterval(checkProcessing)
          console.log('Pressure evaluation scheduler stopped')
          resolve()
        }
      }, 100)

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkProcessing)
        console.log('Pressure evaluation scheduler stopped (timeout)')
        resolve()
      }, 5000)
    })
  }

  /**
   * Evaluate pressure points and trigger re-evaluation for exceeded thresholds
   * 
   * This is the core method that:
   * 1. Gets all pressure points that exceed their automation's threshold
   * 2. For each one, calls the automation's handlePressure method
   * 3. handlePressure typically adds the seed to the automation queue
   */
  private async evaluatePressurePoints(): Promise<void> {
    if (this.isProcessing) {
      // Skip if previous evaluation is still running
      console.log('Previous pressure evaluation still in progress, skipping...')
      return
    }

    this.isProcessing = true

    try {
      // Get all pressure points that exceed their threshold
      const exceededPoints = await PressurePointsService.getExceededThresholds()

      if (exceededPoints.length === 0) {
        // No pressure points exceeding threshold
        return
      }

      console.log(
        `Evaluating ${exceededPoints.length} pressure point(s) that exceed threshold`
      )

      const registry = AutomationRegistry.getInstance()

      // Process each exceeded pressure point
      for (const point of exceededPoints) {
        try {
          // Get the automation
          const automation = registry.getById(point.automation_id)
          if (!automation) {
            console.warn(
              `Automation ${point.automation_id} not found for pressure point ${point.seed_id}`
            )
            continue
          }

          if (!automation.enabled) {
            // Automation is disabled, skip
            continue
          }

          // Get user ID from seed (we need it for the context)
          // SeedsService.getById requires userId, so we query the database directly
          const seedRow = await db('seeds')
            .where('id', point.seed_id)
            .select('user_id')
            .first()

          if (!seedRow) {
            console.warn(`Could not find user_id for seed ${point.seed_id}`)
            continue
          }

          const userId = seedRow.user_id

          // Get full seed with current state
          const fullSeed = await SeedsService.getById(point.seed_id, userId)
          if (!fullSeed) {
            continue
          }

          // Create a minimal OpenRouter client for context
          // handlePressure might not use it, but we need it for AutomationContext
          const { createOpenRouterClient } = await import('../openrouter/client')
          const openrouterClient = createOpenRouterClient('', '') // Empty - won't be used

          // Create automation context
          const context = {
            openrouter: openrouterClient,
            userId,
          }

          // Call automation's handlePressure method
          // This will typically add the seed to the automation queue
          await automation.handlePressure(fullSeed, point.pressure_amount, context)

          console.log(
            `Triggered re-evaluation for seed ${point.seed_id} via automation ${automation.name} (pressure: ${point.pressure_amount})`
          )
        } catch (error) {
          // Log error but continue processing other pressure points
          console.error(
            `Error processing pressure point for seed ${point.seed_id}, automation ${point.automation_id}:`,
            error
          )
        }
      }
    } catch (error) {
      console.error('Error in pressure evaluation scheduler:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Check if the scheduler is currently running
   * 
   * @returns true if running, false otherwise
   */
  isActive(): boolean {
    return this.isRunning
  }
}

// Create singleton instance
let schedulerInstance: PressureEvaluationScheduler | null = null

/**
 * Get the singleton scheduler instance
 * 
 * @returns PressureEvaluationScheduler instance
 */
export function getPressureEvaluationScheduler(): PressureEvaluationScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new PressureEvaluationScheduler()
  }
  return schedulerInstance
}
