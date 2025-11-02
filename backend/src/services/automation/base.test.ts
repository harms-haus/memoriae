// Tests for base automation framework
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Seed, SeedState } from '../seeds'
import type { OpenRouterClient } from '../openrouter/client'
import { Automation, type AutomationContext, type CategoryChange } from './base'

// Mock the queue service
vi.mock('../queue/queue', () => ({
  addAutomationJob: vi.fn().mockResolvedValue('job-id'),
}))

// Mock automation for testing
class TestAutomation extends Automation {
  readonly name = 'test-automation'
  readonly description = 'Test automation for unit tests'
  readonly handlerFnName = 'processTest'

  async process(seed: Seed, context: AutomationContext) {
    // Mock implementation
    return {
      events: [],
      metadata: { processed: true },
    }
  }

  calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
    // Mock: return pressure based on number of changes
    return changes.length * 10
  }
}

describe('Automation base class', () => {
  let automation: TestAutomation
  let mockSeed: Seed
  let mockContext: AutomationContext
  let mockOpenRouter: OpenRouterClient

  beforeEach(() => {
    automation = new TestAutomation()
    
    const baseState: SeedState = {
      seed: 'Test seed content',
      timestamp: new Date(),
      metadata: {},
      tags: [],
      categories: [],
    }

    mockSeed = {
      id: 'seed-123',
      user_id: 'user-123',
      seed_content: 'Test seed content',
      created_at: new Date(),
      currentState: baseState,
    }

    mockOpenRouter = {
      createChatCompletion: async () => {
        throw new Error('Mock not implemented')
      },
      generateText: async () => {
        throw new Error('Mock not implemented')
      },
      getModels: async () => [],
      setApiKey: () => {},
      setDefaultModel: () => {},
      getDefaultModel: () => undefined,
    } as unknown as OpenRouterClient

    mockContext = {
      openrouter: mockOpenRouter,
      userId: 'user-123',
    }
  })

  describe('basic properties', () => {
    it('should have required properties', () => {
      expect(automation.name).toBe('test-automation')
      expect(automation.description).toBe('Test automation for unit tests')
      expect(automation.handlerFnName).toBe('processTest')
      expect(automation.enabled).toBe(true)
    })

    it('should have default pressure threshold', () => {
      expect(automation.getPressureThreshold()).toBe(50)
    })

    it('should have default priority calculation', () => {
      expect(automation.calculatePriority(75)).toBe(75)
      expect(automation.calculatePriority(0)).toBe(1)
      expect(automation.calculatePriority(150)).toBe(100)
    })
  })

  describe('process', () => {
    it('should call process method', async () => {
      const result = await automation.process(mockSeed, mockContext)
      expect(result.events).toEqual([])
      expect(result.metadata?.processed).toBe(true)
    })

    it('should validate seed by default', async () => {
      const isValid = await automation.validateSeed(mockSeed, mockContext)
      expect(isValid).toBe(true)
    })
  })

  describe('calculatePressure', () => {
    it('should calculate pressure from category changes', () => {
      const changes: CategoryChange[] = [
        { type: 'rename', categoryId: 'cat-1', oldPath: '/old', newPath: '/new' },
        { type: 'remove', categoryId: 'cat-2' },
      ]

      const pressure = automation.calculatePressure(mockSeed, mockContext, changes)
      expect(pressure).toBe(20) // 2 changes * 10
    })

    it('should return 0 for no changes', () => {
      const pressure = automation.calculatePressure(mockSeed, mockContext, [])
      expect(pressure).toBe(0)
    })
  })

  describe('handlePressure', () => {
    it('should throw error if automation does not have an ID', async () => {
      // Automation doesn't have an ID set
      await expect(
        automation.handlePressure(mockSeed, 75, mockContext)
      ).rejects.toThrow('Automation "test-automation" does not have an ID')
    })

    it('should add job to queue when pressure exceeds threshold', async () => {
      const { addAutomationJob } = await import('../queue/queue')
      
      // Set automation ID
      automation.id = 'auto-123'
      
      // Pressure above default threshold (50)
      await automation.handlePressure(mockSeed, 75, mockContext)

      expect(addAutomationJob).toHaveBeenCalledWith({
        seedId: 'seed-123',
        automationId: 'auto-123',
        userId: 'user-123',
        priority: 75,
      })
    })

    it('should add job when called (handlePressure is only called when threshold is exceeded)', async () => {
      const { addAutomationJob } = await import('../queue/queue')
      vi.clearAllMocks()
      
      // Set automation ID
      automation.id = 'auto-123'
      
      // handlePressure is called when pressure >= threshold, so it should always add a job
      // Even if we pass a lower pressure, the method itself doesn't check threshold
      // (that check happens before handlePressure is called)
      await automation.handlePressure(mockSeed, 50, mockContext)

      expect(addAutomationJob).toHaveBeenCalledWith({
        seedId: 'seed-123',
        automationId: 'auto-123',
        userId: 'user-123',
        priority: 50,
      })
    })

    it('should use calculatePriority for job priority', async () => {
      const { addAutomationJob } = await import('../queue/queue')
      vi.clearAllMocks()
      
      // Set automation ID
      automation.id = 'auto-123'
      
      // High pressure should be capped at 100 by calculatePriority
      await automation.handlePressure(mockSeed, 150, mockContext)

      expect(addAutomationJob).toHaveBeenCalledWith({
        seedId: 'seed-123',
        automationId: 'auto-123',
        userId: 'user-123',
        priority: 100, // calculatePriority caps at 100
      })
    })
  })
})

