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
})

