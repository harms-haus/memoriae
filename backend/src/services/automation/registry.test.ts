// Automation registry tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AutomationRegistry } from './registry'
import type { Automation } from './base'
import db from '../../db/connection'

// Mock database connection
vi.mock('../../db/connection', () => ({
  default: vi.fn(),
}))

// Mock Automation base class
class MockAutomation implements Automation {
  readonly name: string
  readonly description: string
  readonly handlerFnName: string
  id?: string
  enabled: boolean = true

  constructor(name: string, description: string, handlerFnName: string) {
    this.name = name
    this.description = description
    this.handlerFnName = handlerFnName
  }

  async process(): Promise<any> {
    return { transactions: [] }
  }

  async calculatePressure(): Promise<number> {
    return 0
  }

  async handlePressure(): Promise<void> {
    // No-op
  }
}

describe('AutomationRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear singleton instance for each test
    const registry = AutomationRegistry.getInstance()
    registry.clear()
  })

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = AutomationRegistry.getInstance()
      const instance2 = AutomationRegistry.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('register', () => {
    it('should register automation with database ID', async () => {
      const automation = new MockAutomation('test-automation', 'Test automation', 'processTest')
      const mockRow = {
        id: 'auto-123',
        name: 'test-automation',
        description: 'Test automation',
        handler_fn_name: 'processTest',
        enabled: true,
        created_at: new Date(),
      }

      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(mockRow)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation)

      expect(automation.id).toBe('auto-123')
      expect(automation.enabled).toBe(true)
      expect(registry.getById('auto-123')).toBe(automation)
      expect(registry.getByName('test-automation')).toBe(automation)
    })

    it('should register automation without database ID if not found', async () => {
      const automation = new MockAutomation('test-automation', 'Test automation', 'processTest')

      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation)

      expect(automation.id).toBeUndefined()
      expect(registry.getByName('test-automation')).toBe(automation)
    })

    it('should register automation with existing ID', async () => {
      const automation = new MockAutomation('test-automation', 'Test automation', 'processTest')
      automation.id = 'auto-456'

      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation)

      expect(registry.getById('auto-456')).toBe(automation)
      expect(registry.getByName('test-automation')).toBe(automation)
    })
  })

  describe('getById', () => {
    it('should return automation by ID', async () => {
      const automation = new MockAutomation('test-automation', 'Test automation', 'processTest')
      automation.id = 'auto-123'

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation)

      const result = registry.getById('auto-123')
      expect(result).toBe(automation)
    })

    it('should return null when automation not found', () => {
      const registry = AutomationRegistry.getInstance()
      const result = registry.getById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('getByName', () => {
    it('should return automation by name', async () => {
      const automation = new MockAutomation('test-automation', 'Test automation', 'processTest')

      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation)

      const result = registry.getByName('test-automation')
      expect(result).toBe(automation)
    })

    it('should return null when automation not found', () => {
      const registry = AutomationRegistry.getInstance()
      const result = registry.getByName('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('getAll', () => {
    it('should return all registered automations', async () => {
      const automation1 = new MockAutomation('auto-1', 'Automation 1', 'process1')
      automation1.id = 'id-1'
      const automation2 = new MockAutomation('auto-2', 'Automation 2', 'process2')
      automation2.id = 'id-2'

      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation1)
      await registry.register(automation2)

      const result = registry.getAll()
      expect(result).toHaveLength(2)
      expect(result).toContain(automation1)
      expect(result).toContain(automation2)
    })

    it('should return empty array when no automations registered', () => {
      const registry = AutomationRegistry.getInstance()
      const result = registry.getAll()
      expect(result).toEqual([])
    })
  })

  describe('getEnabled', () => {
    it('should return only enabled automations', async () => {
      const automation1 = new MockAutomation('auto-1', 'Automation 1', 'process1')
      automation1.id = 'id-1'
      automation1.enabled = true
      const automation2 = new MockAutomation('auto-2', 'Automation 2', 'process2')
      automation2.id = 'id-2'
      automation2.enabled = false

      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation1)
      await registry.register(automation2)

      const result = registry.getEnabled()
      expect(result).toHaveLength(1)
      expect(result).toContain(automation1)
      expect(result).not.toContain(automation2)
    })
  })

  describe('has', () => {
    it('should return true when automation is registered', async () => {
      const automation = new MockAutomation('test-automation', 'Test automation', 'processTest')
      automation.id = 'auto-123'

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation)

      expect(registry.has('auto-123')).toBe(true)
    })

    it('should return false when automation is not registered', () => {
      const registry = AutomationRegistry.getInstance()
      expect(registry.has('non-existent')).toBe(false)
    })
  })

  describe('unregister', () => {
    it('should unregister automation by ID', async () => {
      const automation = new MockAutomation('test-automation', 'Test automation', 'processTest')
      automation.id = 'auto-123'

      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation)

      expect(registry.has('auto-123')).toBe(true)
      expect(registry.getByName('test-automation')).toBe(automation)

      registry.unregister('auto-123')

      expect(registry.has('auto-123')).toBe(false)
      expect(registry.getByName('test-automation')).toBeNull()
    })

    it('should do nothing when automation not found', () => {
      const registry = AutomationRegistry.getInstance()
      // Should not throw
      registry.unregister('non-existent')
    })
  })

  describe('loadFromDatabase', () => {
    it('should load automations from database and register them', async () => {
      const automation1 = new MockAutomation('auto-1', 'Automation 1', 'process1')
      const automation2 = new MockAutomation('auto-2', 'Automation 2', 'process2')

      const mockRows = [
        {
          id: 'id-1',
          name: 'auto-1',
          description: 'Automation 1',
          handler_fn_name: 'process1',
          enabled: true,
          created_at: new Date(),
        },
        {
          id: 'id-2',
          name: 'auto-2',
          description: 'Automation 2',
          handler_fn_name: 'process2',
          enabled: false,
          created_at: new Date(),
        },
      ]

      const mockSelect = vi.fn().mockResolvedValue(mockRows)
      vi.mocked(db).mockReturnValue({
        select: mockSelect,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.loadFromDatabase([automation1, automation2])

      expect(automation1.id).toBe('id-1')
      expect(automation1.enabled).toBe(true)
      expect(automation2.id).toBe('id-2')
      expect(automation2.enabled).toBe(false)
      expect(registry.getById('id-1')).toBe(automation1)
      expect(registry.getById('id-2')).toBe(automation2)
    })

    it('should create automation in database if not found', async () => {
      const automation = new MockAutomation('new-auto', 'New Automation', 'processNew')

      const mockRows: any[] = []
      const mockSelect = vi.fn().mockResolvedValue(mockRows)
      const mockInsert = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([
        {
          id: 'new-id',
          name: 'new-auto',
          description: 'New Automation',
          handler_fn_name: 'processNew',
          enabled: true,
          created_at: new Date(),
        },
      ])

      vi.mocked(db)
        .mockReturnValueOnce({
          select: mockSelect,
        } as any)
        .mockReturnValueOnce({
          insert: mockInsert,
          returning: mockReturning,
        } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.loadFromDatabase([automation])

      expect(automation.id).toBe('new-id')
      expect(automation.enabled).toBe(true)
      expect(registry.getById('new-id')).toBe(automation)
    })

    it('should handle empty automation list', async () => {
      const mockSelect = vi.fn().mockResolvedValue([])
      vi.mocked(db).mockReturnValue({
        select: mockSelect,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.loadFromDatabase([])

      expect(registry.getAll()).toEqual([])
    })
  })

  describe('clear', () => {
    it('should clear all registered automations', async () => {
      const automation1 = new MockAutomation('auto-1', 'Automation 1', 'process1')
      automation1.id = 'id-1'
      const automation2 = new MockAutomation('auto-2', 'Automation 2', 'process2')
      automation2.id = 'id-2'

      const mockWhere = vi.fn().mockReturnThis()
      const mockFirst = vi.fn().mockResolvedValue(undefined)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        first: mockFirst,
      } as any)

      const registry = AutomationRegistry.getInstance()
      await registry.register(automation1)
      await registry.register(automation2)

      expect(registry.getAll()).toHaveLength(2)

      registry.clear()

      expect(registry.getAll()).toEqual([])
      expect(registry.getById('id-1')).toBeNull()
      expect(registry.getById('id-2')).toBeNull()
      expect(registry.getByName('auto-1')).toBeNull()
      expect(registry.getByName('auto-2')).toBeNull()
    })
  })
})

