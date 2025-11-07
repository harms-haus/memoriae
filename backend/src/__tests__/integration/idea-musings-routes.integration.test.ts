// Idea musings routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import ideaMusingsRoutes from '../../routes/idea-musings'
import { generateTestToken } from '../../test-helpers'
import * as authService from '../../services/auth'
import { IdeaMusingsService } from '../../services/idea-musings'
import { SeedsService } from '../../services/seeds'
import { SettingsService } from '../../services/settings'
import { IdeaMusingAutomation } from '../../services/automation/idea-musing'
import { addAutomationJob } from '../../services/queue/queue'
import db from '../../db/connection'

// Mock the services
vi.mock('../../services/idea-musings', () => ({
  IdeaMusingsService: {
    getDailyMusings: vi.fn(),
    getBySeedId: vi.fn(),
    getById: vi.fn(),
    dismiss: vi.fn(),
    create: vi.fn(),
    recordShown: vi.fn(),
    getSeedsShownInLastDays: vi.fn(),
  },
}))

vi.mock('../../services/seeds', () => ({
  SeedsService: {
    getByUser: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../../services/settings', () => ({
  SettingsService: {
    getByUserId: vi.fn(),
  },
}))

vi.mock('../../services/automation/idea-musing', () => ({
  IdeaMusingAutomation: vi.fn(),
}))

vi.mock('../../services/queue/queue', () => ({
  addAutomationJob: vi.fn(),
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

// Mock auth middleware
vi.mock('../../middleware/auth', async () => {
  const actual = await vi.importActual('../../middleware/auth')
  return actual
})

const app = express()
app.use(express.json())
app.use('/api/idea-musings', ideaMusingsRoutes)

describe('Idea Musings Routes', () => {
  const mockUserId = 'user-123'
  const mockSeedId = 'seed-123'
  const mockMusingId = 'musing-123'

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock getUserById
    vi.mocked(authService.getUserById).mockResolvedValue({
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      provider: 'google',
      provider_id: 'provider-123',
      created_at: new Date(),
    })

    // Mock database seed lookup
    const mockWhere = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockResolvedValue({
      id: mockSeedId,
      user_id: mockUserId,
    })
    vi.mocked(db).mockReturnValue({
      where: mockWhere,
      first: mockFirst,
    } as any)
  })

  describe('GET /api/idea-musings', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/idea-musings')
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return daily musings for authenticated user', async () => {
      const token = generateTestToken({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const mockMusings = [
        {
          id: mockMusingId,
          seed_id: mockSeedId,
          template_type: 'numbered_ideas',
          content: { ideas: ['Idea 1', 'Idea 2'] },
          created_at: new Date(),
          dismissed: false,
          dismissed_at: null,
        },
      ]

      vi.mocked(IdeaMusingsService.getDailyMusings).mockResolvedValue(mockMusings as any)

      const response = await request(app)
        .get('/api/idea-musings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe(mockMusingId)
    })

    it('should return empty array when no musings exist', async () => {
      const token = generateTestToken({ id: mockUserId })

      vi.mocked(IdeaMusingsService.getDailyMusings).mockResolvedValue([])

      const response = await request(app)
        .get('/api/idea-musings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })

    it('should handle missing table gracefully', async () => {
      const token = generateTestToken({ id: mockUserId })
      const error = new Error('relation "idea_musings" does not exist')
      ;(error as any).code = '42P01'

      vi.mocked(IdeaMusingsService.getDailyMusings).mockRejectedValue(error)

      const response = await request(app)
        .get('/api/idea-musings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })
  })

  describe('GET /api/idea-musings/seed/:seedId', () => {
    it('should return musings for seed', async () => {
      const token = generateTestToken({ id: mockUserId })

      const mockSeed = {
        id: mockSeedId,
        user_id: mockUserId,
        created_at: new Date(),
        currentState: { seed: 'Test seed', timestamp: new Date().toISOString(), metadata: {} },
      }

      const mockMusings = [
        {
          id: mockMusingId,
          seed_id: mockSeedId,
          template_type: 'numbered_ideas',
          content: { ideas: ['Idea 1'] },
          created_at: new Date(),
          dismissed: false,
          dismissed_at: null,
        },
      ]

      vi.mocked(SeedsService.getById).mockResolvedValue(mockSeed as any)
      vi.mocked(IdeaMusingsService.getBySeedId).mockResolvedValue(mockMusings as any)

      const response = await request(app)
        .get(`/api/idea-musings/seed/${mockSeedId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
    })

    it('should return 404 if seed not found', async () => {
      const token = generateTestToken({ id: mockUserId })

      vi.mocked(SeedsService.getById).mockResolvedValue(null)

      const response = await request(app)
        .get(`/api/idea-musings/seed/${mockSeedId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Seed not found')
    })
  })

  describe('POST /api/idea-musings/generate', () => {
    it('should require API key', async () => {
      const token = generateTestToken({ id: mockUserId })

      vi.mocked(SettingsService.getByUserId).mockResolvedValue({
        id: 'settings-1',
        user_id: mockUserId,
        openrouter_api_key: null,
        openrouter_model: null,
        created_at: new Date(),
        updated_at: new Date(),
      } as any)

      const response = await request(app)
        .post('/api/idea-musings/generate')
        .set('Authorization', `Bearer ${token}`)
        .expect(400)

      expect(response.body.error).toBe('OpenRouter API key not configured')
    })

    it('should return error if no seeds found', async () => {
      const token = generateTestToken({ id: mockUserId })

      vi.mocked(SettingsService.getByUserId).mockResolvedValue({
        id: 'settings-1',
        user_id: mockUserId,
        openrouter_api_key: 'test-key',
        openrouter_model: null,
        created_at: new Date(),
        updated_at: new Date(),
      } as any)

      vi.mocked(SeedsService.getByUser).mockResolvedValue([])

      const response = await request(app)
        .post('/api/idea-musings/generate')
        .set('Authorization', `Bearer ${token}`)
        .expect(400)

      expect(response.body.error).toBe('No seeds found. Create some seeds first.')
    })

    it('should generate musings successfully', async () => {
      const token = generateTestToken({ id: mockUserId })

      const mockSeed = {
        id: mockSeedId,
        user_id: mockUserId,
        created_at: new Date(),
        currentState: {
          seed: 'I want to build an app',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      vi.mocked(SettingsService.getByUserId).mockResolvedValue({
        id: 'settings-1',
        user_id: mockUserId,
        openrouter_api_key: 'test-key',
        openrouter_model: null,
        created_at: new Date(),
        updated_at: new Date(),
      } as any)

      vi.mocked(SeedsService.getByUser).mockResolvedValue([mockSeed] as any)
      vi.mocked(IdeaMusingsService.getSeedsShownInLastDays).mockResolvedValue(new Set())

      const mockAutomation = {
        identifyIdeaSeeds: vi.fn().mockResolvedValue([mockSeed]),
        generateMusing: vi.fn().mockResolvedValue({
          templateType: 'numbered_ideas',
          content: { ideas: ['Idea 1'] },
        }),
      }

      vi.mocked(IdeaMusingAutomation).mockImplementation(() => mockAutomation as any)
      vi.mocked(IdeaMusingsService.create).mockResolvedValue({
        id: mockMusingId,
        seed_id: mockSeedId,
        template_type: 'numbered_ideas',
        content: { ideas: ['Idea 1'] },
        created_at: new Date(),
        dismissed: false,
        dismissed_at: null,
      } as any)

      vi.mocked(IdeaMusingsService.recordShown).mockResolvedValue()

      const response = await request(app)
        .post('/api/idea-musings/generate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.musingsCreated).toBe(1)
    })
  })

  describe('POST /api/idea-musings/:musingId/dismiss', () => {
    it('should dismiss musing', async () => {
      const token = generateTestToken({ id: mockUserId })

      const mockMusing = {
        id: mockMusingId,
        seed_id: mockSeedId,
        user_id: mockUserId,
        template_type: 'numbered_ideas',
        content: { ideas: ['Idea 1'] },
        created_at: new Date(),
        dismissed: false,
        dismissed_at: null,
      }

      const dismissedMusing = {
        ...mockMusing,
        dismissed: true,
        dismissed_at: new Date(),
      }

      vi.mocked(IdeaMusingsService.getById).mockResolvedValue(mockMusing as any)
      vi.mocked(IdeaMusingsService.dismiss).mockResolvedValue(dismissedMusing as any)

      const response = await request(app)
        .post(`/api/idea-musings/${mockMusingId}/dismiss`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.dismissed).toBe(true)
    })

    it('should return 404 if musing not found', async () => {
      const token = generateTestToken({ id: mockUserId })

      vi.mocked(IdeaMusingsService.getById).mockResolvedValue(null)

      const response = await request(app)
        .post(`/api/idea-musings/${mockMusingId}/dismiss`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Musing not found')
    })
  })

  describe('POST /api/idea-musings/:musingId/apply-idea', () => {
    it('should return preview without confirm', async () => {
      const token = generateTestToken({ id: mockUserId })

      const mockMusing = {
        id: mockMusingId,
        seed_id: mockSeedId,
        user_id: mockUserId,
        template_type: 'numbered_ideas',
        content: { ideas: ['Idea 1', 'Idea 2'] },
        created_at: new Date(),
        dismissed: false,
        dismissed_at: null,
      }

      const mockSeed = {
        id: mockSeedId,
        user_id: mockUserId,
        created_at: new Date(),
        currentState: {
          seed: 'Original content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      vi.mocked(IdeaMusingsService.getById).mockResolvedValue(mockMusing as any)
      vi.mocked(SeedsService.getById).mockResolvedValue(mockSeed as any)

      const response = await request(app)
        .post(`/api/idea-musings/${mockMusingId}/apply-idea`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ideaIndex: 0 })
        .expect(200)

      expect(response.body.preview).toBeDefined()
      expect(response.body.preview).toContain('Original content')
      expect(response.body.preview).toContain('Idea 1')
    })

    it('should apply idea with confirm', async () => {
      const token = generateTestToken({ id: mockUserId })

      const mockMusing = {
        id: mockMusingId,
        seed_id: mockSeedId,
        user_id: mockUserId,
        template_type: 'numbered_ideas',
        content: { ideas: ['Idea 1'] },
        created_at: new Date(),
        dismissed: false,
        dismissed_at: null,
      }

      const mockSeed = {
        id: mockSeedId,
        user_id: mockUserId,
        created_at: new Date(),
        currentState: {
          seed: 'Original content',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      }

      vi.mocked(IdeaMusingsService.getById).mockResolvedValue(mockMusing as any)
      vi.mocked(SeedsService.getById).mockResolvedValue(mockSeed as any)
      vi.mocked(SeedsService.update).mockResolvedValue(mockSeed as any)

      const response = await request(app)
        .post(`/api/idea-musings/${mockMusingId}/apply-idea`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ideaIndex: 0, confirm: true })
        .expect(200)

      expect(response.body.applied).toBe(true)
      expect(SeedsService.update).toHaveBeenCalled()
    })

    it('should return 400 for invalid idea index', async () => {
      const token = generateTestToken({ id: mockUserId })

      const mockMusing = {
        id: mockMusingId,
        seed_id: mockSeedId,
        user_id: mockUserId,
        template_type: 'numbered_ideas',
        content: { ideas: ['Idea 1'] },
        created_at: new Date(),
        dismissed: false,
        dismissed_at: null,
      }

      vi.mocked(IdeaMusingsService.getById).mockResolvedValue(mockMusing as any)

      const response = await request(app)
        .post(`/api/idea-musings/${mockMusingId}/apply-idea`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ideaIndex: 10 })
        .expect(400)

      expect(response.body.error).toBe('Invalid idea index')
    })
  })
})

