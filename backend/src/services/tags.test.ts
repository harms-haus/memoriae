// Tags service unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as tagsService from './tags'
import { TagTransactionsService } from './tag-transactions'
import { computeTagState } from '../utils/tag-state'
import { computeCurrentState } from './seeds'
import db from '../db/connection'

// Mock dependencies
vi.mock('../db/connection', () => {
  const createMockQueryBuilder = (methods: Record<string, any> = {}) => {
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      first: vi.fn(),
      limit: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation((...args: any[]) => {
        // Return a new builder that supports chaining
        return createMockQueryBuilder({ ...methods, whereArgs: args })
      }),
      whereIn: vi.fn().mockImplementation((...args: any[]) => {
        return createMockQueryBuilder({ ...methods, whereInArgs: args })
      }),
      whereRaw: vi.fn().mockImplementation((...args: any[]) => {
        return createMockQueryBuilder({ ...methods, whereRawArgs: args })
      }),
      ...methods,
    }
    return builder
  }

  const mockTransaction = vi.fn()
  
  const mockDb = vi.fn((table?: string) => {
    return createMockQueryBuilder()
  })
  
  // Add transaction as a property of the default export
  Object.assign(mockDb, {
    transaction: mockTransaction,
  })

  return {
    default: mockDb,
  }
})

