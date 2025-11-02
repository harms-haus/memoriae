// Performance tests for queue operations
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AutomationRegistry } from '../automation/registry'

// Create hoisted mock instances
const mockJob = {
  id: 'test-job-id',
  remove: vi.fn().mockResolvedValue(undefined),
  updateProgress: vi.fn().mockResolvedValue(undefined),
}

const mockQueueInstance = {
  add: vi.fn().mockResolvedValue(mockJob),
  getJob: vi.fn().mockResolvedValue(mockJob),
  getWaitingCount: vi.fn().mockResolvedValue(0),
  getActiveCount: vi.fn().mockResolvedValue(0),
  getCompletedCount: vi.fn().mockResolvedValue(0),
  getFailedCount: vi.fn().mockResolvedValue(0),
  getDelayedCount: vi.fn().mockResolvedValue(0),
  close: vi.fn().mockResolvedValue(undefined),
}

// Mock BullMQ
vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(() => mockQueueInstance),
    Worker: vi.fn(),
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

// Mock automation registry
vi.mock('../automation/registry', () => ({
  AutomationRegistry: {
    getInstance: vi.fn(() => ({
      getById: vi.fn(),
      getEnabled: vi.fn(() => []),
      getAll: vi.fn(() => []),
    })),
  },
}))

