// Categories routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import categoriesRoutes from '../../routes/categories'
import { generateTestToken } from '../../test-helpers'
import * as authService from '../../services/auth'

// Mock the categories service
vi.mock('../../services/categories', () => {
  const mockGetAllCategories = vi.fn()
  return {
    getAllCategories: mockGetAllCategories,
    __mockGetAllCategories: mockGetAllCategories,
  }
})

const mockCategories = [
  {
    id: 'cat-1',
    parent_id: null,
    name: 'Work',
    path: '/work',
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-2',
    parent_id: 'cat-1',
    name: 'Projects',
    path: '/work/projects',
    created_at: '2024-01-02T00:00:00.000Z',
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
app.use('/api/categories', categoriesRoutes)

describe('Categories Routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const categoriesModule = await import('../../services/categories')
    const mockGetAllCategories = (categoriesModule as any).__mockGetAllCategories
    mockGetAllCategories.mockResolvedValue(mockCategories)
    
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

  describe('GET /api/categories', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(401)

      expect(response.body.error).toContain('Unauthorized')
    })

    it('should return all categories for authenticated user', async () => {
      const token = generateTestToken({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        id: 'cat-1',
        parent_id: null,
        name: 'Work',
        path: '/work',
      })
      expect(response.body[0]).toHaveProperty('created_at')
    })

    it('should return 401 when token is invalid', async () => {
      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.error).toContain('Invalid token')
    })

    it('should return categories in correct format', async () => {
      const token = generateTestToken()

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      const category = response.body[0]
      expect(category).toHaveProperty('id')
      expect(category).toHaveProperty('parent_id')
      expect(category).toHaveProperty('name')
      expect(category).toHaveProperty('path')
      expect(category).toHaveProperty('created_at')
      expect(typeof category.id).toBe('string')
      expect(typeof category.name).toBe('string')
      expect(typeof category.path).toBe('string')
      expect(typeof category.created_at).toBe('string')
    })
  })
})

