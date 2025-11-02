// Tests for base automation framework
import { describe, it, expect, beforeEach } from 'vitest'
import type { Seed, SeedState } from '../seeds'
import type { OpenRouterClient } from '../openrouter/client'
import { Automation, type AutomationContext, type CategoryChange } from './base'

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
    it('should throw error by default (queue not implemented)', async () => {
      await expect(
        automation.handlePressure(mockSeed, 75, mockContext)
      ).rejects.toThrow('handlePressure() not implemented')
    })
  })
})

