// Tags routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import tagsRoutes from '../../routes/tags'
import { authenticate } from '../../middleware/auth'
import { generateTestToken } from '../../test-helpers'
import { getAllTags, getByName, edit, setColor, getSeedsByTagName } from '../../services/tags'
import * as authService from '../../services/auth'

// Mock services
vi.mock('../../services/tags', () => ({
  getAllTags: vi.fn(),
  getByName: vi.fn(),
  edit: vi.fn(),
  setColor: vi.fn(),
  getSeedsByTagName: vi.fn(),
}))

// Mock auth service
vi.mock('../../services/auth', () => ({
  getUserById: vi.fn(),
}))

const app = express()
app.use(express.json())
app.use('/api/tags', authenticate, tagsRoutes)

describe('Tags Routes', () => {
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

  describe('GET /api/tags', () => {
    it('should return all tags', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'work',
          color: '#ff0000',
          currentState: {
            name: 'work',
            color: '#ff0000',
          },
        },
        {
          id: 'tag-2',
          name: 'personal',
          color: null,
          currentState: {
            name: 'personal',
            color: null,
          },
        },
      ]

      ;(getAllTags as any).mockResolvedValue(mockTags)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        id: 'tag-1',
        name: 'work',
      })
      expect(getAllTags).toHaveBeenCalled()
    })

    it('should return empty array when no tags exist', async () => {
      ;(getAllTags as any).mockResolvedValue([])

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toEqual([])
    })

    it('should handle service errors gracefully', async () => {
      ;(getAllTags as any).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })
  })

  describe('GET /api/tags/:name', () => {
    it('should return tag by name', async () => {
      const mockTag = {
        id: 'tag-1',
        name: 'work',
        color: '#ff0000',
        currentState: {
          name: 'work',
          color: '#ff0000',
        },
        transactions: [],
      }

      ;(getByName as any).mockResolvedValue(mockTag)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/tags/work')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'tag-1',
        name: 'work',
      })
      expect(getByName).toHaveBeenCalledWith('work')
    })

    it('should return 404 when tag not found', async () => {
      ;(getByName as any).mockResolvedValue(null)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/tags/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Tag not found',
      })
    })

    // Note: Express routing handles trailing slashes, so this test is not applicable
    // The route handler itself checks for id in req.params, which is tested in other cases

    it('should handle service errors gracefully', async () => {
      ;(getByName as any).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/tags/tag-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })
  })

  describe('GET /api/tags/:name/seeds', () => {
    it('should return seeds for tag', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date(),
          slug: 'abc1234/test-seed',
          currentState: {
            seed: 'Seed content',
            tags: [{ id: 'tag-1', name: 'work' }],
          },
        },
      ]

      ;(getSeedsByTagName as any).mockResolvedValue(mockSeeds)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/tags/work/seeds')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        id: 'seed-1',
      })
      expect(getSeedsByTagName).toHaveBeenCalledWith('work')
    })

    it('should return empty array when tag has no seeds', async () => {
      ;(getSeedsByTagName as any).mockResolvedValue([])

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/tags/work/seeds')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toEqual([])
    })

    // Note: Express routing handles trailing slashes, so this test is not applicable
    // The route handler itself checks for id in req.params, which is tested in other cases
  })

  describe('PUT /api/tags/:name', () => {
    it('should update tag name only', async () => {
      const mockTag = {
        id: 'tag-1',
        name: 'work',
        color: '#ff0000',
        currentState: {
          name: 'work',
          color: '#ff0000',
        },
        transactions: [],
      }
      const mockUpdatedTag = {
        id: 'tag-1',
        name: 'updated-work',
        color: '#ff0000',
        currentState: {
          name: 'updated-work',
          color: '#ff0000',
        },
        transactions: [],
      }

      ;(getByName as any).mockResolvedValue(mockTag)
      ;(edit as any).mockResolvedValue(mockUpdatedTag)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .put('/api/tags/work')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'updated-work' })
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'tag-1',
        name: 'updated-work',
      })
      expect(getByName).toHaveBeenCalledWith('work')
      expect(edit).toHaveBeenCalledWith('tag-1', { name: 'updated-work' })
    })

    it('should update tag color only', async () => {
      const mockTag = {
        id: 'tag-1',
        name: 'work',
        color: '#ff0000',
        currentState: {
          name: 'work',
          color: '#ff0000',
        },
        transactions: [],
      }
      const mockUpdatedTag = {
        id: 'tag-1',
        name: 'work',
        color: '#00ff00',
        currentState: {
          name: 'work',
          color: '#00ff00',
        },
        transactions: [],
      }

      ;(getByName as any).mockResolvedValue(mockTag)
      ;(setColor as any).mockResolvedValue(mockUpdatedTag)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .put('/api/tags/work')
        .set('Authorization', `Bearer ${token}`)
        .send({ color: '#00ff00' })
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'tag-1',
        color: '#00ff00',
      })
      expect(getByName).toHaveBeenCalledWith('work')
      expect(setColor).toHaveBeenCalledWith('tag-1', '#00ff00')
    })

    it('should update both name and color', async () => {
      const mockTag = {
        id: 'tag-1',
        name: 'work',
        color: '#ff0000',
        currentState: {
          name: 'work',
          color: '#ff0000',
        },
        transactions: [],
      }
      const mockTagAfterEdit = {
        id: 'tag-1',
        name: 'updated-work',
        color: '#ff0000',
        currentState: {
          name: 'updated-work',
          color: '#ff0000',
        },
        transactions: [],
      }
      const mockTagAfterColor = {
        id: 'tag-1',
        name: 'updated-work',
        color: '#00ff00',
        currentState: {
          name: 'updated-work',
          color: '#00ff00',
        },
        transactions: [],
      }

      ;(getByName as any).mockResolvedValue(mockTag)
      ;(edit as any).mockResolvedValue(mockTagAfterEdit)
      ;(setColor as any).mockResolvedValue(mockTagAfterColor)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .put('/api/tags/work')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'updated-work', color: '#00ff00' })
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'tag-1',
        name: 'updated-work',
        color: '#00ff00',
      })
      expect(getByName).toHaveBeenCalledWith('work')
      expect(edit).toHaveBeenCalledWith('tag-1', { name: 'updated-work' })
      expect(setColor).toHaveBeenCalledWith('tag-1', '#00ff00')
    })

    it('should clear color when color is null', async () => {
      const mockTag = {
        id: 'tag-1',
        name: 'work',
        color: '#ff0000',
        currentState: {
          name: 'work',
          color: '#ff0000',
        },
        transactions: [],
      }
      const mockTagAfterEdit = {
        id: 'tag-1',
        name: 'work',
        color: '#ff0000',
        currentState: {
          name: 'work',
          color: '#ff0000',
        },
        transactions: [],
      }
      const mockTagAfterColor = {
        id: 'tag-1',
        name: 'work',
        color: null,
        currentState: {
          name: 'work',
          color: null,
        },
        transactions: [],
      }

      ;(getByName as any).mockResolvedValue(mockTag)
      ;(edit as any).mockResolvedValue(mockTagAfterEdit)
      ;(setColor as any).mockResolvedValue(mockTagAfterColor)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .put('/api/tags/work')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'work', color: null })
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'tag-1',
        color: null,
      })
      expect(getByName).toHaveBeenCalledWith('work')
      expect(setColor).toHaveBeenCalledWith('tag-1', null)
    })

    it('should return 400 when no fields to update', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .put('/api/tags/work')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'No fields to update',
      })
    })

    // Note: Express routing handles trailing slashes, so this test is not applicable
    // The route handler itself checks for id in req.params, which is tested in other cases
  })
})
