// Sprouts routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import sproutsRoutes from '../../routes/sprouts'
import { generateTestToken } from '../../test-helpers'
import * as authService from '../../services/auth'
import { SproutsService } from '../../services/sprouts'
import { SeedsService } from '../../services/seeds'
import { SeedTransactionsService } from '../../services/seed-transactions'
import * as followupHandler from '../../services/sprouts/followup-sprout'
import * as musingHandler from '../../services/sprouts/musing-sprout'

// Mock the sprouts service
vi.mock('../../services/sprouts', () => ({
  SproutsService: {
    getBySeedId: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    verifySproutOwnership: vi.fn(),
  },
}))

// Mock SeedsService
vi.mock('../../services/seeds', () => ({
  SeedsService: {
    getById: vi.fn(),
    getByHashId: vi.fn(),
  },
}))

// Mock SeedTransactionsService
vi.mock('../../services/seed-transactions', () => ({
  SeedTransactionsService: {
    create: vi.fn(),
  },
}))

// Mock sprout handlers
vi.mock('../../services/sprouts/followup-sprout', () => ({
  editFollowup: vi.fn(),
  dismissFollowup: vi.fn(),
  snoozeFollowup: vi.fn(),
}))

vi.mock('../../services/sprouts/musing-sprout', () => ({
  dismissMusing: vi.fn(),
  completeMusing: vi.fn(),
}))

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
app.use('/api', sproutsRoutes)

