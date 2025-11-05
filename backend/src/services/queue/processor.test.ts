// Queue processor tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Worker, Job } from 'bullmq'
import type { AutomationJobData } from './queue'
import type { Automation } from '../automation/base'
import type { Seed, SeedState } from '../seeds'

// Mock BullMQ Worker
vi.mock('bullmq', () => {
  const mockWorker = {
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  }

  return {
    Worker: vi.fn().mockImplementation(() => mockWorker),
    Queue: vi.fn(),
    ConnectionOptions: {},
  }
})

// Mock config
vi.mock('../../config', () => ({
  config: {
    redis: {
      url: 'redis://localhost:6379',
    },
  },
}))

// Create shared mock instances that persist
const mockRegistryInstance = {
  getById: vi.fn(),
}

// Mock services - use hoisted mocks
vi.mock('../automation/registry', () => ({
  AutomationRegistry: {
    getInstance: vi.fn(() => mockRegistryInstance),
  },
}))

const mockSeedsService = {
  getById: vi.fn(),
}

vi.mock('../seeds', () => ({
  SeedsService: mockSeedsService,
}))

const mockEventsService = {
  createMany: vi.fn().mockResolvedValue([]),
}

vi.mock('../events', () => ({
  EventsService: mockEventsService,
}))

const mockCreateOpenRouterClient = vi.fn()

vi.mock('../openrouter/client', () => ({
  createOpenRouterClient: (...args: any[]) => mockCreateOpenRouterClient(...args),
}))

// Mock db with proper chaining support
const mockDbResult = {
  where: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  first: vi.fn().mockResolvedValue({
    openrouter_api_key: 'test-api-key',
    openrouter_model: 'test-model',
  }),
}

const mockDbFn = vi.fn(() => mockDbResult)

vi.mock('../../db/connection', () => ({
  default: mockDbFn,
}))

