// Seeds service - business logic for seed operations
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import { computeSeedState } from '../utils/seed-state'
import { SeedTransactionsService } from './seed-transactions'
import { generateSeedSlug } from '../utils/slug'
import log from 'loglevel'

const logService = log.getLogger('Service:Seeds')

export interface SeedRow {
  id: string
  user_id: string
  created_at: Date
  slug: string | null
}

export interface SeedState {
  seed: string
  timestamp: string
  metadata: Record<string, unknown>
  tags?: Array<{ id: string; name: string }>
  categories?: Array<{ id: string; name: string; path: string }>
}

export interface Seed extends SeedRow {
  currentState: SeedState
}

export interface CreateSeedDto {
  content: string
}

export interface UpdateSeedDto {
  content?: string
}

/**
 * Compute current seed state by replaying all transactions
 * This is the core timeline functionality - current state = replay all transactions
 */
export async function computeCurrentState(seedId: string): Promise<SeedState> {
  logService.debug(`computeCurrentState - Computing state for seed ${seedId}`)
  try {
    // Fetch all transactions for this seed
    const transactions = await SeedTransactionsService.getBySeedId(seedId)
    
    // Compute state by replaying transactions
    const computedState = computeSeedState(transactions)
    
    // Convert to output format (timestamp as ISO string)
    const state: SeedState = {
      seed: computedState.seed,
      timestamp: computedState.timestamp.toISOString(),
      metadata: computedState.metadata || {},
    }
    
    // Only include tags and categories if they exist (not undefined)
    if (computedState.tags !== undefined && computedState.tags.length > 0) {
      state.tags = computedState.tags
    }
    if (computedState.categories !== undefined && computedState.categories.length > 0) {
      state.categories = computedState.categories
    }
    
    logService.debug(`computeCurrentState - Computed state for seed ${seedId} (${transactions.length} transactions)`)
    return state
  } catch (error) {
    logService.error(`computeCurrentState - Error computing state for seed ${seedId}:`, error)
    throw error
  }
}

/**
 * SeedsService - handles all seed-related database operations
 */
