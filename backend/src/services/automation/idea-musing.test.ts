

// IdeaMusingAutomation tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IdeaMusingAutomation } from './idea-musing'
import type { Seed, SeedState } from '../seeds'
import type { OpenRouterClient, OpenRouterChatCompletionResponse } from '../openrouter/client'
import type { AutomationContext, CategoryChange } from './base'
import * as IdeaMusingsService from '../idea-musings'
import * as SeedsService from '../seeds'
import db from '../../db/connection'

// Mock the idea musings service
vi.mock('../idea-musings', () => ({
  IdeaMusingsService: {
    create: vi.fn(),
    recordShown: vi.fn(),
  },
}))

// Mock the seeds service
vi.mock('../seeds', () => ({
  SeedsService: {
    getByUser: vi.fn(),
  },
}))

// Mock the database
const mockWhere = vi.fn()
const mockSelect = vi.fn()
const mockFirst = vi.fn()

vi.mock('../../db/connection', () => {
  const mockDb = vi.fn((table: string) => {
    const queryBuilder = {
      where: mockWhere.mockReturnThis(),
      select: mockSelect.mockReturnThis(),
      first: mockFirst,
    }
    return queryBuilder
  })

  return {
    default: mockDb,
  }
})

describe('IdeaMusingAutomation', () => {
  let automation: IdeaMusingAutomation
  let mockSeed: Seed
  let mockIdeaSeed: Seed
  let mockContext: AutomationContext
  let mockCreateChatCompletion: ReturnType<typeof vi.fn>
  let mockOpenRouter: OpenRouterClient

  beforeEach(() => {
    vi.clearAllMocks()

    const baseState: SeedState = {
      seed: 'Had a meeting with John today',
      timestamp: new Date().toISOString(),
      metadata: {},
      tags: [],
      categories: [],
    }

    const ideaState: SeedState = {
      seed: 'I want to build an app that tracks my reading habits',
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

    mockIdeaSeed = {
      id: 'seed-456',
      user_id: 'user-123',
      created_at: new Date(),
      currentState: ideaState,
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

    automation = new IdeaMusingAutomation()
  })

  describe('basic properties', () => {
    it('should have correct name and description', () => {
      expect(automation.name).toBe('idea-musing')
      expect(automation.description).toBe('Identifies creative idea seeds and generates daily musings')
      expect(automation.handlerFnName).toBe('processIdeaMusing')
    })
  })

  describe('process', () => {
    it('should return empty transactions (not used for this automation)', async () => {
      const result = await automation.process(mockSeed, mockContext)

      expect(result.transactions).toEqual([])
    })
  })

  describe('calculatePressure', () => {
    it('should return 0 (no pressure system)', () => {
      const changes: CategoryChange[] = []
      const pressure = automation.calculatePressure(mockSeed, mockContext, changes)

      expect(pressure).toBe(0)
    })
  })

  describe('identifyIdeaSeeds', () => {
    it('should return empty array when no seeds provided', async () => {
      const result = await automation.identifyIdeaSeeds([], mockContext)

      expect(result).toEqual([])
      expect(mockCreateChatCompletion).not.toHaveBeenCalled()
    })

    it('should identify idea seeds correctly', async () => {
      const seeds = [mockSeed, mockIdeaSeed]
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify([mockIdeaSeed.id]),
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)

      const result = await automation.identifyIdeaSeeds(seeds, mockContext)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(mockIdeaSeed.id)
      expect(mockCreateChatCompletion).toHaveBeenCalled()
    })

    it('should filter out non-idea seeds', async () => {
      const seeds = [mockSeed, mockIdeaSeed]
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify([mockIdeaSeed.id]),
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)

      const result = await automation.identifyIdeaSeeds(seeds, mockContext)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(mockIdeaSeed.id)
      expect(result.find(s => s.id === mockSeed.id)).toBeUndefined()
    })

    it('should handle LLM errors gracefully', async () => {
      const seeds = [mockIdeaSeed]
      mockCreateChatCompletion.mockRejectedValue(new Error('API error'))

      const result = await automation.identifyIdeaSeeds(seeds, mockContext)

      expect(result).toEqual([])
    })

    it('should extract JSON array from markdown code block', async () => {
      const seeds = [mockIdeaSeed]
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: '```json\n["seed-456"]\n```',
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)

      const result = await automation.identifyIdeaSeeds(seeds, mockContext)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(mockIdeaSeed.id)
    })

    it('should handle invalid JSON gracefully', async () => {
      const seeds = [mockIdeaSeed]
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'Invalid JSON response',
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)

      const result = await automation.identifyIdeaSeeds(seeds, mockContext)

      expect(result).toEqual([])
    })
  })

  describe('generateMusing', () => {
    it('should generate numbered ideas template', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                template_type: 'numbered_ideas',
                content: {
                  ideas: ['Idea 1', 'Idea 2', 'Custom idea or prompt...'],
                },
              }),
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await automation.generateMusing(mockIdeaSeed, mockContext)

      expect(result).toBeDefined()
      expect(result?.templateType).toBe('numbered_ideas')
      expect(result?.content).toHaveProperty('ideas')
      expect(Array.isArray((result?.content as any).ideas)).toBe(true)
    })

    it('should generate Wikipedia links template', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                template_type: 'wikipedia_links',
                content: {
                  links: [
                    { title: 'Reading', url: 'https://en.wikipedia.org/wiki/Reading' },
                  ],
                },
              }),
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await automation.generateMusing(mockIdeaSeed, mockContext)

      expect(result).toBeDefined()
      expect(result?.templateType).toBe('wikipedia_links')
      expect(result?.content).toHaveProperty('links')
      expect(Array.isArray((result?.content as any).links)).toBe(true)
    })

    it('should generate markdown template', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                template_type: 'markdown',
                content: {
                  markdown: '# Markdown content\n\nSome text here.',
                },
              }),
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await automation.generateMusing(mockIdeaSeed, mockContext)

      expect(result).toBeDefined()
      expect(result?.templateType).toBe('markdown')
      expect(result?.content).toHaveProperty('markdown')
    })

    it('should add custom prompt placeholder if missing', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                template_type: 'numbered_ideas',
                content: {
                  ideas: ['Idea 1', 'Idea 2'],
                },
              }),
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await automation.generateMusing(mockIdeaSeed, mockContext)

      expect(result).toBeDefined()
      const ideas = (result?.content as any).ideas
      expect(ideas[ideas.length - 1]).toContain('Custom')
    })

    it('should validate numbered ideas content structure', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                template_type: 'numbered_ideas',
                content: {
                  invalid: 'structure',
                },
              }),
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await automation.generateMusing(mockIdeaSeed, mockContext)

      expect(result).toBeNull()
    })

    it('should validate Wikipedia links structure', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                template_type: 'wikipedia_links',
                content: {
                  links: [
                    { title: 'Missing URL' },
                  ],
                },
              }),
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await automation.generateMusing(mockIdeaSeed, mockContext)

      expect(result).toBeNull()
    })

    it('should handle LLM errors gracefully', async () => {
      mockCreateChatCompletion.mockRejectedValue(new Error('API error'))
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await automation.generateMusing(mockIdeaSeed, mockContext)

      expect(result).toBeNull()
    })

    it('should handle invalid template type', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'test-id',
        model: 'test-model',
        created: Date.now(),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                template_type: 'invalid_type',
                content: {},
              }),
            },
          },
        ],
      }

      mockCreateChatCompletion.mockResolvedValue(mockResponse)
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await automation.generateMusing(mockIdeaSeed, mockContext)

      expect(result).toBeNull()
    })
  })
})