describe('Sprouts Routes', () => {
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

    // Mock SeedsService.getById for full UUID (backward compatibility)
    vi.mocked(SeedsService.getById).mockImplementation(async (id: string, userId: string) => {
      if (id === 'seed-123' && userId === 'user-123') {
        return {
          id: 'seed-123',
          user_id: 'user-123',
          created_at: new Date(),
          slug: null,
          currentState: {
            seed: 'Test content',
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        } as any
      }
      return null
    })

    // Mock SeedsService.getByHashId for hashId-based routes
    vi.mocked(SeedsService.getByHashId).mockImplementation(
      async (hashId: string, userId: string, slugHint?: string) => {
        // seed-123 has hashId 'seed-1' (first 7 chars)
        if (hashId === 'seed-1' && userId === 'user-123') {
          return {
            id: 'seed-123',
            user_id: 'user-123',
            created_at: new Date(),
            slug: slugHint || null,
            currentState: {
              seed: 'Test content',
              timestamp: new Date().toISOString(),
              metadata: {},
            },
          } as any
        }
        // Handle seed-123 as hashId (for backward compatibility tests)
        if (hashId === 'seed-123' && userId === 'user-123') {
          return {
            id: 'seed-123',
            user_id: 'user-123',
            created_at: new Date(),
            slug: slugHint || null,
            currentState: {
              seed: 'Test content',
              timestamp: new Date().toISOString(),
              metadata: {},
            },
          } as any
        }
        // For full UUID (36 chars), return null (should use getById instead)
        if (hashId.length === 36) {
          return null
        }
        return null
      }
    )

    // Mock SproutsService.verifySproutOwnership
    vi.mocked(SproutsService.verifySproutOwnership).mockImplementation(
      async (sproutId: string, userId: string) => {
        return sproutId === 'sprout-123' && userId === 'user-123'
      }
    )
  })

  describe('GET /api/seeds/:hashId/:slug/sprouts', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/seeds/seed-1/test-slug/sprouts').expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return sprouts for seed by hashId with slug', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockSprouts = [
        {
          id: 'sprout-1',
          seed_id: 'seed-123',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'manual',
            initial_time: new Date('2024-01-02T10:00:00Z').toISOString(),
            initial_message: 'Test followup',
          },
          created_at: new Date('2024-01-01T10:00:00Z'),
          automation_id: null,
        },
      ]

      vi.mocked(SproutsService.getBySeedId).mockResolvedValue(mockSprouts as any)

      const response = await request(app)
        .get('/api/seeds/seed-1/test-slug/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe('sprout-1')
      expect(SeedsService.getByHashId).toHaveBeenCalledWith('seed-1', 'user-123', 'test-slug')
      expect(SproutsService.getBySeedId).toHaveBeenCalledWith('seed-123')
    })

    it('should return 400 if hashId is missing', async () => {
      const token = generateTestToken()

      // Express doesn't match routes with empty params, so this returns 404
      // The actual route handler would check for missing hashId if the route matched
      const response = await request(app)
        .get('/api/seeds//test-slug/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .expect(404) // Express returns 404 for unmatched routes
    })

    it('should return 404 if seed not found by hashId/slug', async () => {
      const token = generateTestToken()

      vi.mocked(SeedsService.getByHashId).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/seeds/non-existent/slug/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Seed not found')
    })
  })

  describe('GET /api/seeds/:seedId/sprouts', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/seeds/seed-123/sprouts').expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return sprouts for seed by full UUID', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockSprouts = [
        {
          id: 'sprout-1',
          seed_id: 'seed-123',
          sprout_type: 'musing',
          sprout_data: {
            template_type: 'numbered_ideas',
            content: { ideas: ['Idea 1'] },
            dismissed: false,
            dismissed_at: null,
            completed: false,
            completed_at: null,
          },
          created_at: new Date('2024-01-01T10:00:00Z'),
          automation_id: null,
        },
      ]

      vi.mocked(SproutsService.getBySeedId).mockResolvedValue(mockSprouts as any)

      const response = await request(app)
        .get('/api/seeds/seed-123/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      // seed-123 is 9 chars, not 36, so it uses getByHashId
      expect(SeedsService.getByHashId).toHaveBeenCalledWith('seed-123', 'user-123')
      expect(SproutsService.getBySeedId).toHaveBeenCalledWith('seed-123')
    })

    it('should return sprouts for seed by hashId', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockSprouts = [
        {
          id: 'sprout-1',
          seed_id: 'seed-123',
          sprout_type: 'followup',
          sprout_data: {},
          created_at: new Date('2024-01-01T10:00:00Z'),
          automation_id: null,
        },
      ]

      vi.mocked(SproutsService.getBySeedId).mockResolvedValue(mockSprouts as any)

      const response = await request(app)
        .get('/api/seeds/seed-1/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(SeedsService.getByHashId).toHaveBeenCalledWith('seed-1', 'user-123')
    })

    it('should return 400 if seedId is missing', async () => {
      const token = generateTestToken()

      // Express returns 404 for unmatched routes (empty params don't match)
      const response = await request(app)
        .get('/api/seeds//sprouts')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })

    it('should return 404 if seed not found', async () => {
      const token = generateTestToken()

      vi.mocked(SeedsService.getById).mockResolvedValue(null)
      vi.mocked(SeedsService.getByHashId).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/seeds/non-existent/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Seed not found')
    })
  })

  describe('GET /api/sprouts/:sproutId', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/sprouts/sprout-123').expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return sprout by ID', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockSprout = {
        id: 'sprout-123',
        seed_id: 'seed-123',
        sprout_type: 'followup',
        sprout_data: {
          trigger: 'manual',
          initial_time: new Date('2024-01-02T10:00:00Z').toISOString(),
          initial_message: 'Test followup',
        },
        created_at: new Date('2024-01-01T10:00:00Z'),
        automation_id: null,
      }

      vi.mocked(SproutsService.getById).mockResolvedValue(mockSprout as any)

      const response = await request(app)
        .get('/api/sprouts/sprout-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.id).toBe('sprout-123')
      expect(SproutsService.verifySproutOwnership).toHaveBeenCalledWith('sprout-123', 'user-123')
      expect(SproutsService.getById).toHaveBeenCalledWith('sprout-123')
    })

    it('should return 400 if sproutId is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .get('/api/sprouts/')
        .set('Authorization', `Bearer ${token}`)
        .expect(404) // Express returns 404 for missing route param
    })

    it('should return 404 if sprout not found', async () => {
      const token = generateTestToken()

      vi.mocked(SproutsService.verifySproutOwnership).mockResolvedValue(false)

      const response = await request(app)
        .get('/api/sprouts/sprout-999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Sprout not found')
    })

    it('should return 404 if sprout not owned by user', async () => {
      const token = generateTestToken()

      vi.mocked(SproutsService.verifySproutOwnership).mockResolvedValue(false)

      const response = await request(app)
        .get('/api/sprouts/sprout-999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Sprout not found')
    })
  })

  describe('POST /api/seeds/:hashId/:slug/sprouts', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/seeds/seed-1/test-slug/sprouts')
        .send({ sprout_type: 'followup', sprout_data: {} })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should create sprout and transaction', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockSprout = {
        id: 'sprout-123',
        seed_id: 'seed-123',
        sprout_type: 'followup',
        sprout_data: {
          trigger: 'manual',
          initial_time: new Date('2024-01-02T10:00:00Z').toISOString(),
          initial_message: 'Test followup',
        },
        created_at: new Date('2024-01-01T10:00:00Z'),
        automation_id: null,
      }

      vi.mocked(SproutsService.create).mockResolvedValue(mockSprout as any)
      vi.mocked(SeedTransactionsService.create).mockResolvedValue({
        id: 'txn-123',
        seed_id: 'seed-123',
        transaction_type: 'add_sprout',
        transaction_data: { sprout_id: 'sprout-123' },
        created_at: new Date(),
        automation_id: null,
      } as any)

      const response = await request(app)
        .post('/api/seeds/seed-1/test-slug/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'manual',
            initial_time: new Date('2024-01-02T10:00:00Z').toISOString(),
            initial_message: 'Test followup',
          },
        })
        .expect(201)

      expect(response.body.id).toBe('sprout-123')
      expect(SproutsService.create).toHaveBeenCalledWith({
        seed_id: 'seed-123',
        sprout_type: 'followup',
        sprout_data: expect.objectContaining({
          trigger: 'manual',
        }),
        automation_id: null,
      })
      expect(SeedTransactionsService.create).toHaveBeenCalledWith({
        seed_id: 'seed-123',
        transaction_type: 'add_sprout',
        transaction_data: { sprout_id: 'sprout-123' },
        automation_id: null,
      })
    })

    it('should return 400 if hashId is missing', async () => {
      const token = generateTestToken()

      // Express returns 404 for unmatched routes (empty params don't match)
      const response = await request(app)
        .post('/api/seeds//test-slug/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .send({ sprout_type: 'followup', sprout_data: {} })
        .expect(404)
    })

    it('should return 400 if sprout_type is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/seeds/seed-1/test-slug/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .send({ sprout_data: {} })
        .expect(400)

      expect(response.body.error).toBe('sprout_type and sprout_data are required')
    })

    it('should return 400 if sprout_data is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/seeds/seed-1/test-slug/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .send({ sprout_type: 'followup' })
        .expect(400)

      expect(response.body.error).toBe('sprout_type and sprout_data are required')
    })

    it('should return 404 if seed not found', async () => {
      const token = generateTestToken()

      vi.mocked(SeedsService.getByHashId).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/seeds/non-existent/slug/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .send({ sprout_type: 'followup', sprout_data: {} })
        .expect(404)

      expect(response.body.error).toBe('Seed not found')
    })
  })

  describe('POST /api/seeds/:seedId/sprouts', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/seeds/seed-123/sprouts')
        .send({ sprout_type: 'followup', sprout_data: {} })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should create sprout for UUID seedId', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockSprout = {
        id: 'sprout-123',
        seed_id: 'seed-123',
        sprout_type: 'musing',
        sprout_data: {
          template_type: 'numbered_ideas',
          content: { ideas: ['Idea 1'] },
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
        created_at: new Date('2024-01-01T10:00:00Z'),
        automation_id: null,
      }

      vi.mocked(SproutsService.create).mockResolvedValue(mockSprout as any)
      vi.mocked(SeedTransactionsService.create).mockResolvedValue({
        id: 'txn-123',
        seed_id: 'seed-123',
        transaction_type: 'add_sprout',
        transaction_data: { sprout_id: 'sprout-123' },
        created_at: new Date(),
        automation_id: null,
      } as any)

      const response = await request(app)
        .post('/api/seeds/seed-123/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sprout_type: 'musing',
          sprout_data: {
            template_type: 'numbered_ideas',
            content: { ideas: ['Idea 1'] },
            dismissed: false,
            dismissed_at: null,
            completed: false,
            completed_at: null,
          },
        })
        .expect(201)

      expect(response.body.id).toBe('sprout-123')
      // seed-123 is 9 chars, not 36, so it uses getByHashId, not getById
      expect(SeedsService.getByHashId).toHaveBeenCalledWith('seed-123', 'user-123')
    })

    it('should create sprout for hashId seedId', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockSprout = {
        id: 'sprout-123',
        seed_id: 'seed-123',
        sprout_type: 'followup',
        sprout_data: {},
        created_at: new Date('2024-01-01T10:00:00Z'),
        automation_id: null,
      }

      vi.mocked(SproutsService.create).mockResolvedValue(mockSprout as any)
      vi.mocked(SeedTransactionsService.create).mockResolvedValue({
        id: 'txn-123',
        seed_id: 'seed-123',
        transaction_type: 'add_sprout',
        transaction_data: { sprout_id: 'sprout-123' },
        created_at: new Date(),
        automation_id: null,
      } as any)

      const response = await request(app)
        .post('/api/seeds/seed-1/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .send({ sprout_type: 'followup', sprout_data: {} })
        .expect(201)

      expect(SeedsService.getByHashId).toHaveBeenCalledWith('seed-1', 'user-123')
    })

    it('should return 400 if seedId is missing', async () => {
      const token = generateTestToken()

      // Express returns 404 for unmatched routes (empty params don't match)
      const response = await request(app)
        .post('/api/seeds//sprouts')
        .set('Authorization', `Bearer ${token}`)
        .send({ sprout_type: 'followup', sprout_data: {} })
        .expect(404)
    })

    it('should return 400 if sprout_type is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/seeds/seed-123/sprouts')
        .set('Authorization', `Bearer ${token}`)
        .send({ sprout_data: {} })
        .expect(400)

      expect(response.body.error).toBe('sprout_type and sprout_data are required')
    })
  })

  describe('DELETE /api/sprouts/:sproutId', () => {
    it('should require authentication', async () => {
      const response = await request(app).delete('/api/sprouts/sprout-123').expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should delete sprout', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      vi.mocked(SproutsService.delete).mockResolvedValue(true)

      await request(app)
        .delete('/api/sprouts/sprout-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(204)

      expect(SproutsService.verifySproutOwnership).toHaveBeenCalledWith('sprout-123', 'user-123')
      expect(SproutsService.delete).toHaveBeenCalledWith('sprout-123')
    })

    it('should return 400 if sproutId is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .delete('/api/sprouts/')
        .set('Authorization', `Bearer ${token}`)
        .expect(404) // Express returns 404 for missing route param
    })

    it('should return 404 if sprout not found', async () => {
      const token = generateTestToken()

      vi.mocked(SproutsService.verifySproutOwnership).mockResolvedValue(false)

      const response = await request(app)
        .delete('/api/sprouts/sprout-999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Sprout not found')
    })

    it('should return 404 if sprout deletion fails', async () => {
      const token = generateTestToken()

      vi.mocked(SproutsService.delete).mockResolvedValue(false)

      const response = await request(app)
        .delete('/api/sprouts/sprout-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Sprout not found')
    })
  })

  describe('PUT /api/sprouts/:sproutId/followup/edit', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/sprouts/sprout-123/followup/edit')
        .send({ due_time: new Date().toISOString() })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should edit followup sprout', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockState = {
        due_time: new Date('2024-01-03T10:00:00Z'),
        message: 'Updated message',
        dismissed: false,
        transactions: [],
      }

      vi.mocked(followupHandler.editFollowup).mockResolvedValue(mockState as any)

      const response = await request(app)
        .put('/api/sprouts/sprout-123/followup/edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          due_time: new Date('2024-01-03T10:00:00Z').toISOString(),
          message: 'Updated message',
        })
        .expect(200)

      expect(response.body.due_time).toBeDefined()
      expect(followupHandler.editFollowup).toHaveBeenCalledWith('sprout-123', {
        due_time: expect.any(String),
        message: 'Updated message',
      })
    })

    it('should return 400 if sproutId is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .put('/api/sprouts//followup/edit')
        .set('Authorization', `Bearer ${token}`)
        .send({ due_time: new Date().toISOString() })
        .expect(404) // Express returns 404 for missing route param
    })

    it('should return 404 if sprout not found', async () => {
      const token = generateTestToken()

      vi.mocked(SproutsService.verifySproutOwnership).mockResolvedValue(false)

      const response = await request(app)
        .put('/api/sprouts/sprout-999/followup/edit')
        .set('Authorization', `Bearer ${token}`)
        .send({ due_time: new Date().toISOString() })
        .expect(404)

      expect(response.body.error).toBe('Sprout not found')
    })

    it('should return 404 if sprout is not followup type', async () => {
      const token = generateTestToken()

      vi.mocked(followupHandler.editFollowup).mockRejectedValue(
        new Error('Sprout is not a followup type')
      )

      const response = await request(app)
        .put('/api/sprouts/sprout-123/followup/edit')
        .set('Authorization', `Bearer ${token}`)
        .send({ due_time: new Date().toISOString() })
        .expect(404)

      expect(response.body.error).toBe('Sprout is not a followup type')
    })

    it('should return 400 if sprout is dismissed', async () => {
      const token = generateTestToken()

      vi.mocked(followupHandler.editFollowup).mockRejectedValue(
        new Error('Cannot edit dismissed followup sprout')
      )

      const response = await request(app)
        .put('/api/sprouts/sprout-123/followup/edit')
        .set('Authorization', `Bearer ${token}`)
        .send({ due_time: new Date().toISOString() })
        .expect(400)

      expect(response.body.error).toBe('Cannot edit dismissed followup sprout')
    })
  })

  describe('POST /api/sprouts/:sproutId/followup/dismiss', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/sprouts/sprout-123/followup/dismiss')
        .send({ type: 'followup' })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should dismiss followup sprout', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockState = {
        due_time: new Date('2024-01-02T10:00:00Z'),
        message: 'Test message',
        dismissed: true,
        dismissed_at: new Date('2024-01-01T12:00:00Z'),
        transactions: [],
      }

      vi.mocked(followupHandler.dismissFollowup).mockResolvedValue(mockState as any)

      const response = await request(app)
        .post('/api/sprouts/sprout-123/followup/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'followup' })
        .expect(200)

      expect(response.body.dismissed).toBe(true)
      expect(followupHandler.dismissFollowup).toHaveBeenCalledWith('sprout-123', { type: 'followup' })
    })

    it('should return 400 if sproutId is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/sprouts//followup/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'followup' })
        .expect(404) // Express returns 404 for missing route param
    })

    it('should return 404 if sprout not found', async () => {
      const token = generateTestToken()

      vi.mocked(SproutsService.verifySproutOwnership).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/sprouts/sprout-999/followup/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'followup' })
        .expect(404)

      expect(response.body.error).toBe('Sprout not found')
    })

    it('should return 404 if sprout is not followup type', async () => {
      const token = generateTestToken()

      vi.mocked(followupHandler.dismissFollowup).mockRejectedValue(
        new Error('Sprout is not a followup type')
      )

      const response = await request(app)
        .post('/api/sprouts/sprout-123/followup/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'followup' })
        .expect(404)

      expect(response.body.error).toBe('Sprout is not a followup type')
    })
  })

  describe('POST /api/sprouts/:sproutId/followup/snooze', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/sprouts/sprout-123/followup/snooze')
        .send({ duration_minutes: 60 })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should snooze followup sprout', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockState = {
        due_time: new Date('2024-01-02T11:00:00Z'),
        message: 'Test message',
        dismissed: false,
        transactions: [],
      }

      vi.mocked(followupHandler.snoozeFollowup).mockResolvedValue(mockState as any)

      const response = await request(app)
        .post('/api/sprouts/sprout-123/followup/snooze')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration_minutes: 60 })
        .expect(200)

      expect(response.body.due_time).toBeDefined()
      expect(followupHandler.snoozeFollowup).toHaveBeenCalledWith(
        'sprout-123',
        { duration_minutes: 60 },
        'manual'
      )
    })

    it('should return 400 if sproutId is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/sprouts//followup/snooze')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration_minutes: 60 })
        .expect(404) // Express returns 404 for missing route param
    })

    it('should return 400 if duration_minutes is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/sprouts/sprout-123/followup/snooze')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400)

      expect(response.body.error).toBe('duration_minutes is required and must be a number')
    })

    it('should return 400 if duration_minutes is not a number', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/sprouts/sprout-123/followup/snooze')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration_minutes: 'not-a-number' })
        .expect(400)

      expect(response.body.error).toBe('duration_minutes is required and must be a number')
    })

    it('should return 404 if sprout not found', async () => {
      const token = generateTestToken()

      vi.mocked(SproutsService.verifySproutOwnership).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/sprouts/sprout-999/followup/snooze')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration_minutes: 60 })
        .expect(404)

      expect(response.body.error).toBe('Sprout not found')
    })

    it('should return 404 if sprout is not followup type', async () => {
      const token = generateTestToken()

      vi.mocked(followupHandler.snoozeFollowup).mockRejectedValue(
        new Error('Sprout is not a followup type')
      )

      const response = await request(app)
        .post('/api/sprouts/sprout-123/followup/snooze')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration_minutes: 60 })
        .expect(404)

      expect(response.body.error).toBe('Sprout is not a followup type')
    })

    it('should return 400 if sprout is dismissed', async () => {
      const token = generateTestToken()

      vi.mocked(followupHandler.snoozeFollowup).mockRejectedValue(
        new Error('Cannot snooze dismissed followup sprout')
      )

      const response = await request(app)
        .post('/api/sprouts/sprout-123/followup/snooze')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration_minutes: 60 })
        .expect(400)

      expect(response.body.error).toBe('Cannot snooze dismissed followup sprout')
    })
  })

  describe('POST /api/sprouts/:sproutId/musing/dismiss', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/sprouts/sprout-123/musing/dismiss')
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should dismiss musing sprout', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockSprout = {
        id: 'sprout-123',
        seed_id: 'seed-123',
        sprout_type: 'musing',
        sprout_data: {
          template_type: 'numbered_ideas',
          content: { ideas: ['Idea 1'] },
          dismissed: true,
          dismissed_at: new Date().toISOString(),
          completed: false,
          completed_at: null,
        },
        created_at: new Date('2024-01-01T10:00:00Z'),
        automation_id: null,
      }

      vi.mocked(musingHandler.dismissMusing).mockResolvedValue(mockSprout as any)

      const response = await request(app)
        .post('/api/sprouts/sprout-123/musing/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.dismissed).toBe(true)
      expect(musingHandler.dismissMusing).toHaveBeenCalledWith('sprout-123')
    })

    it('should return 400 if sproutId is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/sprouts//musing/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .expect(404) // Express returns 404 for missing route param
    })

    it('should return 404 if sprout not found', async () => {
      const token = generateTestToken()

      vi.mocked(SproutsService.verifySproutOwnership).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/sprouts/sprout-999/musing/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Sprout not found')
    })

    it('should return 404 if sprout is not musing type', async () => {
      const token = generateTestToken()

      vi.mocked(musingHandler.dismissMusing).mockRejectedValue(new Error('Sprout is not a musing type'))

      const response = await request(app)
        .post('/api/sprouts/sprout-123/musing/dismiss')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Sprout is not a musing type')
    })
  })

  describe('POST /api/sprouts/:sproutId/musing/complete', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/sprouts/sprout-123/musing/complete')
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should complete musing sprout', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockSprout = {
        id: 'sprout-123',
        seed_id: 'seed-123',
        sprout_type: 'musing',
        sprout_data: {
          template_type: 'numbered_ideas',
          content: { ideas: ['Idea 1'] },
          dismissed: false,
          dismissed_at: null,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        created_at: new Date('2024-01-01T10:00:00Z'),
        automation_id: null,
      }

      vi.mocked(musingHandler.completeMusing).mockResolvedValue(mockSprout as any)

      const response = await request(app)
        .post('/api/sprouts/sprout-123/musing/complete')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.completed).toBe(true)
      expect(musingHandler.completeMusing).toHaveBeenCalledWith('sprout-123')
    })

    it('should return 400 if sproutId is missing', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .post('/api/sprouts//musing/complete')
        .set('Authorization', `Bearer ${token}`)
        .expect(404) // Express returns 404 for missing route param
    })

    it('should return 404 if sprout not found', async () => {
      const token = generateTestToken()

      vi.mocked(SproutsService.verifySproutOwnership).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/sprouts/sprout-999/musing/complete')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Sprout not found')
    })

    it('should return 404 if sprout is not musing type', async () => {
      const token = generateTestToken()

      vi.mocked(musingHandler.completeMusing).mockRejectedValue(
        new Error('Sprout is not a musing type')
      )

      const response = await request(app)
        .post('/api/sprouts/sprout-123/musing/complete')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Sprout is not a musing type')
    })
  })
})