export class SeedsService {
  /**
   * Get all seeds for a user
   * Computes current state for each seed by replaying transactions
   */
  static async getByUser(userId: string): Promise<Seed[]> {
    logService.debug(`getByUser - Fetching seeds for user ${userId}`)
    try {
      const seeds = await db<SeedRow>('seeds')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')

      // Compute current state for each seed
      const seedsWithState = await Promise.all(
        seeds.map(async (seed) => ({
          ...seed,
          currentState: await computeCurrentState(seed.id),
        }))
      )

      logService.info(`getByUser - Found ${seedsWithState.length} seeds for user ${userId}`)
      return seedsWithState
    } catch (error) {
      logService.error(`getByUser - Error fetching seeds for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Get a single seed by ID (must belong to user)
   * Computes current state by replaying all transactions
   */
  static async getById(id: string, userId: string): Promise<Seed | null> {
    logService.debug(`getById - Fetching seed ${id} for user ${userId}`)
    try {
      const seed = await db<SeedRow>('seeds')
        .where({ id, user_id: userId })
        .first()

      if (!seed) {
        logService.debug(`getById - Seed ${id} not found for user ${userId}`)
        return null
      }

      const currentState = await computeCurrentState(seed.id)

      logService.debug(`getById - Found seed ${id} for user ${userId}`)
      return {
        ...seed,
        currentState,
      }
    } catch (error) {
      logService.error(`getById - Error fetching seed ${id} for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Get a single seed by hashId (first 7 chars of UUID)
   * If multiple seeds match, uses slug similarity to find the best match
   * Computes current state by replaying all transactions
   */
  static async getByHashId(hashId: string, userId: string, slugHint?: string): Promise<Seed | null> {
    logService.debug(`getByHashId - Fetching seed with hashId ${hashId} for user ${userId}${slugHint ? `, slugHint: ${slugHint}` : ''}`)
    try {
      // Find all seeds with IDs starting with hashId
      const seeds = await db<SeedRow>('seeds')
        .where({ user_id: userId })
        .whereRaw('LEFT(id::text, ?) = ?', [hashId.length, hashId])
        .orderBy('created_at', 'desc')

      if (seeds.length === 0) {
        logService.debug(`getByHashId - No seeds found with hashId ${hashId} for user ${userId}`)
        return null
      }

      // If only one match, return it
      if (seeds.length === 1) {
        const seed = seeds[0]!
        const currentState = await computeCurrentState(seed.id)
        logService.debug(`getByHashId - Found single match for hashId ${hashId}: seed ${seed.id}`)
        return {
          ...seed,
          currentState,
        } as Seed
      }

      logService.debug(`getByHashId - Found ${seeds.length} matches for hashId ${hashId}, using slug hint`)

      // Multiple matches - use slug hint to find best match
      if (slugHint) {
        // Find seed with slug that most closely matches the hint
        // Compare by checking if hint is contained in slug or vice versa
        let bestMatch: SeedRow | null = null
        let bestScore = 0

        for (const seed of seeds) {
          if (!seed.slug) continue

          // Extract slug part (after hashId/)
          const slugPart = seed.slug.includes('/') 
            ? seed.slug.split('/').slice(1).join('/')
            : seed.slug

          // Calculate similarity score
          // Higher score if hint is contained in slug or slug is contained in hint
          let score = 0
          const hintLower = slugHint.toLowerCase()
          const slugLower = slugPart.toLowerCase()

          if (slugLower.includes(hintLower)) {
            score = hintLower.length / slugLower.length // Percentage match
          } else if (hintLower.includes(slugLower)) {
            score = slugLower.length / hintLower.length // Percentage match
          } else {
            // Check for common substring
            const commonLength = this.getCommonSubstringLength(hintLower, slugLower)
            score = commonLength / Math.max(hintLower.length, slugLower.length)
          }

          if (score > bestScore) {
            bestScore = score
            bestMatch = seed
          }
        }

        // If we found a good match (score > 0.3), use it
        if (bestMatch && bestScore > 0.3) {
          const currentState = await computeCurrentState(bestMatch.id)
          logService.debug(`getByHashId - Found best match for hashId ${hashId} with score ${bestScore.toFixed(2)}: seed ${bestMatch.id}`)
          return {
            ...bestMatch,
            currentState,
          } as Seed
        }
      }

      // No good match found, or no slug hint provided - return the most recent one
      const seed = seeds[0]!
      const currentState = await computeCurrentState(seed.id)
      logService.debug(`getByHashId - Using most recent seed for hashId ${hashId}: seed ${seed.id}`)
      return {
        ...seed,
        currentState,
      } as Seed
    } catch (error) {
      logService.error(`getByHashId - Error fetching seed with hashId ${hashId} for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Helper to calculate common substring length between two strings
   */
  private static getCommonSubstringLength(str1: string, str2: string): number {
    let maxLength = 0
    for (let i = 0; i < str1.length; i++) {
      for (let j = i + 1; j <= str1.length; j++) {
        const substr = str1.substring(i, j)
        if (str2.includes(substr) && substr.length > maxLength) {
          maxLength = substr.length
        }
      }
    }
    return maxLength
  }

  /**
   * Get a single seed by slug (must belong to user)
   * Computes current state by replaying all transactions
   */
  static async getBySlug(slug: string, userId: string): Promise<Seed | null> {
    logService.debug(`getBySlug - Fetching seed with slug ${slug} for user ${userId}`)
    try {
      const seed = await db<SeedRow>('seeds')
        .where({ slug, user_id: userId })
        .first()

      if (!seed) {
        logService.debug(`getBySlug - Seed with slug ${slug} not found for user ${userId}`)
        return null
      }

      const currentState = await computeCurrentState(seed.id)

      logService.debug(`getBySlug - Found seed ${seed.id} with slug ${slug} for user ${userId}`)
      return {
        ...seed,
        currentState,
      }
    } catch (error) {
      logService.error(`getBySlug - Error fetching seed with slug ${slug} for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Create a new seed
   * Creates seed row and create_seed transaction atomically
   * Content is required and must be non-empty
   */
  static async create(userId: string, data: CreateSeedDto): Promise<Seed> {
    logService.debug(`create - Creating seed for user ${userId} (content length: ${data.content?.length || 0})`)
    try {
      // Validate content is required and non-empty
      if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        logService.warn(`create - Invalid content provided for user ${userId}`)
        throw new Error('Content is required and must be a non-empty string')
      }

      const id = uuidv4()
      const now = new Date()
      const trimmedContent = data.content.trim()
      
      // Generate UUID prefix (first 7 characters)
      const uuidPrefix = id.substring(0, 7)
      
      // Generate slug
      const slug = await generateSeedSlug(trimmedContent, uuidPrefix)

      // Use a database transaction to ensure atomicity
      const seed = await db.transaction(async (trx) => {
        // Create seed row
        const [seed] = await trx<SeedRow>('seeds')
          .insert({
            id,
            user_id: userId,
            created_at: now,
            slug,
          })
          .returning('*')

        if (!seed) {
          throw new Error('Failed to create seed: insert did not return a result')
        }

        // Create create_seed transaction within the same database transaction
        await trx('seed_transactions')
          .insert({
            id: uuidv4(),
            seed_id: id,
            transaction_type: 'create_seed',
            transaction_data: trx.raw('?::jsonb', [JSON.stringify({ content: trimmedContent })]),
            created_at: now,
            automation_id: null,
          })

        // Return seed - state will be computed after transaction commits
        return seed
      }).then(async (seed) => {
        // Compute current state from transactions (after commit)
        const currentState = await computeCurrentState(id)
        return {
          ...seed,
          currentState,
        }
      })

      logService.info(`create - Created seed ${id} for user ${userId} with slug ${slug}`)
      return seed
    } catch (error) {
      logService.error(`create - Error creating seed for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Update a seed's content (creates an edit_content transaction)
   * After update, recomputes current state from all transactions
   */
  static async update(id: string, userId: string, data: UpdateSeedDto): Promise<Seed | null> {
    logService.debug(`update - Updating seed ${id} for user ${userId}`, { hasContent: data.content !== undefined })
    try {
      // Verify seed belongs to user
      const existing = await db<SeedRow>('seeds')
        .where({ id, user_id: userId })
        .first()

      if (!existing) {
        logService.debug(`update - Seed ${id} not found for user ${userId}`)
        return null
      }

      if (data.content === undefined) {
        // No updates, return existing with computed current state
        const currentState = await computeCurrentState(id)
        logService.debug(`update - No content update for seed ${id}, returning existing state`)
        return {
          ...existing,
          currentState,
        }
      }

      // Create edit_content transaction
      await SeedTransactionsService.create({
        seed_id: id,
        transaction_type: 'edit_content',
        transaction_data: {
          content: data.content,
        },
        automation_id: null,
      })

      // Recompute current state after update
      const currentState = await computeCurrentState(id)

      logService.info(`update - Updated seed ${id} for user ${userId}`)
      return {
        ...existing,
        currentState,
      }
    } catch (error) {
      logService.error(`update - Error updating seed ${id} for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Delete a seed (must belong to user)
   */
  static async delete(id: string, userId: string): Promise<boolean> {
    logService.debug(`delete - Deleting seed ${id} for user ${userId}`)
    try {
      const deleted = await db<SeedRow>('seeds')
        .where({ id, user_id: userId })
        .delete()

      if (deleted > 0) {
        logService.info(`delete - Deleted seed ${id} for user ${userId}`)
      } else {
        logService.debug(`delete - Seed ${id} not found for user ${userId} (or already deleted)`)
      }

      return deleted > 0
    } catch (error) {
      logService.error(`delete - Error deleting seed ${id} for user ${userId}:`, error)
      throw error
    }
  }
}
