// Idea musing scheduler unit tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IdeaMusingScheduler, getIdeaMusingScheduler } from './idea-musing-scheduler'
import { IdeaMusingsService } from '../idea-musings'
import { SeedsService } from '../seeds'
import { SettingsService } from '../settings'
import { IdeaMusingAutomation } from '../automation/idea-musing'
import { AutomationRegistry } from '../automation/registry'
import { createOpenRouterClient } from '../openrouter/client'
import * as musingSproutHandler from '../sprouts/musing-sprout'
import { SeedTransactionsService } from '../seed-transactions'
import db from '../../db/connection'
import { config } from '../../config'

// Mock dependencies
vi.mock('../../db/connection', () => ({
  default: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    count: vi.fn().mockReturnThis(),
    first: vi.fn(),
  })),
}))

vi.mock('../idea-musings', () => ({
  IdeaMusingsService: {
    getSeedsShownInLastDays: vi.fn(),
    create: vi.fn(),
    recordShown: vi.fn(),
  },
}))

vi.mock('../seeds', () => ({
  SeedsService: {
    getByUser: vi.fn(),
  },
}))

vi.mock('../settings', () => ({
  SettingsService: {
    getByUserId: vi.fn(),
  },
}))

vi.mock('../automation/idea-musing', () => ({
  IdeaMusingAutomation: vi.fn(),
}))

vi.mock('../automation/registry', () => ({
  AutomationRegistry: {
    getInstance: vi.fn(),
  },
}))

vi.mock('../openrouter/client', () => ({
  createOpenRouterClient: vi.fn(),
}))

vi.mock('../sprouts/musing-sprout', () => ({
  createMusingSprout: vi.fn(),
}))

vi.mock('../seed-transactions', () => ({
  SeedTransactionsService: {
    create: vi.fn(),
  },
}))

