// Tags routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import tagsRoutes from '../../routes/tags'
import { generateTestToken } from '../../test-helpers'
import * as authService from '../../services/auth'

// Mock the tags service
vi.mock('../../services/tags', () => {
  const mockGetAllTags = vi.fn()
  return {
    getAllTags: mockGetAllTags,
    __mockGetAllTags: mockGetAllTags,
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
})

