// Test setup - configure environment variables
// This runs before any tests are executed
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

