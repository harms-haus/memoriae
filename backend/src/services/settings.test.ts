// Settings service tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SettingsService } from './settings'
import type { UserSettings, UpdateSettingsDto } from './settings'
import db from '../db/connection'

// Mock the database
vi.mock('../db/connection', () => {
  const mockWhere = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockFirst = vi.fn()

  const mockDb = vi.fn((table: string) => ({
    where: mockWhere.mockReturnThis(),
    insert: mockInsert,
    update: mockUpdate.mockReturnThis(),
    first: mockFirst,
  }))

  // Make where chainable
  mockWhere.mockReturnValue({
    first: mockFirst,
    update: mockUpdate.mockReturnThis(),
  })

  return {
    default: mockDb,
  }
})

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getByUserId', () => {
    it('should return existing settings when they exist', async () => {
      const mockSettings = {
        id: 'settings-id',
        user_id: 'user-123',
        openrouter_api_key: 'test-key',
        openrouter_model: 'test-model',
        openrouter_model_name: 'Test Model',
        timezone: 'America/New_York',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const mockFirst = vi.fn().mockResolvedValue(mockSettings)
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
      })

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
      } as any)

      const result = await SettingsService.getByUserId('user-123')

      expect(result).toEqual({
        openrouter_api_key: 'test-key',
        openrouter_model: 'test-model',
        openrouter_model_name: 'Test Model',
        timezone: 'America/New_York',
      })
      expect(mockWhere).toHaveBeenCalledWith({ user_id: 'user-123' })
    })

    it('should create default settings when none exist', async () => {
      const mockFirst = vi.fn()
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
      })
      const mockInsert = vi.fn().mockResolvedValue([])

      mockFirst.mockResolvedValueOnce(undefined) // No existing settings

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        insert: mockInsert,
      } as any)

      const result = await SettingsService.getByUserId('user-123')

      expect(result).toEqual({
        openrouter_api_key: null,
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: null,
      })
      expect(mockInsert).toHaveBeenCalled()
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.user_id).toBe('user-123')
      expect(insertCall.openrouter_api_key).toBeNull()
    })

    it('should return null values for unset settings', async () => {
      const mockSettings = {
        id: 'settings-id',
        user_id: 'user-123',
        openrouter_api_key: null,
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: null,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const mockFirst = vi.fn().mockResolvedValue(mockSettings)
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
      })

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
      } as any)

      const result = await SettingsService.getByUserId('user-123')

      expect(result).toEqual({
        openrouter_api_key: null,
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: null,
      })
    })
  })

  describe('update', () => {
    it('should update existing settings', async () => {
      const existingSettings = {
        id: 'settings-id',
        user_id: 'user-123',
        openrouter_api_key: 'old-key',
        openrouter_model: 'old-model',
        openrouter_model_name: 'Old Model',
        timezone: 'UTC',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const updatedSettings = {
        ...existingSettings,
        openrouter_api_key: 'new-key',
        openrouter_model: 'new-model',
        updated_at: new Date(),
      }

      const mockFirst = vi.fn()
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
        update: vi.fn().mockResolvedValue(1),
      })
      const mockUpdate = vi.fn().mockReturnThis()

      // First call: check if settings exist
      mockFirst.mockResolvedValueOnce(existingSettings)
      // Second call: get updated settings
      mockFirst.mockResolvedValueOnce(updatedSettings)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        update: mockUpdate,
      } as any)

      const updates: UpdateSettingsDto = {
        openrouter_api_key: 'new-key',
        openrouter_model: 'new-model',
      }

      const result = await SettingsService.update('user-123', updates)

      expect(result.openrouter_api_key).toBe('new-key')
      expect(result.openrouter_model).toBe('new-model')
      expect(mockWhere).toHaveBeenCalledWith({ user_id: 'user-123' })
    })

    it('should create new settings when none exist', async () => {
      const newSettings = {
        id: 'settings-id',
        user_id: 'user-123',
        openrouter_api_key: 'new-key',
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: null,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const mockFirst = vi.fn()
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
      })
      const mockInsert = vi.fn().mockResolvedValue([])

      // First call: check if settings exist (returns undefined)
      mockFirst.mockResolvedValueOnce(undefined)
      // Second call: get created settings
      mockFirst.mockResolvedValueOnce(newSettings)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        insert: mockInsert,
      } as any)

      const updates: UpdateSettingsDto = {
        openrouter_api_key: 'new-key',
      }

      const result = await SettingsService.update('user-123', updates)

      expect(result.openrouter_api_key).toBe('new-key')
      expect(mockInsert).toHaveBeenCalled()
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.user_id).toBe('user-123')
      expect(insertCall.openrouter_api_key).toBe('new-key')
    })

    it('should handle partial updates', async () => {
      const existingSettings = {
        id: 'settings-id',
        user_id: 'user-123',
        openrouter_api_key: 'existing-key',
        openrouter_model: 'existing-model',
        openrouter_model_name: 'Existing Model',
        timezone: 'UTC',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const updatedSettings = {
        ...existingSettings,
        timezone: 'America/New_York',
        updated_at: new Date(),
      }

      const mockFirst = vi.fn()
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
        update: vi.fn().mockResolvedValue(1),
      })

      mockFirst.mockResolvedValueOnce(existingSettings)
      mockFirst.mockResolvedValueOnce(updatedSettings)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        update: vi.fn().mockReturnThis(),
      } as any)

      const updates: UpdateSettingsDto = {
        timezone: 'America/New_York',
      }

      const result = await SettingsService.update('user-123', updates)

      expect(result.timezone).toBe('America/New_York')
      expect(result.openrouter_api_key).toBe('existing-key') // Unchanged
    })

    it('should handle null values in updates', async () => {
      const existingSettings = {
        id: 'settings-id',
        user_id: 'user-123',
        openrouter_api_key: 'existing-key',
        openrouter_model: 'existing-model',
        openrouter_model_name: 'Existing Model',
        timezone: 'UTC',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const updatedSettings = {
        ...existingSettings,
        openrouter_api_key: null,
        updated_at: new Date(),
      }

      const mockFirst = vi.fn()
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
        update: vi.fn().mockResolvedValue(1),
      })

      mockFirst.mockResolvedValueOnce(existingSettings)
      mockFirst.mockResolvedValueOnce(updatedSettings)

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        update: vi.fn().mockReturnThis(),
      } as any)

      const updates: UpdateSettingsDto = {
        openrouter_api_key: null,
      }

      const result = await SettingsService.update('user-123', updates)

      expect(result.openrouter_api_key).toBeNull()
    })

    it('should throw error when update fails', async () => {
      const mockFirst = vi.fn()
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
        update: vi.fn().mockRejectedValue(new Error('Database error')),
      })

      mockFirst.mockResolvedValueOnce({
        id: 'settings-id',
        user_id: 'user-123',
        openrouter_api_key: 'existing-key',
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: null,
        created_at: new Date(),
        updated_at: new Date(),
      })

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        update: vi.fn().mockRejectedValue(new Error('Database error')),
      } as any)

      const updates: UpdateSettingsDto = {
        openrouter_api_key: 'new-key',
      }

      await expect(SettingsService.update('user-123', updates)).rejects.toThrow('Database error')
    })

    it('should handle non-Error exceptions', async () => {
      const mockFirst = vi.fn()
      const mockUpdate = vi.fn().mockRejectedValue('String error')
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
        update: mockUpdate,
      })

      mockFirst.mockResolvedValueOnce({
        id: 'settings-id',
        user_id: 'user-123',
        openrouter_api_key: 'existing-key',
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: null,
        created_at: new Date(),
        updated_at: new Date(),
      })

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        update: mockUpdate,
      } as any)

      const updates: UpdateSettingsDto = {
        openrouter_api_key: 'new-key',
      }

      await expect(SettingsService.update('user-123', updates)).rejects.toThrow('Failed to update settings: String error')
    })
  })
})

