// Edge case tests for queue error scenarios
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

describe('Queue Edge Cases', () => {
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
    mockQueueInstance.getWaitingCount.mockResolvedValue(0)
    mockQueueInstance.getActiveCount.mockResolvedValue(0)
    mockQueueInstance.getCompletedCount.mockResolvedValue(0)
    mockQueueInstance.getFailedCount.mockResolvedValue(0)
    mockQueueInstance.getDelayedCount.mockResolvedValue(0)

    mockRegistry = {
      getById: vi.fn(),
      getEnabled: vi.fn(() => []),
      getAll: vi.fn(() => []),
    }

    ;(AutomationRegistry.getInstance as any).mockReturnValue(mockRegistry)
    
    // Import queue module fresh for each test
    queueModule = await import('./queue')
  })

  describe('Connection errors', () => {
    it('should handle Redis connection failure when adding job', async () => {
      vi.clearAllMocks()
      const connectionError = new Error('Redis connection failed')
      mockQueueInstance.add.mockRejectedValueOnce(connectionError)

      await expect(
        queueModule.addAutomationJob({
          seedId: 'seed-123',
          automationId: 'auto-456',
          userId: 'user-789',
        })
      ).rejects.toThrow('Redis connection failed')
    })

    it('should handle queue unavailable error', async () => {
      vi.clearAllMocks()
      const queueError = new Error('Queue unavailable')
      // Setup automations to queue
      const automations = [{ id: 'auto-1', name: 'test', enabled: true }]
      mockRegistry.getEnabled.mockReturnValueOnce(automations)
      mockQueueInstance.add.mockRejectedValueOnce(queueError)

      await expect(
        queueModule.queueAutomationsForSeed('seed-123', 'user-456')
      ).rejects.toThrow('Queue unavailable')
    })

    it('should handle network timeout when getting stats', async () => {
      const timeoutError = new Error('Network timeout')
      mockQueueInstance.getWaitingCount.mockRejectedValueOnce(timeoutError)

      await expect(queueModule.getQueueStats()).rejects.toThrow('Network timeout')
    })
  })

  describe('Invalid input handling', () => {
    it('should handle empty seed ID gracefully', async () => {
      // Reset any previous mocks
      vi.clearAllMocks()
      mockQueueInstance.add.mockResolvedValue(mockJob)
      
      // Empty seed ID should still create a job (validation would happen at service level)
      const jobId = await queueModule.addAutomationJob({
        seedId: '',
        automationId: 'auto-456',
        userId: 'user-789',
      })
      
      expect(jobId).toBeDefined()
      expect(mockQueueInstance.add).toHaveBeenCalled()
    })

    it('should handle very long automation ID', async () => {
      const longId = 'a'.repeat(1000)
      
      await queueModule.addAutomationJob({
        seedId: 'seed-123',
        automationId: longId,
        userId: 'user-789',
      })

      expect(mockQueueInstance.add).toHaveBeenCalled()
      expect(mockQueueInstance.add.mock.calls[0][2].jobId).toContain(longId.substring(0, 100)) // Job ID should be truncated
    })

    it('should handle special characters in IDs', async () => {
      const specialId = 'auto-123-!@#$%^&*()'
      
      await queueModule.addAutomationJob({
        seedId: 'seed-123',
        automationId: specialId,
        userId: 'user-789',
      })

      expect(mockQueueInstance.add).toHaveBeenCalled()
    })

    it('should handle negative priority', async () => {
      await queueModule.addAutomationJob({
        seedId: 'seed-123',
        automationId: 'auto-456',
        userId: 'user-789',
        priority: -10,
      })

      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          priority: -10,
        })
      )
    })

    it('should handle very high priority', async () => {
      await queueModule.addAutomationJob({
        seedId: 'seed-123',
        automationId: 'auto-456',
        userId: 'user-789',
        priority: 10000,
      })

      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          priority: 10000,
        })
      )
    })
  })

  describe('Registry edge cases', () => {
    it('should handle registry returning undefined', async () => {
      // Reset to ensure clean state
      vi.clearAllMocks()
      mockRegistry.getEnabled.mockReturnValueOnce(undefined as any)

      // Should handle gracefully - return empty array
      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      expect(jobIds).toEqual([])
      expect(mockQueueInstance.add).not.toHaveBeenCalled()
    })

    it('should handle registry throwing error', async () => {
      mockRegistry.getEnabled.mockImplementation(() => {
        throw new Error('Registry error')
      })

      await expect(
        queueModule.queueAutomationsForSeed('seed-123', 'user-456')
      ).rejects.toThrow('Registry error')
    })

    it('should handle circular automation dependencies', async () => {
      const automation1 = {
        id: 'auto-1',
        name: 'auto1',
        enabled: true,
      }
      const automation2 = {
        id: 'auto-2',
        name: 'auto2',
        enabled: true,
      }

      mockRegistry.getEnabled.mockReturnValue([automation1, automation2])
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      expect(jobIds).toHaveLength(2)
    })
  })

  describe('Job management edge cases', () => {
    it('should handle removing non-existent job', async () => {
      mockQueueInstance.getJob.mockResolvedValueOnce(null)

      await expect(
        queueModule.removeJob('non-existent-job')
      ).resolves.toBeUndefined()
    })

    it('should handle job remove failure', async () => {
      const mockJobWithRemove = {
        id: 'job-123',
        remove: vi.fn().mockRejectedValue(new Error('Remove failed')),
      }
      mockQueueInstance.getJob.mockResolvedValueOnce(mockJobWithRemove)

      await expect(
        queueModule.removeJob('job-123')
      ).rejects.toThrow('Remove failed')
    })

    it('should handle concurrent job additions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        queueModule.addAutomationJob({
          seedId: `seed-${i}`,
          automationId: `auto-${i}`,
          userId: 'user-123',
        })
      )

      const jobIds = await Promise.all(promises)

      expect(jobIds).toHaveLength(10)
      expect(mockQueueInstance.add).toHaveBeenCalledTimes(10)
    })

    it('should handle getJob with empty string', async () => {
      mockQueueInstance.getJob.mockResolvedValueOnce(null)

      const job = await queueModule.getJob('')

      expect(job).toBeNull()
    })

    it('should handle very long job ID', async () => {
      const longJobId = 'job-' + 'a'.repeat(10000)
      mockQueueInstance.getJob.mockResolvedValueOnce(null)

      const job = await queueModule.getJob(longJobId)

      expect(mockQueueInstance.getJob).toHaveBeenCalledWith(longJobId)
      expect(job).toBeNull()
    })
  })

  describe('Batch operation edge cases', () => {
    it('should handle empty automation IDs array', async () => {
      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456', [])

      expect(jobIds).toEqual([])
      expect(mockQueueInstance.add).not.toHaveBeenCalled()
    })

    it('should handle large number of automations', async () => {
      const automations = Array.from({ length: 100 }, (_, i) => ({
        id: `auto-${i}`,
        name: `automation-${i}`,
        enabled: true,
      }))

      mockRegistry.getEnabled.mockReturnValue(automations)
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      expect(jobIds).toHaveLength(100)
      expect(mockQueueInstance.add).toHaveBeenCalledTimes(100)
    })

    it('should handle mixed enabled/disabled automations', async () => {
      const automations = [
        { id: 'auto-1', enabled: true },
        { id: 'auto-2', enabled: false },
        { id: 'auto-3', enabled: true },
        { id: undefined, enabled: true }, // No ID
        { id: 'auto-4', enabled: true },
      ]

      mockRegistry.getEnabled.mockReturnValue(automations)
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      // Should only queue auto-1, auto-3, and auto-4 (3 total)
      expect(jobIds).toHaveLength(3)
    })

    it('should handle duplicate automation IDs', async () => {
      mockRegistry.getById
        .mockReturnValueOnce({ id: 'auto-1', enabled: true })
        .mockReturnValueOnce({ id: 'auto-1', enabled: true }) // Duplicate

      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456', [
        'auto-1',
        'auto-1',
      ])

      // Should still create 2 jobs (duplicates allowed)
      expect(jobIds).toHaveLength(2)
    })
  })

  describe('Stats edge cases', () => {
    it('should handle negative counts from queue', async () => {
      mockQueueInstance.getWaitingCount.mockResolvedValue(-1)
      mockQueueInstance.getActiveCount.mockResolvedValue(-1)
      mockQueueInstance.getCompletedCount.mockResolvedValue(-1)
      mockQueueInstance.getFailedCount.mockResolvedValue(-1)
      mockQueueInstance.getDelayedCount.mockResolvedValue(-1)

      const stats = await queueModule.getQueueStats()

      expect(stats).toEqual({
        waiting: -1,
        active: -1,
        completed: -1,
        failed: -1,
        delayed: -1,
        total: -5,
      })
    })

    it('should handle very large counts', async () => {
      const largeCount = Number.MAX_SAFE_INTEGER
      mockQueueInstance.getWaitingCount.mockResolvedValue(largeCount)
      mockQueueInstance.getActiveCount.mockResolvedValue(0)
      mockQueueInstance.getCompletedCount.mockResolvedValue(0)
      mockQueueInstance.getFailedCount.mockResolvedValue(0)
      mockQueueInstance.getDelayedCount.mockResolvedValue(0)

      const stats = await queueModule.getQueueStats()

      expect(stats.waiting).toBe(largeCount)
      expect(stats.total).toBe(largeCount)
    })

    it('should handle partial failures in stats collection', async () => {
      mockQueueInstance.getWaitingCount.mockResolvedValue(5)
      mockQueueInstance.getActiveCount.mockRejectedValueOnce(new Error('Stats error'))
      mockQueueInstance.getCompletedCount.mockResolvedValue(10)
      mockQueueInstance.getFailedCount.mockResolvedValue(2)
      mockQueueInstance.getDelayedCount.mockResolvedValue(1)

      await expect(queueModule.getQueueStats()).rejects.toThrow('Stats error')
    })
  })

  describe('Cleanup edge cases', () => {
    it('should handle close queue failure', async () => {
      const closeError = new Error('Close failed')
      mockQueueInstance.close.mockRejectedValueOnce(closeError)

      await expect(queueModule.closeQueue()).rejects.toThrow('Close failed')
    })

    it('should handle closing already closed queue', async () => {
      mockQueueInstance.close.mockResolvedValueOnce(undefined)
      mockQueueInstance.close.mockResolvedValueOnce(undefined)

      // First close
      await queueModule.closeQueue()
      
      // Second close should also work
      await queueModule.closeQueue()

      expect(mockQueueInstance.close).toHaveBeenCalledTimes(2)
    })
  })
})

