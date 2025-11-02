// Auth middleware tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authenticate, optionalAuth } from './auth'
import { generateTestToken, createMockRequest, createMockResponse, createMockNext } from '../test-helpers'
import jwt from 'jsonwebtoken'
import { config } from '../config'

describe('Auth Middleware', () => {
  describe('authenticate', () => {
    it('should allow request with valid token', () => {
      const token = generateTestToken()
      const req = createMockRequest({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })
      const res = createMockResponse()
      const next = createMockNext()

      authenticate(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
      expect(req.user).toBeDefined()
      expect(req.user?.id).toBe('user-id')
    })

    it('should reject request with missing token', () => {
      const req = {
        headers: {},
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      authenticate(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized - No token provided' })
    })

    it('should reject request with invalid token', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      authenticate(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized - Invalid token' })
    })

    it('should reject request with expired token', () => {
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

      authenticate(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized - Token expired' })
    })

    it('should set req.user with correct payload', () => {
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

      authenticate(req, res, next)

      expect(req.user).toBeDefined()
      expect(req.user?.id).toBe('test-user-id')
      expect(req.user?.email).toBe('test@example.com')
      expect(req.user?.name).toBe('Test User')
      expect(req.user?.provider).toBe('github')
    })
  })

  describe('optionalAuth', () => {
    it('should allow request with valid token', () => {
      const token = generateTestToken()
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      optionalAuth(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.user).toBeDefined()
    })

    it('should allow request without token (does not fail)', () => {
      const req = {
        headers: {},
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      optionalAuth(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should set req.user when token valid', () => {
      const token = generateTestToken({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test',
        provider: 'google',
      })
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      optionalAuth(req, res, next)

      expect(req.user).toBeDefined()
      expect(req.user?.id).toBe('user-id')
    })

    it('should not set req.user when token invalid (silent)', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as any
      const res = createMockResponse()
      const next = createMockNext()

      optionalAuth(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
      expect(req.user).toBeUndefined()
    })
  })
})

