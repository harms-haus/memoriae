// Pressure points service - tracks pressure per seed/automation and detects threshold crossing
import db from '../db/connection'
import { AutomationRegistry } from './automation/registry'

/**
 * Database row for pressure_points table
 */
export interface PressurePointRow {
  seed_id: string
  automation_id: string
  pressure_amount: number | string // 0-100 scale (can be decimal string from DB)
  last_updated: Date
}

/**
 * Pressure point with computed fields
 */
export interface PressurePoint {
  seed_id: string
  automation_id: string
  pressure_amount: number // 0-100 scale (converted to number from decimal)
  last_updated: Date
  threshold?: number // Threshold from automation (optional, computed)
  exceedsThreshold?: boolean // Whether pressure exceeds threshold (optional, computed)
}

/**
 * PressurePointsService - manages pressure tracking and threshold detection
 * 
 * Pressure is a metric (0-100) that accumulates when category changes occur.
 * When pressure crosses an automation's threshold, the automation should re-process the seed.
 */
export class PressurePointsService {
  /**
   * Get pressure point for a specific seed/automation pair
   * 
   * @param seedId - Seed ID
   * @param automationId - Automation ID
   * @returns Pressure point or null if not found
   */
  static async get(seedId: string, automationId: string): Promise<PressurePoint | null> {
    const row = await db<PressurePointRow>('pressure_points')
      .where({ seed_id: seedId, automation_id: automationId })
      .first()

    if (!row) {
      return null
    }

    return this.enrichWithThreshold(row)
  }

  /**
   * Get all pressure points for a seed
   * 
   * @param seedId - Seed ID
   * @returns Array of pressure points
   */
  static async getBySeedId(seedId: string): Promise<PressurePoint[]> {
    const rows = await db<PressurePointRow>('pressure_points')
      .where({ seed_id: seedId })

    return Promise.all(rows.map(row => this.enrichWithThreshold(row)))
  }

  /**
   * Get all pressure points for an automation
   * 
   * @param automationId - Automation ID
   * @returns Array of pressure points
   */
  static async getByAutomationId(automationId: string): Promise<PressurePoint[]> {
    const rows = await db<PressurePointRow>('pressure_points')
      .where({ automation_id: automationId })

    return Promise.all(rows.map(row => this.enrichWithThreshold(row)))
  }

  /**
   * Add or update pressure for a seed/automation pair
   * 
   * If the pressure point exists, adds to existing pressure amount.
   * If it doesn't exist, creates a new pressure point.
   * 
   * Pressure is capped at 100.
   * 
   * @param seedId - Seed ID
   * @param automationId - Automation ID
   * @param pressureAmount - Amount of pressure to add (0-100)
   * @returns Updated pressure point
   */
  static async addPressure(
    seedId: string,
    automationId: string,
    pressureAmount: number
  ): Promise<PressurePoint> {
    // Handle NaN and invalid values
    if (!Number.isFinite(pressureAmount) || isNaN(pressureAmount)) {
      pressureAmount = 0
    }
    
    // Ensure pressure amount is valid (0-100)
    const clampedAmount = Math.max(0, Math.min(100, pressureAmount))

    // Try to get existing pressure point
    const existing = await db<PressurePointRow>('pressure_points')
      .where({ seed_id: seedId, automation_id: automationId })
      .first()

    const now = new Date()

    if (existing) {
      // Parse existing pressure (handle decimal string from DB)
      const existingPressure = typeof existing.pressure_amount === 'string'
        ? parseFloat(existing.pressure_amount)
        : existing.pressure_amount
      
      // Update existing: add to current pressure, cap at 100
      const newPressure = Math.min(100, existingPressure + clampedAmount)

      const [updated] = await db<PressurePointRow>('pressure_points')
        .where({ seed_id: seedId, automation_id: automationId })
        .update({
          pressure_amount: newPressure,
          last_updated: now,
        })
        .returning('*')

      if (!updated) {
        throw new Error('Failed to update pressure point')
      }

      return this.enrichWithThreshold(updated)
    } else {
      // Create new pressure point
      const [created] = await db<PressurePointRow>('pressure_points')
        .insert({
          seed_id: seedId,
          automation_id: automationId,
          pressure_amount: clampedAmount,
          last_updated: now,
        })
        .returning('*')

      if (!created) {
        throw new Error('Failed to create pressure point')
      }

      return this.enrichWithThreshold(created)
    }
  }

  /**
   * Set pressure to a specific value for a seed/automation pair
   * 
   * Unlike addPressure, this sets the pressure to an exact value.
   * 
   * @param seedId - Seed ID
   * @param automationId - Automation ID
   * @param pressureAmount - Exact pressure amount to set (0-100)
   * @returns Updated pressure point
   */
  static async setPressure(
    seedId: string,
    automationId: string,
    pressureAmount: number
  ): Promise<PressurePoint> {
    // Handle NaN and invalid values
    if (!Number.isFinite(pressureAmount) || isNaN(pressureAmount)) {
      pressureAmount = 0
    }
    
    // Ensure pressure amount is valid (0-100)
    const clampedAmount = Math.max(0, Math.min(100, pressureAmount))

    const now = new Date()

    // Use upsert pattern (insert or update)
    const [result] = await db<PressurePointRow>('pressure_points')
      .insert({
        seed_id: seedId,
        automation_id: automationId,
        pressure_amount: clampedAmount,
        last_updated: now,
      })
      .onConflict(['seed_id', 'automation_id'])
      .merge({
        pressure_amount: clampedAmount,
        last_updated: now,
      })
      .returning('*')

    if (!result) {
      throw new Error('Failed to set pressure point')
    }

    return this.enrichWithThreshold(result)
  }

