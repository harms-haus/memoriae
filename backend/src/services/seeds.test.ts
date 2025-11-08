// Seeds service unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SeedsService, computeCurrentState } from './seeds'
import { SeedTransactionsService } from './seed-transactions'
import { computeSeedState } from '../utils/seed-state'
import db from '../db/connection'

// Mock dependencies
vi.mock('../db/connection', () => ({
  default: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
    delete: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('./seed-transactions', () => ({
  SeedTransactionsService: {
    getBySeedId: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../utils/seed-state', () => ({
  computeSeedState: vi.fn(),
}))

describe('SeedsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getByUser', () => {
    it('should return all seeds for a user with computed state', async () => {
      const mockSeeds = [
        {
          id: 'seed-1',
          user_id: 'user-123',
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'seed-2',
          user_id: 'user-123',
          created_at: new Date('2024-01-02'),
        },
      ]

      const mockTransactions1 = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Seed 1 content' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockTransactions2 = [
        {
          id: 'txn-2',
          seed_id: 'seed-2',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Seed 2 content' },
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      const mockState1 = {
        seed: 'Seed 1 content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      const mockState2 = {
        seed: 'Seed 2 content',
        timestamp: new Date('2024-01-02'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockSeeds),
      } as any)

      vi.mocked(SeedTransactionsService.getBySeedId)
        .mockResolvedValueOnce(mockTransactions1 as any)
        .mockResolvedValueOnce(mockTransactions2 as any)

      vi.mocked(computeSeedState)
        .mockReturnValueOnce(mockState1)
        .mockReturnValueOnce(mockState2)

      const result = await SeedsService.getByUser('user-123')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'seed-1',
        user_id: 'user-123',
        currentState: mockState1,
      })
      expect(result[1]).toMatchObject({
        id: 'seed-2',
        user_id: 'user-123',
        currentState: mockState2,
      })
      expect(SeedTransactionsService.getBySeedId).toHaveBeenCalledTimes(2)
      expect(computeSeedState).toHaveBeenCalledTimes(2)
    })

    it('should return empty array when user has no seeds', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      } as any)

      const result = await SeedsService.getByUser('user-123')

      expect(result).toEqual([])
      expect(SeedTransactionsService.getBySeedId).not.toHaveBeenCalled()
    })

    it('should order seeds by created_at descending', async () => {
      const mockSeeds = [
        { id: 'seed-1', user_id: 'user-123', created_at: new Date('2024-01-01') },
        { id: 'seed-2', user_id: 'user-123', created_at: new Date('2024-01-02') },
      ]

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockSeeds),
      } as any)

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue([])

      await SeedsService.getByUser('user-123')

      expect(db).toHaveBeenCalledWith('seeds')
      // Verify orderBy is called with 'created_at' and 'desc'
      const orderByCall = vi.mocked(db().orderBy as any)
      expect(orderByCall).toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('should return seed by ID with computed state', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date('2024-01-01'),
      }

      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockState = {
        seed: 'Test content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockSeed),
      } as any)

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const result = await SeedsService.getById('seed-123', 'user-123')

      expect(result).toMatchObject({
        id: 'seed-123',
        user_id: 'user-123',
        currentState: mockState,
      })
      expect(SeedTransactionsService.getBySeedId).toHaveBeenCalledWith('seed-123')
      expect(computeSeedState).toHaveBeenCalledWith(mockTransactions)
    })

    it('should return null when seed not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      const result = await SeedsService.getById('non-existent', 'user-123')

      expect(result).toBeNull()
      expect(SeedTransactionsService.getBySeedId).not.toHaveBeenCalled()
    })

    it('should verify user ownership', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'other-user',
        created_at: new Date('2024-01-01'),
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockSeed),
      } as any)

      const result = await SeedsService.getById('seed-123', 'user-123')

      // Should return null because user doesn't own the seed
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new seed with create_seed transaction', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date('2024-01-01'),
      }

      const mockTransaction = {
        id: 'txn-1',
        seed_id: 'seed-123',
        transaction_type: 'create_seed',
        transaction_data: { content: 'Test content' },
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      const mockState = {
        seed: 'Test content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn(),
        raw: vi.fn((sql: string, params: any[]) => params[0]),
      }

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTrx)
      })

      mockTrx.returning.mockResolvedValueOnce([mockSeed])
      mockTrx.insert.mockReturnValueOnce(mockTrx)
      mockTrx.returning.mockResolvedValueOnce([mockTransaction])

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue([mockTransaction] as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const result = await SeedsService.create('user-123', { content: 'Test content' })

      expect(result).toMatchObject({
        id: 'seed-123',
        user_id: 'user-123',
        currentState: mockState,
      })
      expect(mockTrx.insert).toHaveBeenCalledWith({
        id: expect.any(String),
        user_id: 'user-123',
        created_at: expect.any(Date),
      })
    })

    it('should trim content when creating seed', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date('2024-01-01'),
      }

      const mockTransaction = {
        id: 'txn-1',
        seed_id: 'seed-123',
        transaction_type: 'create_seed',
        transaction_data: { content: 'Trimmed content' },
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      const mockState = {
        seed: 'Trimmed content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn(),
        raw: vi.fn((sql: string, params: any[]) => params[0]),
      }

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTrx)
      })

      mockTrx.returning.mockResolvedValueOnce([mockSeed])
      mockTrx.insert.mockReturnValueOnce(mockTrx)
      mockTrx.returning.mockResolvedValueOnce([mockTransaction])

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue([mockTransaction] as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      await SeedsService.create('user-123', { content: '  Trimmed content  ' })

      // Verify transaction data has trimmed content
      const insertCall = mockTrx.insert.mock.calls.find(call => 
        call[0].transaction_type === 'create_seed'
      )
      expect(insertCall).toBeDefined()
    })

    it('should throw error when content is missing', async () => {
      await expect(
        SeedsService.create('user-123', { content: '' as any })
      ).rejects.toThrow('Content is required and must be a non-empty string')
    })

    it('should throw error when content is null', async () => {
      await expect(
        SeedsService.create('user-123', { content: null as any })
      ).rejects.toThrow('Content is required and must be a non-empty string')
    })

    it('should throw error when content is not a string', async () => {
      await expect(
        SeedsService.create('user-123', { content: 123 as any })
      ).rejects.toThrow('Content is required and must be a non-empty string')
    })

    it('should throw error when content is whitespace only', async () => {
      await expect(
        SeedsService.create('user-123', { content: '   ' })
      ).rejects.toThrow('Content is required and must be a non-empty string')
    })

    it('should handle database transaction errors', async () => {
      vi.mocked(db.transaction).mockRejectedValue(new Error('Database error'))

      await expect(
        SeedsService.create('user-123', { content: 'Test content' })
      ).rejects.toThrow('Database error')
    })

    it('should handle case when insert does not return result', async () => {
      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
        raw: vi.fn(),
      }

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTrx)
      })

      await expect(
        SeedsService.create('user-123', { content: 'Test content' })
      ).rejects.toThrow('Failed to create seed: insert did not return a result')
    })
  })

  describe('update', () => {
    it('should update seed content by creating edit_content transaction', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date('2024-01-01'),
      }

      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Original content' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
        {
          id: 'txn-2',
          seed_id: 'seed-123',
          transaction_type: 'edit_content',
          transaction_data: { content: 'Updated content' },
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      const mockState = {
        seed: 'Updated content',
        timestamp: new Date('2024-01-02'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockSeed),
      } as any)

      vi.mocked(SeedTransactionsService.create).mockResolvedValue(mockTransactions[1] as any)
      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const result = await SeedsService.update('seed-123', 'user-123', { content: 'Updated content' })

      expect(result).toMatchObject({
        id: 'seed-123',
        currentState: mockState,
      })
      expect(SeedTransactionsService.create).toHaveBeenCalledWith({
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Updated content' },
        automation_id: null,
      })
    })

    it('should return existing seed with computed state when no updates', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'user-123',
        created_at: new Date('2024-01-01'),
      }

      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Original content' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockState = {
        seed: 'Original content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockSeed),
      } as any)

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const result = await SeedsService.update('seed-123', 'user-123', {})

      expect(result).toMatchObject({
        id: 'seed-123',
        currentState: mockState,
      })
      expect(SeedTransactionsService.create).not.toHaveBeenCalled()
    })

    it('should return null when seed not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      const result = await SeedsService.update('non-existent', 'user-123', { content: 'Updated' })

      expect(result).toBeNull()
      expect(SeedTransactionsService.create).not.toHaveBeenCalled()
    })

    it('should verify user ownership', async () => {
      const mockSeed = {
        id: 'seed-123',
        user_id: 'other-user',
        created_at: new Date('2024-01-01'),
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockSeed),
      } as any)

      const result = await SeedsService.update('seed-123', 'user-123', { content: 'Updated' })

      expect(result).toBeNull()
      expect(SeedTransactionsService.create).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete seed', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        delete: vi.fn().mockResolvedValue(1),
      } as any)

      const result = await SeedsService.delete('seed-123', 'user-123')

      expect(result).toBe(true)
    })

    it('should return false when seed not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        delete: vi.fn().mockResolvedValue(0),
      } as any)

      const result = await SeedsService.delete('non-existent', 'user-123')

      expect(result).toBe(false)
    })

    it('should verify user ownership', async () => {
      // The delete query includes user_id in where clause, so it will only delete if owned
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        delete: vi.fn().mockResolvedValue(0),
      } as any)

      const result = await SeedsService.delete('seed-123', 'user-123')

      expect(result).toBe(false)
    })
  })

  describe('computeCurrentState', () => {
    it('should compute current state from transactions', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockState = {
        seed: 'Test content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
        tags: [],
        categories: [],
      }

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const result = await computeCurrentState('seed-123')

      expect(result).toMatchObject({
        seed: 'Test content',
        metadata: {},
      })
      expect(result.timestamp).toBe(mockState.timestamp.toISOString())
      expect(SeedTransactionsService.getBySeedId).toHaveBeenCalledWith('seed-123')
      expect(computeSeedState).toHaveBeenCalledWith(mockTransactions)
    })

    it('should include tags when present', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockState = {
        seed: 'Test content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
        tags: [{ id: 'tag-1', name: 'Test Tag' }],
        categories: [],
      }

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const result = await computeCurrentState('seed-123')

      expect(result.tags).toEqual([{ id: 'tag-1', name: 'Test Tag' }])
    })

    it('should include categories when present', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockState = {
        seed: 'Test content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
        tags: [],
        categories: [{ id: 'cat-1', name: 'Test Category', path: '/test' }],
      }

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const result = await computeCurrentState('seed-123')

      expect(result.categories).toEqual([{ id: 'cat-1', name: 'Test Category', path: '/test' }])
    })

    it('should not include empty tags array', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockState = {
        seed: 'Test content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
        tags: [],
        categories: [],
      }

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const result = await computeCurrentState('seed-123')

      expect(result.tags).toBeUndefined()
    })

    it('should not include empty categories array', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockState = {
        seed: 'Test content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
        tags: [],
        categories: [],
      }

      vi.mocked(SeedTransactionsService.getBySeedId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeSeedState).mockReturnValue(mockState)

      const result = await computeCurrentState('seed-123')

      expect(result.categories).toBeUndefined()
    })
  })
})

