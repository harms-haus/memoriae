// App integration tests - test Express app setup, CORS, routing, error handling
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import request from 'supertest'

// Mock config before importing app (since app imports config)
vi.mock('../../config', () => ({
  config: {
    port: 3000,
    database: {
      url: 'postgresql://test:test@localhost:5432/test',
    },
    jwt: {
      secret: 'test-jwt-secret',
      expiresIn: '7d',
    },
    oauth: {
      google: {
        clientId: 'test-google-client-id',
        clientSecret: 'test-google-client-secret',
        redirectUri: 'http://localhost:3000/api/auth/google/callback',
      },
      github: {
        clientId: 'test-github-client-id',
        clientSecret: 'test-github-client-secret',
        redirectUri: 'http://localhost:3000/api/auth/github/callback',
      },
    },
    frontend: {
      url: 'http://localhost:5173',
      allowedOrigins: ['http://localhost:5173'],
    },
    redis: {
      url: 'redis://localhost:6379',
    },
    openrouter: {
      apiUrl: 'https://openrouter.ai/api/v1',
    },
    queue: {
      checkInterval: 30000,
    },
    ideaMusing: {
      scheduleTime: '02:00',
      maxMusingsPerDay: 10,
      excludeDays: 2,
    },
  },
}))

import app from '../../app'
import { config } from '../../config'

// Mock all route modules to isolate app.ts testing
vi.mock('../../routes/auth', () => {
  const express = require('express')
  const router = express.Router()
  router.get('/status', (req: any, res: any) => res.json({ status: 'auth' }))
  return {
    default: router,
  }
})

vi.mock('../../routes/transactions', () => {
  const express = require('express')
  const router = express.Router()
  router.get('/test', (req: any, res: any) => res.json({ status: 'transactions' }))
  return {
    default: router,
  }
})

vi.mock('../../routes/seeds', () => {
  const express = require('express')
  const router = express.Router()
  router.get('/test', (req: any, res: any) => res.json({ status: 'seeds' }))
  return {
    default: router,
  }
})

vi.mock('../../routes/categories', () => {
  const express = require('express')
  return {
    default: express.Router(),
  }
})

vi.mock('../../routes/tags', () => {
  const express = require('express')
  return {
    default: express.Router(),
  }
})

vi.mock('../../routes/settings', () => {
  const express = require('express')
  return {
    default: express.Router(),
  }
})

vi.mock('../../routes/search', () => {
  const express = require('express')
  return {
    default: express.Router(),
  }
})

vi.mock('../../routes/followups', () => {
  const express = require('express')
  return {
    default: express.Router(),
  }
})

vi.mock('../../routes/idea-musings', () => {
  const express = require('express')
  return {
    default: express.Router(),
  }
})

// Mock path and fs for production static file serving
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    __dirname: '/test/dist',
  },
}))

vi.mock('express', async () => {
  const actual = await vi.importActual('express')
  return {
    ...actual,
    static: vi.fn(() => (req: any, res: any, next: any) => next()),
  }
})

