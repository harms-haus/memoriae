// Seeds service - business logic for seed operations
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import { applyEvents, createBaseState } from '../utils/jsonpatch'
import { EventsService } from './events'

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
 * Compute current seed state by applying all enabled events to base state
 * This is the core timeline functionality - current state = base + enabled events
 */
async function computeCurrentState(seedContent: string, createdAt: Date, seedId: string): Promise<SeedState> {
  // Create base state using jsonpatch utility
  const baseState = createBaseState(seedContent, createdAt)
  
  // Fetch all enabled events for this seed
  const events = await EventsService.getEnabledBySeedId(seedId)
  
  // Apply events to compute current state
  // Convert Event[] to EventData[] format expected by applyEvents
  const eventData = events.map(e => ({
    id: e.id,
    patch_json: e.patch_json,
    enabled: e.enabled,
    created_at: e.created_at,
  }))
  
  const computedState = applyEvents(baseState, eventData)
  
  // Convert to output format (timestamp as ISO string)
  // With exactOptionalPropertyTypes, we can't assign undefined to optional properties
  const state: SeedState = {
    seed: computedState.seed,
    timestamp: computedState.timestamp instanceof Date 
      ? computedState.timestamp.toISOString() 
      : new Date(computedState.timestamp).toISOString(),
    metadata: computedState.metadata || {},
  }
  
  // Only include tags and categories if they exist (not undefined)
  if (computedState.tags !== undefined) {
    state.tags = computedState.tags
  }
  if (computedState.categories !== undefined) {
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
   * Computes current state for each seed by applying enabled events
   */
  static async getByUser(userId: string): Promise<Seed[]> {
    const seeds = await db<SeedRow>('seeds')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')

    // Compute current state for each seed
    const seedsWithState = await Promise.all(
      seeds.map(async (seed) => ({
        ...seed,
        currentState: await computeCurrentState(seed.seed_content, seed.created_at, seed.id),
      }))
    )

    return seedsWithState
  }

  /**
   * Get a single seed by ID (must belong to user)
   * Computes current state by applying all enabled events
   */
  static async getById(id: string, userId: string): Promise<Seed | null> {
    const seed = await db<SeedRow>('seeds')
      .where({ id, user_id: userId })
      .first()

    if (!seed) {
      return null
    }

    const currentState = await computeCurrentState(seed.seed_content, seed.created_at, seed.id)

    return {
      ...seed,
      currentState,
    }
  }

  /**
   * Create a new seed
   * New seeds start with base state (no events yet)
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

    // New seeds have no events, so current state = base state
    const currentState = await computeCurrentState(seed.seed_content, seed.created_at, seed.id)

    return {
      ...seed,
      currentState,
    }
  }

  /**
   * Update a seed's content (creates a new event in the timeline)
   * For now, we'll update the base content. Later, this will create an UPDATE_CONTENT event.
   * After update, recomputes current state from all enabled events
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
      // No updates, return existing with computed current state
      const currentState = await computeCurrentState(existing.seed_content, existing.created_at, existing.id)
      return {
        ...existing,
        currentState,
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

    // Recompute current state after update
    const currentState = await computeCurrentState(updated.seed_content, updated.created_at, updated.id)

    return {
      ...updated,
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
