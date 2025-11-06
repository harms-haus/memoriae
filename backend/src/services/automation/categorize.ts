// Categorize automation - assigns categories to seeds using OpenRouter AI
// Creates SET_CATEGORY or ADD_CATEGORY events when processing seeds

import { v4 as uuidv4 } from 'uuid'
import type { Operation } from 'fast-json-patch'
import db from '../../db/connection'
import { Automation, type AutomationContext, type AutomationProcessResult, type CategoryChange } from './base'
import type { Seed } from '../seeds'
import type { Event } from '../events'

/**
 * Category record from database
 */
interface CategoryRow {
  id: string
  parent_id: string | null
  name: string
  path: string
  created_at: Date
}

/**
 * CategorizeAutomation - Analyzes seed content and assigns categories
 * 
 * Uses OpenRouter AI to determine appropriate categories for seeds,
 * then creates SET_CATEGORY events. Handles hierarchical category structure.
 */
export class CategorizeAutomation extends Automation {
  readonly name = 'categorize'
  readonly description = 'Automatically assigns categories to seeds based on content analysis'
  readonly handlerFnName = 'processCategorize'

  /**
   * Process a seed and assign categories
   * 
   * 1. Gets existing user categories from database
   * 2. Calls OpenRouter to analyze seed and suggest categories
   * 3. Creates categories if they don't exist (with proper hierarchy)
   * 4. Creates SET_CATEGORY events to assign categories to seed
   */
  async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
    // Get all existing categories for the user
    // For now, we'll assume categories are global (not user-specific)
    // If needed later, add user_id to categories table
    const existingCategories = await db<CategoryRow>('categories').select('*')
    const categoriesByPath = new Map<string, CategoryRow>()
    const categoriesByName = new Map<string, CategoryRow>()

    for (const cat of existingCategories) {
      categoriesByPath.set(cat.path, cat)
      categoriesByName.set(cat.name.toLowerCase(), cat)
    }

    // Get existing categories from seed state to avoid duplicates
    const existingCategoryIds = new Set((seed.currentState.categories || []).map(c => c.id))

    // Generate category suggestions using OpenRouter
    const suggestedCategories = await this.generateCategories(seed, context, Array.from(categoriesByName.keys()))

    if (suggestedCategories.length === 0) {
      return { events: [] }
    }

    // Ensure all suggested categories exist, creating them if needed
    const categoryRecords: CategoryRow[] = []
    for (const categoryPath of suggestedCategories) {
      const category = await this.ensureCategoryExists(categoryPath, existingCategories)
      categoryRecords.push(category)

      // Update our maps
      categoriesByPath.set(category.path, category)
      categoriesByName.set(category.name.toLowerCase(), category)
      existingCategories.push(category)
    }

    // Filter out categories already assigned to seed
    const newCategories = categoryRecords.filter(cat => !existingCategoryIds.has(cat.id))

    if (newCategories.length === 0) {
      return { events: [] }
    }

    // Create SET_CATEGORY events for each new category
    // We'll add categories to the existing array (not replace)
    const events: Event[] = []

    for (const category of newCategories) {
      // Create JSON Patch operation to add category
      const patch: Operation[] = [
        {
          op: 'add',
          path: '/categories/-',
          value: {
            id: category.id,
            name: category.name,
            path: category.path,
          },
        },
      ]

      events.push({
        id: uuidv4(),
        seed_id: seed.id,
        event_type: 'SET_CATEGORY',
        patch_json: patch,
        enabled: true,
        created_at: new Date(),
        automation_id: this.id || null,
      })
    }

