// Settings routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import settingsRoutes from '../../routes/settings'
import { authenticate } from '../../middleware/auth'
import { generateTestToken } from '../../test-helpers'
import { SettingsService } from '../../services/settings'
import { OpenRouterClient } from '../../services/openrouter/client'
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

// Mock services
vi.mock('../../services/settings', () => ({
  SettingsService: {
    getByUserId: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../../services/openrouter/client', () => ({
  OpenRouterClient: vi.fn().mockImplementation(() => ({
    getModels: vi.fn(),
  })),
}))

// Mock auth service
vi.mock('../../services/auth', () => ({
  getUserById: vi.fn(),
}))

const app = express()
app.use(express.json())
app.use('/api/settings', authenticate, settingsRoutes)

describe('Settings Routes', () => {
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

  describe('GET /api/settings', () => {
    it('should return user settings', async () => {
      const mockSettings = {
        openrouter_api_key: 'test-key',
        openrouter_model: 'test-model',
        openrouter_model_name: 'Test Model',
        timezone: 'America/New_York',
      }

      ;(SettingsService.getByUserId as any).mockResolvedValue(mockSettings)

      const token = generateTestToken({ id: 'user-123' })
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual(mockSettings)
      expect(SettingsService.getByUserId).toHaveBeenCalledWith('user-123')
    })

    it('should return null values for unset settings', async () => {
      const mockSettings = {
        openrouter_api_key: null,
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: null,
      }

      ;(SettingsService.getByUserId as any).mockResolvedValue(mockSettings)

      const token = generateTestToken()
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual(mockSettings)
    })

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/settings')

      expect(res.status).toBe(401)
    })
  })

  describe('PUT /api/settings', () => {
    it('should update user settings', async () => {
      const updates = {
        openrouter_api_key: 'new-key',
        openrouter_model: 'new-model',
        timezone: 'Europe/London',
      }

      const updatedSettings = {
        openrouter_api_key: 'new-key',
        openrouter_model: 'new-model',
        openrouter_model_name: null,
        timezone: 'Europe/London',
      }

      ;(SettingsService.update as any).mockResolvedValue(updatedSettings)

      const token = generateTestToken()
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .send(updates)

      expect(res.status).toBe(200)
      expect(res.body).toEqual(updatedSettings)
      expect(SettingsService.update).toHaveBeenCalledWith('user-123', updates)
    })

    it('should handle partial updates', async () => {
      const updates = {
        timezone: 'Asia/Tokyo',
      }

      const updatedSettings = {
        openrouter_api_key: 'existing-key',
        openrouter_model: 'existing-model',
        openrouter_model_name: null,
        timezone: 'Asia/Tokyo',
      }

      ;(SettingsService.update as any).mockResolvedValue(updatedSettings)

      const token = generateTestToken()
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .send(updates)

      expect(res.status).toBe(200)
      expect(res.body.timezone).toBe('Asia/Tokyo')
    })

    it('should handle null values in updates', async () => {
      const updates = {
        openrouter_api_key: null,
        timezone: null,
      }

      const updatedSettings = {
        openrouter_api_key: null,
        openrouter_model: 'existing-model',
        openrouter_model_name: null,
        timezone: null,
      }

      ;(SettingsService.update as any).mockResolvedValue(updatedSettings)

      const token = generateTestToken()
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .send(updates)

      expect(res.status).toBe(200)
      expect(res.body.openrouter_api_key).toBeNull()
      expect(res.body.timezone).toBeNull()
    })

    it('should validate openrouter_api_key type', async () => {
      const token = generateTestToken()
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          openrouter_api_key: 123, // Invalid type
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('openrouter_api_key must be a string or null')
    })

    it('should validate openrouter_model type', async () => {
      const token = generateTestToken()
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          openrouter_model: 123, // Invalid type
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('openrouter_model must be a string or null')
    })

    it('should validate timezone format', async () => {
      const token = generateTestToken()
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          timezone: 'Invalid/Timezone',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Invalid IANA timezone identifier')
    })

    it('should accept valid IANA timezone', async () => {
      const updates = {
        timezone: 'America/New_York',
      }

      const updatedSettings = {
        openrouter_api_key: null,
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: 'America/New_York',
      }

      ;(SettingsService.update as any).mockResolvedValue(updatedSettings)

      const token = generateTestToken()
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .send(updates)

      expect(res.status).toBe(200)
      expect(res.body.timezone).toBe('America/New_York')
    })

    it('should require authentication', async () => {
      const res = await request(app)
        .put('/api/settings')
        .send({
          timezone: 'UTC',
        })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/settings/models', () => {
    it('should fetch models from OpenRouter', async () => {
      const mockModels = [
        { id: 'model-1', name: 'Model One' },
        { id: 'model-2', name: 'Model Two' },
      ]

      const mockClient = {
        getModels: vi.fn().mockResolvedValue(mockModels),
      }

      vi.mocked(OpenRouterClient).mockImplementation(() => mockClient as any)

      const token = generateTestToken()
      const res = await request(app)
        .post('/api/settings/models')
        .set('Authorization', `Bearer ${token}`)
        .send({
          api_key: 'test-api-key',
        })

      expect(res.status).toBe(200)
      expect(res.body.models).toEqual(mockModels)
      expect(OpenRouterClient).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      })
      expect(mockClient.getModels).toHaveBeenCalled()
    })

    it('should format model response correctly', async () => {
      const mockModels = [
        { id: 'model-1', name: 'Model One' },
        { id: 'model-2', name: null }, // Model without name
      ]

      const mockClient = {
        getModels: vi.fn().mockResolvedValue(mockModels),
      }

      vi.mocked(OpenRouterClient).mockImplementation(() => mockClient as any)

      const token = generateTestToken()
      const res = await request(app)
        .post('/api/settings/models')
        .set('Authorization', `Bearer ${token}`)
        .send({
          api_key: 'test-api-key',
        })

      expect(res.status).toBe(200)
      expect(res.body.models).toHaveLength(2)
      expect(res.body.models[0]).toEqual({ id: 'model-1', name: 'Model One' })
      expect(res.body.models[1]).toEqual({ id: 'model-2', name: 'model-2' }) // Uses id when name is null
    })

    it('should require api_key', async () => {
      const token = generateTestToken()
      const res = await request(app)
        .post('/api/settings/models')
        .set('Authorization', `Bearer ${token}`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('api_key is required')
    })

    it('should validate api_key is a string', async () => {
      const token = generateTestToken()
      const res = await request(app)
        .post('/api/settings/models')
        .set('Authorization', `Bearer ${token}`)
        .send({
          api_key: 123,
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('api_key is required')
    })

    it('should handle OpenRouter API errors', async () => {
      const mockClient = {
        getModels: vi.fn().mockRejectedValue(new Error('API Error')),
      }

      vi.mocked(OpenRouterClient).mockImplementation(() => mockClient as any)

      const token = generateTestToken()
      const res = await request(app)
        .post('/api/settings/models')
        .set('Authorization', `Bearer ${token}`)
        .send({
          api_key: 'test-api-key',
        })

      expect(res.status).toBe(500)
      expect(res.body.error).toContain('Failed to fetch models')
    })

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/settings/models')
        .send({
          api_key: 'test-key',
        })

      expect(res.status).toBe(401)
    })
  })
})

