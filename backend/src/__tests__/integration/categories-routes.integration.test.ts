// Categories routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import categoriesRoutes from '../../routes/categories'
import { authenticate } from '../../middleware/auth'
import { generateTestToken } from '../../test-helpers'
import { getAllCategories } from '../../services/categories'
import * as authService from '../../services/auth'

// Mock services
vi.mock('../../services/categories', () => ({
  getAllCategories: vi.fn(),
}))

// Mock auth service
vi.mock('../../services/auth', () => ({
  getUserById: vi.fn(),
}))

const app = express()
app.use(express.json())
app.use('/api/categories', authenticate, categoriesRoutes)

describe('Categories Routes', () => {
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

  describe('GET /api/categories', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Work',
          path: '/work',
          parent_id: null,
          created_at: new Date(),
        },
        {
          id: 'cat-2',
          name: 'Personal',
          path: '/personal',
          parent_id: null,
          created_at: new Date(),
        },
      ]

      ;(getAllCategories as any).mockResolvedValue(mockCategories)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        id: 'cat-1',
        name: 'Work',
      })
      expect(getAllCategories).toHaveBeenCalled()
    })

    it('should return empty array when no categories exist', async () => {
      ;(getAllCategories as any).mockResolvedValue([])

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toEqual([])
    })

    it('should handle service errors gracefully', async () => {
      ;(getAllCategories as any).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })

    it('should require authentication', async () => {
      await request(app)
        .get('/api/categories')
        .expect(401)
    })
  })
})
