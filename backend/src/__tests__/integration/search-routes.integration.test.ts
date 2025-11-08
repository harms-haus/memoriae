// Search routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import searchRoutes from '../../routes/search'
import { authenticate } from '../../middleware/auth'
import { generateTestToken } from '../../test-helpers'
import { SeedsService } from '../../services/seeds'
import * as authService from '../../services/auth'

// Mock services
vi.mock('../../services/seeds', () => ({
  SeedsService: {
    getByUser: vi.fn(),
  },
}))

// Mock auth service
vi.mock('../../services/auth', () => ({
  getUserById: vi.fn(),
}))

const app = express()
app.use(express.json())
app.use('/api/search', authenticate, searchRoutes)

describe('Search Routes', () => {
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

  describe('GET /api/search', () => {
    it('should return all seeds when no query parameters', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Test content',
            tags: [],
            categories: [],
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Another seed',
            tags: [],
            categories: [],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(SeedsService.getByUser).toHaveBeenCalledWith('user-123')
    })

    it('should filter seeds by text query in content', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Test content with keyword',
            tags: [],
            categories: [],
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Another seed without match',
            tags: [],
            categories: [],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search?q=keyword')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe('seed-1')
    })

    it('should filter seeds by text query in tag names', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Test content',
            tags: [{ id: 'tag-1', name: 'work' }],
            categories: [],
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Another seed',
            tags: [{ id: 'tag-2', name: 'personal' }],
            categories: [],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search?q=work')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe('seed-1')
    })

    it('should filter seeds by text query in category names', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Test content',
            tags: [],
            categories: [{ id: 'cat-1', name: 'Work' }],
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Another seed',
            tags: [],
            categories: [{ id: 'cat-2', name: 'Personal' }],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search?q=work')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe('seed-1')
    })

    it('should be case-insensitive for text search', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Test CONTENT',
            tags: [],
            categories: [],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search?q=content')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
    })

    it('should filter seeds by category ID', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Test content',
            tags: [],
            categories: [{ id: 'cat-1', name: 'Work' }],
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Another seed',
            tags: [],
            categories: [{ id: 'cat-2', name: 'Personal' }],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search?category=cat-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe('seed-1')
    })

    it('should filter seeds by tag IDs', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Test content',
            tags: [{ id: 'tag-1', name: 'work' }],
            categories: [],
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Another seed',
            tags: [{ id: 'tag-2', name: 'personal' }],
            categories: [],
          },
        },
        {
          id: 'seed-3',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Third seed',
            tags: [{ id: 'tag-1', name: 'work' }, { id: 'tag-2', name: 'personal' }],
            categories: [],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search?tags=tag-1,tag-2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      // Should return seeds that have ANY of the specified tags (OR logic)
      expect(response.body.length).toBeGreaterThanOrEqual(2)
      const seedIds = response.body.map((s: any) => s.id)
      expect(seedIds).toContain('seed-1') // has tag-1
      expect(seedIds).toContain('seed-3') // has both tag-1 and tag-2
      // seed-2 has tag-2, so it should also be included
      expect(seedIds).toContain('seed-2')
    })

    it('should combine multiple filters', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Work project content',
            tags: [{ id: 'tag-1', name: 'work' }],
            categories: [{ id: 'cat-1', name: 'Work' }],
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Personal note',
            tags: [{ id: 'tag-2', name: 'personal' }],
            categories: [{ id: 'cat-2', name: 'Personal' }],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search?q=project&category=cat-1&tags=tag-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe('seed-1')
    })

    it('should ignore empty query string', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Test content',
            tags: [],
            categories: [],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search?q=   ')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
    })

    it('should handle empty tag list', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          currentState: {
            seed: 'Test content',
            tags: [],
            categories: [],
          },
        },
      ]

      ;(SeedsService.getByUser as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/search?tags=,,')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
    })

    it('should handle service errors gracefully', async () => {
      ;(SeedsService.getByUser as any).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/search?q=test')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })

    it('should require authentication', async () => {
      await request(app)
        .get('/api/search')
        .expect(401)
    })
  })
})

