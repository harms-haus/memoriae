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

