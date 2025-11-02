// Test utilities and helpers
import { vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { config } from './config'
import type { JWTPayload } from './middleware/auth'

/**
 * Generate a test JWT token
 */
export function generateTestToken(payload: Partial<JWTPayload> = {}): string {
  const defaultPayload: JWTPayload = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    provider: 'google',
    ...payload,
  }

  return jwt.sign(defaultPayload, config.jwt.secret, {
    expiresIn: '1h',
  } as jwt.SignOptions)
}

/**
 * Create a mock Express Request with user
 */
export function createMockRequest(user?: JWTPayload) {
  const token = user ? generateTestToken(user) : null
  return {
    headers: {
      authorization: token ? `Bearer ${token}` : undefined,
    },
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
    } : undefined,
  } as any
}

/**
 * Create a mock Express Response
 */
export function createMockResponse() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  }
  return res
}

/**
 * Create a mock Express Next function
 */
export function createMockNext() {
  return vi.fn()
}

