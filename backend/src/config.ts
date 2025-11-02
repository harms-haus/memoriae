// Environment configuration
import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  oauth: {
    google: {
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.OAUTH_GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    },
    github: {
      clientId: process.env.OAUTH_GITHUB_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET || '',
      redirectUri: process.env.OAUTH_GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback',
    },
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  openrouter: {
    apiUrl: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1',
  },
  queue: {
    checkInterval: parseInt(process.env.QUEUE_CHECK_INTERVAL || '30000', 10),
  },
} as const

// Validate required configuration
if (!config.jwt.secret) {
  throw new Error('JWT_SECRET environment variable is required')
}

if (!config.database.url && !process.env.DB_HOST) {
  throw new Error('DATABASE_URL or DB_HOST environment variable is required')
}
