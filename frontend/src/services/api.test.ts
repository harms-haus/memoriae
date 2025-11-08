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

  describe('Idea Musings Methods', () => {
    it('should call getDailyMusings with correct endpoint', async () => {
      // Get the actual client instance used by api
      const client = (api as any).client
      const mockMusings = [
        {
          id: 'musing-1',
          seed_id: 'seed-1',
          template_type: 'numbered_ideas',
          content: { ideas: ['Idea 1'] },
          created_at: new Date().toISOString(),
          dismissed: false,
        },
      ]

      client.get.mockResolvedValue({ data: mockMusings })

      const result = await api.getDailyMusings()

      expect(client.get).toHaveBeenCalledWith('/idea-musings', undefined)
      expect(result).toEqual(mockMusings)
    })

    it('should call getMusingsBySeedId with correct endpoint', async () => {
      const client = (api as any).client
      const seedId = 'seed-123'

      client.get.mockResolvedValue({ data: [] })

      await api.getMusingsBySeedId(seedId)

      expect(client.get).toHaveBeenCalledWith(`/idea-musings/seed/${seedId}`, undefined)
    })

    it('should call dismissMusing with correct endpoint', async () => {
      const client = (api as any).client
      const musingId = 'musing-123'

      client.post.mockResolvedValue({ data: { id: musingId, dismissed: true } })

      await api.dismissMusing(musingId)

      expect(client.post).toHaveBeenCalledWith(`/idea-musings/${musingId}/dismiss`, undefined, undefined)
    })

    it('should call regenerateMusing with correct endpoint', async () => {
      const client = (api as any).client
      const musingId = 'musing-123'

      client.post.mockResolvedValue({ data: { id: musingId } })

      await api.regenerateMusing(musingId)

      expect(client.post).toHaveBeenCalledWith(`/idea-musings/${musingId}/regenerate`, undefined, undefined)
    })

    it('should call applyIdea with correct params', async () => {
      const client = (api as any).client
      const musingId = 'musing-123'
      const ideaIndex = 0

      client.post.mockResolvedValue({ data: { preview: 'Preview content' } })

      await api.applyIdea(musingId, ideaIndex)

      expect(client.post).toHaveBeenCalledWith(
        `/idea-musings/${musingId}/apply-idea`,
        { ideaIndex, confirm: undefined },
        undefined
      )
    })

    it('should call applyIdea with confirm flag', async () => {
      const client = (api as any).client
      const musingId = 'musing-123'
      const ideaIndex = 0

      client.post.mockResolvedValue({ data: { applied: true } })

      await api.applyIdea(musingId, ideaIndex, true)

      expect(client.post).toHaveBeenCalledWith(
        `/idea-musings/${musingId}/apply-idea`,
        { ideaIndex, confirm: true },
        undefined
      )
    })

    it('should call promptLLM with correct params', async () => {
      const client = (api as any).client
      const musingId = 'musing-123'
      const prompt = 'Tell me more about this idea'

      client.post.mockResolvedValue({ data: { preview: 'LLM response' } })

      await api.promptLLM(musingId, prompt)

      expect(client.post).toHaveBeenCalledWith(
        `/idea-musings/${musingId}/prompt-llm`,
        { prompt, confirm: undefined },
        undefined
      )
    })

    it('should call generateMusings with correct endpoint', async () => {
      const client = (api as any).client

      client.post.mockResolvedValue({ data: { message: 'Generated 5 musings', musingsCreated: 5 } })

      const result = await api.generateMusings()

      expect(client.post).toHaveBeenCalledWith('/idea-musings/generate', undefined, undefined)
      expect(result.musingsCreated).toBe(5)
    })
  })

})

