// Auth routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import authRoutes from '../../routes/auth'
import { authenticate } from '../../middleware/auth'
import { generateTestToken } from '../../test-helpers'

// Mock auth service
vi.mock('../../services/auth', () => ({
  findOrCreateUser: vi.fn(),
  generateToken: vi.fn((user) => `mock-token-${user.id}`),
}))

// Mock axios for OAuth provider calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/auth/status', () => {
    it('should return user info with valid token', async () => {
      const token = generateTestToken({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const response = await request(app)
        .get('/api/auth/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('authenticated', true)
      expect(response.body.user).toMatchObject({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })
    })

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/auth/status')
        .expect(401)
    })
  })

  describe('GET /api/auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(302)

      expect(response.headers.location).toContain('accounts.google.com')
      expect(response.headers.location).toContain('oauth2')
      expect(response.headers.location).toContain('client_id=test-google-client-id')
    })

    it('should include state parameter with redirect', async () => {
      const response = await request(app)
        .get('/api/auth/google?redirect=/dashboard')
        .expect(302)

      expect(response.headers.location).toContain('state=')
    })
  })

  describe('GET /api/auth/github', () => {
    it('should redirect to GitHub OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/github')
        .expect(302)

      expect(response.headers.location).toContain('github.com')
      expect(response.headers.location).toContain('login/oauth/authorize')
      expect(response.headers.location).toContain('client_id=test-github-client-id')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should return success with valid token', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Logged out successfully')
    })

    it('should return 401 without token', async () => {
      await request(app)
        .post('/api/auth/logout')
        .expect(401)
    })
  })
})

