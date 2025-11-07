// Tag automation - generates tags for seeds using OpenRouter AI
// Creates ADD_TAG events when processing seeds

import { v4 as uuidv4 } from 'uuid'
import type { Operation } from 'fast-json-patch'
import db from '../../db/connection'
import { Automation, type AutomationContext, type AutomationProcessResult, type CategoryChange } from './base'
import type { Seed } from '../seeds'
import type { Event } from '../events'

/**
 * Tag record from database
 */
interface TagRow {
  id: string
  name: string
  color: string | null
  created_at: Date
}

/**
 * TagAutomation - Analyzes seed content and automatically generates tags
 * 
 * Uses OpenRouter AI to extract relevant tags from seed content,
 * then creates ADD_TAG events for each generated tag.
 */
export class TagAutomation extends Automation {
  readonly name = 'tag'
  readonly description = 'Automatically generates tags for seeds based on content analysis'
  readonly handlerFnName = 'processTag'

  /**
   * Process a seed and generate tags
   * 
   * 1. Calls OpenRouter to analyze seed content and extract tags
   * 2. For each tag, ensures it exists in database (creates if needed)
   * 3. Creates ADD_TAG events for tags not already present
   */
  async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
    // Get existing tags from current state to avoid duplicates
    const existingTagNames = new Set((seed.currentState.tags || []).map(t => t.name.toLowerCase()))

    // Generate tags using OpenRouter
    const generatedTags = await this.generateTags(seed, context)

    // Filter out tags that already exist
    const newTags = generatedTags.filter(tag => !existingTagNames.has(tag.toLowerCase()))

    if (newTags.length === 0) {
      // No new tags to add
      return { events: [] }
    }

    // Ensure all tags exist in database and get/create them
    const tagRecords = await Promise.all(
      newTags.map(tagName => this.ensureTagExists(tagName))
    )

    // Create ADD_TAG events for each new tag
    const events: Event[] = []

    for (const tagRecord of tagRecords) {
      // Create JSON Patch operation to add tag
      const patch: Operation[] = [
        {
          op: 'add',
          path: '/tags/-',
          value: {
            id: tagRecord.id,
            name: tagRecord.name,
          },
        },
      ]

      events.push({
        id: uuidv4(), // Will be regenerated when saved, but needed for type
        seed_id: seed.id,
        event_type: 'ADD_TAG',
        patch_json: patch,
        enabled: true,
        created_at: new Date(),
        automation_id: this.id || null,
      })
    }

