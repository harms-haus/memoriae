// Followup notification scheduler - periodically checks for due followups
import { NotificationService } from '../notifications'
import { FollowupService } from '../followups'
import db from '../../db/connection'
import log from 'loglevel'

const logScheduler = log.getLogger('Scheduler:Followup')

/**
 * FollowupNotificationScheduler - Timer service that periodically checks for due followups
 * 
 * This service runs every minute and:
 * 1. Checks all users for due followups
 * 2. Handles automatic snoozes (if followup is 30 minutes past due, auto-snooze by 90 minutes)
 * 3. Note: Actual browser notifications are handled by the frontend polling /api/followups/due
 * 
 * The scheduler is started when the server starts and stopped during graceful shutdown.
 */
export class FollowupNotificationScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private isProcessing = false

  /**
   * Start the scheduler
   * 
   * Begins periodic checking for due followups every minute.
   */
  start(): void {
    if (this.isRunning) {
      logScheduler.debug('Followup notification scheduler is already running')
      return
    }

    const intervalMs = 60000 // 1 minute
    logScheduler.info(`Starting followup notification scheduler (interval: ${intervalMs}ms)`)

    this.isRunning = true

    // Run immediately on start, then on interval
    this.checkDueFollowups()

    this.intervalId = setInterval(() => {
      this.checkDueFollowups()
    }, intervalMs)
  }

  /**
   * Stop the scheduler
   * 
   * Stops periodic checking and clears the interval timer.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        resolve()
        return
      }

      logScheduler.info('Stopping followup notification scheduler...')

      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }

      this.isRunning = false

      // Wait for any in-progress check to complete
      const checkProcessing = setInterval(() => {
        if (!this.isProcessing) {
          clearInterval(checkProcessing)
          logScheduler.info('Followup notification scheduler stopped')
          resolve()
          return
        }
      }, 100)

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkProcessing)
        logScheduler.warn('Followup notification scheduler stopped (timeout)')
        resolve()
      }, 5000)
    })
  }

  /**
   * Check for due followups and handle automatic snoozes
   * 
   * This method:
   * 1. Gets all users
   * 2. For each user, checks for due followups
   * 3. For followups that are 30+ minutes past due, automatically snoozes them by 90 minutes
   */
  private async checkDueFollowups(): Promise<void> {
    if (this.isProcessing) {
      // Skip if previous check is still running
      logScheduler.debug('Previous followup check still in progress, skipping...')
      return
    }

    this.isProcessing = true

    try {
      // Get all users
      const users = await db('users').select('id')

      if (users.length === 0) {
        return
      }

      const now = new Date()
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

      // Check each user for due followups
      for (const user of users) {
        try {
          const dueFollowups = await NotificationService.checkDueFollowups(user.id)

          // Check for followups that are 30+ minutes past due (need auto-snooze)
          for (const followup of dueFollowups) {
            // If due_time is more than 30 minutes ago, auto-snooze
            if (followup.due_time <= thirtyMinutesAgo) {
              // Check if already snoozed recently (avoid infinite snoozes)
              const followupState = await FollowupService.getById(followup.followup_id)
              if (followupState && !followupState.dismissed) {
                // Get the last transaction to check if it was a recent snooze
                const lastTransaction = followupState.transactions[followupState.transactions.length - 1]
                const shouldAutoSnooze = !lastTransaction || 
                  lastTransaction.transaction_type !== 'snooze' ||
                  (now.getTime() - lastTransaction.created_at.getTime()) > 5 * 60 * 1000 // At least 5 minutes since last snooze

                if (shouldAutoSnooze) {
                  // Auto-snooze by 90 minutes
                  await FollowupService.snooze(followup.followup_id, 90, 'automatic')
                  logScheduler.info(
                    `Auto-snoozed followup ${followup.followup_id} for seed ${followup.seed_id} (was ${Math.round((now.getTime() - followup.due_time.getTime()) / 60000)} minutes past due)`
                  )
                }
              }
            }
          }
        } catch (error) {
          // Log error but continue processing other users
          logScheduler.error(`Error checking followups for user ${user.id}:`, error)
        }
      }
    } catch (error) {
      logScheduler.error('Error in followup notification scheduler:', error)
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
let schedulerInstance: FollowupNotificationScheduler | null = null

/**
 * Get the singleton scheduler instance
 * 
 * @returns FollowupNotificationScheduler instance
 */
export function getFollowupNotificationScheduler(): FollowupNotificationScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new FollowupNotificationScheduler()
  }
  return schedulerInstance
}

