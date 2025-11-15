// Sprouts service - business logic for sprout operations
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import type {
  Sprout,
  SproutRow,
  SproutData,
  CreateSproutDto,
} from '../types/sprouts'
import log from 'loglevel'

const logService = log.getLogger('Service:Sprouts')

export class SproutsService {
  /**
   * Get all sprouts for a seed, ordered by creation time
   */
  static async getBySeedId(seedId: string): Promise<Sprout[]> {
    logService.debug(`getBySeedId - Fetching sprouts for seed ${seedId}`)
    try {
      const rows = await db<SproutRow>('sprouts')
        .where({ seed_id: seedId })
        .orderBy('created_at', 'asc')
        .select('*')

      const sprouts: Sprout[] = rows.map((row) => ({
        id: row.id,
        seed_id: row.seed_id,
        sprout_type: row.sprout_type,
        sprout_data: row.sprout_data as SproutData,
        created_at: new Date(row.created_at),
        automation_id: row.automation_id,
      }))

      logService.info(`getBySeedId - Found ${sprouts.length} sprouts for seed ${seedId}`)
      return sprouts
    } catch (error) {
      logService.error(`getBySeedId - Error fetching sprouts for seed ${seedId}:`, error)
      throw error
    }
  }

  /**
   * Get a single sprout by ID
   */
  static async getById(sproutId: string): Promise<Sprout | null> {
    logService.debug(`getById - Fetching sprout ${sproutId}`)
    try {
      const row = await db<SproutRow>('sprouts')
        .where({ id: sproutId })
        .first()

      if (!row) {
        logService.debug(`getById - Sprout ${sproutId} not found`)
        return null
      }

      const sprout: Sprout = {
        id: row.id,
        seed_id: row.seed_id,
        sprout_type: row.sprout_type,
        sprout_data: row.sprout_data as SproutData,
        created_at: new Date(row.created_at),
        automation_id: row.automation_id,
      }

      logService.debug(`getById - Found sprout ${sproutId}`)
      return sprout
    } catch (error) {
      logService.error(`getById - Error fetching sprout ${sproutId}:`, error)
      throw error
    }
  }

  /**
   * Create a new sprout
   */
  static async create(data: CreateSproutDto & { seed_id: string }): Promise<Sprout> {
    logService.debug(`create - Creating sprout for seed ${data.seed_id} (type: ${data.sprout_type})`)
    try {
      const sproutId = uuidv4()
      const now = new Date()

      await db<SproutRow>('sprouts').insert({
        id: sproutId,
        seed_id: data.seed_id,
        sprout_type: data.sprout_type,
        sprout_data: db.raw('?::jsonb', [JSON.stringify(data.sprout_data)]),
        created_at: now,
        automation_id: data.automation_id || null,
      })

      const sprout = await this.getById(sproutId)
      if (!sprout) {
        throw new Error('Failed to create sprout')
      }

      logService.info(`create - Created sprout ${sproutId} for seed ${data.seed_id} (type: ${data.sprout_type})`)
      return sprout
    } catch (error) {
      logService.error(`create - Error creating sprout for seed ${data.seed_id}:`, error)
      throw error
    }
  }

  /**
   * Delete a sprout
   */
  static async delete(sproutId: string): Promise<boolean> {
    logService.debug(`delete - Deleting sprout ${sproutId}`)
    try {
      const deleted = await db('sprouts').where({ id: sproutId }).delete()
      const success = deleted > 0

      if (success) {
        logService.info(`delete - Deleted sprout ${sproutId}`)
      } else {
        logService.warn(`delete - Sprout ${sproutId} not found`)
      }

      return success
    } catch (error) {
      logService.error(`delete - Error deleting sprout ${sproutId}:`, error)
      throw error
    }
  }

  /**
   * Verify that a sprout belongs to a seed owned by a user (for authorization)
   */
  static async verifySproutOwnership(sproutId: string, userId: string): Promise<boolean> {
    try {
      const sprout = await this.getById(sproutId)
      if (!sprout) {
        return false
      }

      const seed = await db('seeds')
        .where({ id: sprout.seed_id, user_id: userId })
        .first()

      return !!seed
    } catch (error) {
      logService.error(`verifySproutOwnership - Error verifying ownership for sprout ${sproutId}:`, error)
      return false
    }
  }
}

