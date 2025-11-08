// Queue service - manages automation job queue using BullMQ
import { Queue, ConnectionOptions } from 'bullmq'
import { config } from '../../config'

/**
 * Log helper that only logs when not in test environment
 * Prevents test output clutter while keeping useful logs in development/production
 */
function queueLog(...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'test') {
    console.log(...args)
  }
}

/**
 * Data payload for automation queue jobs
 */
export interface AutomationJobData {
  seedId: string
  automationId: string
  userId: string
  priority?: number
  metadata?: {
    manual?: boolean
  }
}

/**
 * Queue connection options for BullMQ
 */
function getQueueConnection(): ConnectionOptions {
  const connection: ConnectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  }

  // Add password only if provided
  if (process.env.REDIS_PASSWORD) {
    connection.password = process.env.REDIS_PASSWORD
  }

  // Parse Redis URL if provided (takes precedence over individual settings)
  if (config.redis.url && config.redis.url !== 'redis://localhost:6379') {
    try {
      const url = new URL(config.redis.url)
      connection.host = url.hostname
      connection.port = parseInt(url.port || '6379', 10)
      if (url.password) {
        connection.password = decodeURIComponent(url.password)
      }
    } catch (error) {
      console.warn('Failed to parse REDIS_URL, using defaults:', error)
    }
  }

  return connection
}

const queueConnection = getQueueConnection()

// Log queue initialization
queueLog('[Queue] Initializing automation queue...')
// Type guard to check if connection has host/port (not ClusterOptions)
const hasHostPort = (conn: ConnectionOptions): conn is { host: string; port: number; password?: string } => {
  return 'host' in conn && 'port' in conn
}
if (hasHostPort(queueConnection)) {
  queueLog(`[Queue] Connection: ${queueConnection.host}:${queueConnection.port}`)
} else {
  queueLog(`[Queue] Connection: cluster mode`)
}

/**
 * Automation queue instance
 * This is the main queue for processing automation jobs
 */
export const automationQueue = new Queue<AutomationJobData>('automation', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay, exponential backoff
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours for debugging
    },
  },
})

/**
 * Add an automation job to the queue
 * 
 * @param data - Job data (seedId, automationId, userId, optional priority)
 * @param options - Optional settings (makeUnique: if true, adds timestamp to job ID to allow re-running)
 * @returns The created job ID
 */
export async function addAutomationJob(
  data: AutomationJobData,
  options?: { makeUnique?: boolean }
): Promise<string> {
  queueLog(`[Queue] Adding job: automation=${data.automationId}, seed=${data.seedId}, user=${data.userId}, priority=${data.priority || 0}`)
  
  // Generate job ID - if makeUnique is true, add timestamp to allow re-running same automation
  const baseJobId = `${data.automationId}-${data.seedId}`
  const jobId = options?.makeUnique ? `${baseJobId}-${Date.now()}` : baseJobId
  
  const job = await automationQueue.add(
    'process-automation',
    data,
    {
      priority: data.priority || 0,
      jobId,
    }
  )

  queueLog(`[Queue] Job added with ID: ${job.id}`)
  return job.id!
}

/**
 * Add multiple automation jobs for a seed
 * Useful when creating a new seed and queueing all enabled automations
 * 
 * @param seedId - Seed ID to process
 * @param userId - User ID that owns the seed
 * @param automationIds - Array of automation IDs to queue (if not provided, queues all enabled automations)
 * @returns Array of job IDs created
 */
export async function queueAutomationsForSeed(
  seedId: string,
  userId: string,
  automationIds?: string[]
): Promise<string[]> {
  const { AutomationRegistry } = await import('../automation/registry')
  const registry = AutomationRegistry.getInstance()

  let automations = automationIds
    ? automationIds.map(id => registry.getById(id)).filter((a): a is NonNullable<typeof a> => a !== null)
    : registry.getEnabled()

  // Handle case where getEnabled returns undefined or null
  if (!automations || !Array.isArray(automations)) {
    return []
  }

  // Filter to only enabled automations with IDs
  automations = automations.filter((a): a is NonNullable<typeof a> => a !== null && a.enabled && a.id !== undefined)

  if (automations.length === 0) {
    return []
  }

  // Add jobs for each enabled automation
  const jobIds = await Promise.all(
    automations.map(async (automation) => {
      if (!automation || !automation.id) {
        throw new Error(`Automation does not have an ID`)
      }

      return addAutomationJob({
        seedId,
        automationId: automation.id,
        userId,
        priority: 0, // Default priority for new seeds
      })
    })
  )

  return jobIds
}

/**
 * Get queue statistics
 * Useful for monitoring and debugging
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    automationQueue.getWaitingCount(),
    automationQueue.getActiveCount(),
    automationQueue.getCompletedCount(),
    automationQueue.getFailedCount(),
    automationQueue.getDelayedCount(),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  }
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string) {
  return automationQueue.getJob(jobId)
}

/**
 * Remove a job from the queue
 */
export async function removeJob(jobId: string) {
  const job = await getJob(jobId)
  if (job) {
    await job.remove()
  }
}

/**
 * Clean up queue connection
 * Should be called on application shutdown
 */
export async function closeQueue(): Promise<void> {
  await automationQueue.close()
}

