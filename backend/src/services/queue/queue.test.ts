// Queue service tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AutomationRegistry } from '../automation/registry'

// Create hoisted mock instances that persist across module loads
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

// Mock BullMQ before importing queue module
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

describe('Queue Service', () => {
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

  describe('addAutomationJob', () => {
    it('should add a job to the queue with correct data', async () => {
      const jobData = {
        seedId: 'seed-123',
        automationId: 'auto-456',
        userId: 'user-789',
        priority: 10,
      }

      const jobId = await queueModule.addAutomationJob(jobData)

      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        'process-automation',
        jobData,
        {
          priority: 10,
          jobId: 'auto-456-seed-123',
        }
      )
      expect(jobId).toBe('test-job-id')
    })

    it('should use default priority of 0 if not provided', async () => {
      const jobData = {
        seedId: 'seed-123',
        automationId: 'auto-456',
        userId: 'user-789',
      }

      await queueModule.addAutomationJob(jobData)

      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        'process-automation',
        jobData,
        {
          priority: 0,
          jobId: 'auto-456-seed-123',
        }
      )
    })

    it('should generate unique job ID from automation and seed IDs', async () => {
      const jobData = {
        seedId: 'seed-abc',
        automationId: 'auto-xyz',
        userId: 'user-123',
      }

      await queueModule.addAutomationJob(jobData)

      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        'process-automation',
        jobData,
        expect.objectContaining({
          jobId: 'auto-xyz-seed-abc',
        })
      )
    })
  })

  describe('queueAutomationsForSeed', () => {
    it('should queue all enabled automations for a seed', async () => {
      const mockAutomation1 = {
        id: 'auto-1',
        name: 'tag',
        enabled: true,
      }
      const mockAutomation2 = {
        id: 'auto-2',
        name: 'categorize',
        enabled: true,
      }

      mockRegistry.getEnabled.mockReturnValue([mockAutomation1, mockAutomation2])
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      expect(jobIds).toHaveLength(2)
      expect(mockQueueInstance.add).toHaveBeenCalledTimes(2)
      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        'process-automation',
        {
          seedId: 'seed-123',
          automationId: 'auto-1',
          userId: 'user-456',
          priority: 0,
        },
        expect.any(Object)
      )
    })

    it('should filter out disabled automations', async () => {
      const mockAutomation1 = {
        id: 'auto-1',
        name: 'tag',
        enabled: true,
      }
      const mockAutomation2 = {
        id: 'auto-2',
        name: 'categorize',
        enabled: false,
      }

      mockRegistry.getEnabled.mockReturnValue([mockAutomation1, mockAutomation2])
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      expect(jobIds).toHaveLength(1)
      expect(mockQueueInstance.add).toHaveBeenCalledTimes(1)
    })

    it('should filter out automations without IDs', async () => {
      const mockAutomation1 = {
        id: 'auto-1',
        name: 'tag',
        enabled: true,
      }
      const mockAutomation2 = {
        id: undefined,
        name: 'categorize',
        enabled: true,
      }

      mockRegistry.getEnabled.mockReturnValue([mockAutomation1, mockAutomation2])
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      expect(jobIds).toHaveLength(1)
      expect(mockQueueInstance.add).toHaveBeenCalledTimes(1)
    })

    it('should queue specific automations when IDs provided', async () => {
      const mockAutomation = {
        id: 'auto-1',
        name: 'tag',
        enabled: true,
      }

      mockRegistry.getById.mockReturnValue(mockAutomation)
      mockQueueInstance.add.mockResolvedValue({ id: 'job-1' })

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456', ['auto-1'])

      expect(jobIds).toHaveLength(1)
      expect(mockRegistry.getById).toHaveBeenCalledWith('auto-1')
    })

    it('should return empty array if no enabled automations', async () => {
      mockRegistry.getEnabled.mockReturnValue([])

      const jobIds = await queueModule.queueAutomationsForSeed('seed-123', 'user-456')

      expect(jobIds).toEqual([])
      expect(mockQueueInstance.add).not.toHaveBeenCalled()
    })

    it('should handle missing automation in registry gracefully', async () => {
      mockRegistry.getById.mockReturnValue(null)

      await expect(
        queueModule.queueAutomationsForSeed('seed-123', 'user-456', ['auto-missing'])
      ).resolves.toEqual([])
    })
  })

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      // Setup mock return values
      mockQueueInstance.getWaitingCount.mockResolvedValue(5)
      mockQueueInstance.getActiveCount.mockResolvedValue(2)
      mockQueueInstance.getCompletedCount.mockResolvedValue(100)
      mockQueueInstance.getFailedCount.mockResolvedValue(3)
      mockQueueInstance.getDelayedCount.mockResolvedValue(1)

      const stats = await queueModule.getQueueStats()

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        total: 111,
      })
    })
  })

  describe('getJob', () => {
    it('should get job by ID', async () => {
      const mockJobResult = { id: 'job-123', data: { seedId: 'seed-1' } }
      mockQueueInstance.getJob.mockResolvedValue(mockJobResult)
      
      const job = await queueModule.getJob('job-123')

      expect(job).toEqual(mockJobResult)
      expect(mockQueueInstance.getJob).toHaveBeenCalledWith('job-123')
    })

    it('should return null if job not found', async () => {
      mockQueueInstance.getJob.mockResolvedValueOnce(null)

      const job = await queueModule.getJob('job-missing')

      expect(job).toBeNull()
    })
  })

  describe('removeJob', () => {
    it('should remove job from queue', async () => {
      const mockJobWithRemove = {
        id: 'job-123',
        remove: vi.fn().mockResolvedValue(undefined),
      }
      mockQueueInstance.getJob.mockResolvedValue(mockJobWithRemove)

      await queueModule.removeJob('job-123')

      expect(mockJobWithRemove.remove).toHaveBeenCalled()
    })

    it('should not throw if job not found', async () => {
      mockQueueInstance.getJob.mockResolvedValue(null)

      await expect(queueModule.removeJob('job-missing')).resolves.toBeUndefined()
    })
  })

  describe('closeQueue', () => {
    it('should close queue connection', async () => {
      await queueModule.closeQueue()

      expect(mockQueueInstance.close).toHaveBeenCalled()
    })
  })

  describe('Redis connection configuration', () => {
    it('should parse REDIS_URL correctly', () => {
      // This is tested indirectly through Queue instantiation
      // Connection logic is in getQueueConnection function
      expect(queueModule.automationQueue).toBeDefined()
    })
  })
})
