// IdeaMusingsService tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IdeaMusingsService, type MusingTemplateType, type MusingContent } from './idea-musings'
import type { Seed } from './seeds'
import db from '../db/connection'
import * as SeedsService from './seeds'

// Mock the seeds service
vi.mock('./seeds', () => ({
  SeedsService: {
    getByUser: vi.fn(),
    getById: vi.fn(),
  },
}))

// Mock the database - define mocks inside factory to avoid hoisting issues
vi.mock('../db/connection', () => {
  const mockRaw = vi.fn((sql: string, bindings: any[]) => ({ sql, bindings }))
  const mockWhere = vi.fn()
  const mockWhereIn = vi.fn()
  const mockOrderBy = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockReturning = vi.fn()
  const mockFirst = vi.fn()
  const mockUpdate = vi.fn()
  const mockCount = vi.fn()

  const mockDb = vi.fn((table: string) => {
    const queryBuilder = {
      where: mockWhere.mockReturnThis(),
      whereIn: mockWhereIn.mockReturnThis(),
      orderBy: mockOrderBy.mockReturnThis(),
      select: mockSelect,
      insert: mockInsert.mockReturnValue({
        returning: mockReturning,
      }),
      first: mockFirst,
      update: mockUpdate.mockReturnThis(),
      count: mockCount.mockReturnThis(),
    }
    return queryBuilder
  })

  mockDb.raw = mockRaw

  return {
    default: mockDb,
    __mocks: {
      raw: mockRaw,
      where: mockWhere,
      whereIn: mockWhereIn,
      orderBy: mockOrderBy,
      select: mockSelect,
      insert: mockInsert,
      returning: mockReturning,
      first: mockFirst,
      update: mockUpdate,
      count: mockCount,
    },
  }
})

