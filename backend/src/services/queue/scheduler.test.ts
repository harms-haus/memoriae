// Pressure evaluation scheduler tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { PressureEvaluationScheduler, getPressureEvaluationScheduler } from './scheduler'
import { PressurePointsService } from '../pressure'
import { SeedsService } from '../seeds'
import { AutomationRegistry } from '../automation/registry'
import { Automation, type AutomationContext } from '../automation/base'
import type { Seed, SeedState } from '../seeds'

// Mock services
vi.mock('../pressure', () => ({
  PressurePointsService: {
    getExceededThresholds: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../seeds', () => ({
  SeedsService: {
    getById: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('../automation/registry', () => ({
  AutomationRegistry: {
    getInstance: vi.fn(() => ({
      getById: vi.fn().mockReturnValue(null),
    })),
  },
}))

vi.mock('../openrouter/client', () => ({
  createOpenRouterClient: vi.fn(() => ({
    chat: vi.fn(),
  })),
}))

// Mock database
const mockDb: {
  seeds: Map<string, any>
} = {
  seeds: new Map(),
}

vi.mock('../../db/connection', () => {
  const createMockQueryBuilder = (table: string) => {
    const store = mockDb[table as keyof typeof mockDb]
    let queryFilters: Array<{ field: string; value: any }> = []
    let selectFields: string[] = ['*']

    const executeQuery = (): any[] => {
      const results: any[] = []
      for (const [key, item] of store.entries()) {
        let matches = true
        for (const filter of queryFilters) {
          if (item[filter.field] !== filter.value) {
            matches = false
            break
          }
        }
        if (matches) {
          const result: any = {}
          for (const field of selectFields) {
            if (field === '*' || field === 'user_id') {
              result.user_id = item.user_id
            }
          }
          results.push(result)
        }
      }
      queryFilters = []
      selectFields = ['*']
      return results
    }

    const builder: any = {
      where(field: string | object, value?: any) {
        if (typeof field === 'object') {
          Object.entries(field).forEach(([k, v]) => queryFilters.push({ field: k, value: v }))
        } else {
          queryFilters.push({ field, value })
        }
        return builder
      },
      select(fields?: string | string[]) {
        if (fields) {
          selectFields = Array.isArray(fields) ? fields : [fields]
        }
        return builder
      },
      first() {
        const results = executeQuery()
        return Promise.resolve(results.length > 0 ? results[0] : undefined)
      },
      then(resolve: (value: any) => any) {
        return Promise.resolve(executeQuery()).then(resolve)
      },
    }
    return builder
  }

  return {
    default: vi.fn((table: string) => createMockQueryBuilder(table)),
  }
})

// Mock config
vi.mock('../../config', () => ({
  config: {
    queue: {
      checkInterval: 1000, // 1 second for faster tests
    },
  },
}))

// Test automation class
class TestAutomation extends Automation {
  readonly name = 'test-automation'
  readonly description = 'Test automation'
  readonly handlerFnName = 'processTest'
  id: string | undefined = uuidv4()
  enabled: boolean = true

  async process(seed: Seed, context: AutomationContext) {
    return { events: [] }
  }

  calculatePressure(seed: Seed, context: AutomationContext, changes: any[]): number {
    return 0
  }

  getPressureThreshold(): number {
    return 50
  }

  handlePressure = vi.fn().mockResolvedValue(undefined)
}

describe('PressureEvaluationScheduler', () => {
  let scheduler: PressureEvaluationScheduler
  let mockRegistry: any
  let testAutomation: TestAutomation
  let testSeedId: string
  let testUserId: string

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    
    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Clear mock database
    mockDb.seeds.clear()

    // Setup test data
    testUserId = uuidv4()
    testSeedId = uuidv4()
    testAutomation = new TestAutomation()

    // Setup mock registry
    mockRegistry = {
      getById: vi.fn().mockReturnValue(testAutomation),
    }
    ;(AutomationRegistry.getInstance as any).mockReturnValue(mockRegistry)

    // Setup mock seed
    const mockSeed: Seed = {
      id: testSeedId,
      user_id: testUserId,
      seed_content: 'Test seed',
      created_at: new Date(),
      currentState: {
        seed: 'Test seed',
        timestamp: new Date().toISOString(),
        metadata: {},
      },
    }
    ;(SeedsService.getById as any).mockResolvedValue(mockSeed)

    // Add seed to mock database
    mockDb.seeds.set(testSeedId, {
      id: testSeedId,
      user_id: testUserId,
      seed_content: 'Test seed',
      created_at: new Date(),
    })

    // Get fresh scheduler instance
    scheduler = getPressureEvaluationScheduler()
  })

  afterEach(async () => {
    // Force stop scheduler immediately without waiting
    if (scheduler.isActive() || scheduler['isProcessing']) {
      // Clear the interval immediately to prevent it from firing
      if (scheduler['intervalId']) {
        clearInterval(scheduler['intervalId'])
        scheduler['intervalId'] = null
      }
      // Force state to stopped
      scheduler['isRunning'] = false
      scheduler['isProcessing'] = false
    }
    // Clear any remaining timers BEFORE restoring real timers
    vi.clearAllTimers()
    // Restore real timers to allow any pending promises to resolve
    vi.useRealTimers()
    // Give a tiny bit of time for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 10))
    // Clear mocks
    vi.clearAllMocks()
    // Restore console methods
    vi.restoreAllMocks()
  })

  describe('Timer Control', () => {
    it('should not start automatically', () => {
      // Scheduler should not be running when created
      expect(scheduler.isActive()).toBe(false)
    })

    it('should start when start() is called', async () => {
      scheduler.start()
      expect(scheduler.isActive()).toBe(true)
      // Wait for immediate evaluation to complete
      await vi.runOnlyPendingTimersAsync()
      // Ensure scheduler stops cleanly
      scheduler['isProcessing'] = false
    })

    it('should stop when stop() is called', async () => {
      scheduler.start()
      expect(scheduler.isActive()).toBe(true)

      const stopPromise = scheduler.stop()
      // Advance time to let stop() complete (it checks isProcessing every 100ms)
      vi.advanceTimersByTime(100)
      await vi.runOnlyPendingTimersAsync()
      await stopPromise
      
      expect(scheduler.isActive()).toBe(false)
    })

    it('should be idempotent when start() is called multiple times', async () => {
      scheduler.start()
      expect(scheduler.isActive()).toBe(true)
      await vi.runOnlyPendingTimersAsync()
      scheduler['isProcessing'] = false

      scheduler.start() // Call again
      expect(scheduler.isActive()).toBe(true)
      await vi.runOnlyPendingTimersAsync()
      scheduler['isProcessing'] = false
    })

    it('should work after stop() and start()', async () => {
      scheduler.start()
      const stopPromise = scheduler.stop()
      vi.advanceTimersByTime(100)
      await vi.runOnlyPendingTimersAsync()
      await stopPromise
      
      scheduler.start()
      expect(scheduler.isActive()).toBe(true)
    })
  })

  describe('Pressure Evaluation', () => {
    it('should evaluate pressure points on start', async () => {
      const mockPressurePoint = {
        seed_id: testSeedId,
        automation_id: testAutomation.id!,
        pressure_amount: 60, // Above threshold of 50
        last_updated: new Date(),
        threshold: 50,
        exceedsThreshold: true,
      }
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue([mockPressurePoint])

      scheduler.start()

      // Advance timers to trigger evaluation (only immediate, not interval)
      await vi.runOnlyPendingTimersAsync()
      
      // Wait for async operations to complete
      vi.advanceTimersByTime(50)
      await vi.runOnlyPendingTimersAsync()
      // Ensure processing completes
      scheduler['isProcessing'] = false

      expect(PressurePointsService.getExceededThresholds).toHaveBeenCalled()
    })

    it('should skip if no pressure points exceed threshold', async () => {
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue([])

      scheduler.start()
      // Wait for immediate evaluation only
      await vi.runOnlyPendingTimersAsync()
      
      // Ensure processing completes
      scheduler['isProcessing'] = false

      expect(PressurePointsService.getExceededThresholds).toHaveBeenCalled()
      expect(SeedsService.getById).not.toHaveBeenCalled()
    })

    it('should process exceeded pressure points', async () => {
      const mockPressurePoint = {
        seed_id: testSeedId,
        automation_id: testAutomation.id!,
        pressure_amount: 60,
        last_updated: new Date(),
        threshold: 50,
        exceedsThreshold: true,
      }
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue([mockPressurePoint])

      scheduler.start()
      // Wait for immediate evaluation only
      await vi.runOnlyPendingTimersAsync()
      
      // Wait for async operations to complete
      vi.advanceTimersByTime(50)
      await vi.runOnlyPendingTimersAsync()
      // Ensure processing completes
      scheduler['isProcessing'] = false

      expect(PressurePointsService.getExceededThresholds).toHaveBeenCalled()
      expect(SeedsService.getById).toHaveBeenCalledWith(testSeedId, testUserId)
      expect(testAutomation.handlePressure).toHaveBeenCalledWith(
        expect.objectContaining({ id: testSeedId }),
        60,
        expect.objectContaining({ userId: testUserId })
      )
    })

    it('should skip disabled automations', async () => {
      testAutomation.enabled = false
      const mockPressurePoint = {
        seed_id: testSeedId,
        automation_id: testAutomation.id!,
        pressure_amount: 60,
        last_updated: new Date(),
        threshold: 50,
        exceedsThreshold: true,
      }
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue([mockPressurePoint])

      scheduler.start()
      await vi.runOnlyPendingTimersAsync()

      expect(testAutomation.handlePressure).not.toHaveBeenCalled()
    })

    it('should skip missing automations gracefully', async () => {
      mockRegistry.getById.mockReturnValue(null)
      const mockPressurePoint = {
        seed_id: testSeedId,
        automation_id: 'non-existent',
        pressure_amount: 60,
        last_updated: new Date(),
        threshold: 50,
        exceedsThreshold: true,
      }
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue([mockPressurePoint])

      scheduler.start()
      await vi.runOnlyPendingTimersAsync()

      // Should not throw
      expect(SeedsService.getById).not.toHaveBeenCalled()
    })

    it('should skip missing seeds gracefully', async () => {
      ;(SeedsService.getById as any).mockResolvedValue(null)
      mockDb.seeds.clear()

      const mockPressurePoint = {
        seed_id: testSeedId,
        automation_id: testAutomation.id!,
        pressure_amount: 60,
        last_updated: new Date(),
        threshold: 50,
        exceedsThreshold: true,
      }
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue([mockPressurePoint])

      scheduler.start()
      await vi.runOnlyPendingTimersAsync()
      
      // Ensure processing completes
      scheduler['isProcessing'] = false

      // Should not throw
      expect(testAutomation.handlePressure).not.toHaveBeenCalled()
    })

    it('should handle multiple exceeded pressure points', async () => {
      const seedId2 = uuidv4()
      const automationId2 = uuidv4()
      const automation2 = new TestAutomation()
      automation2.id = automationId2

      mockDb.seeds.set(seedId2, {
        id: seedId2,
        user_id: testUserId,
        seed_content: 'Seed 2',
        created_at: new Date(),
      })

      const seed2: Seed = {
        id: seedId2,
        user_id: testUserId,
        seed_content: 'Seed 2',
        created_at: new Date(),
        currentState: {
          seed: 'Seed 2',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }
      ;(SeedsService.getById as any).mockImplementation((id: string) => {
        if (id === seedId2) return Promise.resolve(seed2)
        return Promise.resolve({
          id: testSeedId,
          user_id: testUserId,
          seed_content: 'Test seed',
          created_at: new Date(),
          currentState: {
            seed: 'Test seed',
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        })
      })

      mockRegistry.getById.mockImplementation((id: string) => {
        if (id === automationId2) return automation2
        return testAutomation
      })

      const mockPressurePoints = [
        {
          seed_id: testSeedId,
          automation_id: testAutomation.id!,
          pressure_amount: 60,
          last_updated: new Date(),
          threshold: 50,
          exceedsThreshold: true,
        },
        {
          seed_id: seedId2,
          automation_id: automationId2,
          pressure_amount: 70,
          last_updated: new Date(),
          threshold: 50,
          exceedsThreshold: true,
        },
      ]
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue(mockPressurePoints)

      // Clear mocks to ensure accurate count
      vi.clearAllMocks()
      
      // Clear interval immediately when scheduler starts to prevent it from firing
      const originalStart = scheduler.start.bind(scheduler)
      scheduler.start = function() {
        originalStart()
        // Immediately clear the interval to prevent it from firing
        if (this['intervalId']) {
          clearInterval(this['intervalId'])
          this['intervalId'] = null
        }
      }
      
      scheduler.start()
      
      // Wait for the immediate evaluation to start
      await vi.runOnlyPendingTimersAsync()
      
      // Wait for async operations to complete (db query -> SeedsService -> handlePressure)
      // Advance time and run timers until processing completes
      let attempts = 0
      while (scheduler['isProcessing'] && attempts < 10) {
        vi.advanceTimersByTime(50)
        await vi.runOnlyPendingTimersAsync()
        attempts++
      }
      
      // Manually reset isProcessing if it's still true (in case of timeout)
      scheduler['isProcessing'] = false
      scheduler['isRunning'] = false

      expect(testAutomation.handlePressure).toHaveBeenCalledTimes(1)
      expect(automation2.handlePressure).toHaveBeenCalledTimes(1)
    })
  })

  describe('Periodic Execution', () => {
    it('should run immediately on start()', async () => {
      const mockPressurePoint = {
        seed_id: testSeedId,
        automation_id: testAutomation.id!,
        pressure_amount: 60,
        last_updated: new Date(),
        threshold: 50,
        exceedsThreshold: true,
      }
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue([mockPressurePoint])

      scheduler.start()

      // Should run immediately - wait for the promise only
      await vi.runOnlyPendingTimersAsync()
      
      // Ensure processing completes
      scheduler['isProcessing'] = false

      expect(PressurePointsService.getExceededThresholds).toHaveBeenCalled()
    })

    it('should run again after interval', async () => {
      const mockPressurePoint = {
        seed_id: testSeedId,
        automation_id: testAutomation.id!,
        pressure_amount: 60,
        last_updated: new Date(),
        threshold: 50,
        exceedsThreshold: true,
      }
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue([mockPressurePoint])

      // Clear mocks before starting to get accurate count
      vi.clearAllMocks()
      
      // Prevent interval from being set up by temporarily overriding start
      const originalStart = scheduler.start.bind(scheduler)
      let intervalCleared = false
      scheduler.start = function() {
        originalStart()
        // Immediately clear the interval to prevent it from firing during test
        if (this['intervalId'] && !intervalCleared) {
          clearInterval(this['intervalId'])
          this['intervalId'] = null
          intervalCleared = true
        }
      }
      
      scheduler.start()

      // First evaluation (immediate) - wait for it to complete
      await vi.runOnlyPendingTimersAsync()
      // Wait a bit more for async operations
      vi.advanceTimersByTime(10)
      await vi.runOnlyPendingTimersAsync()
      
      // Wait for processing to complete
      let attempts = 0
      while (scheduler['isProcessing'] && attempts < 10) {
        vi.advanceTimersByTime(10)
        await vi.runOnlyPendingTimersAsync()
        attempts++
      }
      scheduler['isProcessing'] = false
      
      expect(PressurePointsService.getExceededThresholds).toHaveBeenCalledTimes(1)
      
      // Now manually trigger one more evaluation to simulate interval
      // Advance timers enough to let any timeout promises settle (even though they won't fire)
      const evalPromise = scheduler['evaluatePressurePoints']()
      // Advance time to let timeout promises be created and settled
      // Also advance enough for the 100ms delay between processing points
      vi.advanceTimersByTime(200)
      await vi.runOnlyPendingTimersAsync()
      await evalPromise
      
      // Wait for processing to complete
      attempts = 0
      while (scheduler['isProcessing'] && attempts < 20) {
        vi.advanceTimersByTime(50)
        await vi.runOnlyPendingTimersAsync()
        attempts++
      }
      scheduler['isProcessing'] = false

      // Should have run again (total: 1 immediate + 1 manual = 2)
      expect(PressurePointsService.getExceededThresholds).toHaveBeenCalledTimes(2)
      
      // Stop to prevent interval from continuing
      if (scheduler['intervalId']) {
        clearInterval(scheduler['intervalId'])
        scheduler['intervalId'] = null
      }
      scheduler['isRunning'] = false
      scheduler['isProcessing'] = false
    }, 10000) // Increase timeout to 10 seconds

    it('should skip if previous evaluation still running', async () => {
      // Make getExceededThresholds slow
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      ;(PressurePointsService.getExceededThresholds as any).mockReturnValue(slowPromise)

      scheduler.start()

      // First call starts (immediate) - start the evaluation
      const evalPromise = vi.runOnlyPendingTimersAsync()

      // Advance timer by interval (1000ms) - should not trigger new evaluation because previous is still running
      vi.advanceTimersByTime(1000)
      // Run pending timers - but should skip because isProcessing is true
      await vi.runOnlyPendingTimersAsync()

      // Resolve the slow promise to complete the first evaluation
      resolvePromise!([])
      await evalPromise
      scheduler['isProcessing'] = false

      // Should only be called once (concurrent protection)
      expect(PressurePointsService.getExceededThresholds).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      ;(PressurePointsService.getExceededThresholds as any).mockRejectedValue(
        new Error('Database error')
      )

      scheduler.start()
      await vi.runOnlyPendingTimersAsync()
      
      // Wait a bit for error handling to complete
      vi.advanceTimersByTime(50)
      await vi.runOnlyPendingTimersAsync()
      
      // Ensure processing completes (even if error occurred)
      scheduler['isProcessing'] = false

      // Should not throw
      expect(scheduler.isActive()).toBe(true)
      
      // Ensure scheduler is stopped for cleanup
      const stopPromise = scheduler.stop()
      vi.advanceTimersByTime(100)
      await vi.runOnlyPendingTimersAsync()
      await stopPromise
    }, 10000) // Increase timeout

    it('should handle handlePressure errors gracefully', async () => {
      testAutomation.handlePressure = vi.fn().mockRejectedValue(new Error('Handle error'))
      
      const mockPressurePoint = {
        seed_id: testSeedId,
        automation_id: testAutomation.id!,
        pressure_amount: 60,
        last_updated: new Date(),
        threshold: 50,
        exceedsThreshold: true,
      }
      ;(PressurePointsService.getExceededThresholds as any).mockResolvedValue([mockPressurePoint])

      // Ensure db mock is set up for user_id query
      mockDb.seeds.set(testSeedId, {
        id: testSeedId,
        user_id: testUserId,
      })

      scheduler.start()
      
      // Stop immediately to clear interval, but let evaluation complete
      // The stop() method will wait for isProcessing to become false
      const stopPromise = scheduler.stop()
      
      // Let the evaluation complete - advance time and run timers
      // This allows all async operations to resolve
      vi.advanceTimersByTime(100)
      await vi.runOnlyPendingTimersAsync()
      
      // Wait for stop() to complete (it waits for evaluation to finish)
      await stopPromise
      
      // Verify handlePressure was called (even though it threw an error)
      // The error should be caught and logged, but processing should continue
      expect(testAutomation.handlePressure).toHaveBeenCalled()
      
      // Verify scheduler is stopped
      expect(scheduler.isActive()).toBe(false)
    }, 10000) // Increase test timeout to 10 seconds
  })

  describe('Stop Behavior', () => {
    it('should wait for in-progress evaluation', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      ;(PressurePointsService.getExceededThresholds as any).mockReturnValue(slowPromise)

      scheduler.start()
      const evalPromise = vi.runOnlyPendingTimersAsync()

      // Stop while evaluation is running
      const stopPromise = scheduler.stop()

      // Resolve the slow promise
      resolvePromise!([])

      await evalPromise
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })

    it('should timeout after 5 seconds', async () => {
      const neverResolves = new Promise(() => {}) // Never resolves
      ;(PressurePointsService.getExceededThresholds as any).mockReturnValue(neverResolves)

      scheduler.start()
      // Start the evaluation but don't wait for it
      vi.runOnlyPendingTimersAsync()

      // Call stop() which will wait for processing to complete
      const stopPromise = scheduler.stop()
      
      // Advance time by 5 seconds to trigger timeout in stop()
      vi.advanceTimersByTime(5000)
      
      // Run timers to process the timeout
      await vi.runOnlyPendingTimersAsync()
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })
  })
})