    return {
      events,
      metadata: {
        tagsGenerated: tagRecords.length,
        tagNames: tagRecords.map(t => t.name),
      },
    }
  }

  /**
   * Calculate pressure when categories change
   * 
   * Tags might need updating if categories change, especially if tags
   * are related to categories. This creates moderate pressure to re-evaluate.
   */
  calculatePressure(
    seed: Seed,
    context: AutomationContext,
    changes: CategoryChange[]
  ): number {
    // If seed has no categories, category changes don't affect tags much
    const seedCategories = seed.currentState.categories || []
    if (seedCategories.length === 0) {
      return 0
    }

    // Check if seed's categories are affected by the changes
    const affectedCategoryIds = new Set(changes.map(c => c.categoryId))
    const isAffected = seedCategories.some(cat => affectedCategoryIds.has(cat.id))

    if (!isAffected) {
      return 0
    }

    // Calculate pressure based on change type
    let totalPressure = 0
    for (const change of changes) {
      switch (change.type) {
        case 'rename':
          // Category renamed - tags might need updating if tag names matched category names
          totalPressure += 10
          break
        case 'add_child':
          // New child category - low impact on tags
          totalPressure += 5
          break
        case 'remove':
          // Category removed - might need to remove tags or update them
          totalPressure += 15
          break
        case 'move':
          // Category moved - moderate impact
          totalPressure += 10
          break
        default:
          break
      }
    }

    // Cap at 100
    return Math.min(100, totalPressure)
  }

  /**
   * Generate tags using OpenRouter AI
   * 
   * Calls OpenRouter to analyze seed content and extract relevant tags.
   * Returns array of tag names (strings).
   */
  private async generateTags(seed: Seed, context: AutomationContext): Promise<string[]> {
    // Get all existing tag names from database to suggest to AI
    const existingTags = await db<TagRow>('tags')
      .select('name')
      .orderBy('name', 'asc')
    
    const existingTagNames = existingTags.map(t => t.name).join(', ') || 'none'

    const systemPrompt = `You are a tag extraction assistant. Analyze the given text and extract no more than 8 relevant tags that best describe the content.

Tags should be:
- Short (1-2 words when possible)
- Descriptive and relevant
- Lowercase
- Use hyphens for multi-word tags (e.g., "machine-learning" not "machine learning")

Prefer tags that are not already directly stated in the seed's text.
Prefer tags that already exist in the database: [${existingTagNames}]

Return ONLY a JSON array of tag names, nothing else. Example: ["work", "programming", "typescript"]`

    const userPrompt = `Extract tags from this text:\n\n${seed.currentState.seed}`

    try {
      const response = await context.openrouter.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3, // Lower temperature for more consistent tag extraction
          max_tokens: 500, // Increased to handle reasoning models and prevent truncation
        }
      )

      const message = response.choices[0]?.message
      if (!message) {
        throw new Error('OpenRouter response has no message')
      }

      // Some models (like reasoning models) put content in 'reasoning' field instead of 'content'
      // Check both fields and use whichever has content
      let content = message.content?.trim() || ''
      const reasoning = (message as any).reasoning?.trim() || ''
      
      // If content is empty but reasoning exists, try to extract JSON array from reasoning
      if (!content && reasoning) {
        // Try multiple patterns to find JSON array in reasoning text
        // Pattern 1: JSON array in markdown code block
        let jsonMatch = reasoning.match(/```(?:json)?\s*(\[.*?\])\s*```/s)
        if (jsonMatch && jsonMatch[1]) {
          content = jsonMatch[1]
        } else {
          // Pattern 2: JSON array with double quotes
          jsonMatch = reasoning.match(/\[(?:\s*"[^"]+"\s*,?\s*)+\]/)
          if (jsonMatch) {
            content = jsonMatch[0]
          } else {
            // Pattern 3: JSON array with single quotes (less common but possible)
            jsonMatch = reasoning.match(/\[(?:\s*'[^']+'\s*,?\s*)+\]/)
            if (jsonMatch) {
              content = jsonMatch[0].replace(/'/g, '"') // Convert single quotes to double quotes
            } else {
              // Pattern 4: Look for array-like structure at the end of reasoning
              // Some models put the answer at the end
              const lines = reasoning.split('\n')
              for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim()
                if (line.startsWith('[') && line.endsWith(']')) {
                  try {
                    JSON.parse(line) // Validate it's valid JSON
                    content = line
                    break
                  } catch {
                    // Not valid JSON, continue
                  }
                }
              }
            }
          }
        }
        
        // If we still don't have valid JSON, throw a helpful error
        if (!content) {
          throw new Error(`Could not extract JSON array from reasoning model response. Reasoning text: ${reasoning.substring(0, 200)}...`)
        }
      }
      
      // If content is still empty, check if finish_reason indicates truncation
      if (!content) {
        const finishReason = response.choices[0]?.finish_reason
        if (finishReason === 'length') {
          throw new Error(`OpenRouter response was truncated (max_tokens limit reached). Finish reason: ${finishReason}`)
        }
        throw new Error(`OpenRouter returned empty response. Finish reason: ${finishReason || 'unknown'}`)
      }

      // Parse JSON array from response
      // Handle cases where response might have markdown code blocks
      let jsonContent = content
      if (content.startsWith('```')) {
        // Extract JSON from code block
        const match = content.match(/```(?:json)?\s*(\[.*?\])\s*```/s)
        if (match && match[1]) {
          jsonContent = match[1]
        }
      }

      // Try to parse JSON, with better error handling
      let tags: string[]
      try {
        tags = JSON.parse(jsonContent) as string[]
      } catch (parseError) {
        throw new Error(`Failed to parse JSON from response. Content: ${jsonContent.substring(0, 200)}... Error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }

      // Validate and normalize tags
      if (!Array.isArray(tags)) {
        throw new Error('OpenRouter response is not an array')
      }

      return tags
        .map(tag => {
          // Normalize: lowercase, trim, replace spaces with hyphens
          if (typeof tag !== 'string') {
            return null
          }
          return tag
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
        })
        .filter((tag): tag is string => tag !== null && tag.length > 0 && tag.length <= 50)
    } catch (error) {
      console.error('TagAutomation: Failed to generate tags:', error)
      // Return empty array on error - don't fail the automation
      return []
    }
  }

  /**
   * Ensure a tag exists in the database
   * Creates the tag if it doesn't exist, otherwise returns existing tag
   */
  private async ensureTagExists(tagName: string): Promise<TagRow> {
    // Normalize tag name for lookup (lowercase, trimmed)
    const normalizedName = tagName.toLowerCase().trim()

    // Try to find existing tag
    const existing = await db<TagRow>('tags')
      .where({ name: normalizedName })
      .first()

    if (existing) {
      return existing
    }

    // Create new tag
    const [created] = await db<TagRow>('tags')
      .insert({
        id: uuidv4(),
        name: normalizedName,
        color: null, // Could assign colors from style guide palette later
        created_at: new Date(),
      })
      .returning('*')

    if (!created) {
      throw new Error(`Failed to create tag: ${tagName}`)
    }

    return created
  }
}

