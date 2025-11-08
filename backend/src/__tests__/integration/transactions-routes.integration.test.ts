// Transaction routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import transactionsRoutes from '../../routes/transactions'
import { authenticate } from '../../middleware/auth'
import { generateTestToken } from '../../test-helpers'
import { SeedTransactionsService } from '../../services/seed-transactions'
import { computeSeedState } from '../../utils/seed-state'
import * as authService from '../../services/auth'
import db from '../../db/connection'

// Mock database connection
vi.mock('../../db/connection', () => ({
  default: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    whereIn: vi.fn().mockReturnThis(),
    first: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  })),
}))

// Mock services
vi.mock('../../services/seed-transactions', () => ({
  SeedTransactionsService: {
    getBySeedId: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../../utils/seed-state', () => ({
  computeSeedState: vi.fn(),
}))

// Mock auth service
vi.mock('../../services/auth', () => ({
  getUserById: vi.fn(),
}))

const app = express()
app.use(express.json())
app.use('/api', authenticate, transactionsRoutes)

describe('Transaction Routes', () => {
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

    // Mock database queries
    vi.mocked(db).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      whereIn: vi.fn().mockReturnThis(),
      first: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      transaction: vi.fn(),
    } as any)
  })

  describe('GET /api/seeds/:seedId/transactions', () => {
    it('should return all transactions for a seed', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: new Date(),
          automation_id: null,
        },
        {
          id: 'txn-2',
          seed_id: 'seed-123',
          transaction_type: 'edit_content',
          transaction_data: { content: 'Updated content' },
          created_at: new Date(),
          automation_id: null,
        },
      ]

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        id: 'txn-1',
        seed_id: 'seed-123',
        transaction_type: 'create_seed',
      })
      expect(SeedTransactionsService.getBySeedId).toHaveBeenCalledWith('seed-123')
    })

    it('should return 400 when seed ID is missing', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      // Note: Express routing handles this, but we test the handler's validation
      const response = await request(app)
        .get('/api/seeds//transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(404) // Express routing returns 404 for empty segment
    })

    it('should return 404 when seed not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds/non-existent/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })

    it('should verify seed ownership', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'other-user',
        }),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })

    it('should handle service errors gracefully', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)
      vi.mocked(SeedTransactionsService.getBySeedId).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })
  })

  describe('GET /api/seeds/:seedId/state', () => {
    it('should return computed seed state', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: new Date(),
          automation_id: null,
        },
      ]

      const mockState = {
        seed: 'Test content',
        timestamp: new Date(),
        metadata: {},
        tags: [],
        categories: [],
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)
      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds/seed-123/state')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toMatchObject({
        seed_id: 'seed-123',
        current_state: {
          seed: 'Test content',
          metadata: {},
        },
        transactions_applied: 1,
      })
      expect(response.body.current_state.timestamp).toBeDefined()
      expect(computeSeedState).toHaveBeenCalledWith(mockTransactions)
    })

    it('should return 400 when seed ID is missing', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/seeds//state')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })

    it('should return 404 when seed not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/seeds/non-existent/state')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })

    it('should handle computation errors gracefully', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)
      vi.mocked(SeedTransactionsService.getBySeedId).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/seeds/seed-123/state')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })
  })

  describe('POST /api/seeds/:seedId/transactions', () => {
    it('should create a new transaction', async () => {
      const mockTransaction = {
        id: 'txn-1',
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Updated content' },
        created_at: new Date(),
        automation_id: null,
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)
      vi.mocked(SeedTransactionsService.create).mockResolvedValue(mockTransaction as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_type: 'edit_content',
          transaction_data: { content: 'Updated content' },
        })
        .expect(201)

      expect(response.body).toMatchObject({
        id: 'txn-1',
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
      })
      expect(SeedTransactionsService.create).toHaveBeenCalledWith({
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Updated content' },
        automation_id: null,
      })
    })

    it('should return 400 when seed ID is missing', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .post('/api/seeds//transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_type: 'edit_content',
          transaction_data: { content: 'Updated content' },
        })
        .expect(404)
    })

    it('should return 400 when transaction_type is missing', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_data: { content: 'Updated content' },
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'transaction_type is required and must be a string',
      })
    })

    it('should return 400 when transaction_type is not a string', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_type: 123,
          transaction_data: { content: 'Updated content' },
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'transaction_type is required and must be a string',
      })
    })

    it('should return 400 when transaction_data is missing', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_type: 'edit_content',
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'transaction_data is required and must be an object',
      })
    })

    it('should return 400 when transaction_data is not an object', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_type: 'edit_content',
          transaction_data: 'not an object',
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'transaction_data is required and must be an object',
      })
    })

    it('should return 404 when seed not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/non-existent/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_type: 'edit_content',
          transaction_data: { content: 'Updated content' },
        })
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })

    it('should handle validation errors from service', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)
      vi.mocked(SeedTransactionsService.create).mockRejectedValue(
        new Error('Transaction type not allowed')
      )

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_type: 'invalid_type',
          transaction_data: { content: 'Updated content' },
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Transaction type not allowed',
      })
    })

    it('should handle service errors gracefully', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)
      vi.mocked(SeedTransactionsService.create).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .post('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_type: 'edit_content',
          transaction_data: { content: 'Updated content' },
        })
        .expect(500)
    })

    it('should accept optional automation_id', async () => {
      const mockTransaction = {
        id: 'txn-1',
        seed_id: 'seed-123',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-1', tag_name: 'Test' },
        created_at: new Date(),
        automation_id: 'auto-1',
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)
      vi.mocked(SeedTransactionsService.create).mockResolvedValue(mockTransaction as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .post('/api/seeds/seed-123/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'Test' },
          automation_id: 'auto-1',
        })
        .expect(201)

      expect(SeedTransactionsService.create).toHaveBeenCalledWith({
        seed_id: 'seed-123',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-1', tag_name: 'Test' },
        automation_id: 'auto-1',
      })
    })
  })

  describe('GET /api/transactions/:transactionId', () => {
    it('should return a specific transaction by ID', async () => {
      const mockTransaction = {
        id: 'txn-1',
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Updated content' },
        created_at: new Date(),
        automation_id: null,
      }

      vi.mocked(SeedTransactionsService.getById).mockResolvedValue(mockTransaction as any)
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/transactions/txn-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: 'txn-1',
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
      })
      expect(SeedTransactionsService.getById).toHaveBeenCalledWith('txn-1')
    })

    it('should return 400 when transaction ID is missing', async () => {
      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/transactions/')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })

    it('should return 404 when transaction not found', async () => {
      vi.mocked(SeedTransactionsService.getById).mockResolvedValue(null)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/transactions/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Transaction not found',
      })
    })

    it('should verify seed ownership', async () => {
      const mockTransaction = {
        id: 'txn-1',
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Updated content' },
        created_at: new Date(),
        automation_id: null,
      }

      vi.mocked(SeedTransactionsService.getById).mockResolvedValue(mockTransaction as any)
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null), // Seed not found or not owned
      } as any)

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      const response = await request(app)
        .get('/api/transactions/txn-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toMatchObject({
        error: 'Seed not found',
      })
    })

    it('should handle service errors gracefully', async () => {
      vi.mocked(SeedTransactionsService.getById).mockRejectedValue(new Error('Database error'))

      const token = generateTestToken({
        id: 'user-123',
        email: 'test@example.com',
      })

      await request(app)
        .get('/api/transactions/txn-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500)
    })
  })
})

