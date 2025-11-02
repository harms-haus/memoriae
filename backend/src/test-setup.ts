// Test setup - configure environment variables
// This runs before any tests are executed
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only'
process.env.OAUTH_GOOGLE_CLIENT_ID = process.env.OAUTH_GOOGLE_CLIENT_ID || 'test-google-client-id'
process.env.OAUTH_GOOGLE_CLIENT_SECRET = process.env.OAUTH_GOOGLE_CLIENT_SECRET || 'test-google-client-secret'
process.env.OAUTH_GITHUB_CLIENT_ID = process.env.OAUTH_GITHUB_CLIENT_ID || 'test-github-client-id'
process.env.OAUTH_GITHUB_CLIENT_SECRET = process.env.OAUTH_GITHUB_CLIENT_SECRET || 'test-github-client-secret'
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'

