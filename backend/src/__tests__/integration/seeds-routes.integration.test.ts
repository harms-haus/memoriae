// Seeds routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import seedsRoutes from '../../routes/seeds'
import { authenticate } from '../../middleware/auth'
import { generateTestToken } from '../../test-helpers'
import { SeedsService } from '../../services/seeds'
import { queueAutomationsForSeed } from '../../services/queue/queue'
import * as authService from '../../services/auth'

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

// Mock database connection
vi.mock('../../db/connection', () => ({
  default: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    first: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  })),
}))

// Mock services
vi.mock('../../services/seeds', () => ({
  SeedsService: {
    create: vi.fn(),
    getById: vi.fn(),
    getByUser: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../services/queue/queue', () => ({
  queueAutomationsForSeed: vi.fn().mockResolvedValue(['job-1', 'job-2']),
  addAutomationJob: vi.fn().mockResolvedValue('job-id'),
  automationQueue: {
    add: vi.fn(),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getJob: vi.fn(),
  },
}))

vi.mock('../../services/automation/registry', () => ({
  AutomationRegistry: {
    getInstance: vi.fn(() => ({
      getEnabled: vi.fn(() => []),
    })),
  },
}))

// Mock auth service
vi.mock('../../services/auth', () => ({
  getUserById: vi.fn(),
}))

const app = express()
app.use(express.json())
app.use('/api/seeds', authenticate, seedsRoutes)

describe('Seeds Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock getUserById to return a user by default
    vi.mocked(authService.getUserById).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'google',
      provider_id: 'provider-123',
      created_at: new Date(),
    })
  })

  describe('POST /api/seeds', () => {
    it('should create a seed with valid content', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date(),
        currentState: {
          seed: 'Test content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.create as any).mockResolvedValue(mockSeed)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test content' })
        .expect(201)

      expect(response.body).toMatchObject({
        id: 'seed-123',
        user_id: 'user-123',
      })
      expect(SeedsService.create).toHaveBeenCalledWith('user-123', { content: 'Test content' })
      expect(queueAutomationsForSeed).toHaveBeenCalledWith('seed-123', 'user-123')
    })

    it('should trim content when creating seed', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date(),
        currentState: {
          seed: 'Test content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.create as any).mockResolvedValue(mockSeed)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '  Test content  ' })
        .expect(201)

      expect(SeedsService.create).toHaveBeenCalledWith('user-123', { content: 'Test content' })
    })

    it('should reject seed creation with missing content', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Content is required and must be a non-empty string',
      })
      expect(SeedsService.create).not.toHaveBeenCalled()
    })

    it('should reject seed creation with null content', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: null })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Content is required and must be a non-empty string',
      })
      expect(SeedsService.create).not.toHaveBeenCalled()
    })

    it('should reject seed creation with empty string content', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '' })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Content is required and must be a non-empty string',
      })
      expect(SeedsService.create).not.toHaveBeenCalled()
    })

    it('should reject seed creation with whitespace-only content', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '   ' })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Content is required and must be a non-empty string',
      })
      expect(SeedsService.create).not.toHaveBeenCalled()
    })

    it('should reject seed creation with newline-only content', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '\n\n\t  \n' })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Content is required and must be a non-empty string',
      })
      expect(SeedsService.create).not.toHaveBeenCalled()
    })

    it('should reject seed creation with non-string content', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 123 })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Content is required and must be a non-empty string',
      })
      expect(SeedsService.create).not.toHaveBeenCalled()
    })

    it('should reject seed creation with array content', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: ['test'] })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Content is required and must be a non-empty string',
      })
      expect(SeedsService.create).not.toHaveBeenCalled()
    })

    it('should reject seed creation with object content', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: { text: 'test' } })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Content is required and must be a non-empty string',
      })
      expect(SeedsService.create).not.toHaveBeenCalled()
    })

    it('should handle service errors gracefully', async () => {
      ;(SeedsService.create as any).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .post('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test content' })
        .expect(500)
    })
  })

  describe('GET /api/seeds', () => {
    it('should return all seeds for authenticated user', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Seed 1 content',
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Seed 2 content',
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(SeedsService.getByUser).toHaveBeenCalledWith('user-123')
    })

    it('should return empty array when user has no seeds', async () => {
      ;(SeedsService.getByUser as any).mockResolvedValue([])

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toEqual([])
    })

    it('should handle service errors gracefully', async () => {
      ;(SeedsService.getByUser as any).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/seeds')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })
  })

  describe('GET /api/seeds/:id', () => {
    it('should return seed by ID', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date(),
        currentState: {
          seed: 'Test content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.getById as any).mockResolvedValue(mockSeed)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds/seed-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'seed-123',
        user_id: 'user-123',
      })
      expect(SeedsService.getById).toHaveBeenCalledWith('seed-123', 'user-123')
    })

    it('should return 404 when seed not found', async () => {
      ;(SeedsService.getById as any).mockResolvedValue(null)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })

    // Note: Express routing handles trailing slashes, so this test is not applicable
    // The route handler itself checks for id in req.params, which is tested in other cases

    it('should handle service errors gracefully', async () => {
      ;(SeedsService.getById as any).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/seeds/seed-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })
  })

  describe('PUT /api/seeds/:id', () => {
    it('should update seed content', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date(),
        currentState: {
          seed: 'Updated content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.update as any).mockResolvedValue(mockSeed)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .put('/api/seeds/seed-123')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Updated content' })
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'seed-123',
      })
      expect(SeedsService.update).toHaveBeenCalledWith('seed-123', 'user-123', { content: 'Updated content' })
    })

    it('should return 400 when content is not a string', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .put('/api/seeds/seed-123')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 123 })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Content must be a string',
      })
    })

    it('should return 404 when seed not found', async () => {
      ;(SeedsService.update as any).mockResolvedValue(null)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .put('/api/seeds/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Updated content' })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })

    // Note: Express routing handles trailing slashes, so this test is not applicable
    // The route handler itself checks for id in req.params, which is tested in other cases

    it('should allow update without content (no-op)', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date(),
        currentState: {
          seed: 'Original content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.update as any).mockResolvedValue(mockSeed)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .put('/api/seeds/seed-123')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200)

      expect(SeedsService.update).toHaveBeenCalledWith('seed-123', 'user-123', {})
    })
  })

  describe('DELETE /api/seeds/:id', () => {
    it('should delete seed', async () => {
      ;(SeedsService.delete as any).mockResolvedValue(true)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .delete('/api/seeds/seed-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(204)

      expect(SeedsService.delete).toHaveBeenCalledWith('seed-123', 'user-123')
    })

    it('should return 404 when seed not found', async () => {
      ;(SeedsService.delete as any).mockResolvedValue(false)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .delete('/api/seeds/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })

    it('should handle service errors gracefully', async () => {
      ;(SeedsService.delete as any).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .delete('/api/seeds/seed-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })
  })

  describe('GET /api/seeds/:id/automations', () => {
    it('should return list of automations for seed', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date(),
        currentState: {
          seed: 'Test content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.getById as any).mockResolvedValue(mockSeed)

      const mockAutomations = [
        { id: 'auto-1', name: 'Tag Automation', description: 'Tags seeds', enabled: true },
        { id: 'auto-2', name: 'Categorize Automation', description: 'Categorizes seeds', enabled: true },
      ]

      const { AutomationRegistry } = await import('../../services/automation/registry')
      const mockRegistry = {
        getAll: vi.fn(() => mockAutomations),
      }
      vi.mocked(AutomationRegistry.getInstance).mockReturnValue(mockRegistry as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds/seed-123/automations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        id: 'auto-1',
        name: 'Tag Automation',
        enabled: true,
      })
    })

    it('should return 404 when seed not found', async () => {
      ;(SeedsService.getById as any).mockResolvedValue(null)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds/non-existent/automations')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })
  })

  describe('POST /api/seeds/:id/automations/:automationId/run', () => {
    it('should queue automation job for seed', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date(),
        currentState: {
          seed: 'Test content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.getById as any).mockResolvedValue(mockSeed)

      const mockAutomation = {
        id: 'auto-1',
        name: 'Tag Automation',
        description: 'Tags seeds',
        enabled: true,
      }

      const { AutomationRegistry } = await import('../../services/automation/registry')
      const mockRegistry = {
        getById: vi.fn(() => mockAutomation),
      }
      vi.mocked(AutomationRegistry.getInstance).mockReturnValue(mockRegistry as any)

      const { addAutomationJob, automationQueue } = await import('../../services/queue/queue')
      vi.mocked(addAutomationJob).mockResolvedValue('job-123')
      if (automationQueue && typeof automationQueue === 'object') {
        vi.mocked((automationQueue as any).getWaitingCount).mockResolvedValue(1)
        vi.mocked((automationQueue as any).getActiveCount).mockResolvedValue(0)
        vi.mocked((automationQueue as any).getJob).mockResolvedValue({
          getState: vi.fn().mockResolvedValue('waiting'),
        } as any)
      }

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/seed-123/automations/auto-1/run')
        .set('Authorization', `Bearer ${token}`)
        .expect(202)

      expect(response.body).toMatchObject({
        message: 'Automation queued',
        jobId: 'job-123',
        automation: {
          id: 'auto-1',
          name: 'Tag Automation',
        },
      })
    })

    it('should return 404 when seed not found', async () => {
      ;(SeedsService.getById as any).mockResolvedValue(null)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/non-existent/automations/auto-1/run')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })

    it('should return 404 when automation not found', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date(),
        currentState: {
          seed: 'Test content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      ;(SeedsService.getById as any).mockResolvedValue(mockSeed)

      const { AutomationRegistry } = await import('../../services/automation/registry')
      const mockRegistry = {
        getById: vi.fn(() => null),
      }
      vi.mocked(AutomationRegistry.getInstance).mockReturnValue(mockRegistry as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/seed-123/automations/non-existent/run')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Automation not found',
      })
    })
  })
})

