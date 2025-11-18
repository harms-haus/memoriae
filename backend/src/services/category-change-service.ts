// Category change detection service - monitors category changes and applies pressure to affected seeds
import db from '../db/connection'
import type { CategoryChange } from './automation/base'
import { AutomationRegistry } from './automation/registry'
import { PressurePointsService } from './pressure'
import { SeedsService } from './seeds'
import log from 'loglevel'

const logService = log.getLogger('Service:CategoryChange')

/**
 * Category row from database
 */
interface CategoryRow {
  id: string
  user_id: string
  parent_id: string | null
  name: string
  path: string
  created_at: Date
}

/**
 * CategoryChangeService - Detects category changes and applies pressure to affected seeds
 * 
 * When categories are renamed, added, removed, or moved, this service:
 * 1. Detects all seeds affected by the change
 * 2. Calculates pressure for each automation per seed
 * 3. Updates pressure_points table
 * 
 * This service is called whenever category operations occur (create, update, delete).
 */
export class CategoryChangeService {
  /**
   * Handle category rename - detects affected seeds and applies pressure
   * 
   * @param categoryId - ID of renamed category
   * @param oldPath - Previous path (e.g., "/work/projects")
   * @param newPath - New path (e.g., "/work/tasks")
   * @param userId - User ID (for context)
   */
  static async handleCategoryRename(
    categoryId: string,
    oldPath: string,
    newPath: string,
    userId: string
  ): Promise<void> {
    const change: CategoryChange = {
      type: 'rename',
      categoryId,
      oldPath,
      newPath,
    }

    await this.applyPressureForChange(change, userId)
  }

  /**
   * Handle category addition - detects affected seeds and applies pressure
   * 
   * @param categoryId - ID of newly added category
   * @param parentId - ID of parent category (null for top-level)
   * @param path - Full path of new category (e.g., "/work/projects/new")
   * @param userId - User ID (for context)
   */
  static async handleCategoryAdd(
    categoryId: string,
    parentId: string | null,
    path: string,
    userId: string
  ): Promise<void> {
    const change: CategoryChange = {
      type: 'add_child',
      categoryId,
      ...(parentId ? { parentId } : {}),
      newPath: path,
    }

    await this.applyPressureForChange(change, userId)
  }

  /**
   * Handle category removal - detects affected seeds and applies pressure
   * 
   * @param categoryId - ID of removed category
   * @param oldPath - Path of removed category (e.g., "/work/projects")
   * @param userId - User ID (for context)
   */
  static async handleCategoryRemove(
    categoryId: string,
    oldPath: string,
    userId: string
  ): Promise<void> {
    const change: CategoryChange = {
      type: 'remove',
      categoryId,
      oldPath,
    }

    await this.applyPressureForChange(change, userId)
  }

  /**
   * Handle category move - detects affected seeds and applies pressure
   * 
   * @param categoryId - ID of moved category
   * @param oldParentId - Previous parent ID
   * @param newParentId - New parent ID
   * @param oldPath - Previous full path
   * @param newPath - New full path
   * @param userId - User ID (for context)
   */
  static async handleCategoryMove(
    categoryId: string,
    oldParentId: string | null,
    newParentId: string | null,
    oldPath: string,
    newPath: string,
    userId: string
  ): Promise<void> {
    const change: CategoryChange = {
      type: 'move',
      categoryId,
      ...(oldParentId ? { oldParentId } : {}),
      ...(newParentId ? { newParentId } : {}),
      oldPath,
      newPath,
    }

    await this.applyPressureForChange(change, userId)
  }