vi.mock('./tag-transactions', () => ({
  TagTransactionsService: {
    getByTagId: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../utils/tag-state', () => ({
  computeTagState: vi.fn(),
}))

vi.mock('./seeds', () => ({
  computeCurrentState: vi.fn(),
}))

describe('Tags Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllTags', () => {
    it('should return all tags with computed state from transactions', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'Tag 1',
          color: '#ff0000',
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'tag-2',
          name: 'Tag 2',
          color: null,
          created_at: new Date('2024-01-02'),
        },
      ]

      const mockTransactions1 = [
        {
          id: 'txn-1',
          tag_id: 'tag-1',
          transaction_type: 'creation',
          transaction_data: { name: 'Tag 1', color: '#ff0000' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockTransactions2 = [
        {
          id: 'txn-2',
          tag_id: 'tag-2',
          transaction_type: 'creation',
          transaction_data: { name: 'Tag 2', color: null },
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      const mockState1 = {
        name: 'Tag 1',
        color: '#ff0000',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      const mockState2 = {
        name: 'Tag 2',
        color: null,
        timestamp: new Date('2024-01-02'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockTags),
      } as any)

      vi.mocked(TagTransactionsService.getByTagId)
        .mockResolvedValueOnce(mockTransactions1 as any)
        .mockResolvedValueOnce(mockTransactions2 as any)

      vi.mocked(computeTagState)
        .mockReturnValueOnce(mockState1)
        .mockReturnValueOnce(mockState2)

      const result = await tagsService.getAllTags()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'tag-1',
        name: 'Tag 1',
        color: '#ff0000',
      })
      expect(result[1]).toMatchObject({
        id: 'tag-2',
        name: 'Tag 2',
        color: '',
      })
    })

    it('should fall back to direct tag data when no transactions exist', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'Legacy Tag',
          color: '#00ff00',
          created_at: new Date('2024-01-01'),
        },
      ]

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockTags),
      } as any)

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue([])

      const result = await tagsService.getAllTags()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'tag-1',
        name: 'Legacy Tag',
        color: '#00ff00',
      })
    })

    it('should fall back to direct tag data when no creation transaction exists', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'Tag 1',
          color: '#ff0000',
          created_at: new Date('2024-01-01'),
        },
      ]

      const mockTransactions = [
        {
          id: 'txn-1',
          tag_id: 'tag-1',
          transaction_type: 'edit',
          transaction_data: { name: 'Edited Tag' },
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockTags),
      } as any)

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue(mockTransactions as any)

      const result = await tagsService.getAllTags()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'tag-1',
        name: 'Tag 1', // Uses original name, not from transaction
        color: '#ff0000',
      })
    })

    it('should handle computeTagState errors gracefully', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'Tag 1',
          color: '#ff0000',
          created_at: new Date('2024-01-01'),
        },
      ]

      const mockTransactions = [
        {
          id: 'txn-1',
          tag_id: 'tag-1',
          transaction_type: 'creation',
          transaction_data: { name: 'Tag 1', color: '#ff0000' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockTags),
      } as any)

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeTagState).mockImplementation(() => {
        throw new Error('Invalid transaction data')
      })

      const result = await tagsService.getAllTags()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'tag-1',
        name: 'Tag 1',
        color: '#ff0000',
      })
    })

    it('should return empty array when no tags exist', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      } as any)

      const result = await tagsService.getAllTags()

      expect(result).toEqual([])
    })

    it('should order tags by name ascending', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'B Tag', color: null, created_at: new Date() },
        { id: 'tag-2', name: 'A Tag', color: null, created_at: new Date() },
      ]

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockTags),
      } as any)

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue([])

      await tagsService.getAllTags()

      // Verify orderBy is called with 'name' and 'asc'
      const orderByCall = vi.mocked(db().orderBy as any)
      expect(orderByCall).toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('should return tag by ID with computed state and transactions', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Test Tag',
        color: '#ff0000',
        created_at: new Date('2024-01-01'),
      }

      const mockTransactions = [
        {
          id: 'txn-1',
          tag_id: 'tag-123',
          transaction_type: 'creation',
          transaction_data: { name: 'Test Tag', color: '#ff0000' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockState = {
        name: 'Test Tag',
        color: '#ff0000',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTag),
      } as any)

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeTagState).mockReturnValue(mockState)

      const result = await tagsService.getById('tag-123')

      expect(result).toMatchObject({
        id: 'tag-123',
        name: 'Test Tag',
        color: '#ff0000',
        currentState: mockState,
        transactions: mockTransactions,
      })
      expect(TagTransactionsService.getByTagId).toHaveBeenCalledWith('tag-123')
      expect(computeTagState).toHaveBeenCalledWith(mockTransactions)
    })

    it('should return null when tag not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      const result = await tagsService.getById('non-existent')

      expect(result).toBeNull()
    })

    it('should fall back to direct tag data when no transactions exist', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Legacy Tag',
        color: '#00ff00',
        created_at: new Date('2024-01-01'),
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTag),
      } as any)

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue([])

      const result = await tagsService.getById('tag-123')

      expect(result).toMatchObject({
        id: 'tag-123',
        name: 'Legacy Tag',
        color: '#00ff00',
        currentState: {
          name: 'Legacy Tag',
          color: '#00ff00',
          timestamp: mockTag.created_at,
          metadata: {},
        },
        transactions: [],
      })
    })

    it('should use empty string for null color', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Test Tag',
        color: null,
        created_at: new Date('2024-01-01'),
      }

      const mockTransactions = [
        {
          id: 'txn-1',
          tag_id: 'tag-123',
          transaction_type: 'creation',
          transaction_data: { name: 'Test Tag', color: null },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      const mockState = {
        name: 'Test Tag',
        color: null,
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTag),
      } as any)

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeTagState).mockReturnValue(mockState)

      const result = await tagsService.getById('tag-123')

      expect(result?.color).toBe('')
    })
  })

  describe('getSeedsByTagId', () => {
    it('should return seeds that use a specific tag', async () => {
      const mockTagTransactions = [
        { seed_id: 'seed-1', created_at: new Date('2024-01-02') },
        { seed_id: 'seed-2', created_at: new Date('2024-01-01') },
      ]

      const mockSeedRows = [
        { id: 'seed-1', user_id: 'user-123', created_at: new Date('2024-01-01') },
        { id: 'seed-2', user_id: 'user-123', created_at: new Date('2024-01-01') },
      ]

      const mockState1 = {
        seed: 'Seed 1 content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      const mockState2 = {
        seed: 'Seed 2 content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        whereRaw: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockTagTransactions),
        whereIn: vi.fn().mockReturnThis(),
      } as any)

      // Mock the second query for seed rows
      const mockDbQuery = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          whereRaw: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockTagTransactions),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          whereIn: vi.fn().mockResolvedValue(mockSeedRows),
        })

      vi.mocked(db).mockImplementation(mockDbQuery)

      vi.mocked(computeCurrentState)
        .mockResolvedValueOnce(mockState1)
        .mockResolvedValueOnce(mockState2)

      const result = await tagsService.getSeedsByTagId('tag-123')

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
    })

    it('should return empty array when tag is not used', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        whereRaw: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any)

      const result = await tagsService.getSeedsByTagId('tag-123')

      expect(result).toEqual([])
      expect(computeCurrentState).not.toHaveBeenCalled()
    })

    it('should limit to 50 most recent seeds', async () => {
      const mockTagTransactions = Array.from({ length: 60 }, (_, i) => ({
        seed_id: `seed-${i}`,
        created_at: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
      }))

      const mockLimit = vi.fn().mockResolvedValue(mockTagTransactions.slice(0, 50))
      const mockDbQuery = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          whereRaw: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: mockLimit,
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          whereIn: vi.fn().mockResolvedValue([]),
        })

      vi.mocked(db).mockImplementation(mockDbQuery)

      await tagsService.getSeedsByTagId('tag-123')

      // Verify limit(50) was called
      expect(mockLimit).toHaveBeenCalledWith(50)
    })

    it('should handle missing slug column gracefully', async () => {
      const mockTagTransactions = [
        { seed_id: 'seed-1', created_at: new Date('2024-01-02') },
      ]

      const mockSeedRows = [
        { id: 'seed-1', user_id: 'user-123', created_at: new Date('2024-01-01') },
      ]

      const mockState1 = {
        seed: 'Seed 1 content',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      // Mock database query that doesn't include slug (simulating missing column)
      const mockDbQuery = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          whereRaw: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockTagTransactions),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          whereIn: vi.fn().mockResolvedValue(mockSeedRows),
        })

      vi.mocked(db).mockImplementation(mockDbQuery)
      vi.mocked(computeCurrentState).mockResolvedValueOnce(mockState1)

      const result = await tagsService.getSeedsByTagId('tag-123')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'seed-1',
        user_id: 'user-123',
        currentState: mockState1,
      })
      // Verify that slug is selected along with id, user_id, created_at
      const secondCall = mockDbQuery.mock.results[1].value
      expect(secondCall.select).toHaveBeenCalledWith('id', 'user_id', 'created_at', 'slug')
    })
  })

  describe('create', () => {
    it('should create a new tag with creation transaction', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'New Tag',
        color: '#ff0000',
        created_at: new Date('2024-01-01'),
      }

      const mockTransaction = {
        id: 'txn-1',
        tag_id: 'tag-123',
        transaction_type: 'creation',
        transaction_data: { name: 'New Tag', color: '#ff0000' },
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      const mockState = {
        name: 'New Tag',
        color: '#ff0000',
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      // Set up transaction mock where trx is a function that returns query builders
      const mockTrxRaw = vi.fn((sql: string, params: any[]) => params[0])
      const mockTrx = vi.fn((table: string) => {
        if (table === 'tags') {
          return {
            insert: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([mockTag]),
          }
        } else if (table === 'tag_transactions') {
          return {
            insert: vi.fn().mockResolvedValue(undefined),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          returning: vi.fn(),
        }
      })
      mockTrx.raw = mockTrxRaw

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTrx)
      })

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue([mockTransaction] as any)
      vi.mocked(computeTagState).mockReturnValue(mockState)

      const result = await tagsService.create({ name: 'New Tag', color: '#ff0000' })

      expect(result).toMatchObject({
        id: 'tag-123',
        name: 'New Tag',
        color: '#ff0000',
        currentState: mockState,
        transactions: [mockTransaction],
      })
      // Verify tags insert was called
      expect(mockTrx).toHaveBeenCalledWith('tags')
    })

    it('should trim name when creating tag', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Trimmed Tag',
        color: null,
        created_at: new Date('2024-01-01'),
      }

      const mockTransaction = {
        id: 'txn-1',
        tag_id: 'tag-123',
        transaction_type: 'creation',
        transaction_data: { name: 'Trimmed Tag', color: null },
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      const mockState = {
        name: 'Trimmed Tag',
        color: null,
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      // Set up transaction mock where trx is a function that returns query builders
      const mockTrxRaw = vi.fn((sql: string, params: any[]) => params[0])
      const mockTrx = vi.fn((table: string) => {
        if (table === 'tags') {
          return {
            insert: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([mockTag]),
          }
        } else if (table === 'tag_transactions') {
          return {
            insert: vi.fn().mockResolvedValue(undefined),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          returning: vi.fn(),
        }
      })
      mockTrx.raw = mockTrxRaw

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTrx)
      })

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue([mockTransaction] as any)
      vi.mocked(computeTagState).mockReturnValue(mockState)

      await tagsService.create({ name: '  Trimmed Tag  ' })

      // Verify tags insert was called with trimmed name
      expect(mockTrx).toHaveBeenCalledWith('tags')
    })

    it('should throw error when name is missing', async () => {
      await expect(
        tagsService.create({ name: '' as any })
      ).rejects.toThrow('Name is required and must be a non-empty string')
    })

    it('should throw error when name is null', async () => {
      await expect(
        tagsService.create({ name: null as any })
      ).rejects.toThrow('Name is required and must be a non-empty string')
    })

    it('should throw error when name is not a string', async () => {
      await expect(
        tagsService.create({ name: 123 as any })
      ).rejects.toThrow('Name is required and must be a non-empty string')
    })

    it('should throw error when name is whitespace only', async () => {
      await expect(
        tagsService.create({ name: '   ' })
      ).rejects.toThrow('Name is required and must be a non-empty string')
    })

    it('should handle null color', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Tag',
        color: null,
        created_at: new Date('2024-01-01'),
      }

      const mockTransaction = {
        id: 'txn-1',
        tag_id: 'tag-123',
        transaction_type: 'creation',
        transaction_data: { name: 'Tag', color: null },
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      const mockState = {
        name: 'Tag',
        color: null,
        timestamp: new Date('2024-01-01'),
        metadata: {},
      }

      // Set up transaction mock where trx is a function that returns query builders
      const mockTrxRaw = vi.fn((sql: string, params: any[]) => params[0])
      const mockTrx = vi.fn((table: string) => {
        if (table === 'tags') {
          return {
            insert: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([mockTag]),
          }
        } else if (table === 'tag_transactions') {
          return {
            insert: vi.fn().mockResolvedValue(undefined),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          returning: vi.fn(),
        }
      })
      mockTrx.raw = mockTrxRaw

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTrx)
      })

      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue([mockTransaction] as any)
      vi.mocked(computeTagState).mockReturnValue(mockState)

      const result = await tagsService.create({ name: 'Tag', color: null })

      expect(result.color).toBe('')
    })

    it('should handle database transaction errors', async () => {
      vi.mocked(db.transaction).mockRejectedValue(new Error('Database error'))

      await expect(
        tagsService.create({ name: 'Test Tag' })
      ).rejects.toThrow('Database error')
    })

    it('should handle case when insert does not return result', async () => {
      // Set up transaction mock where tags insert returns empty array
      const mockTrxRaw = vi.fn((sql: string, params: any[]) => params[0])
      const mockTrx = vi.fn((table: string) => {
        if (table === 'tags') {
          return {
            insert: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([]), // Empty array = no result
          }
        } else if (table === 'tag_transactions') {
          return {
            insert: vi.fn().mockResolvedValue(undefined),
          }
        }
        return {
          insert: vi.fn().mockReturnThis(),
          returning: vi.fn(),
        }
      })
      mockTrx.raw = mockTrxRaw

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTrx)
      })

      await expect(
        tagsService.create({ name: 'Test Tag' })
      ).rejects.toThrow('Failed to create tag: insert did not return a result')
    })
  })

  describe('edit', () => {
    it('should edit tag name by creating edit transaction', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Original Name',
        color: '#ff0000',
        created_at: new Date('2024-01-01'),
      }

      const mockTransactions = [
        {
          id: 'txn-1',
          tag_id: 'tag-123',
          transaction_type: 'creation',
          transaction_data: { name: 'Original Name', color: '#ff0000' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
        {
          id: 'txn-2',
          tag_id: 'tag-123',
          transaction_type: 'edit',
          transaction_data: { name: 'Updated Name' },
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      const mockState = {
        name: 'Updated Name',
        color: '#ff0000',
        timestamp: new Date('2024-01-02'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTag),
      } as any)

      vi.mocked(TagTransactionsService.create).mockResolvedValue(mockTransactions[1] as any)
      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeTagState).mockReturnValue(mockState)

      const result = await tagsService.edit('tag-123', { name: 'Updated Name' })

      expect(result).toMatchObject({
        id: 'tag-123',
        name: 'Updated Name',
        currentState: mockState,
      })
      expect(TagTransactionsService.create).toHaveBeenCalledWith({
        tag_id: 'tag-123',
        transaction_type: 'edit',
        transaction_data: { name: 'Updated Name' },
        automation_id: null,
      })
    })

    it('should throw error when tag not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      await expect(
        tagsService.edit('non-existent', { name: 'Updated Name' })
      ).rejects.toThrow('Tag not found')
    })

    it('should throw error when name is missing', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Tag',
        color: null,
        created_at: new Date('2024-01-01'),
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTag),
      } as any)

      await expect(
        tagsService.edit('tag-123', { name: '' })
      ).rejects.toThrow('Name is required and must be a non-empty string')
    })

    it('should trim name when editing tag', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Tag',
        color: null,
        created_at: new Date('2024-01-01'),
      }

      const mockTransactions = [
        {
          id: 'txn-1',
          tag_id: 'tag-123',
          transaction_type: 'creation',
          transaction_data: { name: 'Tag', color: null },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
        {
          id: 'txn-2',
          tag_id: 'tag-123',
          transaction_type: 'edit',
          transaction_data: { name: 'Trimmed Name' },
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      const mockState = {
        name: 'Trimmed Name',
        color: null,
        timestamp: new Date('2024-01-02'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTag),
      } as any)

      vi.mocked(TagTransactionsService.create).mockResolvedValue(mockTransactions[1] as any)
      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeTagState).mockReturnValue(mockState)

      await tagsService.edit('tag-123', { name: '  Trimmed Name  ' })

      expect(TagTransactionsService.create).toHaveBeenCalledWith({
        tag_id: 'tag-123',
        transaction_type: 'edit',
        transaction_data: { name: 'Trimmed Name' },
        automation_id: null,
      })
    })
  })

  describe('setColor', () => {
    it('should set tag color by creating set_color transaction', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Tag',
        color: '#ff0000',
        created_at: new Date('2024-01-01'),
      }

      const mockTransactions = [
        {
          id: 'txn-1',
          tag_id: 'tag-123',
          transaction_type: 'creation',
          transaction_data: { name: 'Tag', color: null },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
        {
          id: 'txn-2',
          tag_id: 'tag-123',
          transaction_type: 'set_color',
          transaction_data: { color: '#ff0000' },
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      const mockState = {
        name: 'Tag',
        color: '#ff0000',
        timestamp: new Date('2024-01-02'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTag),
      } as any)

      vi.mocked(TagTransactionsService.create).mockResolvedValue(mockTransactions[1] as any)
      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeTagState).mockReturnValue(mockState)

      const result = await tagsService.setColor('tag-123', '#ff0000')

      expect(result).toMatchObject({
        id: 'tag-123',
        color: '#ff0000',
        currentState: mockState,
      })
      expect(TagTransactionsService.create).toHaveBeenCalledWith({
        tag_id: 'tag-123',
        transaction_type: 'set_color',
        transaction_data: { color: '#ff0000' },
        automation_id: null,
      })
    })

    it('should handle null color', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Tag',
        color: null,
        created_at: new Date('2024-01-01'),
      }

      const mockTransactions = [
        {
          id: 'txn-1',
          tag_id: 'tag-123',
          transaction_type: 'creation',
          transaction_data: { name: 'Tag', color: '#ff0000' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
        {
          id: 'txn-2',
          tag_id: 'tag-123',
          transaction_type: 'set_color',
          transaction_data: { color: null },
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      const mockState = {
        name: 'Tag',
        color: null,
        timestamp: new Date('2024-01-02'),
        metadata: {},
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTag),
      } as any)

      vi.mocked(TagTransactionsService.create).mockResolvedValue(mockTransactions[1] as any)
      vi.mocked(TagTransactionsService.getByTagId).mockResolvedValue(mockTransactions as any)
      vi.mocked(computeTagState).mockReturnValue(mockState)

      const result = await tagsService.setColor('tag-123', null)

      expect(result.color).toBe('')
      expect(TagTransactionsService.create).toHaveBeenCalledWith({
        tag_id: 'tag-123',
        transaction_type: 'set_color',
        transaction_data: { color: null },
        automation_id: null,
      })
    })

    it('should throw error when tag not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      await expect(
        tagsService.setColor('non-existent', '#ff0000')
      ).rejects.toThrow('Tag not found')
    })
  })
})

