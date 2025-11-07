// Categorize automation - assigns categories to seeds using OpenRouter AI
// Creates set_category transactions when processing seeds

import { v4 as uuidv4 } from 'uuid'
import db from '../../db/connection'
import { Automation, type AutomationContext, type AutomationProcessResult, type CategoryChange } from './base'
import type { Seed } from '../seeds'
import type { SeedTransaction } from '../../types/seed-transactions'

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
 * then creates set_category transaction (seeds can only have one category). Handles hierarchical category structure.
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
   * 4. Creates set_category transaction to assign category to seed (seeds can only have one category)
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

    // Get existing category from seed state (seeds can only have one category)
    const existingCategory = (seed.currentState.categories || [])[0]

    // Generate category suggestions using OpenRouter
    const suggestedCategories = await this.generateCategories(seed, context, Array.from(categoriesByName.keys()))

    if (suggestedCategories.length === 0) {
      return { transactions: [] }
    }

    // Use the first suggested category (seeds can only have one category)
    const categoryPath = suggestedCategories[0]
    if (!categoryPath) {
      return { transactions: [] }
    }
    
    const category = await this.ensureCategoryExists(categoryPath, existingCategories)

    // Update our maps
    categoriesByPath.set(category.path, category)
    categoriesByName.set(category.name.toLowerCase(), category)
    existingCategories.push(category)

    // If seed already has this category, no need to create a transaction
    if (existingCategory && existingCategory.id === category.id) {
      return { transactions: [] }
    }

    // Create set_category transaction (replaces any existing category)
    const transaction: SeedTransaction = {
      id: uuidv4(),
      seed_id: seed.id,
      transaction_type: 'set_category',
      transaction_data: {
        category_id: category.id,
        category_name: category.name,
        category_path: category.path,
      },
      created_at: new Date(),
      automation_id: this.id || null,
    }

    return {
      transactions: [transaction],
      metadata: {
        categoryAssigned: category.path,
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

    const systemPrompt = `You are a categorization assistant. Analyze the given text and assign it to the MOST relevant category.

Categories should be hierarchical paths like "/work/projects" or "/personal/notes".
- Use forward slashes to separate levels (e.g., "/work/projects/web")
- Keep paths concise
- Use lowercase with hyphens for multi-word names (e.g., "/personal/daily-notes")

If you see similar existing categories, prefer to use those.

CRITICAL: Return ONLY a JSON array with ONE category path as your final answer. Put the JSON array at the very end of your response.
Example: ["/work/projects"]

Do not include any reasoning or explanation - only the JSON array.`

    const userPrompt = `Assign categories to this text:\n\n${seed.currentState.seed}${existingCategoriesText}`

    try {
      const response = await context.openrouter.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.4, // Slightly higher for more creative categorization
          max_tokens: 2000, // Increased to handle reasoning models that output reasoning before content
        }
      )

      const message = response.choices[0]?.message
      if (!message) {
        throw new Error('OpenRouter response has no message')
      }

      // Some models (like reasoning models) put content in 'reasoning' field instead of 'content'
      // Check both fields and extract JSON from whichever has it
      let content = message.content?.trim() || ''
      const reasoning = (message as any).reasoning?.trim() || ''
      
      // Helper function to extract JSON array from text
      const extractJsonArray = (text: string): string | null => {
        if (!text) return null
        
        // Pattern 1: JSON array in markdown code block
        let jsonMatch = text.match(/```(?:json)?\s*(\[.*?\])\s*```/s)
        if (jsonMatch && jsonMatch[1]) {
          return jsonMatch[1]
        }
        
        // Pattern 2: JSON array with double quotes (multiline)
        jsonMatch = text.match(/\[(?:\s*"[^"]+"\s*,?\s*)+\]/s)
        if (jsonMatch) {
          return jsonMatch[0]
        }
        
        // Pattern 3: JSON array with single quotes (less common but possible)
        jsonMatch = text.match(/\[(?:\s*'[^']+'\s*,?\s*)+\]/s)
        if (jsonMatch) {
          return jsonMatch[0].replace(/'/g, '"') // Convert single quotes to double quotes
        }
        
        // Pattern 4: Look for array-like structure at the end of text
        const lines = text.split('\n')
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i]?.trim()
          if (line && line.startsWith('[') && line.endsWith(']')) {
            try {
              JSON.parse(line) // Validate it's valid JSON
              return line
            } catch {
              // Not valid JSON, continue
            }
          }
        }
        
        // Pattern 5: Try to find JSON array anywhere in the text (more lenient)
        const jsonArrayPattern = /\[[\s\S]*?\]/
        const matches = text.match(jsonArrayPattern)
        if (matches) {
          for (const match of matches) {
            try {
              const parsed = JSON.parse(match.trim())
              if (Array.isArray(parsed)) {
                return match.trim()
              }
            } catch {
              // Not valid JSON, continue
            }
          }
        }
        
        return null
      }
      
      // Try to extract JSON from content first
      let jsonContent = extractJsonArray(content)
      
      // If not found in content, try reasoning
      if (!jsonContent && reasoning) {
        jsonContent = extractJsonArray(reasoning)
      }
      
      // If still not found, combine both and try again
      if (!jsonContent && (content || reasoning)) {
        const combined = `${reasoning}\n${content}`.trim()
        jsonContent = extractJsonArray(combined)
      }
      
      // If we still don't have valid JSON, check if response was truncated
      const finishReason = response.choices[0]?.finish_reason
      if (!jsonContent) {
        // If response was truncated, try to extract partial JSON from the end
        if (finishReason === 'length') {
          const combined = `${reasoning}\n${content}`.trim()
          const lastBracket = combined.lastIndexOf(']')
          const firstBracket = combined.lastIndexOf('[')
          
          if (firstBracket !== -1) {
            // Extract from opening bracket to end (or closing bracket if found)
            const endPos = lastBracket !== -1 && lastBracket > firstBracket ? lastBracket + 1 : combined.length
            const partialJson = combined.substring(firstBracket, endPos)
            
            // Try to complete the JSON by adding closing bracket if needed
            try {
              let jsonToParse = partialJson.trim()
              if (!jsonToParse.endsWith(']')) {
                // Remove any trailing incomplete string
                const lastQuote = jsonToParse.lastIndexOf('"')
                if (lastQuote > jsonToParse.lastIndexOf(',')) {
                  // Incomplete string at the end, remove it
                  jsonToParse = jsonToParse.substring(0, jsonToParse.lastIndexOf(',', lastQuote)) + ']'
                } else {
                  jsonToParse = jsonToParse + ']'
                }
              }
              const parsed = JSON.parse(jsonToParse)
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.warn('CategorizeAutomation: Response was truncated, but extracted partial categories:', parsed)
                jsonContent = jsonToParse
              }
            } catch {
              // Failed to parse partial JSON, continue to error
            }
          }
        }
        
        // If we still don't have JSON, throw a helpful error
        if (!jsonContent) {
          const debugInfo = {
            hasContent: !!content,
            contentLength: content.length,
            hasReasoning: !!reasoning,
            reasoningLength: reasoning.length,
            finishReason,
            contentPreview: content.substring(0, 200),
            reasoningPreview: reasoning.substring(0, 200),
          }
          throw new Error(
            `Could not extract JSON array from model response. ` +
            `Content: ${content ? `"${content.substring(0, 100)}..."` : 'empty'}, ` +
            `Reasoning: ${reasoning ? `"${reasoning.substring(0, 100)}..."` : 'empty'}, ` +
            `Finish reason: ${finishReason || 'unknown'}. ` +
            `Debug: ${JSON.stringify(debugInfo)}`
          )
        }
      }

      // Parse JSON array from response
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
        .slice(0, 1) // Only use the first category (seeds can only have one)
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

