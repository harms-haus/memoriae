// Events service for timeline event management
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import type { Operation } from 'fast-json-patch'

export interface Event {
  id: string
  seed_id: string
  event_type: string
  patch_json: Operation[]
  enabled: boolean
  created_at: Date
  automation_id: string | null
}

export interface CreateEventDto {
  seed_id: string
  event_type: string
  patch_json: Operation[]
  automation_id?: string | null
}

export class EventsService {
  /**
   * Create a new event
   */
  static async create(data: CreateEventDto): Promise<Event> {
    const event = {
      id: uuidv4(),
      seed_id: data.seed_id,
      event_type: data.event_type,
      patch_json: data.patch_json,
      enabled: true,
      created_at: new Date(),
      automation_id: data.automation_id || null,
    }

    const [created] = await db('events')
      .insert(event)
      .returning('*')

    return {
      ...created,
      patch_json: created.patch_json as Operation[],
      created_at: new Date(created.created_at),
    }
  }

  /**
   * Create multiple events in a transaction
   */
  static async createMany(events: CreateEventDto[]): Promise<Event[]> {
    const eventRecords = events.map(data => ({
      id: uuidv4(),
      seed_id: data.seed_id,
      event_type: data.event_type,
      patch_json: data.patch_json,
      enabled: true,
      created_at: new Date(),
      automation_id: data.automation_id || null,
    }))

    const created = await db('events')
      .insert(eventRecords)
      .returning('*')

    return created.map(e => ({
      ...e,
      patch_json: e.patch_json as Operation[],
      created_at: new Date(e.created_at),
    }))
  }

  /**
   * Get event by ID
   */
  static async getById(id: string): Promise<Event | null> {
    const event = await db('events').where({ id }).first()

    if (!event) {
      return null
    }

    return {
      ...event,
      patch_json: event.patch_json as Operation[],
      created_at: new Date(event.created_at),
    }
  }

  /**
   * Get all events for a seed (timeline), ordered by creation time
   */
  static async getBySeedId(seedId: string): Promise<Event[]> {
    const events = await db('events')
      .where({ seed_id: seedId })
      .orderBy('created_at', 'asc')

    return events.map(e => ({
      ...e,
      patch_json: e.patch_json as Operation[],
      created_at: new Date(e.created_at),
    }))
  }

  /**
   * Get only enabled events for a seed, ordered by creation time
   * Used for computing current state
   */
  static async getEnabledBySeedId(seedId: string): Promise<Event[]> {
    const events = await db('events')
      .where({ seed_id: seedId })
      .where({ enabled: true })
      .orderBy('created_at', 'asc')

    return events.map(e => ({
      ...e,
      patch_json: e.patch_json as Operation[],
      created_at: new Date(e.created_at),
    }))
  }

  /**
   * Toggle event enabled/disabled state
   */
  static async toggle(id: string, enabled: boolean): Promise<Event | null> {
    const [updated] = await db('events')
      .where({ id })
      .update({ enabled, updated_at: new Date() })
      .returning('*')

    if (!updated) {
      return null
    }

    return {
      ...updated,
      patch_json: updated.patch_json as Operation[],
      created_at: new Date(updated.created_at),
    }
  }

  /**
   * Delete an event (soft delete by disabling, or hard delete)
   */
  static async delete(id: string, hardDelete: boolean = false): Promise<boolean> {
    if (hardDelete) {
      const deleted = await db('events').where({ id }).delete()
      return deleted > 0
    } else {
      // Soft delete by disabling
      const updated = await db('events')
        .where({ id })
        .update({ enabled: false, updated_at: new Date() })
      return updated > 0
    }
  }

  /**
   * Get events by automation ID
   */
  static async getByAutomationId(automationId: string): Promise<Event[]> {
    const events = await db('events')
      .where({ automation_id: automationId })
      .orderBy('created_at', 'asc')

    return events.map(e => ({
      ...e,
      patch_json: e.patch_json as Operation[],
      created_at: new Date(e.created_at),
    }))
  }

  /**
   * Verify that a seed belongs to a user (for authorization)
   * This is a helper method used by routes to ensure users can only
   * access events for their own seeds
   */
  static async verifySeedOwnership(seedId: string, userId: string): Promise<boolean> {
    const seed = await db('seeds')
      .where({ id: seedId, user_id: userId })
      .first()

    return !!seed
  }
}

