// Tags service unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAllTags } from './tags'
import db from '../db/connection'

// Mock the database
vi.mock('../db/connection', () => {
  const mockOrderBy = vi.fn()
  const mockSelect = vi.fn()

  // Make select chainable
  mockSelect.mockReturnValue({
    orderBy: mockOrderBy,
  })

  const mockDb = vi.fn((table: string) => {
    if (table === 'tags') {
      return {
        select: mockSelect,
      }
    }
    return {}
  })

  return {
    default: mockDb,
    __mockOrderBy: mockOrderBy,
    __mockSelect: mockSelect,
  }
})

describe('Tags Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllTags', () => {
    it('should return all tags ordered by name', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'work',
          color: '#ffd43b',
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'tag-2',
          name: 'personal',
          color: null,
          created_at: new Date('2024-01-02'),
        },
      ]

      // Mock the database query chain
      const dbModule = await import('../db/connection')
      const mockOrderBy = (dbModule as any).__mockOrderBy
      mockOrderBy.mockResolvedValue(mockTags)

      const result = await getAllTags()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'tag-1',
        name: 'work',
        color: '#ffd43b',
      })
      expect(result[1]).toMatchObject({
        id: 'tag-2',
        name: 'personal',
        color: '', // null colors should be converted to empty string
      })
      expect(db).toHaveBeenCalledWith('tags')
    })

    it('should handle empty tags array', async () => {
      // Mock the database query chain
      const dbModule = await import('../db/connection')
      const mockOrderBy = (dbModule as any).__mockOrderBy
      mockOrderBy.mockResolvedValue([])

      const result = await getAllTags()

      expect(result).toHaveLength(0)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should convert null colors to empty string', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'work',
          color: null,
          created_at: new Date('2024-01-01'),
        },
      ]

      const dbModule = await import('../db/connection')
      const mockOrderBy = (dbModule as any).__mockOrderBy
      mockOrderBy.mockResolvedValue(mockTags)

      const result = await getAllTags()

      expect(result[0].color).toBe('')
    })

    it('should preserve non-null colors', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'work',
          color: '#4fc3f7',
          created_at: new Date('2024-01-01'),
        },
      ]

      const dbModule = await import('../db/connection')
      const mockOrderBy = (dbModule as any).__mockOrderBy
      mockOrderBy.mockResolvedValue(mockTags)

      const result = await getAllTags()

      expect(result[0].color).toBe('#4fc3f7')
    })
  })
})

