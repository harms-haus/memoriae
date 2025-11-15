// Musing sprout handler tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as musingHandler from './musing-sprout'
import { SproutsService } from '../sprouts'
import type { Sprout, MusingSproutData } from '../../types/sprouts'
import db from '../../db/connection'

// Mock SproutsService
vi.mock('../sprouts', () => ({
  SproutsService: {
    getById: vi.fn(),
    create: vi.fn(),
  },
}))

// Mock database
const mockWhere = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

vi.mock('../../db/connection', () => {
  const createQueryBuilder = () => {
    const builder: any = {
      where: (...args: any[]) => {
        mockWhere(...args)
        return builder
      },
      update: (...args: any[]) => {
        mockUpdate(...args)
        return Promise.resolve(1)
      },
      insert: (...args: any[]) => {
        mockInsert(...args)
        return Promise.resolve([{}])
      },
    }
    return builder
  }

  const mockDb = vi.fn((table: string) => {
    return createQueryBuilder()
  })

  mockDb.raw = vi.fn((sql: string, params: any[]) => {
    return { sql, params }
  })

  return {
    default: mockDb,
  }
})

describe('MusingSprout Handler', () => {
  const mockSproutId = 'sprout-123'
  const mockSeedId = 'seed-123'
  const mockMusingData: MusingSproutData = {
    template_type: 'numbered_ideas',
    content: {
      ideas: ['Idea 1', 'Idea 2'],
    },
    dismissed: false,
    dismissed_at: null,
    completed: false,
    completed_at: null,
  }

  const mockSprout: Sprout = {
    id: mockSproutId,
    seed_id: mockSeedId,
    sprout_type: 'musing',
    sprout_data: mockMusingData,
    created_at: new Date(),
    automation_id: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMusingData', () => {
    it('should return musing data for musing sprout', () => {
      const data = musingHandler.getMusingData(mockSprout)
      expect(data).toEqual(mockMusingData)
    })

    it('should throw error for non-musing sprout', () => {
      const followupSprout: Sprout = {
        ...mockSprout,
        sprout_type: 'followup',
        sprout_data: {} as any,
      }
      expect(() => musingHandler.getMusingData(followupSprout)).toThrow('Sprout is not a musing type')
    })
  })

  describe('dismissMusing', () => {
    it('should dismiss a musing sprout', async () => {
      const dismissedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockMusingData,
          dismissed: true,
          dismissed_at: new Date().toISOString(),
        },
      }

      vi.mocked(SproutsService.getById)
        .mockResolvedValueOnce(mockSprout) // First call in dismissMusing
        .mockResolvedValueOnce(mockSprout) // Second call in updateMusingData (before update)
        .mockResolvedValueOnce(dismissedSprout) // Third call in updateMusingData (after update)

      const result = await musingHandler.dismissMusing(mockSproutId)

      expect(SproutsService.getById).toHaveBeenCalledTimes(3)
      expect(SproutsService.getById).toHaveBeenNthCalledWith(1, mockSproutId)
      expect(SproutsService.getById).toHaveBeenNthCalledWith(2, mockSproutId)
      expect(SproutsService.getById).toHaveBeenNthCalledWith(3, mockSproutId)
      expect(mockWhere).toHaveBeenCalledWith({ id: mockSproutId })
      expect(mockUpdate).toHaveBeenCalled()
      expect(result.sprout_data).toMatchObject({
        dismissed: true,
        dismissed_at: expect.any(String),
      })
    })

    it('should return current sprout if already dismissed', async () => {
      const dismissedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockMusingData,
          dismissed: true,
          dismissed_at: new Date().toISOString(),
        },
      }
      vi.mocked(SproutsService.getById).mockResolvedValueOnce(dismissedSprout)

      const result = await musingHandler.dismissMusing(mockSproutId)

      expect(SproutsService.getById).toHaveBeenCalledWith(mockSproutId)
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(result).toEqual(dismissedSprout)
    })

    it('should throw error if sprout not found', async () => {
      vi.mocked(SproutsService.getById).mockResolvedValueOnce(null)

      await expect(musingHandler.dismissMusing(mockSproutId)).rejects.toThrow('Sprout not found')
    })

    it('should throw error if sprout is not musing type', async () => {
      const followupSprout: Sprout = {
        ...mockSprout,
        sprout_type: 'followup',
        sprout_data: {} as any,
      }
      vi.mocked(SproutsService.getById).mockResolvedValueOnce(followupSprout)

      await expect(musingHandler.dismissMusing(mockSproutId)).rejects.toThrow('Sprout is not a musing type')
    })
  })

  describe('completeMusing', () => {
    it('should complete a musing sprout', async () => {
      const completedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockMusingData,
          completed: true,
          completed_at: new Date().toISOString(),
        },
      }

      vi.mocked(SproutsService.getById)
        .mockResolvedValueOnce(mockSprout) // First call in completeMusing
        .mockResolvedValueOnce(mockSprout) // Second call in updateMusingData (before update)
        .mockResolvedValueOnce(completedSprout) // Third call in updateMusingData (after update)

      const result = await musingHandler.completeMusing(mockSproutId)

      expect(SproutsService.getById).toHaveBeenCalledTimes(3)
      expect(SproutsService.getById).toHaveBeenNthCalledWith(1, mockSproutId)
      expect(SproutsService.getById).toHaveBeenNthCalledWith(2, mockSproutId)
      expect(SproutsService.getById).toHaveBeenNthCalledWith(3, mockSproutId)
      expect(mockWhere).toHaveBeenCalledWith({ id: mockSproutId })
      expect(mockUpdate).toHaveBeenCalled()
      expect(result.sprout_data).toMatchObject({
        completed: true,
        completed_at: expect.any(String),
      })
    })

    it('should return current sprout if already completed', async () => {
      const completedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockMusingData,
          completed: true,
          completed_at: new Date().toISOString(),
        },
      }
      vi.mocked(SproutsService.getById).mockResolvedValueOnce(completedSprout)

      const result = await musingHandler.completeMusing(mockSproutId)

      expect(SproutsService.getById).toHaveBeenCalledWith(mockSproutId)
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(result).toEqual(completedSprout)
    })

    it('should throw error if sprout not found', async () => {
      vi.mocked(SproutsService.getById).mockResolvedValueOnce(null)

      await expect(musingHandler.completeMusing(mockSproutId)).rejects.toThrow('Sprout not found')
    })

    it('should throw error if sprout is not musing type', async () => {
      const followupSprout: Sprout = {
        ...mockSprout,
        sprout_type: 'followup',
        sprout_data: {} as any,
      }
      vi.mocked(SproutsService.getById).mockResolvedValueOnce(followupSprout)

      await expect(musingHandler.completeMusing(mockSproutId)).rejects.toThrow('Sprout is not a musing type')
    })
  })

  describe('createMusingSprout', () => {
    it('should create a musing sprout with numbered_ideas template', async () => {
      const content = {
        ideas: ['Idea 1', 'Idea 2', 'Idea 3'],
      }
      vi.mocked(SproutsService.create).mockResolvedValueOnce(mockSprout)

      const result = await musingHandler.createMusingSprout(mockSeedId, 'numbered_ideas', content)

      expect(SproutsService.create).toHaveBeenCalledWith({
        seed_id: mockSeedId,
        sprout_type: 'musing',
        sprout_data: {
          template_type: 'numbered_ideas',
          content,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
        automation_id: null,
      })
      expect(result).toEqual(mockSprout)
    })

    it('should create a musing sprout with wikipedia_links template', async () => {
      const content = {
        links: [
          { title: 'Link 1', url: 'https://example.com/1' },
          { title: 'Link 2', url: 'https://example.com/2' },
        ],
      }
      const wikipediaSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockMusingData,
          template_type: 'wikipedia_links',
          content,
        },
      }
      vi.mocked(SproutsService.create).mockResolvedValueOnce(wikipediaSprout)

      const result = await musingHandler.createMusingSprout(mockSeedId, 'wikipedia_links', content)

      expect(SproutsService.create).toHaveBeenCalledWith({
        seed_id: mockSeedId,
        sprout_type: 'musing',
        sprout_data: {
          template_type: 'wikipedia_links',
          content,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
        automation_id: null,
      })
      expect(result).toEqual(wikipediaSprout)
    })

    it('should create a musing sprout with markdown template', async () => {
      const content = {
        markdown: '# Markdown Content\n\nSome text here.',
      }
      const markdownSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockMusingData,
          template_type: 'markdown',
          content,
        },
      }
      vi.mocked(SproutsService.create).mockResolvedValueOnce(markdownSprout)

      const result = await musingHandler.createMusingSprout(mockSeedId, 'markdown', content)

      expect(SproutsService.create).toHaveBeenCalledWith({
        seed_id: mockSeedId,
        sprout_type: 'musing',
        sprout_data: {
          template_type: 'markdown',
          content,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
        automation_id: null,
      })
      expect(result).toEqual(markdownSprout)
    })

    it('should create a musing sprout with automation_id', async () => {
      const automationId = 'automation-123'
      vi.mocked(SproutsService.create).mockResolvedValueOnce({
        ...mockSprout,
        automation_id: automationId,
      })

      const result = await musingHandler.createMusingSprout(
        mockSeedId,
        'numbered_ideas',
        { ideas: ['Idea 1'] },
        automationId
      )

      expect(SproutsService.create).toHaveBeenCalledWith({
        seed_id: mockSeedId,
        sprout_type: 'musing',
        sprout_data: expect.objectContaining({
          template_type: 'numbered_ideas',
        }),
        automation_id: automationId,
      })
      expect(result.automation_id).toBe(automationId)
    })
  })
})

