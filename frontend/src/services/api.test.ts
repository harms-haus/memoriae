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

  describe('Followup Methods', () => {
    it('should call getFollowups with correct endpoint', async () => {
      const client = (api as any).client
      const seedId = 'seed-123'
      const mockFollowups = [
        {
          id: 'followup-1',
          seed_id: seedId,
          message: 'Follow up message',
          due_at: new Date().toISOString(),
        },
      ]

      client.get.mockResolvedValue({ data: mockFollowups })

      const result = await api.getFollowups(seedId)

      expect(client.get).toHaveBeenCalledWith(`/seeds/${seedId}/followups`, undefined)
      expect(result).toEqual(mockFollowups)
    })

    it('should call createFollowup with correct endpoint', async () => {
      const client = (api as any).client
      const seedId = 'seed-123'
      const followupData = {
        message: 'New followup',
        due_time: new Date().toISOString(),
      }

      client.post.mockResolvedValue({ data: { id: 'followup-1', ...followupData } })

      await api.createFollowup(seedId, followupData)

      expect(client.post).toHaveBeenCalledWith(`/seeds/${seedId}/followups`, followupData, undefined)
    })

    it('should call editFollowup with correct endpoint', async () => {
      const client = (api as any).client
      const followupId = 'followup-123'
      const editData = { message: 'Updated message' }

      client.put.mockResolvedValue({ data: { id: followupId, ...editData } })

      await api.editFollowup(followupId, editData)

      expect(client.put).toHaveBeenCalledWith(`/followups/${followupId}`, editData, undefined)
    })

    it('should call snoozeFollowup with correct endpoint', async () => {
      const client = (api as any).client
      const followupId = 'followup-123'
      const durationMinutes = 60

      client.post.mockResolvedValue({ data: { id: followupId } })

      await api.snoozeFollowup(followupId, durationMinutes)

      expect(client.post).toHaveBeenCalledWith(
        `/followups/${followupId}/snooze`,
        { duration_minutes: durationMinutes },
        undefined
      )
    })

    it('should call dismissFollowup with correct endpoint', async () => {
      const client = (api as any).client
      const followupId = 'followup-123'
      const type = 'followup' as const

      client.post.mockResolvedValue({ data: { id: followupId } })

      await api.dismissFollowup(followupId, type)

      expect(client.post).toHaveBeenCalledWith(
        `/followups/${followupId}/dismiss`,
        { type },
        undefined
      )
    })

    it('should call getDueFollowups with correct endpoint', async () => {
      const client = (api as any).client
      const mockDueFollowups = [
        {
          followup_id: 'followup-1',
          seed_id: 'seed-1',
          message: 'Due followup',
        },
      ]

      client.get.mockResolvedValue({ data: mockDueFollowups })

      const result = await api.getDueFollowups()

      expect(client.get).toHaveBeenCalledWith('/followups/due', undefined)
      expect(result).toEqual(mockDueFollowups)
    })
  })

  describe('Transaction Methods', () => {
    it('should call getSeedTransactions with correct endpoint', async () => {
      const client = (api as any).client
      const seedId = 'seed-123'
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: seedId,
          transaction_type: 'create_seed',
          transaction_data: {},
          created_at: new Date().toISOString(),
        },
      ]

      client.get.mockResolvedValue({ data: mockTransactions })

      const result = await api.getSeedTransactions(seedId)

      expect(client.get).toHaveBeenCalledWith(`/seeds/${seedId}/transactions`, undefined)
      expect(result).toEqual(mockTransactions)
    })

    it('should call createSeedTransaction with correct endpoint', async () => {
      const client = (api as any).client
      const seedId = 'seed-123'
      const transactionData = {
        transaction_type: 'edit_content' as const,
        transaction_data: { content: 'New content' },
      }

      client.post.mockResolvedValue({ data: { id: 'txn-1', ...transactionData } })

      await api.createSeedTransaction(seedId, transactionData)

      expect(client.post).toHaveBeenCalledWith(
        `/seeds/${seedId}/transactions`,
        transactionData,
        undefined
      )
    })

    it('should call getSeedTransaction with correct endpoint', async () => {
      const client = (api as any).client
      const transactionId = 'txn-123'

      client.get.mockResolvedValue({ data: { id: transactionId } })

      await api.getSeedTransaction(transactionId)

      expect(client.get).toHaveBeenCalledWith(`/transactions/${transactionId}`, undefined)
    })
  })

  describe('Tag Methods', () => {
    it('should call getTagDetail with correct endpoint', async () => {
      const client = (api as any).client
      const tagId = 'tag-123'

      client.get.mockResolvedValue({ data: { id: tagId } })

      await api.getTagDetail(tagId)

      expect(client.get).toHaveBeenCalledWith(`/tags/${tagId}`, undefined)
    })

    it('should call updateTag with correct endpoint', async () => {
      const client = (api as any).client
      const tagId = 'tag-123'
      const updateData = { name: 'Updated tag', color: '#ff0000' }

      client.put.mockResolvedValue({ data: { id: tagId, ...updateData } })

      await api.updateTag(tagId, updateData)

      expect(client.put).toHaveBeenCalledWith(`/tags/${tagId}`, updateData, undefined)
    })

    it('should call getTagSeeds with correct endpoint', async () => {
      const client = (api as any).client
      const tagId = 'tag-123'

      client.get.mockResolvedValue({ data: [] })

      await api.getTagSeeds(tagId)

      expect(client.get).toHaveBeenCalledWith(`/tags/${tagId}/seeds`, undefined)
    })
  })

  describe('Auth Methods', () => {
    it('should call getAuthStatus with correct endpoint', async () => {
      const client = (api as any).client
      const mockStatus = {
        authenticated: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google',
        },
      }

      client.get.mockResolvedValue({ data: mockStatus })

      const result = await api.getAuthStatus()

      expect(client.get).toHaveBeenCalledWith('/auth/status')
      expect(result).toEqual(mockStatus)
    })

    it('should handle 401 error in getAuthStatus', async () => {
      const client = (api as any).client
      const axios = await import('axios')
      
      // Mock isAxiosError to return true
      vi.mocked(axios.default.isAxiosError).mockReturnValue(true)
      
      const axiosError = {
        response: { status: 401 },
        isAxiosError: true,
      }

      client.get.mockRejectedValue(axiosError)

      const result = await api.getAuthStatus()

      expect(result).toEqual({
        authenticated: false,
        user: null,
      })
    })

    it('should call logout with correct endpoint', async () => {
      const client = (api as any).client

      client.post.mockResolvedValue({ data: {} })

      await api.logout()

      expect(client.post).toHaveBeenCalledWith('/auth/logout')
    })

    it('should clear token on logout even if request fails', async () => {
      const client = (api as any).client
      api.setToken('test-token')

      client.post.mockRejectedValue(new Error('Logout failed'))

      await api.logout()

      expect(api.getToken()).toBeNull()
    })
  })

  describe('Seed Path Formatting', () => {
    it('should format hashId-only seedId correctly', async () => {
      const client = (api as any).client
      const seedId = 'abc1234'

      client.get.mockResolvedValue({ data: {} })

      await api.getFollowups(seedId)

      expect(client.get).toHaveBeenCalledWith(`/seeds/${seedId}/followups`, undefined)
    })

    it('should format hashId/slug seedId correctly', async () => {
      const client = (api as any).client
      const seedId = 'abc1234/test-slug'

      client.get.mockResolvedValue({ data: {} })

      await api.getFollowups(seedId)

      expect(client.get).toHaveBeenCalledWith(`/seeds/${seedId}/followups`, undefined)
    })

    it('should format full UUID seedId correctly', async () => {
      const client = (api as any).client
      const seedId = '12345678-1234-1234-1234-123456789012'

      client.get.mockResolvedValue({ data: {} })

      await api.getFollowups(seedId)

      expect(client.get).toHaveBeenCalledWith(`/seeds/${seedId}/followups`, undefined)
    })
  })

})