    return {
      events,
      metadata: {
        categoriesAssigned: categoryRecords.length,
        categoryPaths: categoryRecords.map(c => c.path),
      },
    }
  }

  /**
   * Calculate pressure when categories change
   * 
   * This automation directly manages categories, so category changes
   * create significant pressure for re-evaluation.
   */
  calculatePressure(
    seed: Seed,
    context: AutomationContext,
    changes: CategoryChange[]
  ): number {
    const seedCategories = seed.currentState.categories || []

    // If seed has no categories, only high-impact changes matter
    if (seedCategories.length === 0) {
      // Check if any changes might be relevant (e.g., new top-level category)
      const hasRelevantChange = changes.some(c => c.type === 'add_child' || c.type === 'remove')
      return hasRelevantChange ? 10 : 0
    }

    // Check if seed's categories are affected
    const affectedCategoryIds = new Set(changes.map(c => c.categoryId))
    const isAffected = seedCategories.some(cat => affectedCategoryIds.has(cat.id))

    if (!isAffected) {
      // Check if any parent categories are affected (hierarchical relationship)
      const seedCategoryPaths = seedCategories.map(c => c.path)
      const isParentAffected = changes.some(change => {
        // Check if change affects a parent of any seed category
        if (change.oldPath) {
          return seedCategoryPaths.some(path => path.startsWith(change.oldPath! + '/'))
        }
        if (change.newPath) {
          return seedCategoryPaths.some(path => path.startsWith(change.newPath! + '/'))
        }
        return false
      })

      if (!isParentAffected) {
        return 0
      }
    }

    // Calculate pressure based on change type
    let totalPressure = 0
    for (const change of changes) {
      switch (change.type) {
        case 'rename':
          // Category renamed - moderate impact (category name changed)
          totalPressure += 15
          break
        case 'add_child':
          // New child category - low impact (might want to categorize there)
          totalPressure += 10
          break
        case 'remove':
          // Category removed - high impact (seed needs re-categorization)
          totalPressure += 30
          break
        case 'move':
          // Category moved - high impact (hierarchy changed)
          totalPressure += 25
          break
        default:
          break
      }
    }

    // Cap at 100
    return Math.min(100, totalPressure)
  }

  /**
   * Generate category suggestions using OpenRouter AI
   * 
   * Returns array of category paths (e.g., ["/work", "/work/projects"])
   */
  private async generateCategories(
    seed: Seed,
    context: AutomationContext,
    existingCategoryNames: string[]
  ): Promise<string[]> {
    const existingCategoriesText = existingCategoryNames.length > 0
      ? `\n\nExisting categories you can use:\n${existingCategoryNames.slice(0, 20).join(', ')}${existingCategoryNames.length > 20 ? `\n(and ${existingCategoryNames.length - 20} more...)` : ''}`
      : ''

    const systemPrompt = `You are a categorization assistant. Analyze the given text and assign it to 1-3 relevant categories.

Categories should be hierarchical paths like "/work/projects" or "/personal/notes".
- Use forward slashes to separate levels (e.g., "/work/projects/web")
- Keep paths concise
- Use lowercase with hyphens for multi-word names (e.g., "/personal/daily-notes")

If you see similar existing categories, prefer to use those.

Return ONLY a JSON array of category paths, nothing else. Example: ["/work/projects", "/personal"]`

    const userPrompt = `Assign categories to this text:\n\n${seed.currentState.seed}${existingCategoriesText}`

    try {
      const response = await context.openrouter.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.4, // Slightly higher for more creative categorization
          max_tokens: 300,
        }
      )

      const content = response.choices[0]?.message?.content?.trim()
      if (!content) {
        throw new Error('OpenRouter returned empty response')
      }

      // Parse JSON array from response
      let jsonContent = content
      if (content.startsWith('```')) {
        const match = content.match(/```(?:json)?\s*(\[.*?\])\s*```/s)
        if (match && match[1]) {
          jsonContent = match[1]
        }
      }

      const categoryPaths = JSON.parse(jsonContent) as string[]

      // Validate and normalize category paths
      if (!Array.isArray(categoryPaths)) {
        throw new Error('OpenRouter response is not an array')
      }

      return categoryPaths
        .map(path => {
          if (typeof path !== 'string') {
            return null
          }

          // Normalize path
          let normalized = path
            .trim()
            .toLowerCase()
            .replace(/\\/g, '/') // Replace backslashes
            .replace(/\/+/g, '/') // Collapse multiple slashes
            .replace(/[^a-z0-9\/-]/g, '') // Remove invalid characters

          // Ensure starts with /
          if (!normalized.startsWith('/')) {
            normalized = '/' + normalized
          }

          // Remove trailing slash
          normalized = normalized.replace(/\/$/, '')

          // Validate path structure
          if (normalized === '/' || normalized.length > 100) {
            return null
          }

          // Ensure path segments are valid (no empty segments)
          const segments = normalized.split('/').filter(s => s.length > 0)
          if (segments.length === 0 || segments.length > 4) {
            return null
          }

          return normalized
        })
        .filter((path): path is string => path !== null && path.length > 0)
        .slice(0, 3) // Limit to 3 categories
    } catch (error) {
      console.error('CategorizeAutomation: Failed to generate categories:', error)
      return []
    }
  }

  /**
   * Ensure a category exists in the database with proper hierarchy
   * Creates the category and all parent categories if needed
   */
  private async ensureCategoryExists(
    categoryPath: string,
    existingCategories: CategoryRow[]
  ): Promise<CategoryRow> {
    // Normalize path
    const normalizedPath = categoryPath.startsWith('/') ? categoryPath : '/' + categoryPath
    const pathSegments = normalizedPath.split('/').filter(s => s.length > 0)

    // Check if category already exists
    const existingCategoriesByPath = new Map(existingCategories.map(c => [c.path, c]))
    const existing = existingCategoriesByPath.get(normalizedPath)
    if (existing) {
      return existing
    }

    // Build hierarchy from root to target
    // Example: "/work/projects/web" -> ["/work", "/work/projects", "/work/projects/web"]
    const pathsToCreate: string[] = []
    let currentPath = ''

    for (const segment of pathSegments) {
      currentPath += '/' + segment
      if (!existingCategoriesByPath.has(currentPath)) {
        pathsToCreate.push(currentPath)
      }
    }

    // Create categories in order (parents first)
    let parentId: string | null = null

    for (const path of pathsToCreate) {
      const name = path.split('/').pop()!
      const normalizedName = name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') // Convert "work-projects" to "Work Projects"

      // Check if we already created this in a previous iteration
      const alreadyCreated = existingCategoriesByPath.get(path)
      if (alreadyCreated) {
        parentId = alreadyCreated.id
        continue
      }

      // Create category
      const createdRows: CategoryRow[] = await db<CategoryRow>('categories')
        .insert({
          id: uuidv4(),
          parent_id: parentId,
          name: normalizedName,
          path: path,
          created_at: new Date(),
        })
        .returning('*')

      const created: CategoryRow | undefined = createdRows[0]
      if (!created) {
        throw new Error(`Failed to create category: ${path}`)
      }

      // Add to our tracking
      existingCategoriesByPath.set(path, created)
      existingCategories.push(created)
      parentId = created.id
    }

    // Return the target category (should be the last one created, or found in existing)
    const result = existingCategoriesByPath.get(normalizedPath)
    if (!result) {
      throw new Error(`Failed to find or create category: ${normalizedPath}`)
    }

    return result
  }
}