describe('IdeaMusingScheduler', () => {
  let scheduler: IdeaMusingScheduler
  let mockAutomation: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    mockAutomation = {
      identifyIdeaSeeds: vi.fn(),
      generateMusing: vi.fn(),
    }

    // Make mockAutomation an instance of the mocked IdeaMusingAutomation class
    // by setting its prototype to the mocked constructor's prototype
    const MockedIdeaMusingAutomation = vi.mocked(IdeaMusingAutomation)
    Object.setPrototypeOf(mockAutomation, MockedIdeaMusingAutomation.prototype)
    // Set constructor so instanceof check passes
    mockAutomation.constructor = MockedIdeaMusingAutomation

    const mockRegistry = {
      getByName: vi.fn().mockReturnValue(mockAutomation),
    }

    vi.mocked(AutomationRegistry.getInstance).mockReturnValue(mockRegistry as any)

    scheduler = new IdeaMusingScheduler()
  })

  afterEach(() => {
    vi.useRealTimers()
    if (scheduler.isActive()) {
      scheduler.stop()
    }
  })

  describe('start', () => {
    it('should start the scheduler', () => {
      scheduler.start()

      expect(scheduler.isActive()).toBe(true)
    })

    it('should not start if already running', () => {
      scheduler.start()
      const initialIntervalId = (scheduler as any).intervalId

      scheduler.start()

      expect(scheduler.isActive()).toBe(true)
      expect((scheduler as any).intervalId).toBe(initialIntervalId)
    })

    it('should get automation from registry', () => {
      scheduler.start()

      expect(AutomationRegistry.getInstance).toHaveBeenCalled()
      expect(vi.mocked(AutomationRegistry.getInstance).mock.results[0].value.getByName).toHaveBeenCalledWith('idea-musing')
    })

    it('should not start if automation not found', () => {
      const mockRegistry = {
        getByName: vi.fn().mockReturnValue(null),
      }

      vi.mocked(AutomationRegistry.getInstance).mockReturnValue(mockRegistry as any)

      scheduler.start()

      expect(scheduler.isActive()).toBe(false)
    })

    it('should check immediately on start', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 5 }), // Already ran today, so generateDailyMusings won't run
      } as any)

      // Set time to scheduled time
      const [scheduleHour, scheduleMinute] = config.ideaMusing.scheduleTime.split(':').map(Number)
      const scheduledDate = new Date()
      scheduledDate.setUTCHours(scheduleHour, scheduleMinute, 0, 0)
      vi.setSystemTime(scheduledDate)

      scheduler.start()
      // Wait for the immediate checkAndRun call and shouldRunToday promise
      await vi.runOnlyPendingTimersAsync()
      await vi.runOnlyPendingTimersAsync() // Wait for the async shouldRunToday
      
      // Stop scheduler to prevent interval from continuing
      const stopPromise = scheduler.stop()
      // Advance timers to allow stop()'s checkProcessing interval to fire
      vi.advanceTimersByTime(200)
      await vi.runOnlyPendingTimersAsync()
      await stopPromise

      expect(db).toHaveBeenCalled()
    })

    it('should set up interval to check every hour', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 5 }), // Already ran today, so generateDailyMusings won't run
      }
      vi.mocked(db).mockReturnValue(mockQueryBuilder as any)

      // Set initial time to scheduled time
      const [scheduleHour, scheduleMinute] = config.ideaMusing.scheduleTime.split(':').map(Number)
      const scheduledDate = new Date()
      scheduledDate.setUTCHours(scheduleHour, scheduleMinute, 0, 0)
      vi.setSystemTime(scheduledDate)

      scheduler.start()
      
      // Wait for initial checkAndRun
      await vi.runOnlyPendingTimersAsync()
      await vi.runOnlyPendingTimersAsync()

      // Advance time by 1 hour and set to scheduled time again to trigger interval
      vi.advanceTimersByTime(60 * 60 * 1000)
      const nextScheduledDate = new Date(scheduledDate.getTime() + 60 * 60 * 1000)
      nextScheduledDate.setUTCHours(scheduleHour, scheduleMinute, 0, 0)
      vi.setSystemTime(nextScheduledDate)
      await vi.runOnlyPendingTimersAsync()
      await vi.runOnlyPendingTimersAsync()
      
      // Stop scheduler to prevent further intervals
      const stopPromise = scheduler.stop()
      vi.advanceTimersByTime(200)
      await vi.runOnlyPendingTimersAsync()
      await stopPromise

      // Should have checked multiple times (db is called in shouldRunToday)
      expect(db).toHaveBeenCalled()
      // Also verify the query builder methods were called
      expect(mockQueryBuilder.where).toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('should stop the scheduler', async () => {
      scheduler.start()
      expect(scheduler.isActive()).toBe(true)

      const stopPromise = scheduler.stop()
      await vi.runAllTimersAsync()
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })

    it('should resolve immediately if not running', async () => {
      const stopPromise = scheduler.stop()
      await vi.runAllTimersAsync()
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })

    it('should clear interval when stopping', async () => {
      scheduler.start()
      expect((scheduler as any).intervalId).not.toBeNull()

      const stopPromise = scheduler.stop()
      await vi.runOnlyPendingTimersAsync() // Wait for the checkProcessing interval
      await stopPromise

      expect((scheduler as any).intervalId).toBeNull()
    })

    it('should wait for in-progress processing to complete', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve([]), 200))
        ),
      } as any)

      scheduler.start()
      await vi.advanceTimersByTimeAsync(10)

      const stopPromise = scheduler.stop()
      await vi.advanceTimersByTimeAsync(200)
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })

    it('should timeout after 5 seconds if processing takes too long', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve([]), 10000))
        ),
      } as any)

      scheduler.start()
      await vi.advanceTimersByTimeAsync(10)

      const stopPromise = scheduler.stop()
      await vi.advanceTimersByTimeAsync(5000)
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })
  })

  describe('checkAndRun', () => {
    it('should run when time matches schedule', async () => {
      const [scheduleHour, scheduleMinute] = config.ideaMusing.scheduleTime.split(':').map(Number)
      const scheduledDate = new Date()
      scheduledDate.setUTCHours(scheduleHour, scheduleMinute, 0, 0)
      vi.setSystemTime(scheduledDate)

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 5 }), // Already ran today, so generateDailyMusings won't run
        select: vi.fn().mockResolvedValue([]),
      } as any)

      scheduler.start()
      await vi.runOnlyPendingTimersAsync() // Wait for initial checkAndRun
      await vi.runOnlyPendingTimersAsync() // Wait for shouldRunToday
      const stopPromise = scheduler.stop() // Stop to prevent interval from continuing
      vi.advanceTimersByTime(200)
      await vi.runOnlyPendingTimersAsync()
      await stopPromise

      expect(db).toHaveBeenCalled()
    })

    it('should not run if already processing', async () => {
      ;(scheduler as any).isProcessing = true

      scheduler.start()
      await vi.runOnlyPendingTimersAsync() // Wait for initial checkAndRun
      const stopPromise = scheduler.stop() // Stop to prevent interval from continuing
      vi.advanceTimersByTime(200)
      await vi.runOnlyPendingTimersAsync()
      await stopPromise

      // Should not trigger generation
      expect(IdeaMusingsService.create).not.toHaveBeenCalled()
    })

    it('should not run if already ran today', async () => {
      const [scheduleHour, scheduleMinute] = config.ideaMusing.scheduleTime.split(':').map(Number)
      const scheduledDate = new Date()
      scheduledDate.setUTCHours(scheduleHour, scheduleMinute, 0, 0)
      vi.setSystemTime(scheduledDate)

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 5 }), // Already ran today
        select: vi.fn().mockResolvedValue([]),
      } as any)

      scheduler.start()
      await vi.runOnlyPendingTimersAsync() // Wait for initial checkAndRun
      await vi.runOnlyPendingTimersAsync() // Wait for shouldRunToday
      const stopPromise = scheduler.stop() // Stop to prevent interval from continuing
      vi.advanceTimersByTime(200)
      await vi.runOnlyPendingTimersAsync()
      await stopPromise

      expect(IdeaMusingsService.create).not.toHaveBeenCalled()
    })
  })

  describe('shouldRunToday', () => {
    it('should return true if no musings created today', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 0 }),
      } as any)

      const result = await (scheduler as any).shouldRunToday()

      expect(result).toBe(true)
    })

    it('should return false if musings already created today', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 3 }),
      } as any)

      const result = await (scheduler as any).shouldRunToday()

      expect(result).toBe(false)
    })
  })

  describe('generateDailyMusings', () => {
    it('should generate musings for all users', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
      ]

      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-1',
          created_at: new Date(),
          currentState: {
            seed: 'Test seed',
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        },
      ]

      const mockSettings = {
        openrouter_api_key: 'test-key',
        openrouter_model: 'test-model',
      }

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(IdeaMusingsService.getSeedsShownInLastDays).mockResolvedValue(new Set())
      vi.mocked(SettingsService.getByUserId).mockResolvedValue(mockSettings as any)
      vi.mocked(SeedsService.getByUser).mockResolvedValue(mockSeeds as any)
      vi.mocked(createOpenRouterClient).mockReturnValue({} as any)
      vi.mocked(mockAutomation.identifyIdeaSeeds).mockResolvedValue(mockSeeds)
      vi.mocked(mockAutomation.generateMusing).mockResolvedValue({
        templateType: 'numbered',
        content: 'Test musing',
      })
      vi.mocked(musingSproutHandler.createMusingSprout).mockResolvedValue({
        id: 'sprout-123',
        seed_id: 'seed-1',
        sprout_type: 'musing',
        sprout_data: {
          template_type: 'numbered_ideas',
          content: { ideas: ['Test musing'] },
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
        created_at: new Date(),
        automation_id: 'automation-123',
      } as any)
      vi.mocked(SeedTransactionsService.create).mockResolvedValue(undefined as any)
      vi.mocked(IdeaMusingsService.recordShown).mockResolvedValue(undefined)

      // Ensure automation is set (normally done by start())
      ;(scheduler as any).automation = { ...mockAutomation, id: 'automation-123' }

      await scheduler.generateDailyMusings()

      expect(musingSproutHandler.createMusingSprout).toHaveBeenCalled()
      expect(SeedTransactionsService.create).toHaveBeenCalled()
      expect(IdeaMusingsService.recordShown).toHaveBeenCalled()
    })

    it('should skip users without OpenRouter API key', async () => {
      const mockUsers = [
        { id: 'user-1' },
      ]

      const mockSettings = {
        openrouter_api_key: null,
      }

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(SettingsService.getByUserId).mockResolvedValue(mockSettings as any)

      await scheduler.generateDailyMusings()

      expect(SeedsService.getByUser).not.toHaveBeenCalled()
    })

    it('should skip users with no seeds', async () => {
      const mockUsers = [
        { id: 'user-1' },
      ]

      const mockSettings = {
        openrouter_api_key: 'test-key',
      }

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(IdeaMusingsService.getSeedsShownInLastDays).mockResolvedValue(new Set())
      vi.mocked(SettingsService.getByUserId).mockResolvedValue(mockSettings as any)
      vi.mocked(SeedsService.getByUser).mockResolvedValue([])

      await scheduler.generateDailyMusings()

      expect(mockAutomation.identifyIdeaSeeds).not.toHaveBeenCalled()
    })

    it('should filter out excluded seeds', async () => {
      const mockUsers = [
        { id: 'user-1' },
      ]

      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-1',
          created_at: new Date(),
          currentState: {
            seed: 'Test seed',
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-1',
          created_at: new Date(),
          currentState: {
            seed: 'Excluded seed',
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        },
      ]

      const mockSettings = {
        openrouter_api_key: 'test-key',
      }

      const excludedSeedIds = new Set(['seed-2'])

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(IdeaMusingsService.getSeedsShownInLastDays).mockResolvedValue(excludedSeedIds)
      vi.mocked(SettingsService.getByUserId).mockResolvedValue(mockSettings as any)
      vi.mocked(SeedsService.getByUser).mockResolvedValue(mockSeeds as any)
      vi.mocked(createOpenRouterClient).mockReturnValue({} as any)
      vi.mocked(mockAutomation.identifyIdeaSeeds).mockResolvedValue([mockSeeds[0]])

      // Ensure automation is set (normally done by start())
      ;(scheduler as any).automation = mockAutomation

      await scheduler.generateDailyMusings()

      expect(mockAutomation.identifyIdeaSeeds).toHaveBeenCalledWith(
        [mockSeeds[0]], // Only seed-1, seed-2 is excluded
        expect.any(Object)
      )
    })

    it('should limit to max musings per day', async () => {
      const mockUsers = [
        { id: 'user-1' },
      ]

      const mockSeeds = Array.from({ length: 20 }, (_, i) => ({
        id: `seed-${i}`,
        user_id: 'user-1',
        created_at: new Date(),
        currentState: {
          seed: `Seed ${i}`,
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }))

      const mockSettings = {
        openrouter_api_key: 'test-key',
      }

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(IdeaMusingsService.getSeedsShownInLastDays).mockResolvedValue(new Set())
      vi.mocked(SettingsService.getByUserId).mockResolvedValue(mockSettings as any)
      vi.mocked(SeedsService.getByUser).mockResolvedValue(mockSeeds as any)
      vi.mocked(createOpenRouterClient).mockReturnValue({} as any)
      vi.mocked(mockAutomation.identifyIdeaSeeds).mockResolvedValue(mockSeeds)
      vi.mocked(mockAutomation.generateMusing).mockResolvedValue({
        templateType: 'numbered',
        content: 'Test musing',
      })
      vi.mocked(musingSproutHandler.createMusingSprout).mockResolvedValue({
        id: 'sprout-123',
        seed_id: 'seed-1',
        sprout_type: 'musing',
        sprout_data: {
          template_type: 'numbered_ideas',
          content: { ideas: ['Test musing'] },
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
        created_at: new Date(),
        automation_id: 'automation-123',
      } as any)
      vi.mocked(SeedTransactionsService.create).mockResolvedValue(undefined as any)
      vi.mocked(IdeaMusingsService.recordShown).mockResolvedValue(undefined)

      // Ensure automation is set (normally done by start())
      ;(scheduler as any).automation = { ...mockAutomation, id: 'automation-123' }

      await scheduler.generateDailyMusings()

      // Should only process maxMusingsPerDay seeds
      expect(musingSproutHandler.createMusingSprout).toHaveBeenCalledTimes(config.ideaMusing.maxMusingsPerDay)
    })

    it('should skip if already processing', async () => {
      ;(scheduler as any).isProcessing = true

      await scheduler.generateDailyMusings()

      expect(db).not.toHaveBeenCalled()
    })

    it('should skip if automation not available', async () => {
      ;(scheduler as any).automation = null

      await scheduler.generateDailyMusings()

      expect(db).not.toHaveBeenCalled()
    })

    it('should handle errors for individual users gracefully', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
      ]

      // Set automation manually since we're calling generateDailyMusings directly
      ;(scheduler as any).automation = mockAutomation

      // Mock db to return a query builder that supports chaining
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(IdeaMusingsService.getSeedsShownInLastDays).mockResolvedValue(new Set())
      vi.mocked(SettingsService.getByUserId)
        .mockRejectedValueOnce(new Error('User 1 error'))
        .mockResolvedValueOnce({
          openrouter_api_key: 'test-key',
        } as any)

      vi.mocked(SeedsService.getByUser).mockResolvedValue([])

      await scheduler.generateDailyMusings()

      // Should still process user-2 even if user-1 fails
      expect(SettingsService.getByUserId).toHaveBeenCalledTimes(2)
    })

    it('should handle errors for individual seeds gracefully', async () => {
      const mockUsers = [
        { id: 'user-1' },
      ]

      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-1',
          created_at: new Date(),
          currentState: {
            seed: 'Test seed',
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-1',
          created_at: new Date(),
          currentState: {
            seed: 'Test seed 2',
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        },
      ]

      const mockSettings = {
        openrouter_api_key: 'test-key',
      }

      // Set automation manually since we're calling generateDailyMusings directly
      ;(scheduler as any).automation = mockAutomation

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(IdeaMusingsService.getSeedsShownInLastDays).mockResolvedValue(new Set())
      vi.mocked(SettingsService.getByUserId).mockResolvedValue(mockSettings as any)
      vi.mocked(SeedsService.getByUser).mockResolvedValue(mockSeeds as any)
      vi.mocked(createOpenRouterClient).mockReturnValue({} as any)
      vi.mocked(mockAutomation.identifyIdeaSeeds).mockResolvedValue(mockSeeds)
      vi.mocked(mockAutomation.generateMusing)
        .mockRejectedValueOnce(new Error('Seed 1 error'))
        .mockResolvedValueOnce({
          templateType: 'numbered',
          content: 'Test musing',
        })
      vi.mocked(musingSproutHandler.createMusingSprout).mockResolvedValue({
        id: 'sprout-123',
        seed_id: 'seed-2',
        sprout_type: 'musing',
        sprout_data: {
          template_type: 'numbered_ideas',
          content: { ideas: ['Test musing'] },
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
        created_at: new Date(),
        automation_id: 'automation-123',
      } as any)
      vi.mocked(SeedTransactionsService.create).mockResolvedValue(undefined as any)
      vi.mocked(IdeaMusingsService.recordShown).mockResolvedValue(undefined)

      // Set automation manually since we're calling generateDailyMusings directly
      ;(scheduler as any).automation = { ...mockAutomation, id: 'automation-123' }

      await scheduler.generateDailyMusings()

      // Should still process seed-2 even if seed-1 fails
      expect(musingSproutHandler.createMusingSprout).toHaveBeenCalledTimes(1)
    })
  })

  describe('isActive', () => {
    it('should return false when not started', () => {
      expect(scheduler.isActive()).toBe(false)
    })

    it('should return true when started', () => {
      scheduler.start()
      expect(scheduler.isActive()).toBe(true)
    })

    it('should return false when stopped', async () => {
      scheduler.start()
      const stopPromise = scheduler.stop()
      await vi.runAllTimersAsync()
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })
  })

  describe('getIdeaMusingScheduler', () => {
    it('should return singleton instance', () => {
      const instance1 = getIdeaMusingScheduler()
      const instance2 = getIdeaMusingScheduler()

      expect(instance1).toBe(instance2)
    })
  })
})