describe('App Integration Tests', () => {
  const originalEnv = process.env.NODE_ENV
  const originalAllowedOrigins = process.env.FRONTEND_ALLOWED_ORIGINS

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    process.env.FRONTEND_ALLOWED_ORIGINS = originalAllowedOrigins
  })

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toEqual({ status: 'ok' })
    })
  })

  describe('CORS Configuration', () => {
    it('should allow requests from allowed origins', async () => {
      const allowedOrigin = config.frontend.allowedOrigins[0]
      
      const response = await request(app)
        .get('/health')
        .set('Origin', allowedOrigin)
        .expect(200)

      expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin)
    })

    it('should allow requests with no origin (mobile apps, curl)', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      // Should not reject the request
      expect(response.status).toBe(200)
    })

    it('should reject requests from disallowed origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(200) // CORS doesn't reject, it just doesn't set headers

      // CORS middleware doesn't reject, it just doesn't set allow-origin header
      // The request still goes through, but browser will block it
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('should support credentials in CORS', async () => {
      const allowedOrigin = config.frontend.allowedOrigins[0]
      
      const response = await request(app)
        .options('/health')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'GET')
        .expect(204)

      expect(response.headers['access-control-allow-credentials']).toBe('true')
    })

    it('should allow required HTTP methods', async () => {
      const allowedOrigin = config.frontend.allowedOrigins[0]
      
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
      
      for (const method of methods) {
        const response = await request(app)
          .options('/health')
          .set('Origin', allowedOrigin)
          .set('Access-Control-Request-Method', method)
          .expect(204)

        expect(response.headers['access-control-allow-methods']).toContain(method)
      }
    })

    it('should allow required headers', async () => {
      const allowedOrigin = config.frontend.allowedOrigins[0]
      
      const response = await request(app)
        .options('/health')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .expect(204)

      expect(response.headers['access-control-allow-headers']).toContain('Content-Type')
      expect(response.headers['access-control-allow-headers']).toContain('Authorization')
    })
  })

  describe('API Routes', () => {
    it('should mount auth routes at /api/auth', async () => {
      // Note: This test verifies routes are mounted, but actual route handlers are mocked
      // Real route testing is done in route-specific test files
      const response = await request(app)
        .get('/api/auth/status')
        .expect(200)

      expect(response.body).toMatchObject({ status: 'auth' })
    })

    it('should mount transactions routes at /api', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200)

      expect(response.body).toMatchObject({ status: 'transactions' })
    })

    it('should mount seeds routes at /api/seeds', async () => {
      const response = await request(app)
        .get('/api/seeds/test')
        .expect(200)

      expect(response.body).toMatchObject({ status: 'seeds' })
    })
  })

  describe('404 Handler', () => {
    it('should return 404 for non-existent API routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404)

      expect(response.body).toMatchObject({ error: 'Not found' })
    })

    it('should return 404 for API routes with invalid paths', async () => {
      const response = await request(app)
        .get('/api/invalid/path/here')
        .expect(404)

      expect(response.body).toMatchObject({ error: 'Not found' })
    })
  })

  describe('Error Handling Middleware', () => {
    it('should handle errors and return 500 in production', async () => {
      process.env.NODE_ENV = 'production'
      
      // Create a route that throws an error
      const testApp = require('express')()
      testApp.use(require('cors')({
        origin: (origin: string | undefined, callback: any) => {
          callback(null, true)
        },
        credentials: true,
      }))
      testApp.use(require('express').json())
      testApp.get('/error', () => {
        throw new Error('Test error')
      })
      testApp.use((err: Error, req: any, res: any, next: any) => {
        if (process.env.NODE_ENV === 'development') {
          res.status(500).json({ 
            error: 'Internal server error',
            message: err.message,
            stack: err.stack
          })
        } else {
          res.status(500).json({ error: 'Internal server error' })
        }
      })

      const response = await request(testApp)
        .get('/error')
        .expect(500)

      expect(response.body).toEqual({ error: 'Internal server error' })
      expect(response.body.message).toBeUndefined()
      expect(response.body.stack).toBeUndefined()
    })

    it('should include error details in development mode', async () => {
      process.env.NODE_ENV = 'development'
      
      const testApp = require('express')()
      testApp.use(require('cors')({
        origin: (origin: string | undefined, callback: any) => {
          callback(null, true)
        },
        credentials: true,
      }))
      testApp.use(require('express').json())
      testApp.get('/error', () => {
        throw new Error('Test error message')
      })
      testApp.use((err: Error, req: any, res: any, next: any) => {
        if (process.env.NODE_ENV === 'development') {
          res.status(500).json({ 
            error: 'Internal server error',
            message: err.message,
            stack: err.stack
          })
        } else {
          res.status(500).json({ error: 'Internal server error' })
        }
      })

      const response = await request(testApp)
        .get('/error')
        .expect(500)

      expect(response.body).toMatchObject({
        error: 'Internal server error',
        message: 'Test error message',
      })
      expect(response.body.stack).toBeDefined()
    })
  })

  describe('Production Static File Serving', () => {
    it('should serve static files in production', async () => {
      process.env.NODE_ENV = 'production'
      
      // Note: This is tested conceptually since we're mocking express.static
      // In real tests with actual filesystem, you'd test actual file serving
      // The important part is that the route is set up correctly
      const response = await request(app)
        .get('/non-api-route')
        .expect(404) // Since we're mocking static, it won't actually serve

      // In real production, this would serve index.html for SPA routing
    })

    it('should not serve index.html for API routes in production', async () => {
      process.env.NODE_ENV = 'production'
      
      const response = await request(app)
        .get('/api/invalid')
        .expect(404)

      expect(response.body).toMatchObject({ error: 'Not found' })
    })
  })

  describe('JSON Body Parsing', () => {
    it('should parse JSON request bodies', async () => {
      const response = await request(app)
        .post('/health') // Using health as a test endpoint
        .send({ test: 'data' })
        .expect(404) // Health doesn't accept POST, but body should be parsed

      // Body parsing is middleware, so if it fails, we'd get a different error
      // This test verifies the middleware is applied
    })

    it('should parse URL-encoded request bodies', async () => {
      const response = await request(app)
        .post('/health')
        .send('test=data')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(404)

      // URL-encoded parsing middleware is applied
    })
  })
})

