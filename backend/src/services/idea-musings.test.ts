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

// Mock the database
const mockWhere = vi.fn()
const mockWhereIn = vi.fn()
const mockOrderBy = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockReturning = vi.fn()
const mockFirst = vi.fn()
const mockUpdate = vi.fn()

vi.mock('../db/connection', () => {
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
    }
    return queryBuilder
  })

  return {
    default: mockDb,
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
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDailyMusings', () => {
    it('should return today\'s musings for user', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([mockSeed])
      mockSelect.mockResolvedValue([mockMusingRow])

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(mockMusingId)
      expect(result[0].seed_id).toBe(mockSeedId)
      expect(SeedsService.SeedsService.getByUser).toHaveBeenCalledWith(mockUserId)
    })

    it('should return empty array when no musings exist', async () => {
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([mockSeed])
      mockSelect.mockResolvedValue([])

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result).toHaveLength(0)
    })

    it('should return empty array when user has no seeds', async () => {
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([])

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result).toHaveLength(0)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should handle missing table gracefully', async () => {
      const error = new Error('relation "idea_musings" does not exist')
      ;(error as any).code = '42P01'

      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([mockSeed])
      mockSelect.mockRejectedValue(error)

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result).toHaveLength(0)
    })

    it('should include seed data when available', async () => {
      vi.mocked(SeedsService.SeedsService.getByUser).mockResolvedValue([mockSeed])
      mockSelect.mockResolvedValue([mockMusingRow])

      const result = await IdeaMusingsService.getDailyMusings(mockUserId)

      expect(result[0].seed).toBeDefined()
      expect(result[0].seed?.id).toBe(mockSeedId)
    })
  })

  describe('getBySeedId', () => {
    it('should return musings for specific seed', async () => {
      mockSelect.mockResolvedValue([mockMusingRow])

      const result = await IdeaMusingsService.getBySeedId(mockSeedId)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(mockMusingId)
      expect(mockWhere).toHaveBeenCalledWith({ seed_id: mockSeedId })
    })

    it('should return empty array when no musings exist', async () => {
      mockSelect.mockResolvedValue([])

      const result = await IdeaMusingsService.getBySeedId(mockSeedId)

      expect(result).toHaveLength(0)
    })

    it('should handle missing table gracefully', async () => {
      const error = new Error('relation "idea_musings" does not exist')
      ;(error as any).code = '42P01'
      mockSelect.mockRejectedValue(error)

      const result = await IdeaMusingsService.getBySeedId(mockSeedId)

      expect(result).toHaveLength(0)
    })
  })

  describe('getById', () => {
    it('should return musing by ID', async () => {
      mockFirst.mockResolvedValue(mockMusingRow)

      const result = await IdeaMusingsService.getById(mockMusingId)

      expect(result).toBeDefined()
      expect(result?.id).toBe(mockMusingId)
    })

    it('should return null when musing not found', async () => {
      mockFirst.mockResolvedValue(undefined)

      const result = await IdeaMusingsService.getById(mockMusingId)

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create new musing with correct data', async () => {
      const templateType: MusingTemplateType = 'numbered_ideas'
      const content: MusingContent = {
        ideas: ['Idea 1', 'Idea 2'],
      }

      mockReturning.mockResolvedValue([{ id: mockMusingId }])
      mockFirst.mockResolvedValue(mockMusingRow)

      const result = await IdeaMusingsService.create(mockSeedId, templateType, content)

      expect(result).toBeDefined()
      expect(result.id).toBe(mockMusingId)
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('dismiss', () => {
    it('should mark musing as dismissed', async () => {
      const updatedRow = { ...mockMusingRow, dismissed: true, dismissed_at: new Date() }
      mockFirst.mockResolvedValueOnce(mockMusingRow) // For getById
      mockFirst.mockResolvedValueOnce(updatedRow) // For getById after update

      vi.mocked(SeedsService.SeedsService.getById).mockResolvedValue(mockSeed)

      const result = await IdeaMusingsService.dismiss(mockMusingId, mockUserId)

      expect(result.dismissed).toBe(true)
      expect(result.dismissed_at).toBeDefined()
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should verify user ownership', async () => {
      const otherUserSeed: Seed = {
        ...mockSeed,
        user_id: 'other-user',
      }

      mockFirst.mockResolvedValue(mockMusingRow)
      vi.mocked(SeedsService.SeedsService.getById).mockResolvedValue(otherUserSeed)

      await expect(
        IdeaMusingsService.dismiss(mockMusingId, mockUserId)
      ).rejects.toThrow('Musing not found or access denied')
    })
  })

  describe('recordShown', () => {
    it('should record shown history entry', async () => {
      const shownDate = new Date()
      shownDate.setUTCHours(0, 0, 0, 0)

      mockReturning.mockResolvedValue([{ id: 'history-1' }])

      await IdeaMusingsService.recordShown(mockSeedId, shownDate)

      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('getSeedsShownInLastDays', () => {
    it('should return correct seed IDs', async () => {
      const rows = [
        { seed_id: 'seed-1' },
        { seed_id: 'seed-2' },
        { seed_id: 'seed-1' }, // Duplicate
      ]
      mockSelect.mockResolvedValue(rows)

      const result = await IdeaMusingsService.getSeedsShownInLastDays(2)

      expect(result.size).toBe(2)
      expect(result.has('seed-1')).toBe(true)
      expect(result.has('seed-2')).toBe(true)
    })

    it('should handle missing table gracefully', async () => {
      const error = new Error('relation "idea_musing_shown_history" does not exist')
      ;(error as any).code = '42P01'
      mockSelect.mockRejectedValue(error)

      const result = await IdeaMusingsService.getSeedsShownInLastDays(2)

      expect(result.size).toBe(0)
    })
  })

  describe('wasShownInLastDays', () => {
    it('should return true if shown recently', async () => {
      mockFirst.mockResolvedValue({ count: 1 })

      const result = await IdeaMusingsService.wasShownInLastDays(mockSeedId, 2)

      expect(result).toBe(true)
    })

    it('should return false if not shown recently', async () => {
      mockFirst.mockResolvedValue({ count: 0 })

      const result = await IdeaMusingsService.wasShownInLastDays(mockSeedId, 2)

      expect(result).toBe(false)
    })
  })
})

