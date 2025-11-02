// Entry point for the backend server
import app from './app'
import { config } from './config'
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
