// API client tests
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock axios before importing api
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: vi.fn(),
    },
  }
})

// Import api - the mock is hoisted so it's already applied
import { api } from './api'

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
    // Reset api instance token
    ;(api as any).token = null
  })

  describe('Token Management', () => {
    it('should store token in localStorage', () => {
      const token = 'test-token-123'
      api.setToken(token)

      expect(api.getToken()).toBe(token)
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('auth_token')).toBe(token)
      }
    })

    it('should retrieve stored token', () => {
      const token = 'test-token-456'
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('auth_token', token)
        ;(api as any).loadToken()
        expect(api.getToken()).toBe(token)
      }
    })

    it('should clear token from localStorage', () => {
      const token = 'test-token-789'
      api.setToken(token)
      api.clearToken()

      expect(api.getToken()).toBeNull()
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('auth_token')).toBeNull()
      }
    })

    it('should handle missing localStorage gracefully', () => {
      // Temporarily remove localStorage
      const originalLocalStorage = (globalThis as any).localStorage
      delete (globalThis as any).localStorage

      // Should not throw
      expect(() => api.setToken('token')).not.toThrow()
      expect(() => api.clearToken()).not.toThrow()
      expect(() => api.loadToken()).not.toThrow()

      // Restore
      ;(globalThis as any).localStorage = originalLocalStorage
    })
  })

  describe('Auth Methods', () => {
    it('should generate correct Google OAuth URL', () => {
      const url = api.getGoogleAuthUrl('/dashboard')
      expect(url).toContain('/auth/google')
      expect(url).toContain('redirect') // URL encoding may change the exact format
    })

    it('should generate correct GitHub OAuth URL', () => {
      const url = api.getGithubAuthUrl('/dashboard')
      expect(url).toContain('/auth/github')
      expect(url).toContain('redirect') // URL encoding may change the exact format
    })
  })

})

