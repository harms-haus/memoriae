// Seeds service - business logic for seed operations
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import { computeSeedState } from '../utils/seed-state'
import { SeedTransactionsService } from './seed-transactions'
import { generateSeedSlug } from '../utils/slug'

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
  
  return state
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

    return seedsWithState
  }

  /**
   * Get a single seed by ID (must belong to user)
   * Computes current state by replaying all transactions
   */
  static async getById(id: string, userId: string): Promise<Seed | null> {
    const seed = await db<SeedRow>('seeds')
      .where({ id, user_id: userId })
      .first()

    if (!seed) {
      return null
    }

    const currentState = await computeCurrentState(seed.id)

    return {
      ...seed,
      currentState,
    }
  }

  /**
   * Get a single seed by slug (must belong to user)
   * Computes current state by replaying all transactions
   */
  static async getBySlug(slug: string, userId: string): Promise<Seed | null> {
    const seed = await db<SeedRow>('seeds')
      .where({ slug, user_id: userId })
      .first()

    if (!seed) {
      return null
    }

    const currentState = await computeCurrentState(seed.id)

    return {
      ...seed,
      currentState,
    }
  }

  /**
   * Create a new seed
   * Creates seed row and create_seed transaction atomically
   * Content is required and must be non-empty
   */
  static async create(userId: string, data: CreateSeedDto): Promise<Seed> {
    // Validate content is required and non-empty
    if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
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
    return await db.transaction(async (trx) => {
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
  }

  /**
   * Update a seed's content (creates an edit_content transaction)
   * After update, recomputes current state from all transactions
   */
  static async update(id: string, userId: string, data: UpdateSeedDto): Promise<Seed | null> {
    // Verify seed belongs to user
    const existing = await db<SeedRow>('seeds')
      .where({ id, user_id: userId })
      .first()

    if (!existing) {
      return null
    }

    if (data.content === undefined) {
      // No updates, return existing with computed current state
      const currentState = await computeCurrentState(id)
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

    return {
      ...existing,
      currentState,
    }
  }

  /**
   * Delete a seed (must belong to user)
   */
  static async delete(id: string, userId: string): Promise<boolean> {
    const deleted = await db<SeedRow>('seeds')
      .where({ id, user_id: userId })
      .delete()

    return deleted > 0
  }
}
