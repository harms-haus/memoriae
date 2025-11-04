// Integration tests for queue system
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import seedsRoutes from '../../routes/seeds'
import { authenticate } from '../../middleware/auth'
import { generateTestToken } from '../../test-helpers'
import { SeedsService } from '../../services/seeds'
import { queueAutomationsForSeed } from '../../services/queue/queue'
import { AutomationRegistry } from '../../services/automation/registry'

// Mock BullMQ to prevent Redis connections
vi.mock('bullmq', () => {
  const mockWorker = {
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  }

  const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-id' }),
    getJob: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  }

  return {
    Queue: vi.fn().mockImplementation(() => mockQueue),
    Worker: vi.fn().mockImplementation(() => mockWorker),
    ConnectionOptions: {},
  }
})

// Mock database connection to avoid requiring actual DB
vi.mock('../../db/connection', () => ({
  default: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    first: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  })),
}))

// Mock services
vi.mock('../../services/seeds', () => ({
  SeedsService: {
    create: vi.fn(),
    getById: vi.fn(),
    getByUser: vi.fn(),
  },
}))

vi.mock('../../services/queue/queue', () => ({
  queueAutomationsForSeed: vi.fn().mockResolvedValue(['job-1', 'job-2']),
  addAutomationJob: vi.fn().mockResolvedValue('job-id'),
  automationQueue: {
    add: vi.fn(),
  },
}))

vi.mock('../../services/automation/registry', () => ({
  AutomationRegistry: {
    getInstance: vi.fn(() => ({
      getEnabled: vi.fn(() => []),
    })),
  },
}))

const app = express()
app.use(express.json())
app.use('/api/seeds', authenticate, seedsRoutes)

describe('Queue Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Seed creation triggers automation queue', () => {
    it('should queue automations when seed is created', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-456',
        seed_content: 'Test content',
        created_at: new Date(),
        currentState: {
          seed: 'Test content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.create as any).mockResolvedValue(mockSeed)

      const token = generateTestToken({
        id: 'user-456',
        email: 'test@example.com',
      })

      await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test content' })
        .expect(201)

      expect(queueAutomationsForSeed).toHaveBeenCalledWith('seed-123', 'user-456')
    })

    it('should not fail seed creation if queue fails', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-456',
        seed_content: 'Test content',
        created_at: new Date(),
        currentState: {
          seed: 'Test content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.create as any).mockResolvedValue(mockSeed)
      ;(queueAutomationsForSeed as any).mockRejectedValue(new Error('Queue failed'))

      const token = generateTestToken({
        id: 'user-456',
        email: 'test@example.com',
      })

      // Should still succeed despite queue error
      await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test content' })
        .expect(201)

      expect(queueAutomationsForSeed).toHaveBeenCalled()
    })
  })
})

// Test automation handlePressure integration
describe('Automation handlePressure Integration', () => {
  it('should add job to queue when handlePressure is called', async () => {
    const { Automation } = await import('../../services/automation/base')
    const { addAutomationJob } = await import('../../services/queue/queue')

    // Create a test automation
    class TestAutomation extends Automation {
      readonly name = 'test'
      readonly description = 'Test'
      readonly handlerFnName = 'test'

      async process() {
        return { events: [] }
      }

      calculatePressure() {
        return 75
      }
    }

    const automation = new TestAutomation()
    automation.id = 'auto-123'

    const mockSeed = {
      id: 'seed-123',
      user_id: 'user-456',
      seed_content: 'Test',
      created_at: new Date(),
      currentState: {
        seed: 'Test',
        timestamp: new Date().toISOString(),
        metadata: {},
      },
    }

    const mockContext = {
      openrouter: {} as any,
      userId: 'user-456',
    }

    await automation.handlePressure(mockSeed, 75, mockContext)

    expect(addAutomationJob).toHaveBeenCalledWith({
      seedId: 'seed-123',
      automationId: 'auto-123',
      userId: 'user-456',
      priority: 75,
    })
  })
})

