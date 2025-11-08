// Idea musings service for managing idea musings
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import { SeedsService } from './seeds'

export type MusingTemplateType = 'numbered_ideas' | 'wikipedia_links' | 'markdown'

export interface NumberedIdeasContent {
  ideas: string[]
}

export interface WikipediaLinksContent {
  links: Array<{
    title: string
    url: string
  }>
}

export interface MarkdownContent {
  markdown: string
}

export type MusingContent = NumberedIdeasContent | WikipediaLinksContent | MarkdownContent

export interface IdeaMusingRow {
  id: string
  seed_id: string
  template_type: MusingTemplateType
  content: MusingContent
  created_at: Date
  dismissed: boolean
  dismissed_at: Date | null
  completed: boolean
  completed_at: Date | null
}

export interface IdeaMusing {
  id: string
  seed_id: string
  template_type: MusingTemplateType
  content: MusingContent
  created_at: Date
  dismissed: boolean
  dismissed_at: Date | null
  completed: boolean
  completed_at: Date | null
  seed?: import('./seeds').Seed // Optional, populated when fetching with seed details
}

export interface IdeaMusingShownHistoryRow {
  id: string
  seed_id: string
  shown_date: Date
  created_at: Date
}

export class IdeaMusingsService {
  /**
   * Get today's musings for a user
   * Returns musings created today that are not dismissed
   */
  static async getDailyMusings(userId: string): Promise<IdeaMusing[]> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Get all seeds for user
      const seeds = await SeedsService.getByUser(userId)
      const seedIds = seeds.map(s => s.id)

      if (seedIds.length === 0) {
        return []
      }

      // Get musings created today for user's seeds
      // Exclude dismissed and completed musings
      const rows = await db<IdeaMusingRow>('idea_musings')
        .whereIn('seed_id', seedIds)
        .where('created_at', '>=', today)
        .where('created_at', '<', tomorrow)
        .where('dismissed', false)
        .where('completed', false)
        .orderBy('created_at', 'desc')
        .select('*')