describe('Queue Processor', () => {
  let mockAutomation: Partial<Automation>
  let mockSeed: Seed
  let mockOpenRouterClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Create fresh mock automation
    mockAutomation = {
      id: 'auto-123',
      name: 'test-automation',
      enabled: true,
      validateSeed: vi.fn().mockResolvedValue(true),
      process: vi.fn().mockResolvedValue({
        events: [
          {
            id: 'event-1',
            seed_id: 'seed-123',
            event_type: 'ADD_TAG',
            patch_json: [{ op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'test' } }],
            enabled: true,
            created_at: new Date(),
            automation_id: 'auto-123',
          },
        ],
        metadata: {},
      }),
    }

    const baseState: SeedState = {
      seed: 'Test seed content',
      timestamp: new Date().toISOString(),
      metadata: {},
    }

    mockSeed = {
      id: 'seed-123',
      user_id: 'user-456',
      seed_content: 'Test seed content',
      created_at: new Date(),
      currentState: baseState,
    }

    mockOpenRouterClient = {
      createChatCompletion: vi.fn(),
      generateText: vi.fn(),
      getModels: vi.fn(),
      setApiKey: vi.fn(),
      setDefaultModel: vi.fn(),
      getDefaultModel: vi.fn(),
    }

    // Setup default service mocks
    mockRegistryInstance.getById.mockImplementation((id: string) => {
      if (id === 'auto-123') {
        return mockAutomation
      }
      return null
    })

    mockSeedsService.getById.mockImplementation(async (seedId: string, userId: string) => {
      if (seedId === 'seed-123' && userId === 'user-456') {
        return mockSeed
      }
      return null
    })

    mockCreateOpenRouterClient.mockReturnValue(mockOpenRouterClient)

    // Reset db mock
    mockDbResult.where.mockReturnThis()
    mockDbResult.first.mockResolvedValue({
      openrouter_api_key: 'test-api-key',
      openrouter_model: 'test-model',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    // Restore console methods
    vi.restoreAllMocks()
  })

  describe('successful job processing', () => {
    it('should process automation job successfully', async () => {
      const { processAutomationJob } = await import('./processor')
      
      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
        updateProgress: vi.fn().mockResolvedValue(undefined),
      } as any

      await processAutomationJob(mockJob)

      expect(mockAutomation.process).toHaveBeenCalledWith(
        mockSeed,
        expect.objectContaining({
          openrouter: mockOpenRouterClient,
          userId: 'user-456',
        })
      )
      expect(mockEventsService.createMany).toHaveBeenCalled()
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100)
    })

    it('should save events created by automation', async () => {
      const { processAutomationJob } = await import('./processor')
      
      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
        updateProgress: vi.fn().mockResolvedValue(undefined),
      } as any

      await processAutomationJob(mockJob)

      expect(mockEventsService.createMany).toHaveBeenCalledWith([
        {
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'test' } }],
          automation_id: 'auto-123',
        },
      ])
    })

    it('should create OpenRouter client with user settings', async () => {
      const { processAutomationJob } = await import('./processor')
      
      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
        updateProgress: vi.fn().mockResolvedValue(undefined),
      } as any

      await processAutomationJob(mockJob)

      expect(mockCreateOpenRouterClient).toHaveBeenCalledWith('test-api-key', 'test-model')
    })
  })

  describe('error scenarios', () => {
    it('should throw error if seed not found', async () => {
      const { processAutomationJob } = await import('./processor')
      
      mockSeedsService.getById.mockResolvedValueOnce(null)

      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-missing',
          automationId: 'auto-123',
          userId: 'user-456',
        },
      } as any

      await expect(processAutomationJob(mockJob)).rejects.toThrow('Seed seed-missing not found')
    })

    it('should throw error if automation not found', async () => {
      const { processAutomationJob } = await import('./processor')
      
      mockRegistryInstance.getById.mockReturnValueOnce(null)

      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-missing',
          userId: 'user-456',
        },
      } as any

      await expect(processAutomationJob(mockJob)).rejects.toThrow('Automation auto-missing not found')
    })

    it('should skip if automation is disabled', async () => {
      const { processAutomationJob } = await import('./processor')
      
      const disabledAutomation = { ...mockAutomation, enabled: false }
      mockRegistryInstance.getById.mockReturnValueOnce(disabledAutomation)

      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
      } as any

      await processAutomationJob(mockJob)

      expect(mockAutomation.process).not.toHaveBeenCalled()
    })

    it('should skip if user has no API key', async () => {
      const { processAutomationJob } = await import('./processor')
      
      mockDbResult.first.mockResolvedValueOnce({
        openrouter_api_key: null,
        openrouter_model: null,
      })

      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
      } as any

      await processAutomationJob(mockJob)

      expect(mockAutomation.process).not.toHaveBeenCalled()
      expect(mockCreateOpenRouterClient).not.toHaveBeenCalled()
    })

    it('should skip if seed validation fails', async () => {
      const { processAutomationJob } = await import('./processor')
      
      const automationWithFailedValidation = {
        ...mockAutomation,
        validateSeed: vi.fn().mockResolvedValue(false),
      }
      mockRegistryInstance.getById.mockReturnValueOnce(automationWithFailedValidation)

      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
      } as any

      await processAutomationJob(mockJob)

      expect(automationWithFailedValidation.process).not.toHaveBeenCalled()
    })

    it('should handle automation process errors', async () => {
      const { processAutomationJob } = await import('./processor')
      
      const error = new Error('Automation process failed')
      const automationWithError = {
        ...mockAutomation,
        process: vi.fn().mockRejectedValue(error),
      }
      mockRegistryInstance.getById.mockReturnValueOnce(automationWithError)

      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
      } as any

      await expect(processAutomationJob(mockJob)).rejects.toThrow('Automation process failed')
    })

    it('should not save events if automation returns no events', async () => {
      const { processAutomationJob } = await import('./processor')
      
      const automationWithNoEvents = {
        ...mockAutomation,
        process: vi.fn().mockResolvedValue({
          events: [],
          metadata: {},
        }),
      }
      mockRegistryInstance.getById.mockReturnValueOnce(automationWithNoEvents)

      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
        updateProgress: vi.fn().mockResolvedValue(undefined),
      } as any

      await processAutomationJob(mockJob)

      expect(mockEventsService.createMany).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const { processAutomationJob } = await import('./processor')
      
      mockDbResult.first.mockRejectedValueOnce(new Error('Database connection failed'))

      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
      } as any

      // Should skip gracefully (returns null API key from catch block)
      await processAutomationJob(mockJob)

      expect(mockAutomation.process).not.toHaveBeenCalled()
    })

    it('should handle event save errors', async () => {
      const { processAutomationJob } = await import('./processor')
      
      const saveError = new Error('Failed to save events')
      mockEventsService.createMany.mockRejectedValueOnce(saveError)

      const mockJob = {
        id: 'job-123',
        data: {
          seedId: 'seed-123',
          automationId: 'auto-123',
          userId: 'user-456',
        },
      } as any

      await expect(processAutomationJob(mockJob)).rejects.toThrow('Failed to save events')
    })
  })
})
