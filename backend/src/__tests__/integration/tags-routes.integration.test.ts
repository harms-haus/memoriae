// Tags routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import tagsRoutes from '../../routes/tags'
import { generateTestToken } from '../../test-helpers'
import * as authService from '../../services/auth'
import * as tagsService from '../../services/tags'

// Mock the tags service
vi.mock('../../services/tags', () => {
  const mockGetAllTags = vi.fn()
  const mockGetById = vi.fn()
  const mockGetSeedsByTagId = vi.fn()
  const mockEdit = vi.fn()
  const mockSetColor = vi.fn()
  
  return {
    getAllTags: mockGetAllTags,
    getById: mockGetById,
    getSeedsByTagId: mockGetSeedsByTagId,
    edit: mockEdit,
    setColor: mockSetColor,
    __mockGetAllTags: mockGetAllTags,
    __mockGetById: mockGetById,
    __mockGetSeedsByTagId: mockGetSeedsByTagId,
    __mockEdit: mockEdit,
    __mockSetColor: mockSetColor,
  }
})

const mockTags = [
  {
    id: 'tag-1',
    name: 'work',
    color: '#ffd43b',
  },
  {
    id: 'tag-2',
    name: 'personal',
    color: '',
  },
]

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
app.use('/api/tags', tagsRoutes)

describe('Tags Routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const tagsModule = await import('../../services/tags')
    const mockGetAllTags = (tagsModule as any).__mockGetAllTags
    mockGetAllTags.mockResolvedValue(mockTags)
    
    // Mock getUserById to return a user by default
    vi.mocked(authService.getUserById).mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'google',
      provider_id: 'provider-123',
      created_at: new Date(),
    })
  })

  describe('GET /api/tags', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/tags')
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return all tags for authenticated user', async () => {
      const token = generateTestToken({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        id: 'tag-1',
        name: 'work',
        color: '#ffd43b',
      })
    })

    it('should return 401 when token is invalid', async () => {
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.error).toContain('Invalid token')
    })

    it('should return tags in correct format', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      const tag = response.body[0]
      expect(tag).toHaveProperty('id')
      expect(tag).toHaveProperty('name')
      expect(tag).toHaveProperty('color')
      expect(typeof tag.id).toBe('string')
      expect(typeof tag.name).toBe('string')
      expect(typeof tag.color).toBe('string')
    })

    it('should return empty array when no tags exist', async () => {
      const tagsModule = await import('../../services/tags')
      const mockGetAllTags = (tagsModule as any).__mockGetAllTags
      mockGetAllTags.mockResolvedValue([])

      const token = generateTestToken()

      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })
  })

  describe('GET /api/tags/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/tags/tag-1')
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return tag detail for authenticated user', async () => {
      const mockTagDetail = {
        id: 'tag-1',
        name: 'work',
        color: '#ffd43b',
        currentState: {
          name: 'work',
          color: '#ffd43b',
          timestamp: new Date(),
          metadata: {},
        },
        transactions: [],
      }

      const tagsModule = await import('../../services/tags')
      const mockGetById = (tagsModule as any).__mockGetById
      mockGetById.mockResolvedValue(mockTagDetail)

      const token = generateTestToken()

      const response = await request(app)
        .get('/api/tags/tag-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'tag-1',
        name: 'work',
        color: '#ffd43b',
      })
    })

    it('should return 404 when tag not found', async () => {
      const tagsModule = await import('../../services/tags')
      const mockGetById = (tagsModule as any).__mockGetById
      mockGetById.mockResolvedValue(null)

      const token = generateTestToken()

      const response = await request(app)
        .get('/api/tags/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body.error).toBe('Tag not found')
    })
  })

  describe('GET /api/tags/:id/seeds', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/tags/tag-1/seeds')
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return seeds using the tag', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-1',
          created_at: new Date(),
          tag_added_at: new Date(),
        },
      ]

      const tagsModule = await import('../../services/tags')
      const mockGetSeedsByTagId = (tagsModule as any).__mockGetSeedsByTagId
      mockGetSeedsByTagId.mockResolvedValue(mockSeeds)

      const token = generateTestToken()

      const response = await request(app)
        .get('/api/tags/tag-1/seeds')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toHaveProperty('id')
    })
  })

  describe('PUT /api/tags/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/tags/tag-1')
        .send({ name: 'updated' })
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should update tag name', async () => {
      const mockUpdatedTag = {
        id: 'tag-1',
        name: 'updated',
        color: '#ffd43b',
        currentState: {
          name: 'updated',
          color: '#ffd43b',
          timestamp: new Date(),
          metadata: {},
        },
        transactions: [],
      }

      const tagsModule = await import('../../services/tags')
      const mockEdit = (tagsModule as any).__mockEdit
      mockEdit.mockResolvedValue(mockUpdatedTag)

      const token = generateTestToken()

      const response = await request(app)
        .put('/api/tags/tag-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'updated' })
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'tag-1',
        name: 'updated',
      })
      expect(mockEdit).toHaveBeenCalledWith('tag-1', { name: 'updated' })
    })

    it('should update tag color', async () => {
      const mockUpdatedTag = {
        id: 'tag-1',
        name: 'work',
        color: '#00ff00',
        currentState: {
          name: 'work',
          color: '#00ff00',
          timestamp: new Date(),
          metadata: {},
        },
        transactions: [],
      }

      const tagsModule = await import('../../services/tags')
      const mockSetColor = (tagsModule as any).__mockSetColor
      mockSetColor.mockResolvedValue(mockUpdatedTag)

      const token = generateTestToken()

      const response = await request(app)
        .put('/api/tags/tag-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ color: '#00ff00' })
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'tag-1',
        color: '#00ff00',
      })
      expect(mockSetColor).toHaveBeenCalledWith('tag-1', '#00ff00')
    })

    it('should return 400 when no fields to update', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .put('/api/tags/tag-1')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400)

      expect(response.body.error).toBe('No fields to update')
    })
  })
})

