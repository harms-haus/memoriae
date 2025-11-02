// Seeds service - business logic for seed operations
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'

export interface SeedRow {
  id: string
  user_id: string
  seed_content: string
  created_at: Date
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
 * Compute base state from seed content
 * For now, this is just the base state. Later, we'll apply enabled events.
 */
function computeBaseState(seedContent: string, createdAt: Date): SeedState {
  return {
    seed: seedContent,
    timestamp: createdAt.toISOString(),
    metadata: {},
  }
}

/**
 * SeedsService - handles all seed-related database operations
 */
export class SeedsService {
  /**
   * Get all seeds for a user
   */
  static async getByUser(userId: string): Promise<Seed[]> {
    const seeds = await db<SeedRow>('seeds')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')

    return seeds.map((seed) => ({
      ...seed,
      currentState: computeBaseState(seed.seed_content, seed.created_at),
    }))
  }

  /**
   * Get a single seed by ID (must belong to user)
   */
  static async getById(id: string, userId: string): Promise<Seed | null> {
    const seed = await db<SeedRow>('seeds')
      .where({ id, user_id: userId })
      .first()

    if (!seed) {
      return null
    }

    return {
      ...seed,
      currentState: computeBaseState(seed.seed_content, seed.created_at),
    }
  }

  /**
   * Create a new seed
   */
  static async create(userId: string, data: CreateSeedDto): Promise<Seed> {
    const id = uuidv4()
    const now = new Date()

    const result = await db<SeedRow>('seeds')
      .insert({
        id,
        user_id: userId,
        seed_content: data.content,
        created_at: now,
      })
      .returning('*')

    const seed = result[0]
    if (!seed) {
      throw new Error('Failed to create seed: insert did not return a result')
    }

    return {
      ...seed,
      currentState: computeBaseState(seed.seed_content, seed.created_at),
    }
  }

  /**
   * Update a seed's content (creates a new event in the timeline)
   * For now, we'll update the base content. Later, this will create an UPDATE_CONTENT event.
   */
  static async update(id: string, userId: string, data: UpdateSeedDto): Promise<Seed | null> {
    // Verify seed belongs to user
    const existing = await db<SeedRow>('seeds')
      .where({ id, user_id: userId })
      .first()

    if (!existing) {
      return null
    }

    const updates: Partial<SeedRow> = {}
    if (data.content !== undefined) {
      updates.seed_content = data.content
    }

    if (Object.keys(updates).length === 0) {
      // No updates, return existing
      return {
        ...existing,
        currentState: computeBaseState(existing.seed_content, existing.created_at),
      }
    }

    const result = await db<SeedRow>('seeds')
      .where({ id })
      .update(updates)
      .returning('*')

    const updated = result[0]
    if (!updated) {
      throw new Error('Failed to update seed: update did not return a result')
    }

    return {
      ...updated,
      currentState: computeBaseState(updated.seed_content, updated.created_at),
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