  /**
   * Apply pressure to all affected seeds based on category change
   * 
   * This is the core method that:
   * 1. Finds all seeds affected by the category change
   * 2. For each affected seed and each automation, calculates pressure
   * 3. Updates pressure_points table
   * 
   * @param change - Category change that occurred
   * @param userId - User ID (for context and OpenRouter client)
   */
  private static async applyPressureForChange(
    change: CategoryChange,
    userId: string
  ): Promise<void> {
    // Get all enabled automations
    const registry = AutomationRegistry.getInstance()
    const automations = registry.getEnabled()

    if (automations.length === 0) {
      // No automations to process
      return
    }

    // Find all seeds that might be affected by this category change
    // We need to check seeds that have this category or any child categories
    const affectedSeeds = await this.findAffectedSeeds(change, userId)

    if (affectedSeeds.length === 0) {
      // No seeds affected
      return
    }

    // Create a minimal OpenRouter client for context (won't be used for API calls)
    // We only need it to satisfy the AutomationContext interface
    const { createOpenRouterClient } = await import('./openrouter/client')
    const openrouterClient = createOpenRouterClient('', '') // Empty API key - won't be used

    // For each affected seed, calculate pressure for each automation
    for (const seed of affectedSeeds) {
      // Get full seed data with current state
      const fullSeed = await SeedsService.getById(seed.id, seed.user_id)
      if (!fullSeed) {
        continue // Skip if seed not found
      }

      // Create tool executor
      const { ToolExecutor } = await import('./automation/tools/executor')
      const toolExecutor = new ToolExecutor()

      // Create automation context
      const context = {
        openrouter: openrouterClient,
        userId: seed.user_id,
        toolExecutor,
      }

      // Calculate pressure for each automation
      for (const automation of automations) {
        if (!automation.id) {
          continue // Skip if automation has no ID
        }

        try {
          // Calculate pressure using automation's calculatePressure method
          const pressure = automation.calculatePressure(fullSeed, context, [change])

          if (pressure > 0) {
            // Add pressure to pressure_points table
            await PressurePointsService.addPressure(
              seed.id,
              automation.id,
              pressure
            )
          }
        } catch (error) {
          // Log error but continue processing other automations
          logService.error(
            `Error calculating pressure for automation ${automation.id} on seed ${seed.id}:`,
            error
          )
        }
      }
    }
  }

  /**
   * Find all seeds affected by a category change
   * 
   * A seed is affected if:
   * - It has the category that changed
   * - It has a child category of the changed category (for hierarchical changes)
   * 
   * @param change - Category change
   * @param userId - User ID to filter categories by (categories are user-specific)
   * @returns Array of affected seed IDs and user IDs
   */
  private static async findAffectedSeeds(
    change: CategoryChange,
    userId: string
  ): Promise<Array<{ id: string; user_id: string }>> {
    // Get all seeds that have this category directly
    const directSeeds = await db('seed_categories')
      .join('seeds', 'seed_categories.seed_id', 'seeds.id')
      .where('seed_categories.category_id', change.categoryId)
      .select('seeds.id', 'seeds.user_id')
      .distinct()

    // For hierarchical changes (rename, move, remove), also check child categories
    let childSeeds: Array<{ id: string; user_id: string }> = []

    if (change.type === 'rename' || change.type === 'move' || change.type === 'remove') {
      // Find all child categories of the changed category
      const oldPath = change.oldPath || ''
      
      if (oldPath) {
        // Find all categories that are children of the changed category
        // (path starts with oldPath + '/')
        // Filter by user_id since categories are user-specific
        const childCategories = await db<CategoryRow>('categories')
          .where('path', 'like', `${oldPath}/%`)
          .where({ user_id: userId })
          .select('id')

        if (childCategories.length > 0) {
          const childCategoryIds = childCategories.map(c => c.id)
          
          // Find seeds that have any of these child categories
          const childSeedsResult = await db('seed_categories')
            .join('seeds', 'seed_categories.seed_id', 'seeds.id')
            .whereIn('seed_categories.category_id', childCategoryIds)
            .select('seeds.id', 'seeds.user_id')
            .distinct()

          childSeeds = childSeedsResult
        }
      }
    }

    // For add_child, also check parent category seeds
    let parentSeeds: Array<{ id: string; user_id: string }> = []

    if (change.type === 'add_child' && change.parentId) {
      // Find seeds that have the parent category
      const parentSeedsResult = await db('seed_categories')
        .join('seeds', 'seed_categories.seed_id', 'seeds.id')
        .where('seed_categories.category_id', change.parentId)
        .select('seeds.id', 'seeds.user_id')
        .distinct()

      parentSeeds = parentSeedsResult
    }

    // Combine all affected seeds and remove duplicates
    const allSeeds = [...directSeeds, ...childSeeds, ...parentSeeds]
    const uniqueSeeds = Array.from(
      new Map(allSeeds.map(s => [s.id, s])).values()
    )

    return uniqueSeeds
  }
}
