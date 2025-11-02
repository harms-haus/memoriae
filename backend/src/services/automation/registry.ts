// Automation registry - manages all registered automations

import { v4 as uuidv4 } from 'uuid'
import type { Automation } from './base'
import db from '../../db/connection'

/**
 * Database row for automations table
 */
export interface AutomationRow {
  id: string
  name: string
  description: string | null
  handler_fn_name: string
  enabled: boolean
  created_at: Date
}

/**
 * Automation registry - singleton pattern for managing automations
 * 
 * Loads automations from database and provides access by ID or name.
 * Automations should be registered after being instantiated.
 */
export class AutomationRegistry {
  private static instance: AutomationRegistry
  private automations: Map<string, Automation> = new Map() // keyed by automation ID
  private automationsByName: Map<string, Automation> = new Map() // keyed by name

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AutomationRegistry {
    if (!AutomationRegistry.instance) {
      AutomationRegistry.instance = new AutomationRegistry()
    }
    return AutomationRegistry.instance
  }

  /**
   * Register an automation instance
   * 
   * Sets the automation's id and enabled status from database if it exists.
   * 
   * @param automation - Automation instance to register
   */
  async register(automation: Automation): Promise<void> {
    // Try to load from database by name
    const row = await db<AutomationRow>('automations')
      .where({ name: automation.name })
      .first()

    if (row) {
      automation.id = row.id
      automation.enabled = row.enabled
    }

    // Register in both maps
    if (automation.id) {
      this.automations.set(automation.id, automation)
    }
    this.automationsByName.set(automation.name, automation)
  }

  /**
   * Get automation by ID
   * 
   * @param id - Automation ID
   * @returns Automation instance or null if not found
   */
  getById(id: string): Automation | null {
    return this.automations.get(id) || null
  }

  /**
   * Get automation by name
   * 
   * @param name - Automation name
   * @returns Automation instance or null if not found
   */
  getByName(name: string): Automation | null {
    return this.automationsByName.get(name) || null
  }

  /**
   * Get all registered automations
   * 
   * @returns Array of all automation instances
   */
  getAll(): Automation[] {
    return Array.from(this.automations.values())
  }

  /**
   * Get all enabled automations
   * 
   * @returns Array of enabled automation instances
   */
  getEnabled(): Automation[] {
    return Array.from(this.automations.values()).filter(a => a.enabled)
  }

  /**
   * Check if an automation is registered
   * 
   * @param id - Automation ID
   * @returns true if registered, false otherwise
   */
  has(id: string): boolean {
    return this.automations.has(id)
  }

  /**
   * Unregister an automation
   * 
   * @param id - Automation ID
   */
  unregister(id: string): void {
    const automation = this.automations.get(id)
    if (automation) {
      this.automations.delete(id)
      this.automationsByName.delete(automation.name)
    }
  }

  /**
   * Load all automations from database and register them
   * 
   * This should be called during application startup after all automation
   * classes have been instantiated and registered.
   * 
   * @param automationInstances - Array of automation instances to sync with database
   */
  async loadFromDatabase(automationInstances: Automation[]): Promise<void> {
    const rows = await db<AutomationRow>('automations')
      .select('*')

    // Create a map of database rows by name
    const rowsByName = new Map<string, AutomationRow>()
    for (const row of rows) {
      rowsByName.set(row.name, row)
    }

    // Sync automation instances with database
    for (const automation of automationInstances) {
      const row = rowsByName.get(automation.name)
      
      if (row) {
        // Automation exists in database - set ID and enabled status
        automation.id = row.id
        automation.enabled = row.enabled
      } else {
        // Automation not in database - create it
        const [created] = await db<AutomationRow>('automations')
          .insert({
            id: uuidv4(),
            name: automation.name,
            description: automation.description,
            handler_fn_name: automation.handlerFnName,
            enabled: automation.enabled,
          })
          .returning('*')
        
        if (created) {
          automation.id = created.id
          automation.enabled = created.enabled
        }
      }

      // Register the automation
      if (automation.id) {
        this.automations.set(automation.id, automation)
      }
      this.automationsByName.set(automation.name, automation)
    }
  }

  /**
   * Clear all registered automations (useful for testing)
   */
  clear(): void {
    this.automations.clear()
    this.automationsByName.clear()
  }
}

/**
 * Convenience function to get the registry instance
 */
export function getAutomationRegistry(): AutomationRegistry {
  return AutomationRegistry.getInstance()
}

