// Wikipedia sprout handler tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as wikipediaHandler from './wikipedia-sprout'
import { SproutsService } from '../sprouts'
import type {
  Sprout,
  WikipediaReferenceSproutData,
  WikipediaSproutState,
  WikipediaTransaction,
  SproutWikipediaTransactionRow,
} from '../../types/sprouts'
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
const mockOrderBy = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()

let selectResolvedValue: any[] = []
let selectCallQueue: any[][] = []
let selectCallIndex = 0

vi.mock('../../db/connection', () => {
  const createQueryBuilder = () => {
    const builder: any = {
      where: (...args: any[]) => {
        mockWhere(...args)
        return builder
      },
      orderBy: (...args: any[]) => {
        mockOrderBy(...args)
        return builder
      },
      select: (...args: any[]) => {
        mockSelect(...args)
        // If queue is set, use it; otherwise use single value
        if (selectCallQueue.length > 0) {
          const value = selectCallQueue[selectCallIndex] || []
          selectCallIndex++
          return Promise.resolve(value)
        }
        return Promise.resolve(selectResolvedValue)
      },
      insert: (...args: any[]) => {
        mockInsert(...args)
        return Promise.resolve(undefined)
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

describe('WikipediaSprout Handler', () => {
  const mockSproutId = 'sprout-123'
  const mockSeedId = 'seed-123'
  const reference = 'Human chimerism'
  const articleUrl = 'https://en.wikipedia.org/wiki/Human_chimerism'
  const articleTitle = 'Human chimerism'
  const summary = 'This is a summary about human chimerism.'

  const mockSproutData: WikipediaReferenceSproutData = {
    reference,
    article_url: articleUrl,
    article_title: articleTitle,
    summary,
  }

  const mockSprout: Sprout = {
    id: mockSproutId,
    seed_id: mockSeedId,
    sprout_type: 'wikipedia_reference',
    sprout_data: mockSproutData,
    created_at: new Date(),
    automation_id: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    selectResolvedValue = []
    selectCallQueue = []
    selectCallIndex = 0
  })

  describe('getWikipediaState', () => {
    it('should compute state from creation transaction', async () => {
      const creationTime = new Date('2024-01-01T10:00:00Z')
      const creationTransaction: SproutWikipediaTransactionRow = {
        id: 'txn-1',
        sprout_id: mockSproutId,
        transaction_type: 'creation',
        transaction_data: {
          reference,
          article_url: articleUrl,
          article_title: articleTitle,
          summary,
        },
        created_at: creationTime,
      }

      selectResolvedValue = [creationTransaction]

      vi.mocked(SproutsService.getById).mockResolvedValue(mockSprout)

      const state = await wikipediaHandler.getWikipediaState(mockSprout)

      expect(state.reference).toBe(reference)
      expect(state.article_url).toBe(articleUrl)
      expect(state.article_title).toBe(articleTitle)
      expect(state.summary).toBe(summary)
      expect(state.transactions).toHaveLength(1)
      expect(state.transactions[0]?.transaction_type).toBe('creation')
    })

    it('should throw error if no creation transaction exists', async () => {
      selectResolvedValue = []

      vi.mocked(SproutsService.getById).mockResolvedValue(mockSprout)

      await expect(wikipediaHandler.getWikipediaState(mockSprout)).rejects.toThrow(
        'Wikipedia sprout must have a creation transaction'
      )
    })

    it('should apply edit transactions in order', async () => {
      const creationTime = new Date('2024-01-01T10:00:00Z')
      const editTime = new Date('2024-01-02T10:00:00Z')
      const newSummary = 'This is an updated summary.'

      const creationTransaction: SproutWikipediaTransactionRow = {
        id: 'txn-1',
        sprout_id: mockSproutId,
        transaction_type: 'creation',
        transaction_data: {
          reference,
          article_url: articleUrl,
          article_title: articleTitle,
          summary,
        },
        created_at: creationTime,
      }

      const editTransaction: SproutWikipediaTransactionRow = {
        id: 'txn-2',
        sprout_id: mockSproutId,
        transaction_type: 'edit',
        transaction_data: {
          old_summary: summary,
          new_summary: newSummary,
        },
        created_at: editTime,
      }

      selectResolvedValue = [creationTransaction, editTransaction]

      vi.mocked(SproutsService.getById).mockResolvedValue(mockSprout)

      const state = await wikipediaHandler.getWikipediaState(mockSprout)

      expect(state.summary).toBe(newSummary)
      expect(state.transactions).toHaveLength(2)
    })
  })

  describe('editWikipediaSummary', () => {
    it('should create edit transaction and update state', async () => {
      const creationTime = new Date('2024-01-01T10:00:00Z')
      const creationTransaction: SproutWikipediaTransactionRow = {
        id: 'txn-1',
        sprout_id: mockSproutId,
        transaction_type: 'creation',
        transaction_data: {
          reference,
          article_url: articleUrl,
          article_title: articleTitle,
          summary,
        },
        created_at: creationTime,
      }

      const newSummary = 'This is an updated summary.'
      const editTime = new Date('2024-01-01T11:00:00Z')
      const editTransaction: SproutWikipediaTransactionRow = {
        id: 'txn-2',
        sprout_id: mockSproutId,
        transaction_type: 'edit',
        transaction_data: {
          old_summary: summary,
          new_summary: newSummary,
        },
        created_at: editTime,
      }

      // Set up queue: first call gets current state, second call gets updated state
      selectCallQueue = [
        [creationTransaction], // First call: get current state
        [creationTransaction, editTransaction], // Second call: get updated state after insert
      ]
      selectCallIndex = 0

      vi.mocked(SproutsService.getById).mockResolvedValue(mockSprout)

      const state = await wikipediaHandler.editWikipediaSummary(mockSproutId, newSummary)

      expect(state.summary).toBe(newSummary)
      expect(mockInsert).toHaveBeenCalled()
      // insert is called with a single object, not an array
      const insertData = mockInsert.mock.calls[0]?.[0]
      expect(insertData?.transaction_type).toBe('edit')
      expect(insertData?.sprout_id).toBe(mockSproutId)
    })

    it('should return current state if summary unchanged', async () => {
      const creationTime = new Date('2024-01-01T10:00:00Z')
      const creationTransaction: SproutWikipediaTransactionRow = {
        id: 'txn-1',
        sprout_id: mockSproutId,
        transaction_type: 'creation',
        transaction_data: {
          reference,
          article_url: articleUrl,
          article_title: articleTitle,
          summary,
        },
        created_at: creationTime,
      }

      selectResolvedValue = [creationTransaction]

      vi.mocked(SproutsService.getById).mockResolvedValue(mockSprout)

      const state = await wikipediaHandler.editWikipediaSummary(mockSproutId, summary)

      expect(state.summary).toBe(summary)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should throw error if sprout not found', async () => {
      vi.mocked(SproutsService.getById).mockResolvedValue(null)

      await expect(wikipediaHandler.editWikipediaSummary(mockSproutId, 'New summary')).rejects.toThrow(
        'Sprout not found'
      )
    })

    it('should throw error if sprout is not Wikipedia reference type', async () => {
      const wrongSprout: Sprout = {
        ...mockSprout,
        sprout_type: 'followup',
      }

      vi.mocked(SproutsService.getById).mockResolvedValue(wrongSprout)

      await expect(wikipediaHandler.editWikipediaSummary(mockSproutId, 'New summary')).rejects.toThrow(
        'Sprout is not a Wikipedia reference type'
      )
    })
  })

  describe('createWikipediaSprout', () => {
    it('should create sprout with creation transaction', async () => {
      const now = new Date()
      const createdSprout: Sprout = {
        ...mockSprout,
        created_at: now,
      }

      vi.mocked(SproutsService.create).mockResolvedValue(createdSprout)
      vi.mocked(SproutsService.getById).mockResolvedValue(createdSprout)

      const sprout = await wikipediaHandler.createWikipediaSprout(mockSeedId, mockSproutData, null)

      expect(sprout).toBe(createdSprout)
      expect(SproutsService.create).toHaveBeenCalledWith({
        seed_id: mockSeedId,
        sprout_type: 'wikipedia_reference',
        sprout_data: mockSproutData,
        automation_id: null,
      })
      expect(mockInsert).toHaveBeenCalled()
      // insert is called with a single object, not an array
      const insertData = mockInsert.mock.calls[0]?.[0]
      expect(insertData?.transaction_type).toBe('creation')
      expect(insertData?.sprout_id).toBe(sprout.id)
    })

    it('should create sprout with automation_id when provided', async () => {
      const automationId = 'automation-123'
      const now = new Date()
      const createdSprout: Sprout = {
        ...mockSprout,
        created_at: now,
        automation_id: automationId,
      }

      vi.mocked(SproutsService.create).mockResolvedValue(createdSprout)
      vi.mocked(SproutsService.getById).mockResolvedValue(createdSprout)

      const sprout = await wikipediaHandler.createWikipediaSprout(mockSeedId, mockSproutData, automationId)

      expect(sprout.automation_id).toBe(automationId)
      expect(SproutsService.create).toHaveBeenCalledWith({
        seed_id: mockSeedId,
        sprout_type: 'wikipedia_reference',
        sprout_data: mockSproutData,
        automation_id: automationId,
      })
    })
  })
})

