// FollowupAutomation tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FollowupAutomation } from './followup'
import type { Seed, SeedState } from '../seeds'
import type { OpenRouterClient, OpenRouterChatCompletionResponse } from '../openrouter/client'
import type { AutomationContext, CategoryChange } from './base'
import { SproutsService } from '../sprouts'
import { SettingsService } from '../settings'
import * as followupHandler from '../sprouts/followup-sprout'
import { SeedTransactionsService } from '../seed-transactions'

// Mock SproutsService
vi.mock('../sprouts', () => ({
  SproutsService: {
    getBySeedId: vi.fn(),
  },
}))

// Mock followup sprout handler
vi.mock('../sprouts/followup-sprout', () => ({
  createFollowupSprout: vi.fn(),
  getFollowupState: vi.fn(),
}))

// Mock SeedTransactionsService
vi.mock('../seed-transactions', () => ({
  SeedTransactionsService: {
    create: vi.fn(),
  },
}))

// Mock SettingsService
vi.mock('../settings', () => ({
  SettingsService: {
    getByUserId: vi.fn(),
  },
}))

describe('FollowupAutomation', () => {
  let automation: FollowupAutomation
  let mockSeed: Seed
  let mockContext: AutomationContext
  let mockOpenRouter: OpenRouterClient
  let mockCreateChatCompletion: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    
    automation = new FollowupAutomation()

    const baseState: SeedState = {
      seed: 'Call John tomorrow about the project proposal',
      timestamp: new Date().toISOString(),
      metadata: {},
      tags: [],
      categories: [],
    }

    mockSeed = {
      id: 'seed-123',
      user_id: 'user-123',
      created_at: new Date(),
      currentState: baseState,
    }

    mockCreateChatCompletion = vi.fn()
    mockOpenRouter = {
      createChatCompletion: mockCreateChatCompletion,
      generateText: vi.fn(),
      getModels: vi.fn().mockResolvedValue([]),
      setApiKey: vi.fn(),
      setDefaultModel: vi.fn(),
      getDefaultModel: vi.fn().mockReturnValue('openai/gpt-3.5-turbo'),
    } as unknown as OpenRouterClient

    mockContext = {
      openrouter: mockOpenRouter,
      userId: 'user-123',
    }

    // Mock SettingsService to return default settings
    vi.mocked(SettingsService.getByUserId).mockResolvedValue({
      openrouter_api_key: null,
      openrouter_model: null,
      openrouter_model_name: null,
      timezone: null,
    })
  })

  describe('basic properties', () => {
    it('should have correct name and description', () => {
      expect(automation.name).toBe('followup')
      expect(automation.description).toBe('Identifies seeds that require follow-ups using AI analysis')
      expect(automation.handlerFnName).toBe('processFollowup')
    })
  })

  describe('process', () => {
    it('should create followup if confidence > 60%', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'chat-123',
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                confidence: 90,
                due_time: '2024-01-02T10:00:00Z',
                message: 'Call John about the project proposal',
              }),
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        created: Date.now(),
        model: 'openai/gpt-3.5-turbo',
        object: 'chat.completion',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SproutsService.getBySeedId).mockResolvedValue([])
      vi.mocked(followupHandler.createFollowupSprout).mockResolvedValue({
        sprout: {
          id: 'sprout-123',
          seed_id: 'seed-123',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'automatic',
            initial_time: '2024-01-02T10:00:00Z',
            initial_message: 'Call John about the project proposal',
          },
          created_at: new Date(),
          automation_id: automation.id,
        },
        followupState: {
          due_time: new Date('2024-01-02T10:00:00Z'),
          message: 'Call John about the project proposal',
          dismissed: false,
          transactions: [],
        },
      })
      vi.mocked(SeedTransactionsService.create).mockResolvedValue(undefined as any)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toEqual([])
      expect(followupHandler.createFollowupSprout).toHaveBeenCalled()
      // Verify the call arguments
      const createCall = vi.mocked(followupHandler.createFollowupSprout).mock.calls[0]
      expect(createCall[0]).toBe('seed-123')
      // The date is converted to ISO string, which may include milliseconds
      expect(createCall[1]).toMatch(/^2024-01-02T10:00:00/)
      expect(createCall[2]).toBe('Call John about the project proposal')
      expect(createCall[3]).toBe('automatic')
      expect(SeedTransactionsService.create).toHaveBeenCalled()
    })

    it('should not create followup if confidence <= 60%', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'chat-123',
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                confidence: 50,
                due_time: null,
                message: '',
              }),
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        created: Date.now(),
        model: 'openai/gpt-3.5-turbo',
        object: 'chat.completion',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SproutsService.getBySeedId).mockResolvedValue([])

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toEqual([])
      expect(followupHandler.createFollowupSprout).not.toHaveBeenCalled()
    })

    it('should not create followup if seed already has active followup', async () => {
      vi.mocked(SproutsService.getBySeedId).mockResolvedValue([
        {
          id: 'sprout-123',
          seed_id: 'seed-123',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'automatic',
            initial_time: '2024-01-02T10:00:00Z',
            initial_message: 'Existing followup',
          },
          created_at: new Date(),
          automation_id: automation.id,
          followup_state: {
            due_time: new Date('2024-01-02T10:00:00Z'),
            message: 'Existing followup',
            dismissed: false,
            transactions: [],
          },
        },
      ])
      vi.mocked(followupHandler.getFollowupState).mockResolvedValue({
        due_time: new Date('2024-01-02T10:00:00Z'),
        message: 'Existing followup',
        dismissed: false,
        transactions: [],
      })

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toEqual([])
      expect(mockCreateChatCompletion).not.toHaveBeenCalled()
      expect(followupHandler.createFollowupSprout).not.toHaveBeenCalled()
    })

    it('should allow creating followup if existing followup is dismissed', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'chat-123',
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                confidence: 90,
                due_time: '2024-01-02T10:00:00Z',
                message: 'New followup',
              }),
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        created: Date.now(),
        model: 'openai/gpt-3.5-turbo',
        object: 'chat.completion',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SproutsService.getBySeedId).mockResolvedValue([
        {
          id: 'sprout-123',
          seed_id: 'seed-123',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'automatic',
            initial_time: '2024-01-02T10:00:00Z',
            initial_message: 'Dismissed followup',
          },
          created_at: new Date(),
          automation_id: automation.id,
          followup_state: {
            due_time: new Date('2024-01-02T10:00:00Z'),
            message: 'Dismissed followup',
            dismissed: true,
            dismissed_at: new Date(),
            transactions: [],
          },
        },
      ])
      vi.mocked(followupHandler.getFollowupState).mockResolvedValue({
        due_time: new Date('2024-01-02T10:00:00Z'),
        message: 'Dismissed followup',
        dismissed: true,
        dismissed_at: new Date(),
        transactions: [],
      })
      vi.mocked(followupHandler.createFollowupSprout).mockResolvedValue({
        sprout: {
          id: 'sprout-456',
          seed_id: 'seed-123',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'automatic',
            initial_time: '2024-01-02T10:00:00Z',
            initial_message: 'New followup',
          },
          created_at: new Date(),
          automation_id: automation.id,
        },
        followupState: {
          due_time: new Date('2024-01-02T10:00:00Z'),
          message: 'New followup',
          dismissed: false,
          transactions: [],
        },
      })
      vi.mocked(SeedTransactionsService.create).mockResolvedValue(undefined as any)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toEqual([])
      expect(followupHandler.createFollowupSprout).toHaveBeenCalled()
    })

    it('should handle AI errors gracefully', async () => {
      mockCreateChatCompletion.mockRejectedValue(new Error('AI service error'))
      vi.mocked(SproutsService.getBySeedId).mockResolvedValue([])

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toEqual([])
      expect(followupHandler.createFollowupSprout).not.toHaveBeenCalled()
    })

    it('should handle invalid AI response gracefully', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'chat-123',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Invalid JSON response',
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        created: Date.now(),
        model: 'openai/gpt-3.5-turbo',
        object: 'chat.completion',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SproutsService.getBySeedId).mockResolvedValue([])

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toEqual([])
      expect(followupHandler.createFollowupSprout).not.toHaveBeenCalled()
    })

    it('should return empty events array (followups are NOT timeline events)', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'chat-123',
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                confidence: 90,
                due_time: '2024-01-02T10:00:00Z',
                message: 'Test followup',
              }),
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        created: Date.now(),
        model: 'openai/gpt-3.5-turbo',
        object: 'chat.completion',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SproutsService.getBySeedId).mockResolvedValue([])
      vi.mocked(followupHandler.createFollowupSprout).mockResolvedValue({
        sprout: {
          id: 'sprout-123',
          seed_id: 'seed-123',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'automatic',
            initial_time: '2024-01-02T10:00:00Z',
            initial_message: 'Test followup',
          },
          created_at: new Date(),
          automation_id: automation.id,
        },
        followupState: {
          due_time: new Date('2024-01-02T10:00:00Z'),
          message: 'Test followup',
          dismissed: false,
          transactions: [],
        },
      })
      vi.mocked(SeedTransactionsService.create).mockResolvedValue(undefined as any)

      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toEqual([])
    })
  })

  describe('calculatePressure', () => {
    it('should always return 0', () => {
      const changes: CategoryChange[] = [
        {
          type: 'rename',
          categoryId: 'cat-123',
          oldName: 'Old',
          newName: 'New',
        },
      ]

      const result = automation.calculatePressure(mockSeed, mockContext, changes)

      expect(result).toBe(0)
    })
  })

  describe('getPressureThreshold', () => {
    it('should return 100', () => {
      const result = automation.getPressureThreshold()

      expect(result).toBe(100)
    })
  })
})