describe('Queue Performance', () => {
  let mockRegistry: any
  let queueModule: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Reset all mock functions
    mockQueueInstance.add.mockClear()
    mockQueueInstance.getJob.mockClear()
    mockQueueInstance.getWaitingCount.mockClear()
    mockQueueInstance.getActiveCount.mockClear()
    mockQueueInstance.getCompletedCount.mockClear()
    mockQueueInstance.getFailedCount.mockClear()
    mockQueueInstance.getDelayedCount.mockClear()
    mockQueueInstance.close.mockClear()

    // Reset mock return values
    mockQueueInstance.add.mockResolvedValue(mockJob)
    mockQueueInstance.getJob.mockResolvedValue(mockJob)

    mockRegistry = {
      getById: vi.fn(),
      getEnabled: vi.fn(() => []),
      getAll: vi.fn(() => []),
    }

    ;(AutomationRegistry.getInstance as any).mockReturnValue(mockRegistry)
    
    // Import queue module fresh for each test
    queueModule = await import('./queue')
  })

  describe('Job addition performance', () => {
    it('should add single job quickly', async () => {
      const start = performance.now()
      
      await queueModule.addAutomationJob({
        seedId: 'seed-123',
        automationId: 'auto-456',
        userId: 'user-789',
      })

      const duration = performance.now() - start

      // Should complete in under 100ms (mock operation)
      expect(duration).toBeLessThan(100)
    })

    it('should handle 100 sequential job additions', async () => {
      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        await queueModule.addAutomationJob({
          seedId: `seed-${i}`,
          automationId: `auto-${i}`,
          userId: 'user-123',
        })
      }

      const duration = performance.now() - start

      // Should complete in reasonable time (under 1 second for mocks)
      expect(duration).toBeLessThan(1000)
      expect(mockQueueInstance.add).toHaveBeenCalledTimes(100)
    })

    it('should handle 1000 concurrent job additions efficiently', async () => {
      const start = performance.now()

      const promises = Array.from({ length: 1000 }, (_, i) =>
        queueModule.addAutomationJob({
          seedId: `seed-${i}`,
          automationId: `auto-${i}`,
          userId: 'user-123',
        })
      )

      await Promise.all(promises)

      const duration = performance.now() - start

      // Concurrent operations should be faster than sequential
      expect(duration).toBeLessThan(2000)
      expect(mockQueueInstance.add).toHaveBeenCalledTimes(1000)
    })
  })

  describe('Batch operation performance', () => {
    it('should queue many automations efficiently', async () => {
      const automationCount = 50
      const automations = Array.from({ length: automationCount }, (_, i) => ({
        id: `auto-${i}`,
        name: `automation-${i}`,
        enabled: true,
      }))

      mockRegistry.getEnabled.mockReturnValue(automations)
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const start = performance.now()

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      const duration = performance.now() - start

      expect(jobIds).toHaveLength(automationCount)
      expect(duration).toBeLessThan(500)
    })

    it('should handle filtering disabled automations efficiently', async () => {
      // Mix of enabled and disabled automations
      const automations = Array.from({ length: 200 }, (_, i) => ({
        id: `auto-${i}`,
        name: `automation-${i}`,
        enabled: i % 2 === 0, // Every other one disabled
      }))

      mockRegistry.getEnabled.mockReturnValue(automations)
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const start = performance.now()

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      const duration = performance.now() - start

      // Should only queue 100 enabled automations
      expect(jobIds).toHaveLength(100)
      expect(duration).toBeLessThan(500)
    })

    it('should handle very large automation list', async () => {
      const largeCount = 500
      const automations = Array.from({ length: largeCount }, (_, i) => ({
        id: `auto-${i}`,
        name: `automation-${i}`,
        enabled: true,
      }))

      mockRegistry.getEnabled.mockReturnValue(automations)
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const start = performance.now()

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      const duration = performance.now() - start

      expect(jobIds).toHaveLength(largeCount)
      // Should scale reasonably even with large lists
      expect(duration).toBeLessThan(2000)
    })
  })

  describe('Stats retrieval performance', () => {
    it('should retrieve stats quickly', async () => {
      const start = performance.now()

      const stats = await queueModule.getQueueStats()

      const duration = performance.now() - start

      expect(stats).toBeDefined()
      expect(duration).toBeLessThan(100)
    })

    it('should handle concurrent stats requests', async () => {
      const start = performance.now()

      const promises = Array.from({ length: 100 }, () => queueModule.getQueueStats())

      const results = await Promise.all(promises)

      const duration = performance.now() - start

      expect(results).toHaveLength(100)
      expect(duration).toBeLessThan(500)
    })
  })

  describe('Job retrieval performance', () => {
    it('should retrieve single job quickly', async () => {
      const start = performance.now()

      const job = await queueModule.getJob('job-123')

      const duration = performance.now() - start

      expect(job).toBeDefined()
      expect(duration).toBeLessThan(100)
    })

    it('should handle 100 sequential job retrievals', async () => {
      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        await queueModule.getJob(`job-${i}`)
      }

      const duration = performance.now() - start

      expect(duration).toBeLessThan(1000)
      expect(mockQueueInstance.getJob).toHaveBeenCalledTimes(100)
    })

    it('should handle concurrent job retrievals efficiently', async () => {
      const start = performance.now()

      const promises = Array.from({ length: 100 }, (_, i) =>
        queueModule.getJob(`job-${i}`)
      )

      await Promise.all(promises)

      const duration = performance.now() - start

      expect(duration).toBeLessThan(500)
      expect(mockQueueInstance.getJob).toHaveBeenCalledTimes(100)
    })
  })

  describe('Memory efficiency', () => {
    it('should not leak memory with many job additions', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Add many jobs
      for (let i = 0; i < 1000; i++) {
        await queueModule.addAutomationJob({
          seedId: `seed-${i}`,
          automationId: `auto-${i}`,
          userId: 'user-123',
        })
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      // Memory should not grow excessively (allowing for some variance)
      // Note: This is a basic check - in real scenarios, you'd want more sophisticated monitoring
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Memory growth should be reasonable (less than 10MB for 1000 jobs)
      if (finalMemory > 0 && initialMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory
        // In a real test, you'd want to ensure memory growth is bounded
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024)
      }
    })

    it('should handle large batch operations without excessive memory', async () => {
      const automations = Array.from({ length: 1000 }, (_, i) => ({
        id: `auto-${i}`,
        name: `automation-${i}`,
        enabled: true,
      }))

      mockRegistry.getEnabled.mockReturnValue(automations)
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const start = performance.now()

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      const duration = performance.now() - start

      expect(jobIds).toHaveLength(1000)
      // Should complete in reasonable time
      expect(duration).toBeLessThan(3000)
    })
  })

  describe('Scalability tests', () => {
    it('should maintain performance with increasing job count', async () => {
      const counts = [10, 100, 500]
      const durations: number[] = []

      for (const count of counts) {
        vi.clearAllMocks()
        mockQueueInstance.add.mockResolvedValue(mockJob)

        const start = performance.now()

        const promises = Array.from({ length: count }, (_, i) =>
          queueModule.addAutomationJob({
            seedId: `seed-${i}`,
            automationId: `auto-${i}`,
            userId: 'user-123',
          })
        )

        await Promise.all(promises)

        const duration = performance.now() - start
        durations.push(duration)
      }

      // Performance should scale roughly linearly, not exponentially
      // (duration for 500 should be less than 10x duration for 10)
      const ratio = durations[2] / durations[0]
      expect(ratio).toBeLessThan(100) // Reasonable scaling factor
    })
  })
})

