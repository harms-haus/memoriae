// Entry point for the backend server
// Initialize loglevel first
import log from 'loglevel'

// Initialize log level based on environment
if (process.env.NODE_ENV === 'test') {
  log.setLevel(log.levels.SILENT)
} else if (process.env.NODE_ENV === 'production') {
  log.setLevel(log.levels.INFO)
} else {
  // development
  log.setLevel(log.levels.DEBUG)
}

// Allow override via LOG_LEVEL environment variable
const envLevel = process.env.LOG_LEVEL
if (envLevel) {
  const levelMap: Record<string, number> = {
    'TRACE': log.levels.TRACE,
    'DEBUG': log.levels.DEBUG,
    'INFO': log.levels.INFO,
    'WARN': log.levels.WARN,
    'ERROR': log.levels.ERROR,
    'SILENT': log.levels.SILENT,
  }
  const mappedLevel = levelMap[envLevel.toUpperCase()]
  if (mappedLevel !== undefined) {
    log.setLevel(mappedLevel as log.LogLevelDesc)
  }
}

import app from './app'
import { config } from './config'
import { db } from './db/connection'
import { AutomationRegistry } from './services/automation/registry'
import { TagExtractionAutomation } from './services/automation/tag'
import { CategorizeAutomation } from './services/automation/categorize'
import { FollowupAutomation } from './services/automation/followup'
import { IdeaMusingAutomation } from './services/automation/idea-musing'
import { automationWorker, automationQueue, getPressureEvaluationScheduler } from './services/queue'
import { getFollowupNotificationScheduler } from './services/queue/followup-scheduler'
import { getIdeaMusingScheduler } from './services/queue/idea-musing-scheduler'

const logServer = log.getLogger('Server')
const PORT = config.port

/**
 * Initialize automations and queue system
 */
