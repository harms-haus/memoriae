// Categories service unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAllCategories, buildCategoryTree } from './categories'
import type { Category } from './categories'
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
    if (table === 'categories') {
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

describe('Categories Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllCategories', () => {
    it('should return all categories for a user ordered by path', async () => {
      const userId = 'user-123'
      const mockCategories = [
        {
          id: 'cat-1',
          user_id: userId,
          parent_id: null,
          name: 'Work',
          path: '/work',
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'cat-2',
          user_id: userId,
          parent_id: 'cat-1',
          name: 'Projects',
          path: '/work/projects',
          created_at: new Date('2024-01-02'),
        },
      ]

      // Mock the database query chain
      const dbModule = await import('../db/connection')
      const mockOrderBy = (dbModule as any).__mockOrderBy
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
      const mockSelect = (dbModule as any).__mockSelect
      mockSelect.mockReturnValue({ where: mockWhere })
      mockOrderBy.mockResolvedValue(mockCategories)

      const result = await getAllCategories(userId)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'cat-1',
        user_id: userId,
        parent_id: null,
        name: 'Work',
        path: '/work',
      })
      expect(result[0].created_at).toBe(mockCategories[0].created_at.toISOString())
      expect(db).toHaveBeenCalledWith('categories')
      expect(mockWhere).toHaveBeenCalledWith({ user_id: userId })
    })

    it('should handle empty categories array', async () => {
      const userId = 'user-123'
      // Mock the database query chain
      const dbModule = await import('../db/connection')
      const mockOrderBy = (dbModule as any).__mockOrderBy
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
      const mockSelect = (dbModule as any).__mockSelect
      mockSelect.mockReturnValue({ where: mockWhere })
      mockOrderBy.mockResolvedValue([])

      const result = await getAllCategories(userId)

      expect(result).toHaveLength(0)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('buildCategoryTree', () => {
    it('should build correct hierarchical structure', () => {
      const userId = 'user-123'
      const categories: Category[] = [
        {
          id: 'cat-1',
          user_id: userId,
          parent_id: null,
          name: 'Work',
          path: '/work',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'cat-2',
          user_id: userId,
          parent_id: 'cat-1',
          name: 'Projects',
          path: '/work/projects',
          created_at: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'cat-3',
          user_id: userId,
          parent_id: 'cat-2',
          name: 'Web',
          path: '/work/projects/web',
          created_at: '2024-01-03T00:00:00.000Z',
        },
      ]

      const tree = buildCategoryTree(categories)

      expect(tree).toHaveLength(1)
      expect(tree[0].category.id).toBe('cat-1')
      expect(tree[0].children).toHaveLength(1)
      expect(tree[0].children[0].category.id).toBe('cat-2')
      expect(tree[0].children[0].children).toHaveLength(1)
      expect(tree[0].children[0].children[0].category.id).toBe('cat-3')
    })

    it('should handle root categories (no parent_id)', () => {
      const userId = 'user-123'
      const categories: Category[] = [
        {
          id: 'cat-1',
          user_id: userId,
          parent_id: null,
          name: 'Work',
          path: '/work',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'cat-2',
          user_id: userId,
          parent_id: null,
          name: 'Personal',
          path: '/personal',
          created_at: '2024-01-02T00:00:00.000Z',
        },
      ]

      const tree = buildCategoryTree(categories)

      expect(tree).toHaveLength(2)
      // Categories are sorted by path, so /personal comes before /work
      const categoryIds = tree.map(n => n.category.id)
      expect(categoryIds).toContain('cat-1')
      expect(categoryIds).toContain('cat-2')
      expect(tree[0].children).toHaveLength(0)
      expect(tree[1].children).toHaveLength(0)
    })

    it('should handle nested categories (with parent_id)', () => {
      const userId = 'user-123'
      const categories: Category[] = [
        {
          id: 'cat-1',
          user_id: userId,
          parent_id: null,
          name: 'Work',
          path: '/work',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'cat-2',
          user_id: userId,
          parent_id: 'cat-1',
          name: 'Projects',
          path: '/work/projects',
          created_at: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'cat-3',
          user_id: userId,
          parent_id: 'cat-1',
          name: 'Tasks',
          path: '/work/tasks',
          created_at: '2024-01-03T00:00:00.000Z',
        },
      ]

      const tree = buildCategoryTree(categories)

      expect(tree).toHaveLength(1)
      expect(tree[0].category.id).toBe('cat-1')
      expect(tree[0].children).toHaveLength(2)
      expect(tree[0].children.map(c => c.category.id)).toContain('cat-2')
      expect(tree[0].children.map(c => c.category.id)).toContain('cat-3')
    })

    it('should handle orphaned categories (parent_id that does not exist)', () => {
      const userId = 'user-123'
      const categories: Category[] = [
        {
          id: 'cat-1',
          user_id: userId,
          parent_id: 'non-existent',
          name: 'Orphan',
          path: '/orphan',
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      const tree = buildCategoryTree(categories)

      // Orphaned category should be treated as root
      expect(tree).toHaveLength(1)
      expect(tree[0].category.id).toBe('cat-1')
      expect(tree[0].children).toHaveLength(0)
    })

    it('should sort categories by path correctly', () => {
      const userId = 'user-123'
      const categories: Category[] = [
        {
          id: 'cat-2',
          user_id: userId,
          parent_id: null,
          name: 'Personal',
          path: '/personal',
          created_at: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'cat-1',
          user_id: userId,
          parent_id: null,
          name: 'Work',
          path: '/work',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'cat-3',
          user_id: userId,
          parent_id: 'cat-1',
          name: 'Projects',
          path: '/work/projects',
          created_at: '2024-01-03T00:00:00.000Z',
        },
        {
          id: 'cat-4',
          user_id: userId,
          parent_id: 'cat-1',
          name: 'Tasks',
          path: '/work/tasks',
          created_at: '2024-01-04T00:00:00.000Z',
        },
      ]

      const tree = buildCategoryTree(categories)

      // Root categories should be sorted
      expect(tree[0].category.path).toBe('/personal')
      expect(tree[1].category.path).toBe('/work')

      // Children should be sorted
      const workChildren = tree[1].children
      expect(workChildren[0].category.path).toBe('/work/projects')
      expect(workChildren[1].category.path).toBe('/work/tasks')
    })
  })
})

