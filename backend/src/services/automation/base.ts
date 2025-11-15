// Base automation framework
// All automations extend this abstract class to implement process(), calculatePressure(), and handlePressure()

import type { SeedTransaction } from '../../types/seed-transactions'
import type { Seed } from '../seeds'
import type { OpenRouterClient } from '../openrouter/client'
import type { ToolExecutor } from './tools/executor'

/**
 * Type representing a category change that triggers pressure calculation
 */
export interface CategoryChange {
  type: 'rename' | 'add_child' | 'remove' | 'move'
  categoryId: string
  oldPath?: string
  newPath?: string
  parentId?: string
  oldParentId?: string
  newParentId?: string
}

/**
 * Context passed to automation methods
 * Contains dependencies like OpenRouter client, database access, etc.
 */
export interface AutomationContext {
  /**
   * OpenRouter client for making AI API calls
   * User's API key and model preferences should be set on this client
   */
  openrouter: OpenRouterClient
  
  /**
   * User ID for which the automation is running
   */
  userId: string
  
  /**
   * Tool executor for executing tool calls in AI prompts
   */
  toolExecutor: ToolExecutor
  
  /**
   * Optional metadata for passing additional context
   */
  metadata?: Record<string, unknown>
}

/**
 * Result of processing a seed through an automation
 */
export interface AutomationProcessResult {
  /**
   * Transactions created by the automation
   * These should be saved to the database using SeedTransactionsService
   */
  transactions: SeedTransaction[]
  
  /**
   * Optional metadata about the processing
   */
  metadata?: Record<string, unknown>
}

/**
 * Abstract base class for all automations
 * 
 * Automations analyze seeds and create timeline transactions automatically.
 * They can respond to category changes through the pressure system.
 * 
 * Each automation must implement:
 * - process(): Analyze seed and create transactions
 * - calculatePressure(): Determine pressure amount when categories change
 * - handlePressure(): Respond when pressure threshold is reached
 */
export abstract class Automation {
  /**
   * Unique identifier for this automation
   * Should match the 'name' field in the automations database table
   */
  abstract readonly name: string

  /**
   * Human-readable description of what this automation does
   */
  abstract readonly description: string

  /**
   * Function name used to identify this automation's handler
   * Should match the 'handler_fn_name' field in the automations database table
   */
  abstract readonly handlerFnName: string

  /**
   * Unique ID from the automations database table
   * Set when automation is registered or loaded from database
   */
  id?: string

  /**
   * Whether this automation is currently enabled
   * Set when automation is registered or loaded from database
   */
  enabled: boolean = true

  /**
   * Process a seed and create transactions
   * 
   * This is the main method called when an automation should analyze a seed.
   * It should:
   * 1. Analyze the seed content/state
   * 2. Use OpenRouter API if needed (via context.openrouter)
   * 3. Create appropriate transactions
   * 4. Return the transactions to be saved
   * 
   * @param seed - The seed to process (includes currentState computed from transactions)
   * @param context - Automation context with OpenRouter client and other dependencies
   * @returns Promise resolving to transactions created by the automation
   */
  abstract process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult>

  /**
   * Calculate pressure amount when categories change
   * 
   * Pressure is a metric (0-100) that indicates how much a category change
   * affects whether this automation should re-process a seed.
   * 
   * Examples:
   * - Category rename: +10 pressure (moderate impact)
   * - Add child category: +5 pressure (low impact)
   * - Remove category: +20 pressure (high impact)
   * - Move subcategory: +15 pressure (moderate-high impact)
   * 
   * The pressure system tracks accumulated pressure per seed/automation.
   * When threshold is reached, handlePressure() is called.
   * 
   * @param seed - The seed to evaluate
   * @param context - Automation context
   * @param changes - Array of category changes that occurred
   * @returns Pressure amount (0-100) - 0 means no pressure, 100 means maximum
   */
  abstract calculatePressure(
    seed: Seed,
    context: AutomationContext,
    changes: CategoryChange[]
  ): number

  /**
   * Handle pressure when threshold is reached
   * 
   * Called when accumulated pressure for a seed/automation crosses
   * the configured threshold. This typically means the automation
   * should re-process the seed to account for category changes.
   * 
   * Default implementation adds the seed to the automation queue for re-processing.
   * Override this if you need custom behavior.
   * 
   * @param seed - The seed that needs re-processing
   * @param pressure - The current pressure amount (0-100)
   * @param context - Automation context
   * @returns Promise resolving when handling is complete
   */
  async handlePressure(
    seed: Seed,
    pressure: number,
    context: AutomationContext
  ): Promise<void> {
    // Default implementation: add to queue for re-processing
    if (!this.id) {
      throw new Error(`Automation "${this.name}" does not have an ID`)
    }

    const { addAutomationJob } = await import('../queue/queue')
    
    await addAutomationJob({
      seedId: seed.id,
      automationId: this.id,
      userId: context.userId,
      priority: this.calculatePriority(pressure),
    })
  }

  /**
   * Get the pressure threshold for this automation
   * 
   * Override to set a custom threshold (default: 50)
   * When accumulated pressure >= threshold, handlePressure() is called
   * 
   * @returns Pressure threshold (0-100)
   */
  getPressureThreshold(): number {
    return 50
  }

  /**
   * Optional: Validate that the automation can process a seed
   * 
   * Override to add validation logic. Called before process().
   * Return false or throw an error if the seed cannot be processed.
   * 
   * @param seed - Seed to validate
   * @param context - Automation context
   * @returns true if valid, false or throws error if invalid
   */
  async validateSeed(seed: Seed, context: AutomationContext): Promise<boolean> {
    // Default: all seeds are valid
    return true
  }

  /**
   * Optional: Get priority for queue jobs
   * 
   * Override to set priority when adding to queue.
   * Higher numbers = higher priority
   * 
   * @param pressure - Current pressure amount
   * @returns Priority value (default: based on pressure)
   */
  calculatePriority(pressure: number): number {
    // Default: priority is based on pressure
    return Math.min(100, Math.max(1, Math.round(pressure)))
  }
}

