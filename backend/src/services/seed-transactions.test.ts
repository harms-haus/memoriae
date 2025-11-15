// Seed transactions service tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SeedTransactionsService } from './seed-transactions'
import db from '../db/connection'
import type { SeedTransaction, CreateSeedTransactionDto } from '../types/seed-transactions'

// Mock database connection
vi.mock('../db/connection', () => {
  const mockRaw = vi.fn((sql: string, params: any[]) => {
    // Return the first param (the JSON stringified data)
    return params[0]
  })

  return {
    default: Object.assign(
      vi.fn(),
      { raw: mockRaw }
    ),
  }
})

describe('SeedTransactionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new transaction', async () => {
      const mockTransaction = {
        id: 'txn-123',
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Updated content' },
        created_at: new Date('2024-01-01T10:00:00Z'),
        automation_id: null,
      }

      const mockInsert = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockTransaction])

      vi.mocked(db).mockReturnValue({
        insert: mockInsert,
        returning: mockReturning,
      } as any)

      const result = await SeedTransactionsService.create({
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Updated content' },
      })

      expect(result).toMatchObject({
        id: 'txn-123',
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
      })
      expect(mockInsert).toHaveBeenCalled()
      expect(mockReturning).toHaveBeenCalled()
    })

    it('should create transaction with automation_id', async () => {
      const mockTransaction = {
        id: 'txn-123',
        seed_id: 'seed-123',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-1' },
        created_at: new Date('2024-01-01T10:00:00Z'),
        automation_id: 'auto-1',
      }

      const mockInsert = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockTransaction])

      vi.mocked(db).mockReturnValue({
        insert: mockInsert,
        returning: mockReturning,
      } as any)

      const result = await SeedTransactionsService.create({
        seed_id: 'seed-123',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-1' },
        automation_id: 'auto-1',
      })

      expect(result.automation_id).toBe('auto-1')
    })
  })

  describe('createMany', () => {
    it('should create multiple transactions', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1' },
          created_at: new Date('2024-01-01T10:00:00Z'),
          automation_id: null,
        },
        {
          id: 'txn-2',
          seed_id: 'seed-123',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-2' },
          created_at: new Date('2024-01-01T10:00:00Z'),
          automation_id: null,
        },
      ]

      const mockInsert = vi.fn().mockReturnThis()
      const mockReturning = vi.fn()
        .mockResolvedValueOnce([mockTransactions[0]])
        .mockResolvedValueOnce([mockTransactions[1]])

      vi.mocked(db).mockReturnValue({
        insert: mockInsert,
        returning: mockReturning,
      } as any)

      const result = await SeedTransactionsService.createMany([
        {
          seed_id: 'seed-123',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1' },
        },
        {
          seed_id: 'seed-123',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-2' },
        },
      ])

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'txn-1',
        transaction_type: 'add_tag',
      })
      expect(result[1]).toMatchObject({
        id: 'txn-2',
        transaction_type: 'add_tag',
      })
    })
  })

  describe('getById', () => {
    it('should return transaction by ID', async () => {
      const mockTransaction = {
        id: 'txn-123',
        seed_id: 'seed-123',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Updated content' },
        created_at: new Date('2024-01-01T10:00:00Z'),
        automation_id: null,
      }

      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(mockTransaction)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const result = await SeedTransactionsService.getById('txn-123')

      expect(result).toMatchObject({
        id: 'txn-123',
        seed_id: 'seed-123',
      })
      expect(mockWhere).toHaveBeenCalledWith({ id: 'txn-123' })
    })

    it('should return null when transaction not found', async () => {
      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const result = await SeedTransactionsService.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getBySeedId', () => {
    it('should return all transactions for a seed', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: new Date('2024-01-01T10:00:00Z'),
          automation_id: null,
        },
        {
          id: 'txn-2',
          seed_id: 'seed-123',
          transaction_type: 'edit_content',
          transaction_data: { content: 'Updated content' },
          created_at: new Date('2024-01-02T10:00:00Z'),
          automation_id: null,
        },
      ]

      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockTransactions)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
      } as any)

      const result = await SeedTransactionsService.getBySeedId('seed-123')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'txn-1',
        transaction_type: 'create_seed',
      })
      expect(result[1]).toMatchObject({
        id: 'txn-2',
        transaction_type: 'edit_content',
      })
      expect(mockWhere).toHaveBeenCalledWith({ seed_id: 'seed-123' })
      expect(mockOrderBy).toHaveBeenCalledWith('created_at', 'asc')
    })

    it('should return empty array when no transactions found', async () => {
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue([])

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
      } as any)

      const result = await SeedTransactionsService.getBySeedId('seed-123')

      expect(result).toEqual([])
    })
  })

  describe('verifySeedOwnership', () => {
    it('should return true when seed belongs to user', async () => {
      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue({
        id: 'seed-123',
        user_id: 'user-123',
      })

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const result = await SeedTransactionsService.verifySeedOwnership('seed-123', 'user-123')

      expect(result).toBe(true)
      expect(mockWhere).toHaveBeenCalledWith({
        id: 'seed-123',
        user_id: 'user-123',
      })
    })

    it('should return false when seed does not belong to user', async () => {
      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const result = await SeedTransactionsService.verifySeedOwnership('seed-123', 'user-456')

      expect(result).toBe(false)
    })

    it('should return false when seed does not exist', async () => {
      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const result = await SeedTransactionsService.verifySeedOwnership('non-existent', 'user-123')

      expect(result).toBe(false)
    })
  })

  describe('getByAutomationId', () => {
    it('should return all transactions for an automation', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          seed_id: 'seed-123',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1' },
          created_at: new Date('2024-01-01T10:00:00Z'),
          automation_id: 'auto-1',
        },
        {
          id: 'txn-2',
          seed_id: 'seed-456',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-2' },
          created_at: new Date('2024-01-02T10:00:00Z'),
          automation_id: 'auto-1',
        },
      ]

      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockTransactions)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
      } as any)

      const result = await SeedTransactionsService.getByAutomationId('auto-1')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'txn-1',
        automation_id: 'auto-1',
      })
      expect(result[1]).toMatchObject({
        id: 'txn-2',
        automation_id: 'auto-1',
      })
      expect(mockWhere).toHaveBeenCalledWith({ automation_id: 'auto-1' })
      expect(mockOrderBy).toHaveBeenCalledWith('created_at', 'asc')
    })

    it('should return empty array when no transactions found', async () => {
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue([])

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
      } as any)

      const result = await SeedTransactionsService.getByAutomationId('auto-1')

      expect(result).toEqual([])
    })
  })
})

