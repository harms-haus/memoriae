// Followups routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import followupsRoutes from '../../routes/followups'
import { generateTestToken } from '../../test-helpers'
import * as authService from '../../services/auth'
import { FollowupService } from '../../services/followups'
import db from '../../db/connection'

// Mock the followups service
vi.mock('../../services/followups', () => ({
  FollowupService: {
    getBySeedId: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    edit: vi.fn(),
    snooze: vi.fn(),
    dismiss: vi.fn(),
    getDueFollowups: vi.fn(),
  },
}))

// Mock database
vi.mock('../../db/connection', () => {
  const mockDb = vi.fn((table: string) => {
    const queryBuilder = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn(),
    }
    return queryBuilder
  })
  return {
    default: mockDb,
  }
})

// Mock auth service
vi.mock('../../services/auth', () => ({
  getUserById: vi.fn(),
}))

// Mock auth middleware - use real auth but mock at a higher level
vi.mock('../../middleware/auth', async () => {
  const actual = await vi.importActual('../../middleware/auth')
  return actual
})

const app = express()
app.use(express.json())
app.use('/api', followupsRoutes)

describe('Followups Routes', () => {
  beforeEach(async () => {
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

    // Mock database seed lookup
    const mockWhere = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockResolvedValue({
      id: 'seed-123',
      user_id: 'user-123',
    })
    vi.mocked(db).mockReturnValue({
      where: mockWhere,
      first: mockFirst,
    } as any)
  })

  describe('GET /api/seeds/:seedId/followups', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/seeds/seed-123/followups')
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return followups for seed', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockFollowups = [
        {
          id: 'followup-1',
          seed_id: 'seed-123',
          created_at: new Date('2024-01-01T10:00:00Z'),
          due_time: new Date('2024-01-02T10:00:00Z'),
          message: 'Test followup',
          dismissed: false,
          transactions: [],
        },
      ]

      vi.mocked(FollowupService.getBySeedId).mockResolvedValue(mockFollowups)

      const response = await request(app)
        .get('/api/seeds/seed-123/followups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe('followup-1')
    })

    it('should return 404 if seed not found', async () => {
      const token = generateTestToken()

      // Mock seed lookup to return null
      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(null)
      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const response = await request(app)
        .get('/api/seeds/non-existent/followups')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Seed not found')
    })

    it('should return 404 if seed belongs to different user', async () => {
      const token = generateTestToken({
        id: 'user-456', // Different user
      })

      // Mock seed lookup to return null (different user)
      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(null)
      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const response = await request(app)
        .get('/api/seeds/seed-123/followups')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Seed not found')
    })
  })

  describe('POST /api/seeds/:seedId/followups', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/seeds/seed-123/followups')
        .send({ due_time: '2024-01-02T10:00:00Z', message: 'Test' })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should create followup', async () => {
      const token = generateTestToken()
      const mockFollowup = {
        id: 'followup-123',
        seed_id: 'seed-123',
        created_at: new Date('2024-01-01T10:00:00Z'),
        due_time: new Date('2024-01-02T10:00:00Z'),
        message: 'Test followup',
        dismissed: false,
        transactions: [],
      }

      vi.mocked(FollowupService.create).mockResolvedValue(mockFollowup)

      const response = await request(app)
        .post('/api/seeds/seed-123/followups')
        .set('Authorization', `Bearer ${token}`)
        .send({
          due_time: '2024-01-02T10:00:00Z',
          message: 'Test followup',
        })
        .expect(201)

      expect(response.body.id).toBe('followup-123')
      expect(FollowupService.create).toHaveBeenCalledWith(
        'seed-123',
        {
          due_time: '2024-01-02T10:00:00Z',
          message: 'Test followup',
        },
        'manual'
      )
    })

    it('should validate due_time', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/seeds/seed-123/followups')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Test' })
        .expect(400)

      expect(response.body.error).toContain('due_time')
    })

    it('should validate message', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/seeds/seed-123/followups')
        .set('Authorization', `Bearer ${token}`)
        .send({ due_time: '2024-01-02T10:00:00Z' })
        .expect(400)

      expect(response.body.error).toContain('message')
    })
  })

  describe('PUT /api/followups/:followupId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/followups/followup-123')
        .send({ message: 'Updated' })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should edit followup', async () => {
      const token = generateTestToken()
      const mockFollowup = {
        id: 'followup-123',
        seed_id: 'seed-123',
        created_at: new Date('2024-01-01T10:00:00Z'),
        due_time: new Date('2024-01-03T10:00:00Z'),
        message: 'Updated message',
        dismissed: false,
        transactions: [],
      }

      vi.mocked(FollowupService.getById).mockResolvedValue({
        id: 'followup-123',
        seed_id: 'seed-123',
        created_at: new Date(),
        due_time: new Date('2024-01-02T10:00:00Z'),
        message: 'Original message',
        dismissed: false,
        transactions: [],
      })
      vi.mocked(FollowupService.edit).mockResolvedValue(mockFollowup)

      const response = await request(app)
        .put('/api/followups/followup-123')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Updated message',
          due_time: '2024-01-03T10:00:00Z',
        })
        .expect(200)

      expect(response.body.message).toBe('Updated message')
    })

    it('should return 404 if followup not found', async () => {
      const token = generateTestToken()

      vi.mocked(FollowupService.getById).mockResolvedValue(null)

      const response = await request(app)
        .put('/api/followups/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Updated' })
        .expect(404)

      expect(response.body.error).toBe('Followup not found')
    })

    it('should return 400 if followup is dismissed', async () => {
      const token = generateTestToken()

      vi.mocked(FollowupService.getById).mockResolvedValue({
        id: 'followup-123',
        seed_id: 'seed-123',
        created_at: new Date(),
        due_time: new Date('2024-01-02T10:00:00Z'),
        message: 'Original',
        dismissed: true,
        dismissed_at: new Date(),
        transactions: [],
      })
      vi.mocked(FollowupService.edit).mockRejectedValue(
        new Error('Cannot edit dismissed followup')
      )

      const response = await request(app)
        .put('/api/followups/followup-123')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Updated' })
        .expect(400)

      expect(response.body.error).toBe('Cannot edit dismissed followup')
    })
  })

  describe('POST /api/followups/:followupId/snooze', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/followups/followup-123/snooze')
        .send({ duration_minutes: 60 })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should snooze followup', async () => {
      const token = generateTestToken()
      const mockFollowup = {
        id: 'followup-123',
        seed_id: 'seed-123',
        created_at: new Date('2024-01-01T10:00:00Z'),
        due_time: new Date('2024-01-02T11:00:00Z'), // +60 minutes
        message: 'Test',
        dismissed: false,
        transactions: [],
      }

      vi.mocked(FollowupService.getById).mockResolvedValue({
        id: 'followup-123',
        seed_id: 'seed-123',
        created_at: new Date(),
        due_time: new Date('2024-01-02T10:00:00Z'),
        message: 'Test',
        dismissed: false,
        transactions: [],
      })
      vi.mocked(FollowupService.snooze).mockResolvedValue(mockFollowup)

      const response = await request(app)
        .post('/api/followups/followup-123/snooze')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration_minutes: 60 })
        .expect(200)

      expect(FollowupService.snooze).toHaveBeenCalledWith('followup-123', 60, 'manual')
    })

    it('should validate duration_minutes', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/followups/followup-123/snooze')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400)

      expect(response.body.error).toContain('duration_minutes')
    })
  })

  describe('POST /api/followups/:followupId/dismiss', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/followups/followup-123/dismiss')
        .send({ type: 'followup' })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should dismiss followup', async () => {
      const token = generateTestToken()
      const mockFollowup = {
        id: 'followup-123',
        seed_id: 'seed-123',
        created_at: new Date('2024-01-01T10:00:00Z'),
        due_time: new Date('2024-01-02T10:00:00Z'),
        message: 'Test',
        dismissed: true,
        dismissed_at: new Date(),
        transactions: [],
      }

      vi.mocked(FollowupService.getById).mockResolvedValue({
        id: 'followup-123',
        seed_id: 'seed-123',
        created_at: new Date(),
        due_time: new Date('2024-01-02T10:00:00Z'),
        message: 'Test',
        dismissed: false,
        transactions: [],
      })
      vi.mocked(FollowupService.dismiss).mockResolvedValue(mockFollowup)

      const response = await request(app)
        .post('/api/followups/followup-123/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'followup' })
        .expect(200)

      expect(response.body.dismissed).toBe(true)
      expect(FollowupService.dismiss).toHaveBeenCalledWith('followup-123', 'followup')
    })

    it('should validate type', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/followups/followup-123/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'invalid' })
        .expect(400)

      expect(response.body.error).toContain('type')
    })
  })

  describe('GET /api/followups/due', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/followups/due')
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return due followups for user', async () => {
      const token = generateTestToken({
        id: 'user-123',
      })

      const mockDueFollowups = [
        {
          followup_id: 'followup-1',
          seed_id: 'seed-1',
          user_id: 'user-123',
          due_time: new Date('2024-01-01T10:00:00Z'),
          message: 'Due followup',
        },
      ]

      vi.mocked(FollowupService.getDueFollowups).mockResolvedValue(mockDueFollowups)

      const response = await request(app)
        .get('/api/followups/due')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      expect(FollowupService.getDueFollowups).toHaveBeenCalledWith('user-123')
    })
  })
})

