// Settings service - handles user settings operations
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'

export interface UserSettingsRow {
  id: string
  user_id: string
  openrouter_api_key: string | null
  openrouter_model: string | null
  openrouter_model_name: string | null
  timezone: string | null
  created_at: Date
  updated_at: Date
}

export interface UserSettings {
  openrouter_api_key: string | null
  openrouter_model: string | null
  openrouter_model_name: string | null
  timezone: string | null
}

export interface UpdateSettingsDto {
  openrouter_api_key?: string | null
  openrouter_model?: string | null
  openrouter_model_name?: string | null
  timezone?: string | null
}

/**
 * SettingsService - handles user settings operations
 */
export class SettingsService {
  /**
   * Get user settings, creating default record if none exists
   */
  static async getByUserId(userId: string): Promise<UserSettings> {
    let settings = await db<UserSettingsRow>('user_settings')
      .where({ user_id: userId })
      .first()

    // Create default settings if none exist
    if (!settings) {
      const id = uuidv4()
      await db('user_settings').insert({
        id,
        user_id: userId,
        openrouter_api_key: null,
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      
      return {
        openrouter_api_key: null,
        openrouter_model: null,
        openrouter_model_name: null,
        timezone: null,
      }
    }

    return {
      openrouter_api_key: settings.openrouter_api_key,
      openrouter_model: settings.openrouter_model,
      openrouter_model_name: settings.openrouter_model_name,
      timezone: settings.timezone,
    }
  }

  /**
   * Update user settings
   */
  static async update(userId: string, updates: UpdateSettingsDto): Promise<UserSettings> {
    try {
      // Check if settings exist
      const existing = await db<UserSettingsRow>('user_settings')
        .where({ user_id: userId })
        .first()

      if (!existing) {
        // Create new settings record
        const id = uuidv4()
        await db('user_settings').insert({
          id,
          user_id: userId,
          openrouter_api_key: updates.openrouter_api_key ?? null,
          openrouter_model: updates.openrouter_model ?? null,
          openrouter_model_name: updates.openrouter_model_name ?? null,
          timezone: updates.timezone ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        })
      } else {
        // Update existing settings
        const updateData: Partial<UserSettingsRow> = {
          updated_at: new Date(),
        }

        if (updates.openrouter_api_key !== undefined) {
          updateData.openrouter_api_key = updates.openrouter_api_key
        }
        if (updates.openrouter_model !== undefined) {
          updateData.openrouter_model = updates.openrouter_model
        }
        if (updates.openrouter_model_name !== undefined) {
          updateData.openrouter_model_name = updates.openrouter_model_name
        }
        if (updates.timezone !== undefined) {
          updateData.timezone = updates.timezone
        }

        await db('user_settings')
          .where({ user_id: userId })
          .update(updateData)
      }

      // Return updated settings
      return await this.getByUserId(userId)
    } catch (error) {
      console.error('Error updating user settings:', error)
      // Re-throw as Error if it isn't already
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Failed to update settings: ${String(error)}`)
    }
  }
}