async function initializeServices() {
  try {
    // Test database connection first
    logServer.info('Testing database connection...')
    // Extract connection details from DATABASE_URL if available
    const databaseUrl = process.env.DATABASE_URL || ''
    
    // Parse DATABASE_URL for logging (prioritize DATABASE_URL over individual DB_* vars)
    let dbConfig = {
      host: 'localhost',
      port: '5432',
      database: 'memoriae',
      user: 'postgres',
    }
    
    // Always try to parse DATABASE_URL first if available
    if (databaseUrl) {
      // Use regex parsing (more reliable for postgresql:// URLs)
      // Match host and optional port: @host:port or @host
      const hostMatch = databaseUrl.match(/@([^:/]+)(?::(\d+))?/)
      if (hostMatch && hostMatch[1]) {
        dbConfig.host = hostMatch[1]
        if (hostMatch[2]) {
          dbConfig.port = hostMatch[2]
        }
      }
      // Match database name: /database or /database?params
      const dbMatch = databaseUrl.match(/\/([^?/]+)(?:\?|$)/)
      if (dbMatch && dbMatch[1]) {
        dbConfig.database = dbMatch[1]
      }
      // Match username: postgresql://username:password@ or postgresql://username@
      const userMatch = databaseUrl.match(/:\/\/([^:@]+)(?::[^@]+)?@/)
      if (userMatch && userMatch[1]) {
        dbConfig.user = userMatch[1]
      }
    }
    
    // Override with individual DB_* environment variables if set (for backwards compatibility)
    if (process.env.DB_HOST) {
      dbConfig.host = process.env.DB_HOST
    }
    if (process.env.DB_PORT) {
      dbConfig.port = process.env.DB_PORT
    }
    if (process.env.DB_NAME) {
      dbConfig.database = process.env.DB_NAME
    }
    if (process.env.DB_USER) {
      dbConfig.user = process.env.DB_USER
    }
    
    logServer.info(`  Connecting to: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)
    if (databaseUrl) {
      const safeUrl = databaseUrl.replace(/:[^:@]+@/, ':****@')
      logServer.info(`  DATABASE_URL: ${safeUrl}`)
    }
    
    // Retry database connection with exponential backoff
    logServer.info('Starting database connection retry loop...')
    let dbRetries = 0
    const maxDbRetries = 30
    const dbRetryDelay = 2000 // 2 seconds
    const dbConnectionTimeout = 10000 // 10 seconds timeout for connection test
    
    while (dbRetries < maxDbRetries) {
      try {
        logServer.info(`Attempting database connection (attempt ${dbRetries + 1}/${maxDbRetries})...`)
        
        // Create a timeout promise that will reject after the timeout
        let timeoutId: NodeJS.Timeout | null = null
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Database connection test timed out after ${dbConnectionTimeout}ms`))
          }, dbConnectionTimeout)
        })
        
        // Test connection with timeout - wrap in try/finally to ensure timeout is cleared
        let connectionTest: Promise<any>
        try {
          connectionTest = db.raw('SELECT 1').then((result) => {
            // Clear timeout if connection succeeds
            if (timeoutId) {
              clearTimeout(timeoutId)
            }
            logServer.debug('Database query completed successfully')
            return result
          }).catch((error) => {
            // Clear timeout on error
            if (timeoutId) {
              clearTimeout(timeoutId)
            }
            logServer.debug('Database query failed:', error.message)
            throw error
          })
          
          // Race the connection test against the timeout
          await Promise.race([connectionTest, timeoutPromise])
        } finally {
          // Ensure timeout is cleared even if something goes wrong
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
        }
        logServer.info('✓ Database connection successful')
        break
      } catch (dbError: any) {
        dbRetries++
        
        // Log the error for debugging
        const errorMessage = dbError.message || String(dbError)
        const errorCode = dbError.code || 'UNKNOWN'
        logServer.warn(`Database connection attempt ${dbRetries} failed: ${errorMessage} (code: ${errorCode})`)
        
        // If it's a timeout, log more details
        if (errorMessage.includes('timed out')) {
          logServer.warn(`Connection attempt ${dbRetries} timed out - database may not be ready or network issue`)
        }
        
        if (dbRetries >= maxDbRetries) {
          // Final attempt failed - log error and throw
          logServer.error('✗ Database connection failed after', maxDbRetries, 'retries:', dbError.message)
          logServer.error('  Connection details:', dbConfig)
          
          if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT') {
            logServer.error('  → Database server is not accessible. Check:')
            logServer.error('    1. Database server is running and accessible')
            logServer.error('    2. Network connectivity (firewall, VPN, AWS Security Group)')
            logServer.error('    3. Correct host/port in .env')
            logServer.error('    4. For AWS RDS: Security group allows your IP on port 5432')
          } else if (dbError.code === '3D000') {
            logServer.error('  → Database does not exist. Options:')
            logServer.error('    1. Create the database: CREATE DATABASE memoriae;')
            logServer.error('    2. Or update DB_NAME in .env to an existing database')
            logServer.error('    3. Then run migrations: npm run migrate')
          } else if (dbError.code === '28P01') {
            logServer.error('  → Authentication failed. Check:')
            logServer.error('    1. DB_USER and DB_PASSWORD in .env are correct')
            logServer.error('    2. Database user has proper permissions')
          } else if (dbError.message?.includes('timeout') || dbError.message?.includes('Timeout')) {
            logServer.error('  → Connection timeout. Check:')
            logServer.error('    1. Database server is running')
            logServer.error('    2. Network connectivity (ping/telnet the host)')
            logServer.error('    3. Firewall/security groups allow connections')
            logServer.error('    4. Database credentials are correct')
            logServer.error('    5. For AWS RDS: Database is publicly accessible')
          }
          
          // Show actual connection config (without password)
          if (process.env.DATABASE_URL) {
            const safeUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')
            logServer.error('  DATABASE_URL:', safeUrl)
          }
          
          throw dbError
        }
        
        // Retry with exponential backoff
        const delay = dbRetryDelay * Math.min(dbRetries, 5) // Cap at 5x delay
        logServer.info(`Database connection failed (attempt ${dbRetries}/${maxDbRetries}), retrying in ${delay}ms...`)
        logServer.debug(`Error: ${dbError.message}`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    logServer.info('Initializing tools...')
    
    // Initialize tool registry with built-in tools
    const { initializeTools } = await import('./services/automation/tools/implementations')
    initializeTools()
    logServer.info('Tools initialized')
    
    logServer.info('Initializing automations...')
    
    // Create automation instances
    const tagAutomation = new TagExtractionAutomation()
    const categorizeAutomation = new CategorizeAutomation()
    const followupAutomation = new FollowupAutomation()
    const ideaMusingAutomation = new IdeaMusingAutomation()
    const { WikipediaReferenceAutomation } = await import('./services/automation/wikipedia-reference')
    const wikipediaReferenceAutomation = new WikipediaReferenceAutomation()
    
    // Register automations - retry if table doesn't exist yet (migrations may still be running)
    const registry = AutomationRegistry.getInstance()
    let retries = 0
    const maxRetries = 30
    const retryDelay = 2000 // 2 seconds
    
    while (retries < maxRetries) {
      try {
        await registry.loadFromDatabase([tagAutomation, categorizeAutomation, followupAutomation, ideaMusingAutomation, wikipediaReferenceAutomation])
        logServer.info('Automations initialized')
        logServer.info(`Registered ${registry.getAll().length} automations`)
        break
      } catch (error: any) {
        // Check if error is due to missing table (migrations not complete)
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
          retries++
          if (retries >= maxRetries) {
            logServer.error('Failed to initialize automations: database tables not found after', maxRetries, 'retries')
            logServer.error('This usually means migrations have not completed. Please check migration status.')
            throw new Error('Automations table not found - migrations may not have completed')
          }
          logServer.info(`Automations table not found (attempt ${retries}/${maxRetries}), waiting for migrations...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        } else {
          // Different error - rethrow
          throw error
        }
      }
    }
    
    // Queue worker is already started when imported
    // It will process jobs as they come in
    logServer.info('Queue worker initialized')
    logServer.info(`Worker isRunning: ${automationWorker.isRunning()}`)
    
    // Test queue connection by checking if we can get queue info
    try {
      const waiting = await automationQueue.getWaitingCount()
      const active = await automationQueue.getActiveCount()
      const completed = await automationQueue.getCompletedCount()
      const failed = await automationQueue.getFailedCount()
      logServer.info(`Queue status - Waiting: ${waiting}, Active: ${active}, Completed: ${completed}, Failed: ${failed}`)
    } catch (error) {
      logServer.error('Failed to get queue status:', error)
    }
    
    // Start pressure evaluation scheduler
    const scheduler = getPressureEvaluationScheduler()
    scheduler.start()
    logServer.info('Pressure evaluation scheduler started')
    
    // Start followup notification scheduler
    const followupScheduler = getFollowupNotificationScheduler()
    followupScheduler.start()
    logServer.info('Followup notification scheduler started')
    
    // Start idea musing scheduler
    const ideaMusingScheduler = getIdeaMusingScheduler()
    ideaMusingScheduler.start()
    logServer.info('Idea musing scheduler started')
    
  } catch (error) {
    logServer.error('Failed to initialize services:', error)
    throw error
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown() {
  logServer.info('Shutting down...')
  
  try {
    // Stop pressure evaluation scheduler
    const scheduler = getPressureEvaluationScheduler()
    await scheduler.stop()
    
    // Stop followup notification scheduler
    const followupScheduler = getFollowupNotificationScheduler()
    await followupScheduler.stop()
    
    // Stop idea musing scheduler
    const ideaMusingScheduler = getIdeaMusingScheduler()
    await ideaMusingScheduler.stop()
    
    // Close queue worker
    await automationWorker.close()
    logServer.info('Queue worker closed')
  } catch (error) {
    logServer.error('Error during shutdown:', error)
  }
  
  process.exit(0)
}

// Handle shutdown signals
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logServer.error('Unhandled Promise Rejection:', reason)
  logServer.error('Promise:', promise)
  // Don't exit immediately - let the error handler deal with it
  // But log it so we can see what's happening
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logServer.error('Uncaught Exception:', error)
  logServer.error('Stack:', error.stack)
  // Exit after logging - uncaught exceptions are serious
  process.exit(1)
})

// Initialize services and start server
initializeServices()
  .then(() => {
    app.listen(PORT, () => {
      logServer.info(`Server running on port ${PORT}`)
      logServer.info(`API available at http://localhost:${PORT}/api`)
      logServer.info(`CORS allowed origins:`, config.frontend.allowedOrigins)
    })
  })
  .catch((error) => {
    logServer.error('Failed to start server:', error)
    process.exit(1)
  })
