// Auth middleware tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authenticate, optionalAuth } from './auth'
import { generateTestToken, createMockRequest, createMockResponse, createMockNext } from '../test-helpers'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import * as authService from '../services/auth'

// Mock the auth service
vi.mock('../services/auth', () => ({
  getUserById: vi.fn(),
}))

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authenticate', () => {
    it('should allow request with valid token', async () => {
      const userPayload = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      }
      const token = generateTestToken(userPayload)
      const req = createMockRequest(userPayload)
      const res = createMockResponse()
      const next = createMockNext()

      // Mock getUserById to return the user
      vi.mocked(authService.getUserById).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
        provider_id: 'provider-123',
        created_at: new Date(),
      })

      await authenticate(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
      expect(req.user).toBeDefined()
      expect(req.user?.id).toBe('user-id')
    })

    it('should reject request with missing token', async () => {
      const req = {
        headers: {},
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      await authenticate(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized - No token provided' })
    })

    it('should reject request with invalid token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      await authenticate(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized - Invalid token' })
    })

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-id', email: 'test@example.com', name: 'Test', provider: 'google' },
        config.jwt.secret,
        { expiresIn: '-1h' } as jwt.SignOptions
      )

      const req = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      await authenticate(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized - Token expired' })
    })

    it('should set req.user with correct payload', async () => {
      const userPayload = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'github' as const,
      }
      const token = generateTestToken(userPayload)
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      // Mock getUserById to return the user
      vi.mocked(authService.getUserById).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'github',
        provider_id: 'provider-123',
        created_at: new Date(),
      })

      await authenticate(req, res, next)

      expect(req.user).toBeDefined()
      expect(req.user?.id).toBe('test-user-id')
      expect(req.user?.email).toBe('test@example.com')
      expect(req.user?.name).toBe('Test User')
      expect(req.user?.provider).toBe('github')
    })

    it('should reject request when user not found in database', async () => {
      const userPayload = {
        id: 'non-existent-user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      }
      const token = generateTestToken(userPayload)
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      // Mock getUserById to return null (user doesn't exist)
      vi.mocked(authService.getUserById).mockResolvedValue(null)

      await authenticate(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized - User not found. Please log in again.' })
    })
  })

  describe('optionalAuth', () => {
    it('should allow request with valid token', async () => {
      const userPayload = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      }
      const token = generateTestToken(userPayload)
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      // Mock getUserById to return the user
      vi.mocked(authService.getUserById).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
        provider_id: 'provider-123',
        created_at: new Date(),
      })

      await optionalAuth(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.user).toBeDefined()
    })

    it('should allow request without token (does not fail)', async () => {
      const req = {
        headers: {},
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      await optionalAuth(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should set req.user when token valid', async () => {
      const userPayload = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test',
        provider: 'google',
      }
      const token = generateTestToken(userPayload)
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      // Mock getUserById to return the user
      vi.mocked(authService.getUserById).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test',
        provider: 'google',
        provider_id: 'provider-123',
        created_at: new Date(),
      })

      await optionalAuth(req, res, next)

      expect(req.user).toBeDefined()
      expect(req.user?.id).toBe('user-id')
    })

    it('should not set req.user when token invalid (silent)', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      await optionalAuth(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
      expect(req.user).toBeUndefined()
    })

    it('should not set req.user when user not found in database (silent)', async () => {
      const userPayload = {
        id: 'non-existent-user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      }
      const token = generateTestToken(userPayload)
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      // Mock getUserById to return null (user doesn't exist)
      vi.mocked(authService.getUserById).mockResolvedValue(null)

      await optionalAuth(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
      expect(req.user).toBeUndefined()
    })
  })
})

