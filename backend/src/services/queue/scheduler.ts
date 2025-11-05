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
  private consecutiveErrors = 0
  private maxConsecutiveErrors = 3
  private lastErrorTime: number | null = null
  private recoveryDelayMs = 60000 // Wait 1 minute before retrying after max errors

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
          return
        }
      }, 100)

      // Timeout after 5 seconds
      const timeoutId = setTimeout(() => {
        clearInterval(checkProcessing)
        console.log('Pressure evaluation scheduler stopped (timeout)')
        resolve()
      }, 5000)
      
      // Store timeout ID so we can clear it if needed
      // (for cleanup in tests)
      if (checkProcessing && timeoutId) {
        // Both timers are set, they'll handle cleanup
      }
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

    // If we've had too many consecutive errors, skip this evaluation to allow pool to recover
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      const now = Date.now()
      
      // If we haven't set lastErrorTime yet, set it now
      if (!this.lastErrorTime) {
        this.lastErrorTime = now
      }
      
      // Check if enough time has passed for recovery
      const timeSinceLastError = now - this.lastErrorTime
      if (timeSinceLastError < this.recoveryDelayMs) {
        const remainingMs = this.recoveryDelayMs - timeSinceLastError
        console.warn(
          `Skipping pressure evaluation due to ${this.consecutiveErrors} consecutive errors. Pool may be exhausted. Retrying in ${Math.ceil(remainingMs / 1000)}s.`
        )
        return
      }
      
      // Enough time has passed, allow one recovery attempt
      console.log(
        `Attempting recovery after ${this.consecutiveErrors} consecutive errors. Resetting error counter.`
      )
      this.consecutiveErrors = 0
      this.lastErrorTime = null
    }

    this.isProcessing = true

    try {
      // Get all pressure points that exceed their threshold
      // Wrap in timeout to prevent hanging queries
      const exceededPoints = await this.withTimeout(
        PressurePointsService.getExceededThresholds(),
        5000, // 5 second timeout
        'getExceededThresholds'
      )

      // Reset error counter on successful query
      this.consecutiveErrors = 0
      this.lastErrorTime = null

      if (exceededPoints.length === 0) {
        // No pressure points exceeding threshold
        return
      }

      console.log(
        `Evaluating ${exceededPoints.length} pressure point(s) that exceed threshold`
      )

      const registry = AutomationRegistry.getInstance()

      // Process each exceeded pressure point with a small delay to avoid connection exhaustion
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
          // Wrap in timeout to prevent hanging queries
          const seedRow = await this.withTimeout(
            db('seeds')
              .where('id', point.seed_id)
              .select('user_id')
              .first(),
            3000, // 3 second timeout
            'getSeedUserId'
          )

          if (!seedRow) {
            console.warn(`Could not find user_id for seed ${point.seed_id}`)
            continue
          }

          const userId = seedRow.user_id

          // Get full seed with current state
          // Wrap in timeout to prevent hanging queries
          const fullSeed = await this.withTimeout(
            SeedsService.getById(point.seed_id, userId),
            5000, // 5 second timeout
            'getSeedById'
          )

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

          // Small delay between processing points to avoid overwhelming the connection pool
          await this.delay(100)
        } catch (error) {
          // Log error but continue processing other pressure points
          console.error(
            `Error processing pressure point for seed ${point.seed_id}, automation ${point.automation_id}:`,
            error
          )
        }
      }
    } catch (error) {
      // Check if it's a connection timeout error
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes('Timeout acquiring a connection') ||
          error.message.includes('KnexTimeoutError') ||
          error.name === 'KnexTimeoutError')

      if (isConnectionError) {
        this.consecutiveErrors++
        this.lastErrorTime = Date.now()
        console.error(
          `Connection pool exhausted (consecutive errors: ${this.consecutiveErrors}/${this.maxConsecutiveErrors}). Skipping next evaluations to allow pool recovery.`
        )
      } else {
        // Reset error counter for non-connection errors
        this.consecutiveErrors = 0
        this.lastErrorTime = null
        console.error('Error in pressure evaluation scheduler:', error)
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Wrap a promise with a timeout to prevent hanging queries
   * 
   * @param promise - The promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @param operationName - Name of the operation for logging
   * @returns The promise result or throws timeout error
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    // Use AbortController if available (Node 15+), otherwise fall back to setTimeout
    // This works better with both real and fake timers
    let timeoutId: NodeJS.Timeout | null = null
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      const result = await Promise.race([promise, timeoutPromise])
      // Clear timeout if promise resolved first
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      return result
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      throw error
    }
  }

  /**
   * Delay execution for a given number of milliseconds
   * 
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
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