  /**
   * Reset pressure to 0 for a seed/automation pair
   * 
   * @param seedId - Seed ID
   * @param automationId - Automation ID
   * @returns Updated pressure point (now at 0)
   */
  static async resetPressure(
    seedId: string,
    automationId: string
  ): Promise<PressurePoint> {
    return this.setPressure(seedId, automationId, 0)
  }

  /**
   * Reset all pressure for a seed (all automations)
   * 
   * @param seedId - Seed ID
   * @returns Number of pressure points reset
   */
  static async resetAllForSeed(seedId: string): Promise<number> {
    const now = new Date()
    const updated = await db<PressurePointRow>('pressure_points')
      .where({ seed_id: seedId })
      .update({
        pressure_amount: 0,
        last_updated: now,
      })

    return updated
  }

  /**
   * Reset all pressure for an automation (all seeds)
   * 
   * @param automationId - Automation ID
   * @returns Number of pressure points reset
   */
  static async resetAllForAutomation(automationId: string): Promise<number> {
    const now = new Date()
    const updated = await db<PressurePointRow>('pressure_points')
      .where({ automation_id: automationId })
      .update({
        pressure_amount: 0,
        last_updated: now,
      })

    return updated
  }

  /**
   * Check if a pressure point exceeds its automation's threshold
   * 
   * @param pressurePoint - Pressure point to check
   * @returns true if pressure exceeds threshold, false otherwise
   */
  static exceedsThreshold(pressurePoint: PressurePoint): boolean {
    if (pressurePoint.threshold === undefined) {
      return false
    }
    return pressurePoint.pressure_amount >= pressurePoint.threshold
  }

  /**
   * Get all pressure points that exceed their automation's threshold
   * 
   * This is the core method used by the timer service to detect when
   * automations need re-evaluation.
   * 
   * @param automationId - Optional: filter by automation ID
   * @returns Array of pressure points that exceed thresholds
   */
  static async getExceededThresholds(automationId?: string): Promise<PressurePoint[]> {
    const allPressurePoints = automationId
      ? await this.getByAutomationId(automationId)
      : await this.getAll()

    // Filter to only those that exceed threshold
    return allPressurePoints.filter(point => this.exceedsThreshold(point))
  }

  /**
   * Get all pressure points (all seeds, all automations)
   * 
   * @returns Array of all pressure points
   */
  static async getAll(): Promise<PressurePoint[]> {
    const rows = await db<PressurePointRow>('pressure_points')
      .select('*')

    return Promise.all(rows.map(row => this.enrichWithThreshold(row)))
  }

  /**
   * Delete a pressure point
   * 
   * @param seedId - Seed ID
   * @param automationId - Automation ID
   * @returns true if deleted, false if not found
   */
  static async delete(seedId: string, automationId: string): Promise<boolean> {
    const deleted = await db<PressurePointRow>('pressure_points')
      .where({ seed_id: seedId, automation_id: automationId })
      .delete()

    return deleted > 0
  }

  /**
   * Delete all pressure points for a seed
   * 
   * @param seedId - Seed ID
   * @returns Number of pressure points deleted
   */
  static async deleteAllForSeed(seedId: string): Promise<number> {
    const deleted = await db<PressurePointRow>('pressure_points')
      .where({ seed_id: seedId })
      .delete()

    return deleted
  }

  /**
   * Delete all pressure points for an automation
   * 
   * @param automationId - Automation ID
   * @returns Number of pressure points deleted
   */
  static async deleteAllForAutomation(automationId: string): Promise<number> {
    const deleted = await db<PressurePointRow>('pressure_points')
      .where({ automation_id: automationId })
      .delete()

    return deleted
  }

  /**
   * Enrich a pressure point row with threshold information from automation
   * 
   * @param row - Pressure point row from database
   * @returns Enriched pressure point with threshold and exceedsThreshold computed
   */
  private static enrichWithThreshold(row: PressurePointRow): PressurePoint {
    const registry = AutomationRegistry.getInstance()
    const automation = registry.getById(row.automation_id)

    // Convert pressure_amount from decimal string to number if needed
    const pressureAmount = typeof row.pressure_amount === 'string'
      ? parseFloat(row.pressure_amount)
      : row.pressure_amount

    const threshold = automation?.getPressureThreshold()
    const exceedsThreshold = threshold !== undefined && pressureAmount >= threshold

    // Handle optional properties explicitly for exactOptionalPropertyTypes
    // Only include threshold if it's defined
    const result: PressurePoint = {
      ...row,
      pressure_amount: pressureAmount, // Convert to number
      exceedsThreshold, // Always include exceedsThreshold as it's always computed
    }

    if (threshold !== undefined) {
      result.threshold = threshold
    }

    return result
  }
}

