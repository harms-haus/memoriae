// Entry point for the backend server
import app from './app'
import { config } from './config'
import { db } from './db/connection'
import { AutomationRegistry } from './services/automation/registry'
import { TagAutomation } from './services/automation/tag'
import { CategorizeAutomation } from './services/automation/categorize'
import { automationWorker } from './services/queue'

const PORT = config.port

/**
 * Initialize automations and queue system
 */
async function initializeServices() {
  try {
    // Test database connection first
    console.log('Testing database connection...')
    const dbConfig = {
      host: process.env.DB_HOST || process.env.DATABASE_URL?.match(/@([^:]+):/)?.[1] || 'localhost',
      port: process.env.DB_PORT || process.env.DATABASE_URL?.match(/:(\d+)\//)?.[1] || '5432',
      database: process.env.DB_NAME || 'memoriae',
      user: process.env.DB_USER || 'postgres',
    }
    console.log(`  Connecting to: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)
    
    try {
      await db.raw('SELECT 1')
      console.log('✓ Database connection successful')
    } catch (dbError: any) {
      console.error('✗ Database connection failed:', dbError.message)
      console.error('  Connection details:', dbConfig)
      
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT') {
        console.error('  → Database server is not accessible. Check:')
        console.error('    1. Database server is running and accessible')
        console.error('    2. Network connectivity (firewall, VPN, AWS Security Group)')
        console.error('    3. Correct host/port in .env')
        console.error('    4. For AWS RDS: Security group allows your IP on port 5432')
      } else if (dbError.code === '3D000') {
        console.error('  → Database does not exist. Options:')
        console.error('    1. Create the database: CREATE DATABASE memoriae;')
        console.error('    2. Or update DB_NAME in .env to an existing database')
        console.error('    3. Then run migrations: npm run migrate')
      } else if (dbError.code === '28P01') {
        console.error('  → Authentication failed. Check:')
        console.error('    1. DB_USER and DB_PASSWORD in .env are correct')
        console.error('    2. Database user has proper permissions')
      } else if (dbError.message?.includes('timeout') || dbError.message?.includes('Timeout')) {
        console.error('  → Connection timeout. Check:')
        console.error('    1. Database server is running')
        console.error('    2. Network connectivity (ping/telnet the host)')
        console.error('    3. Firewall/security groups allow connections')
        console.error('    4. Database credentials are correct')
        console.error('    5. For AWS RDS: Database is publicly accessible')
      }
      
      // Show actual connection config (without password)
      if (process.env.DATABASE_URL) {
        const safeUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')
        console.error('  DATABASE_URL:', safeUrl)
      }
      
      throw dbError
    }
    
    console.log('Initializing automations...')
    
    // Create automation instances
    const tagAutomation = new TagAutomation()
    const categorizeAutomation = new CategorizeAutomation()
    
    // Register automations
    const registry = AutomationRegistry.getInstance()
    await registry.loadFromDatabase([tagAutomation, categorizeAutomation])
    
    console.log('Automations initialized')
    console.log(`Registered ${registry.getAll().length} automations`)
    
    // Queue worker is already started when imported
    // It will process jobs as they come in
    console.log('Queue worker initialized')
    
  } catch (error) {
    console.error('Failed to initialize services:', error)
    throw error
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown() {
  console.log('Shutting down...')
  
  try {
    // Close queue worker
    await automationWorker.close()
    console.log('Queue worker closed')
  } catch (error) {
    console.error('Error during shutdown:', error)
  }
  
  process.exit(0)
}

// Handle shutdown signals
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Initialize services and start server
initializeServices()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`API available at http://localhost:${PORT}/api`)
    })
  })
  .catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