describe('IdeaMusingsService', () => {
  const mockUserId = 'user-1'
  const mockSeedId = 'seed-1'
  const mockMusingId = 'musing-1'

  const mockSeed: Seed = {
    id: mockSeedId,
    user_id: mockUserId,
    created_at: new Date(),
    currentState: {
      seed: 'I want to build an app',
      timestamp: new Date().toISOString(),
      metadata: {},
    },
  }

  const mockMusingRow = {
    id: mockMusingId,
    seed_id: mockSeedId,
    template_type: 'numbered_ideas' as MusingTemplateType,
    content: {
      ideas: ['Idea 1', 'Idea 2'],
    } as MusingContent,
    created_at: new Date(),
    dismissed: false,
    dismissed_at: null,
    completed: false,
    completed_at: null,
  }

  // Get mocks from the module
  let mocks: {
    raw: ReturnType<typeof vi.fn>
    where: ReturnType<typeof vi.fn>
    whereIn: ReturnType<typeof vi.fn>
    orderBy: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    insert: ReturnType<typeof vi.fn>
    returning: ReturnType<typeof vi.fn>
    first: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    // Get mocks from the module
    const dbModule = await import('../db/connection')
    mocks = (dbModule as any).__mocks
  })

  describe('getDailyMusings', () => {
    it('should return today\'s musings for user', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([mockSeed])
      mocks.select.mockResolvedValue([mockMusingRow])

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(mockMusingId)
      expect(result[0].seed_id).toBe(mockSeedId)
      expect(result[0].completed).toBe(false)
      expect(result[0].completed_at).toBeNull()
      expect(SeedsService.SeedsService.getByUser).toHaveBeenCalledWith(mockUserId)
      // Verify that completed filter is applied (where is called multiple times)
      expect(mocks.where).toHaveBeenCalledWith('completed', false)
    })

    it('should exclude completed musings', async () => {
      const completedMusingRow = {
        ...mockMusingRow,
        completed: true,
        completed_at: new Date(),
      }

      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([mockSeed])
      // Only return non-completed musings
      mocks.select.mockResolvedValue([mockMusingRow])

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      // Should not include completed musings
      expect(result.every(m => !m.completed)).toBe(true)
      expect(mocks.where).toHaveBeenCalledWith('completed', false)
    })

    it('should return empty array when no musings exist', async () => {
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([mockSeed])
      mocks.select.mockResolvedValue([])

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result).toHaveLength(0)
    })

    it('should return empty array when user has no seeds', async () => {
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result).toHaveLength(0)
      expect(mocks.select).not.toHaveBeenCalled()
    })

    it('should handle missing table gracefully', async () => {
      const error = new Error('relation "idea_musings" does not exist')
      ;(error as any).code = '42P01'

      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([mockSeed])
      mocks.select.mockRejectedValue(error)

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result).toHaveLength(0)
    })

    it('should include seed data when available', async () => {
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([mockSeed])
      mocks.select.mockResolvedValue([mockMusingRow])

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result[0].seed).toBeDefined()
      expect(result[0].seed?.id).toBe(mockSeedId)
    })
  })

  describe('getBySeedId', () => {
    it('should return musings for specific seed', async () => {
      mocks.select.mockResolvedValue([mockMusingRow])

      const result = await IdeaMusingsService.getBySeedId(mockSeedId)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(mockMusingId)
      expect(mocks.where).toHaveBeenCalledWith({ seed_id: mockSeedId })
    })

    it('should return empty array when no musings exist', async () => {
      mocks.select.mockResolvedValue([])

      const result = await IdeaMusingsService.getBySeedId(mockSeedId)

      expect(result).toHaveLength(0)
    })

    it('should handle missing table gracefully', async () => {
      const error = new Error('relation "idea_musings" does not exist')
      ;(error as any).code = '42P01'
      mocks.select.mockRejectedValue(error)

      const result = await IdeaMusingsService.getBySeedId(mockSeedId)

      expect(result).toHaveLength(0)
    })
  })

  describe('getById', () => {
    it('should return musing by ID', async () => {
      mocks.first.mockResolvedValue(mockMusingRow)

      const result = await IdeaMusingsService.getById(mockMusingId)

      expect(result).toBeDefined()
      expect(result?.id).toBe(mockMusingId)
      expect(result?.completed).toBe(false)
      expect(result?.completed_at).toBeNull()
    })

    it('should return null when musing not found', async () => {
      mocks.first.mockResolvedValue(undefined)

      const result = await IdeaMusingsService.getById(mockMusingId)

      expect(result).toBeNull()
    })

    it('should include completed fields when musing is completed', async () => {
      const completedRow = {
        ...mockMusingRow,
        completed: true,
        completed_at: new Date('2024-01-01'),
      }
      mocks.first.mockResolvedValue(completedRow)

      const result = await IdeaMusingsService.getById(mockMusingId)

      expect(result?.completed).toBe(true)
      expect(result?.completed_at).toBeInstanceOf(Date)
    })
  })

  describe('create', () => {
    it('should create new musing with correct data', async () => {
      const templateType: MusingTemplateType = 'numbered_ideas'
      const content: MusingContent = {
        ideas: ['Idea 1', 'Idea 2'],
      }

      mocks.returning.mockResolvedValue([{ id: mockMusingId }])
      mocks.first.mockResolvedValue(mockMusingRow)

      const result = await IdeaMusingsService.create(mockSeedId, templateType, content)

      expect(result).toBeDefined()
      expect(result.id).toBe(mockMusingId)
      expect(result.completed).toBe(false)
      expect(result.completed_at).toBeNull()
      expect(mocks.insert).toHaveBeenCalled()
      // Verify insert includes completed fields
      const insertCall = mocks.insert.mock.calls[0][0]
      expect(insertCall.completed).toBe(false)
      expect(insertCall.completed_at).toBeNull()
    })
  })

  describe('dismiss', () => {
    it('should mark musing as dismissed', async () => {
      const updatedRow = { ...mockMusingRow, dismissed: true, dismissed_at: new Date() }
      mocks.first.mockResolvedValueOnce(mockMusingRow) // For getById
      mocks.first.mockResolvedValueOnce(updatedRow) // For getById after update

      vi.mocked(SeedsService.SeedsService.getById).mockResolvedValue(mockSeed)

      const result = await IdeaMusingsService.dismiss(mockMusingId, mockUserId)

      expect(result.dismissed).toBe(true)
      expect(result.dismissed_at).toBeDefined()
      expect(mocks.update).toHaveBeenCalled()
    })

    it('should verify user ownership', async () => {
      const otherUserSeed: Seed = {
        ...mockSeed,
        user_id: 'other-user',
      }

      mocks.first.mockResolvedValue(mockMusingRow)
      vi.mocked(SeedsService.SeedsService.getById).mockResolvedValue(null) // Seed not found for this user

      await expect(
        IdeaMusingsService.dismiss(mockMusingId, mockUserId)
      ).rejects.toThrow('Musing does not belong to user')
    })
  })

  describe('recordShown', () => {
    it('should record shown history entry', async () => {
      const shownDate = new Date()
      shownDate.setUTCHours(0, 0, 0, 0)

      // Mock: first check returns null (doesn't exist), then insert succeeds
      mocks.first.mockResolvedValueOnce(null) // For the existing check
      mocks.returning.mockResolvedValue([{ id: 'history-1' }])

      await IdeaMusingsService.recordShown(mockSeedId, shownDate)

      expect(mocks.insert).toHaveBeenCalled()
    })
  })

  describe('getSeedsShownInLastDays', () => {
    it('should return correct seed IDs', async () => {
      const rows = [
        { seed_id: 'seed-1' },
        { seed_id: 'seed-2' },
        { seed_id: 'seed-1' }, // Duplicate
      ]
      mocks.select.mockResolvedValue(rows)

      const result = await IdeaMusingsService.getSeedsShownInLastDays(2)

      expect(result.size).toBe(2)
      expect(result.has('seed-1')).toBe(true)
      expect(result.has('seed-2')).toBe(true)
    })

    it('should handle missing table gracefully', async () => {
      const error = new Error('relation "idea_musing_shown_history" does not exist')
      ;(error as any).code = '42P01'
      mocks.select.mockRejectedValue(error)

      const result = await IdeaMusingsService.getSeedsShownInLastDays(2)

      expect(result.size).toBe(0)
    })
  })

  describe('wasShownInLastDays', () => {
    it('should return true if shown recently', async () => {
      mocks.count.mockReturnThis()
      mocks.first.mockResolvedValue({ count: '1' })

      const result = await IdeaMusingsService.wasShownInLastDays(mockSeedId, 2)

      expect(result).toBe(true)
      expect(mocks.count).toHaveBeenCalledWith('* as count')
    })

    it('should return false if not shown recently', async () => {
      mocks.count.mockReturnThis()
      mocks.first.mockResolvedValue({ count: '0' })

      const result = await IdeaMusingsService.wasShownInLastDays(mockSeedId, 2)

      expect(result).toBe(false)
      expect(mocks.count).toHaveBeenCalledWith('* as count')
    })
  })

  describe('markComplete', () => {
    it('should mark musing as complete', async () => {
      const completedAt = new Date()
      const updatedRow = {
        ...mockMusingRow,
        completed: true,
        completed_at: completedAt,
      }

      mocks.first.mockResolvedValueOnce(mockMusingRow) // For getById check
      mocks.first.mockResolvedValueOnce(updatedRow) // For getById after update
      vi.mocked(SeedsService.SeedsService.getById).mockResolvedValue(mockSeed)

      const result = await IdeaMusingsService.markComplete(mockMusingId, mockUserId)

      expect(result.completed).toBe(true)
      expect(result.completed_at).toBeInstanceOf(Date)
      expect(mocks.update).toHaveBeenCalled()
      const updateCall = mocks.update.mock.calls[0][0]
      expect(updateCall.completed).toBe(true)
      expect(updateCall.completed_at).toBeInstanceOf(Date)
    })

    it('should verify user ownership before marking complete', async () => {
      mocks.first.mockResolvedValue(mockMusingRow)
      vi.mocked(SeedsService.SeedsService.getById).mockResolvedValue(null) // Seed not found for this user

      await expect(
        IdeaMusingsService.markComplete(mockMusingId, mockUserId)
      ).rejects.toThrow('Musing does not belong to user')
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('should throw error if musing not found', async () => {
      mocks.first.mockResolvedValue(null) // Musing not found

      await expect(
        IdeaMusingsService.markComplete(mockMusingId, mockUserId)
      ).rejects.toThrow('Musing not found')
      expect(mocks.update).not.toHaveBeenCalled()
    })

    it('should be idempotent - can mark already completed musing', async () => {
      const alreadyCompletedRow = {
        ...mockMusingRow,
        completed: true,
        completed_at: new Date('2024-01-01'),
      }
      const updatedRow = {
        ...alreadyCompletedRow,
        completed_at: new Date(), // Updated timestamp
      }

      mocks.first.mockResolvedValueOnce(alreadyCompletedRow) // For getById check
      mocks.first.mockResolvedValueOnce(updatedRow) // For getById after update
      vi.mocked(SeedsService.SeedsService.getById).mockResolvedValue(mockSeed)

      const result = await IdeaMusingsService.markComplete(mockMusingId, mockUserId)

      expect(result.completed).toBe(true)
      expect(mocks.update).toHaveBeenCalled()
    })
  })

  describe('getBySeedId', () => {
    it('should include completed fields in response', async () => {
      const completedRow = {
        ...mockMusingRow,
        completed: true,
        completed_at: new Date('2024-01-01'),
      }
      mocks.select.mockResolvedValue([completedRow])

      const result = await IdeaMusingsService.getBySeedId(mockSeedId)

      expect(result[0].completed).toBe(true)
      expect(result[0].completed_at).toBeInstanceOf(Date)
    })
  })
})

