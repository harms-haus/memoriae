// Queue processor/worker - executes automation jobs from the queue
import { Worker, Job, ConnectionOptions } from 'bullmq'
import Redis from 'ioredis'
import { config } from '../../config'
import { type AutomationJobData } from './queue'
import { AutomationRegistry } from '../automation/registry'
import { SeedsService } from '../seeds'
import { SeedTransactionsService } from '../seed-transactions'
import { createOpenRouterClient } from '../openrouter/client'
import { type UserSettings } from '../settings'

/**
 * Queue connection options (same as in queue.ts)
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

  // Parse Redis URL if provided
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

/**
 * Get user settings from database
 */
async function getUserSettings(userId: string): Promise<UserSettings> {
  const { SettingsService } = await import('../settings')
  return await SettingsService.getByUserId(userId)
}

/**
 * Process an automation job
 * 
 * This function:
 * 1. Fetches the seed and automation
 * 2. Gets user settings (API key, model)
 * 3. Creates OpenRouter client if API key is available
 * 4. Runs the automation
 * 5. Saves any events created by the automation
 * 
 * Exported for testing purposes
 */
export async function processAutomationJob(job: Job<AutomationJobData>): Promise<void> {
  const { seedId, automationId, userId } = job.data

  console.log(`[Worker] Processing automation job ${job.id}: ${automationId} for seed: ${seedId} (user: ${userId})`)

  try {
    // 1. Get the automation from registry
    const registry = AutomationRegistry.getInstance()
    const automation = registry.getById(automationId)

    if (!automation) {
      throw new Error(`Automation ${automationId} not found in registry`)
    }

    if (!automation.enabled) {
      console.log(`Automation ${automationId} is disabled, skipping`)
      return
    }

    // 2. Get the seed
    const seed = await SeedsService.getById(seedId, userId)
    if (!seed) {
      throw new Error(`Seed ${seedId} not found or does not belong to user ${userId}`)
    }

    // 3. Get user settings (API key and model)
    let settings: UserSettings
    try {
      settings = await getUserSettings(userId)
    } catch (error) {
      // Database error getting settings - skip automation gracefully
      console.error(`Failed to get user settings for user ${userId}:`, error)
      return
    }

    if (!settings.openrouter_api_key) {
      // No API key configured - skip automation
      console.log(`No OpenRouter API key configured for user ${userId}, skipping automation`)
      return
    }

    // 4. Create OpenRouter client
    const openrouterClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )

    // 5. Create automation context
    const context = {
      openrouter: openrouterClient,
      userId,
    }

    // 6. Validate seed (optional validation hook)
    const isValid = await automation.validateSeed(seed, context)
    if (!isValid) {
      console.log(`Seed ${seedId} failed validation for automation ${automationId}`)
      return
    }

    // 7. Run the automation
    const result = await automation.process(seed, context)

    // 8. Save transactions created by the automation
    if (result.transactions.length > 0) {
      await SeedTransactionsService.createMany(
        result.transactions.map(transaction => ({
          seed_id: transaction.seed_id,
          transaction_type: transaction.transaction_type,
          transaction_data: transaction.transaction_data,
          automation_id: transaction.automation_id,
        }))
      )
      console.log(`Created ${result.transactions.length} transactions for seed ${seedId} via automation ${automationId}`)
    } else {
      console.log(`No transactions created for seed ${seedId} via automation ${automationId}`)
    }

    // Update job progress
    await job.updateProgress(100)

  } catch (error) {
    console.error(`Error processing automation job ${job.id}:`, error)
    
    // Re-throw to let BullMQ handle retries
    throw error
  }
}

/**
 * Create the automation worker
 * This worker processes jobs from the automation queue
 */
export const automationWorker = new Worker<AutomationJobData>(
  'automation',
  processAutomationJob,
  {
    connection: queueConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  }
)

// Worker event handlers for logging and monitoring
automationWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`)
})

automationWorker.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, error)
  if (error instanceof Error) {
    console.error(`[Worker] Error stack:`, error.stack)
  }
})

automationWorker.on('error', (error) => {
  console.error('[Worker] Worker error:', error)
  if (error instanceof Error) {
    console.error('[Worker] Error message:', error.message)
    console.error('[Worker] Error stack:', error.stack)
  }
})

automationWorker.on('active', (job) => {
  console.log(`[Worker] Job ${job.id} is now active (processing)`)
})

automationWorker.on('stalled', (jobId) => {
  console.warn(`[Worker] Job ${jobId} stalled (taking too long)`)
})

automationWorker.on('ready', () => {
  console.log('[Worker] ✓ Worker is ready and listening for jobs')
})

automationWorker.on('closing', () => {
  console.log('[Worker] Worker is closing...')
})

// Check if worker is actually running after a short delay
setTimeout(() => {
  console.log(`[Worker] Worker status check - isRunning: ${automationWorker.isRunning()}, isPaused: ${automationWorker.isPaused()}`)
  if (!automationWorker.isRunning()) {
    console.error('[Worker] ⚠️ WARNING: Worker is not running! This may indicate a Redis connection issue.')
  }
}, 2000)

// Log worker initialization
console.log('[Worker] Automation worker created, connecting to Redis...')
console.log(`[Worker] Queue name: automation`)
// Type guard to check if connection has host/port (not ClusterOptions)
const hasHostPort = (conn: ConnectionOptions): conn is { host: string; port: number; password?: string } => {
  return 'host' in conn && 'port' in conn
}
if (hasHostPort(queueConnection)) {
  console.log(`[Worker] Connection: ${queueConnection.host}:${queueConnection.port}`)
} else {
  console.log(`[Worker] Connection: cluster mode`)
}

// Test Redis connection
if (hasHostPort(queueConnection)) {
  const redisOptions: {
    host: string
    port: number
    password?: string
    retryStrategy: () => null
    maxRetriesPerRequest: number
    lazyConnect: boolean
  } = {
    host: queueConnection.host,
    port: queueConnection.port,
    retryStrategy: () => null, // Don't retry for test
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  }
  
  // Only include password if it's defined
  if (queueConnection.password) {
    redisOptions.password = queueConnection.password
  }
  
  const testConnection = new Redis(redisOptions)

  testConnection.connect()
    .then(() => testConnection.ping())
    .then(() => {
      console.log('[Worker] ✓ Redis connection test successful')
      testConnection.quit()
    })
    .catch((error) => {
      console.error('[Worker] ✗ Redis connection test failed:', error.message)
      console.error('[Worker] Make sure Redis is running and accessible')
      testConnection.quit().catch(() => {}) // Ignore quit errors
    })
} else {
  console.log('[Worker] Skipping Redis connection test (cluster mode)')
}


/**
 * Clean up worker on shutdown
 */
export async function closeWorker(): Promise<void> {
  await automationWorker.close()
}

