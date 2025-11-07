import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TagTransactionsService } from './tag-transactions'
import type { TagTransaction, CreateTagTransactionDto } from '../types/tag-transactions'

// Create mock functions that will be used
const mockInsert = vi.fn()
const mockReturning = vi.fn()
const mockWhere = vi.fn()
const mockFirst = vi.fn()
const mockOrderBy = vi.fn()

// Mock the database connection
vi.mock('../db/connection', () => {
  const mockDb = vi.fn((table: string) => {
    if (table === 'tag_transactions') {
      return {
        insert: mockInsert.mockReturnValue({
          returning: mockReturning,
        }),
        where: mockWhere.mockReturnThis(),
        first: mockFirst,
        orderBy: mockOrderBy,
      }
    }
    return {}
  })

  mockDb.raw = vi.fn((value: string, params: any[]) => {
    return { value, params }
  })

  return {
    default: mockDb,
  }
})

import db from '../db/connection'

describe('TagTransactionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWhere.mockReturnThis()
    mockOrderBy.mockReturnThis()
  })

  describe('create', () => {
    it('should create a transaction successfully', async () => {
      const mockTransaction = {
        id: 'transaction-1',
        tag_id: 'tag-1',
        transaction_type: 'creation',
        transaction_data: { name: 'test', color: '#ff0000' },
        created_at: new Date(),
        automation_id: null,
      }

      mockReturning.mockResolvedValue([mockTransaction])

      const data: CreateTagTransactionDto & { tag_id: string } = {
        tag_id: 'tag-1',
        transaction_type: 'creation',
        transaction_data: { name: 'test', color: '#ff0000' },
        automation_id: null,
      }

      const result = await TagTransactionsService.create(data)

      expect(mockInsert).toHaveBeenCalledWith({
        id: expect.any(String),
        tag_id: 'tag-1',
        transaction_type: 'creation',
        transaction_data: expect.any(Object),
        created_at: expect.any(Date),
        automation_id: null,
      })

      expect(result).toEqual({
        ...mockTransaction,
        transaction_data: { name: 'test', color: '#ff0000' },
        created_at: expect.any(Date),
      })
    })

    it('should handle automation_id correctly', async () => {
      const mockTransaction = {
        id: 'transaction-1',
        tag_id: 'tag-1',
        transaction_type: 'edit',
        transaction_data: { name: 'updated' },
        created_at: new Date(),
        automation_id: 'automation-1',
      }

      mockReturning.mockResolvedValue([mockTransaction])

      const data: CreateTagTransactionDto & { tag_id: string } = {
        tag_id: 'tag-1',
        transaction_type: 'edit',
        transaction_data: { name: 'updated' },
        automation_id: 'automation-1',
      }

      const result = await TagTransactionsService.create(data)

      expect(mockInsert).toHaveBeenCalledWith({
        id: expect.any(String),
        tag_id: 'tag-1',
        transaction_type: 'edit',
        transaction_data: expect.any(Object),
        created_at: expect.any(Date),
        automation_id: 'automation-1',
      })
    })
  })

  describe('createMany', () => {
    it('should create multiple transactions', async () => {
      const mockTransactions = [
        {
          id: 'transaction-1',
          tag_id: 'tag-1',
          transaction_type: 'creation',
          transaction_data: { name: 'test', color: '#ff0000' },
          created_at: new Date(),
          automation_id: null,
        },
        {
          id: 'transaction-2',
          tag_id: 'tag-1',
          transaction_type: 'edit',
          transaction_data: { name: 'updated' },
          created_at: new Date(),
          automation_id: null,
        },
      ]

      mockReturning
        .mockResolvedValueOnce([mockTransactions[0]])
        .mockResolvedValueOnce([mockTransactions[1]])

      const data: Array<CreateTagTransactionDto & { tag_id: string }> = [
        {
          tag_id: 'tag-1',
          transaction_type: 'creation',
          transaction_data: { name: 'test', color: '#ff0000' },
          automation_id: null,
        },
        {
          tag_id: 'tag-1',
          transaction_type: 'edit',
          transaction_data: { name: 'updated' },
          automation_id: null,
        },
      ]

      const result = await TagTransactionsService.createMany(data)

      expect(mockInsert).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        ...mockTransactions[0],
        transaction_data: { name: 'test', color: '#ff0000' },
        created_at: expect.any(Date),
      })
      expect(result[1]).toEqual({
        ...mockTransactions[1],
        transaction_data: { name: 'updated' },
        created_at: expect.any(Date),
      })
    })
  })

  describe('getById', () => {
    it('should return transaction by ID', async () => {
      const mockTransaction = {
        id: 'transaction-1',
        tag_id: 'tag-1',
        transaction_type: 'creation',
        transaction_data: { name: 'test', color: '#ff0000' },
        created_at: new Date(),
        automation_id: null,
      }

      mockFirst.mockResolvedValue(mockTransaction)

      const result = await TagTransactionsService.getById('transaction-1')

      expect(db).toHaveBeenCalledWith('tag_transactions')
      expect(mockWhere).toHaveBeenCalledWith({ id: 'transaction-1' })
      expect(result).toEqual({
        ...mockTransaction,
        transaction_data: { name: 'test', color: '#ff0000' },
        created_at: expect.any(Date),
      })
    })

    it('should return null when transaction not found', async () => {
      mockFirst.mockResolvedValue(null)

      const result = await TagTransactionsService.getById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getByTagId', () => {
    it('should return all transactions for a tag', async () => {
      const mockTransactions = [
        {
          id: 'transaction-1',
          tag_id: 'tag-1',
          transaction_type: 'creation',
          transaction_data: { name: 'test', color: '#ff0000' },
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
        {
          id: 'transaction-2',
          tag_id: 'tag-1',
          transaction_type: 'edit',
          transaction_data: { name: 'updated' },
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      mockOrderBy.mockResolvedValue(mockTransactions)

      const result = await TagTransactionsService.getByTagId('tag-1')

      expect(db).toHaveBeenCalledWith('tag_transactions')
      expect(mockWhere).toHaveBeenCalledWith({ tag_id: 'tag-1' })
      expect(mockOrderBy).toHaveBeenCalledWith('created_at', 'asc')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        ...mockTransactions[0],
        transaction_data: { name: 'test', color: '#ff0000' },
        created_at: expect.any(Date),
      })
      expect(result[1]).toEqual({
        ...mockTransactions[1],
        transaction_data: { name: 'updated' },
        created_at: expect.any(Date),
      })
    })

    it('should return empty array when no transactions found', async () => {
      mockOrderBy.mockResolvedValue([])

      const result = await TagTransactionsService.getByTagId('empty-tag')

      expect(result).toEqual([])
    })
  })

  describe('getByAutomationId', () => {
    it('should return transactions by automation ID', async () => {
      const mockTransactions = [
        {
          id: 'transaction-1',
          tag_id: 'tag-1',
          transaction_type: 'creation',
          transaction_data: { name: 'test', color: '#ff0000' },
          created_at: new Date(),
          automation_id: 'automation-1',
        },
      ]

      mockOrderBy.mockResolvedValue(mockTransactions)

      const result = await TagTransactionsService.getByAutomationId('automation-1')

      expect(db).toHaveBeenCalledWith('tag_transactions')
      expect(mockWhere).toHaveBeenCalledWith({ automation_id: 'automation-1' })
      expect(mockOrderBy).toHaveBeenCalledWith('created_at', 'asc')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        ...mockTransactions[0],
        transaction_data: { name: 'test', color: '#ff0000' },
        created_at: expect.any(Date),
      })
    })

    it('should return empty array when no automation transactions found', async () => {
      mockOrderBy.mockResolvedValue([])

      const result = await TagTransactionsService.getByAutomationId('nonexistent-automation')

      expect(result).toEqual([])
    })
  })
})
