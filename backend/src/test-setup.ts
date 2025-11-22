// Test setup - configure environment variables
// This runs before any tests are executed

// CRITICAL: Register TypeScript loader FIRST, before anything else
// Knex needs to be able to require() TypeScript migration files
// Vitest can run TypeScript, but Knex's internal require() doesn't use Vitest's loader
// We need to register a loader before Knex tries to load migration files
try {
  // Try ts-node first (more reliable for require-based loading)
  require('ts-node/register')
} catch (tsNodeError) {
  // If ts-node fails, try tsx
  try {
    // tsx might need to be registered differently
    const tsx = require('tsx')
    // tsx might auto-register, or we might need to call a function
    if (typeof tsx === 'function') {
      tsx()
    } else if (tsx.register) {
      tsx.register()
    }
  } catch (tsxError) {
    // If neither works, that's okay - Vitest might handle it
    // But migrations might fail in some cases
  }
}

process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only'
process.env.OAUTH_GOOGLE_CLIENT_ID = process.env.OAUTH_GOOGLE_CLIENT_ID || 'test-google-client-id'
process.env.OAUTH_GOOGLE_CLIENT_SECRET = process.env.OAUTH_GOOGLE_CLIENT_SECRET || 'test-google-client-secret'
process.env.OAUTH_GITHUB_CLIENT_ID = process.env.OAUTH_GITHUB_CLIENT_ID || 'test-github-client-id'
process.env.OAUTH_GITHUB_CLIENT_SECRET = process.env.OAUTH_GITHUB_CLIENT_SECRET || 'test-github-client-secret'
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
// Use DATABASE_URL from environment if set (e.g., AWS database)
// Don't override it with a default - let the actual database connection handle it
// The knexfile will use DATABASE_URL from process.env if available

// Initialize loglevel - set to SILENT level in test environment
// This ensures all Loglevel loggers are silent during tests
import log from 'loglevel'
log.setLevel(log.levels.SILENT)

// Suppress all console methods in tests to reduce output clutter
// These are expected errors/logs from error handling tests and validation failures
// Tests can still verify error behavior without the logs cluttering output
// Note: Once all console calls are migrated to Loglevel, this can be removed
if (process.env.NODE_ENV === 'test') {
  const originalError = console.error
  const originalWarn = console.warn
  const originalLog = console.log
  
  // Suppress all console.error in tests (expected errors from error handling tests)
  console.error = () => {
    // Suppress all errors in tests - they're expected from error handling tests
  }
  
  // Suppress all console.warn in tests
  console.warn = () => {
    // Suppress all warnings in tests
  }
  
  // Suppress all console.log in tests
  console.log = () => {
    // Suppress all logs in tests
  }
  
  // Store originals in case tests need to restore them
  ;(global as any).__originalConsoleError = originalError
  ;(global as any).__originalConsoleWarn = originalWarn
  ;(global as any).__originalConsoleLog = originalLog
}

