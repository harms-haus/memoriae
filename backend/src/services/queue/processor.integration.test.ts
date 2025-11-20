import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import type { Job } from 'bullmq'
import { processAutomationJob } from './processor'
import { TrackedOpenRouterClient } from '../openrouter/tracked-client'
import { TokenUsageService } from '../token-usage'
import { AutomationRegistry } from '../automation/registry'
import { SeedsService } from '../seeds'
import { SettingsService } from '../settings'
import db from '../../db/connection'

// Suppress logs during tests
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// Mock dependencies
vi.mock('../openrouter/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../openrouter/client')>()
  return {
    ...actual,
    createOpenRouterClient: vi.fn(() => ({
      createChatCompletion: vi.fn(),
      generateText: vi.fn(),
      getModels: vi.fn(),
      setApiKey: vi.fn(),
      setDefaultModel: vi.fn(),
      getDefaultModel: vi.fn(),
    })),
  }
})

vi.mock('../openrouter/tracked-client', () => ({
  TrackedOpenRouterClient: vi.fn(),
}))
vi.mock('../token-usage', () => ({
  TokenUsageService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('../automation/registry', () => ({
  AutomationRegistry: {
    getInstance: vi.fn(),
  },
}))
vi.mock('../seeds', () => ({
  SeedsService: {
    getById: vi.fn(),
  },
}))
vi.mock('../settings', () => ({
  SettingsService: {
    getByUserId: vi.fn(),
  },
}))
vi.mock('../seed-transactions', () => ({
  SeedTransactionsService: {
    createMany: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('Queue Processor Integration', () => {
  let mockJob: Job<any>
  let mockAutomation: any
  let mockSeed: any
  let mockSettings: any
  let mockBaseClient: any
  let mockTrackedClient: any

  beforeAll(async () => {
    // Run migrations to ensure token_usage table exists
    await db.migrate.latest()
  }, 60000)

  beforeEach(async () => {
    // Suppress logs
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()

    // Clean up test data (only if tables exist)
    try {
      await db('token_usage').del()
    } catch (error) {
      // Table might not exist yet, ignore error
    }
    try {
      await db('users').del()
    } catch (error) {
      // Table might not exist yet, ignore error
    }

    // Create test user
    const userId = '00000000-0000-0000-0000-000000000001'
    await db('users').insert({
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      provider: 'google',
      provider_id: 'test-provider-id-1',
      created_at: new Date(),
    })

    // Reset mocks
    vi.clearAllMocks()

    // Setup mock job
    mockJob = {
      id: 'job-1',
      data: {
        seedId: uuidv4(),
        automationId: uuidv4(),
        userId,
      },
      updateProgress: vi.fn().mockResolvedValue(undefined),
    } as any

    // Setup mock automation
    mockAutomation = {
      id: mockJob.data.automationId,
      name: 'tag',
      enabled: true,
      validateSeed: vi.fn().mockResolvedValue(true),
      process: vi.fn().mockResolvedValue({ transactions: [] }),
    }

    // Setup mock seed
    mockSeed = {
      id: mockJob.data.seedId,
      user_id: userId,
      seed_content: 'Test seed content',
    }

    // Setup mock settings
    mockSettings = {
      openrouter_api_key: 'test-api-key',
      openrouter_model: 'openai/gpt-4',
    }

    // Setup mock base client
    mockBaseClient = {
      createChatCompletion: vi.fn(),
      generateText: vi.fn(),
      getModels: vi.fn(),
      setApiKey: vi.fn(),
      setDefaultModel: vi.fn(),
      getDefaultModel: vi.fn(),
    }

    // Setup mock tracked client
    mockTrackedClient = {
      createChatCompletion: vi.fn(),
      generateText: vi.fn(),
      getModels: vi.fn(),
      setApiKey: vi.fn(),
      setDefaultModel: vi.fn(),
      getDefaultModel: vi.fn(),
    }

    // Mock registry
    vi.mocked(AutomationRegistry.getInstance).mockReturnValue({
      getById: vi.fn().mockReturnValue(mockAutomation),
    } as any)

    // Mock services
    vi.mocked(SeedsService.getById).mockResolvedValue(mockSeed as any)
    vi.mocked(SettingsService.getByUserId).mockResolvedValue(mockSettings as any)

    // Mock OpenRouter client creation
    const { createOpenRouterClient } = await import('../openrouter/client')
    vi.mocked(createOpenRouterClient).mockReturnValue(mockBaseClient as any)

    // Mock TrackedOpenRouterClient
    vi.mocked(TrackedOpenRouterClient).mockImplementation(() => mockTrackedClient as any)
  })

  afterEach(() => {
    // Restore logs
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  })

  it('should wrap OpenRouter client with tracking', async () => {
    await processAutomationJob(mockJob)

    expect(TrackedOpenRouterClient).toHaveBeenCalledWith(
      mockBaseClient,
      expect.objectContaining({
        userId: mockJob.data.userId,
        automationId: mockJob.data.automationId,
        automationName: 'tag',
      })
    )
  })

  it('should pass tracking context to automation', async () => {
    await processAutomationJob(mockJob)

    expect(mockAutomation.process).toHaveBeenCalledWith(
      mockSeed,
      expect.objectContaining({
        openrouter: mockTrackedClient,
        userId: mockJob.data.userId,
        automationId: mockJob.data.automationId,
        automationName: 'tag',
      })
    )
  })

  it('should skip automation if API key is missing', async () => {
    vi.mocked(SettingsService.getByUserId).mockResolvedValue({
      openrouter_api_key: null,
      openrouter_model: null,
    } as any)

    await processAutomationJob(mockJob)

    expect(TrackedOpenRouterClient).not.toHaveBeenCalled()
    expect(mockAutomation.process).not.toHaveBeenCalled()
  })

  it('should skip automation if disabled', async () => {
    mockAutomation.enabled = false

    await processAutomationJob(mockJob)

    expect(TrackedOpenRouterClient).not.toHaveBeenCalled()
    expect(mockAutomation.process).not.toHaveBeenCalled()
  })

  it('should handle invalid seed gracefully', async () => {
    vi.mocked(SeedsService.getById).mockResolvedValue(null)

    await expect(processAutomationJob(mockJob)).rejects.toThrow('Seed')
  })

  it('should track multiple jobs separately', async () => {
    const job2 = {
      ...mockJob,
      id: 'job-2',
      data: {
        ...mockJob.data,
        automationId: uuidv4(),
      },
    } as any

    const automation2 = {
      ...mockAutomation,
      id: job2.data.automationId,
      name: 'categorize',
    }

    vi.mocked(AutomationRegistry.getInstance).mockReturnValue({
      getById: vi.fn((id: string) => {
        if (id === mockJob.data.automationId) return mockAutomation
        if (id === job2.data.automationId) return automation2
        return null
      }),
    } as any)

    await processAutomationJob(mockJob)
    await processAutomationJob(job2)

    expect(TrackedOpenRouterClient).toHaveBeenCalledTimes(2)
  })
})

