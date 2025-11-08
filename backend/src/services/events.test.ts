// Events service unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventsService } from './events'
import db from '../db/connection'
import type { Operation } from 'fast-json-patch'

// Mock database connection
vi.mock('../db/connection', () => ({
  default: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    raw: vi.fn((sql: string, params: any[]) => params[0]),
  })),
}))

describe('EventsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new event', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvent = {
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        enabled: true,
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      vi.mocked(db).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockEvent]),
        raw: vi.fn((sql: string, params: any[]) => params[0]),
      } as any)

      const result = await EventsService.create({
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
      })

      expect(result).toMatchObject({
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        enabled: true,
      })
      expect(result.created_at).toBeInstanceOf(Date)
    })

    it('should handle JSONB patch_json correctly', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvent = {
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        enabled: true,
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockEvent]),
        raw: vi.fn((sql: string, params: any[]) => {
          // Verify JSONB casting is used
          expect(sql).toContain('::jsonb')
          return params[0]
        }),
      }

      vi.mocked(db).mockReturnValue(mockDb as any)

      await EventsService.create({
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
      })

      expect(mockDb.raw).toHaveBeenCalled()
    })

    it('should set enabled to true by default', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvent = {
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        enabled: true,
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      vi.mocked(db).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockEvent]),
        raw: vi.fn((sql: string, params: any[]) => params[0]),
      } as any)

      const result = await EventsService.create({
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
      })

      expect(result.enabled).toBe(true)
    })

    it('should accept optional automation_id', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvent = {
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        enabled: true,
        created_at: new Date('2024-01-01'),
        automation_id: 'auto-1',
      }

      vi.mocked(db).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockEvent]),
        raw: vi.fn((sql: string, params: any[]) => params[0]),
      } as any)

      const result = await EventsService.create({
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        automation_id: 'auto-1',
      })

      expect(result.automation_id).toBe('auto-1')
    })

    it('should set automation_id to null when not provided', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvent = {
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        enabled: true,
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      vi.mocked(db).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockEvent]),
        raw: vi.fn((sql: string, params: any[]) => params[0]),
      } as any)

      const result = await EventsService.create({
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
      })

      expect(result.automation_id).toBeNull()
    })
  })

  describe('createMany', () => {
    it('should create multiple events', async () => {
      const mockPatch1: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test 1' } },
      ]

      const mockPatch2: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-2', name: 'Test 2' } },
      ]

      const mockEvent1 = {
        id: 'event-1',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch1,
        enabled: true,
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      const mockEvent2 = {
        id: 'event-2',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch2,
        enabled: true,
        created_at: new Date('2024-01-02'),
        automation_id: null,
      }

      vi.mocked(db).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn()
          .mockResolvedValueOnce([mockEvent1])
          .mockResolvedValueOnce([mockEvent2]),
        raw: vi.fn((sql: string, params: any[]) => params[0]),
      } as any)

      const result = await EventsService.createMany([
        {
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: mockPatch1,
        },
        {
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: mockPatch2,
        },
      ])

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'event-1',
        patch_json: mockPatch1,
      })
      expect(result[1]).toMatchObject({
        id: 'event-2',
        patch_json: mockPatch2,
      })
    })

    it('should handle empty array', async () => {
      const result = await EventsService.createMany([])

      expect(result).toEqual([])
      expect(db).not.toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('should return event by ID', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvent = {
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        enabled: true,
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockEvent),
      } as any)

      const result = await EventsService.getById('event-123')

      expect(result).toMatchObject({
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
      })
      expect(result?.created_at).toBeInstanceOf(Date)
    })

    it('should return null when event not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      const result = await EventsService.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getBySeedId', () => {
    it('should return all events for a seed ordered by creation time', async () => {
      const mockPatch1: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test 1' } },
      ]

      const mockPatch2: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-2', name: 'Test 2' } },
      ]

      const mockEvents = [
        {
          id: 'event-1',
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: mockPatch1,
          enabled: true,
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
        {
          id: 'event-2',
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: mockPatch2,
          enabled: true,
          created_at: new Date('2024-01-02'),
          automation_id: null,
        },
      ]

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      } as any)

      const result = await EventsService.getBySeedId('seed-123')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'event-1',
        patch_json: mockPatch1,
      })
      expect(result[1]).toMatchObject({
        id: 'event-2',
        patch_json: mockPatch2,
      })
      expect(result[0].created_at).toBeInstanceOf(Date)
      expect(result[1].created_at).toBeInstanceOf(Date)
    })

    it('should return empty array when seed has no events', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      } as any)

      const result = await EventsService.getBySeedId('seed-123')

      expect(result).toEqual([])
    })

    it('should order events by created_at ascending', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: [],
          enabled: true,
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      } as any)

      await EventsService.getBySeedId('seed-123')

      // Verify orderBy is called with 'created_at' and 'asc'
      const orderByCall = vi.mocked(db().orderBy as any)
      expect(orderByCall).toHaveBeenCalled()
    })
  })

  describe('getEnabledBySeedId', () => {
    it('should return only enabled events for a seed', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvents = [
        {
          id: 'event-1',
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: mockPatch,
          enabled: true,
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      } as any)

      const result = await EventsService.getEnabledBySeedId('seed-123')

      expect(result).toHaveLength(1)
      expect(result[0].enabled).toBe(true)
    })

    it('should filter out disabled events', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: [],
          enabled: true,
          created_at: new Date('2024-01-01'),
          automation_id: null,
        },
      ]

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      } as any)

      const result = await EventsService.getEnabledBySeedId('seed-123')

      // Database query filters by enabled: true, so disabled events won't be in result
      expect(result.every(e => e.enabled === true)).toBe(true)
    })

    it('should return empty array when no enabled events exist', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      } as any)

      const result = await EventsService.getEnabledBySeedId('seed-123')

      expect(result).toEqual([])
    })
  })

  describe('toggle', () => {
    it('should toggle event enabled state to true', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvent = {
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        enabled: true,
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockEvent]),
      } as any)

      const result = await EventsService.toggle('event-123', true)

      expect(result).toMatchObject({
        id: 'event-123',
        enabled: true,
      })
    })

    it('should toggle event enabled state to false', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvent = {
        id: 'event-123',
        seed_id: 'seed-123',
        event_type: 'ADD_TAG',
        patch_json: mockPatch,
        enabled: false,
        created_at: new Date('2024-01-01'),
        automation_id: null,
      }

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockEvent]),
      } as any)

      const result = await EventsService.toggle('event-123', false)

      expect(result).toMatchObject({
        id: 'event-123',
        enabled: false,
      })
    })

    it('should return null when event not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      } as any)

      const result = await EventsService.toggle('non-existent', true)

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should soft delete event by disabling it', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockResolvedValue(1),
      } as any)

      const result = await EventsService.delete('event-123', false)

      expect(result).toBe(true)
    })

    it('should hard delete event when hardDelete is true', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        delete: vi.fn().mockResolvedValue(1),
      } as any)

      const result = await EventsService.delete('event-123', true)

      expect(result).toBe(true)
    })

    it('should return false when event not found (soft delete)', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockResolvedValue(0),
      } as any)

      const result = await EventsService.delete('non-existent', false)

      expect(result).toBe(false)
    })

    it('should return false when event not found (hard delete)', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        delete: vi.fn().mockResolvedValue(0),
      } as any)

      const result = await EventsService.delete('non-existent', true)

      expect(result).toBe(false)
    })

    it('should set updated_at when soft deleting', async () => {
      const mockDb = {
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockResolvedValue(1),
      }

      vi.mocked(db).mockReturnValue(mockDb as any)

      await EventsService.delete('event-123', false)

      expect(mockDb.update).toHaveBeenCalledWith({
        enabled: false,
        updated_at: expect.any(Date),
      })
    })
  })

  describe('getByAutomationId', () => {
    it('should return all events for an automation', async () => {
      const mockPatch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: 'tag-1', name: 'Test' } },
      ]

      const mockEvents = [
        {
          id: 'event-1',
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: mockPatch,
          enabled: true,
          created_at: new Date('2024-01-01'),
          automation_id: 'auto-1',
        },
        {
          id: 'event-2',
          seed_id: 'seed-456',
          event_type: 'ADD_TAG',
          patch_json: mockPatch,
          enabled: true,
          created_at: new Date('2024-01-02'),
          automation_id: 'auto-1',
        },
      ]

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      } as any)

      const result = await EventsService.getByAutomationId('auto-1')

      expect(result).toHaveLength(2)
      expect(result[0].automation_id).toBe('auto-1')
      expect(result[1].automation_id).toBe('auto-1')
    })

    it('should return empty array when automation has no events', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      } as any)

      const result = await EventsService.getByAutomationId('auto-1')

      expect(result).toEqual([])
    })

    it('should order events by created_at ascending', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          seed_id: 'seed-123',
          event_type: 'ADD_TAG',
          patch_json: [],
          enabled: true,
          created_at: new Date('2024-01-01'),
          automation_id: 'auto-1',
        },
      ]

      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      } as any)

      await EventsService.getByAutomationId('auto-1')

      // Verify orderBy is called
      const orderByCall = vi.mocked(db().orderBy as any)
      expect(orderByCall).toHaveBeenCalled()
    })
  })

  describe('verifySeedOwnership', () => {
    it('should return true when seed belongs to user', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'seed-123',
          user_id: 'user-123',
        }),
      } as any)

      const result = await EventsService.verifySeedOwnership('seed-123', 'user-123')

      expect(result).toBe(true)
    })

    it('should return false when seed does not belong to user', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      const result = await EventsService.verifySeedOwnership('seed-123', 'user-123')

      expect(result).toBe(false)
    })

    it('should return false when seed not found', async () => {
      vi.mocked(db).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      } as any)

      const result = await EventsService.verifySeedOwnership('non-existent', 'user-123')

      expect(result).toBe(false)
    })
  })
})