      // Map to IdeaMusing and include seed data
      const seedMap = new Map(seeds.map(s => [s.id, s]))
      return rows.map(row => {
        const musing: IdeaMusing = {
          id: row.id,
          seed_id: row.seed_id,
          template_type: row.template_type,
          content: row.content as MusingContent,
          created_at: new Date(row.created_at),
          dismissed: row.dismissed,
          dismissed_at: row.dismissed_at ? new Date(row.dismissed_at) : null,
          completed: row.completed ?? false,
          completed_at: row.completed_at ? new Date(row.completed_at) : null,
        }
        const seed = seedMap.get(row.seed_id)
        if (seed) {
          musing.seed = seed
        }
        return musing
      })
    } catch (error: any) {
      // Handle case where table doesn't exist yet (migrations not run)
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('idea_musings table does not exist yet, returning empty array')
        return []
      }
      throw error
    }
  }

  /**
   * Get musings for a specific seed
   */
  static async getBySeedId(seedId: string): Promise<IdeaMusing[]> {
    try {
      const rows = await db<IdeaMusingRow>('idea_musings')
        .where({ seed_id: seedId })
        .orderBy('created_at', 'desc')
        .select('*')

      return rows.map(row => ({
        id: row.id,
        seed_id: row.seed_id,
        template_type: row.template_type,
        content: row.content as MusingContent,
        created_at: new Date(row.created_at),
        dismissed: row.dismissed,
        dismissed_at: row.dismissed_at ? new Date(row.dismissed_at) : null,
        completed: row.completed ?? false,
        completed_at: row.completed_at ? new Date(row.completed_at) : null,
      }))
    } catch (error: any) {
      // Handle case where table doesn't exist yet
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('idea_musings table does not exist yet, returning empty array')
        return []
      }
      throw error
    }
  }

  /**
   * Get a musing by ID
   */
  static async getById(musingId: string): Promise<IdeaMusing | null> {
    const row = await db<IdeaMusingRow>('idea_musings')
      .where({ id: musingId })
      .first()

    if (!row) {
      return null
    }

    return {
      id: row.id,
      seed_id: row.seed_id,
      template_type: row.template_type,
      content: row.content as MusingContent,
      created_at: new Date(row.created_at),
      dismissed: row.dismissed,
      dismissed_at: row.dismissed_at ? new Date(row.dismissed_at) : null,
      completed: row.completed ?? false,
      completed_at: row.completed_at ? new Date(row.completed_at) : null,
    }
  }

  /**
   * Create a new musing
   */
  static async create(
    seedId: string,
    templateType: MusingTemplateType,
    content: MusingContent
  ): Promise<IdeaMusing> {
    const id = uuidv4()
    const now = new Date()

    await db<IdeaMusingRow>('idea_musings').insert({
      id,
      seed_id: seedId,
      template_type: templateType,
      content: db.raw('?::jsonb', [JSON.stringify(content)]),
      created_at: now,
      dismissed: false,
      dismissed_at: null,
      completed: false,
      completed_at: null,
    })

    const musing = await this.getById(id)
    if (!musing) {
      throw new Error('Failed to create musing')
    }

    return musing
  }

  /**
   * Dismiss a musing
   */
  static async dismiss(musingId: string, userId: string): Promise<IdeaMusing> {
    // Verify musing belongs to user's seed
    const musing = await this.getById(musingId)
    if (!musing) {
      throw new Error('Musing not found')
    }

    const seed = await SeedsService.getById(musing.seed_id, userId)
    if (!seed) {
      throw new Error('Musing does not belong to user')
    }

    // Update musing
    await db<IdeaMusingRow>('idea_musings')
      .where({ id: musingId })
      .update({
        dismissed: true,
        dismissed_at: new Date(),
      })

    const updated = await this.getById(musingId)
    if (!updated) {
      throw new Error('Failed to dismiss musing')
    }

    return updated
  }

  /**
   * Mark a musing as complete
   */
  static async markComplete(musingId: string, userId: string): Promise<IdeaMusing> {
    // Verify musing belongs to user's seed
    const musing = await this.getById(musingId)
    if (!musing) {
      throw new Error('Musing not found')
    }

    const seed = await SeedsService.getById(musing.seed_id, userId)
    if (!seed) {
      throw new Error('Musing does not belong to user')
    }

    // Update musing
    await db<IdeaMusingRow>('idea_musings')
      .where({ id: musingId })
      .update({
        completed: true,
        completed_at: new Date(),
      })

    const updated = await this.getById(musingId)
    if (!updated) {
      throw new Error('Failed to mark musing as complete')
    }

    return updated
  }

  /**
   * Record that a seed was shown in musings
   */
  static async recordShown(seedId: string, date: Date): Promise<void> {
    // Check if already recorded for this date
    const existing = await db<IdeaMusingShownHistoryRow>('idea_musing_shown_history')
      .where({ seed_id: seedId, shown_date: date })
      .first()

    if (!existing) {
      await db<IdeaMusingShownHistoryRow>('idea_musing_shown_history').insert({
        id: uuidv4(),
        seed_id: seedId,
        shown_date: date,
        created_at: new Date(),
      })
    }
  }

  /**
   * Get seeds that were shown in the last N days
   * Returns set of seed IDs
   */
  static async getSeedsShownInLastDays(days: number): Promise<Set<string>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      cutoffDate.setHours(0, 0, 0, 0)

      const rows = await db<IdeaMusingShownHistoryRow>('idea_musing_shown_history')
        .where('shown_date', '>=', cutoffDate)
        .select('seed_id')

      return new Set(rows.map(r => r.seed_id))
    } catch (error: any) {
      // Handle case where table doesn't exist yet
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('idea_musing_shown_history table does not exist yet, returning empty set')
        return new Set()
      }
      throw error
    }
  }

  /**
   * Check if a seed was shown in the last N days
   */
  static async wasShownInLastDays(seedId: string, days: number): Promise<boolean> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    cutoffDate.setHours(0, 0, 0, 0)

    const count = await db<IdeaMusingShownHistoryRow>('idea_musing_shown_history')
      .where({ seed_id: seedId })
      .where('shown_date', '>=', cutoffDate)
      .count('* as count')
      .first()

    const countValue = (count as any)?.count
    if (typeof countValue === 'string') {
      return parseInt(countValue, 10) > 0
    }
    return (countValue as number) > 0
  }
}

