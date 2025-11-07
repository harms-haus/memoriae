// Tag extraction automation - extracts hash tags from seed content and generates additional tags using OpenRouter AI
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
 * TagExtractionAutomation - Extracts hash tags from seed content and generates additional tags
 * 
 * 1. Extracts hash tags (e.g., #hashtag) from seed content
 * 2. Optionally uses OpenRouter AI to generate additional relevant tags
 * 3. Creates ADD_TAG events for each extracted/generated tag.
 */
export class TagExtractionAutomation extends Automation {
  readonly name = 'tag'
  readonly description = 'Extracts hash tags from seed content and generates additional tags using AI'
  readonly handlerFnName = 'processTag'

  /**
   * Extract hash tags from content using regex
   * Matches patterns like #hashtag, #hash-tag, #hash_tag
   */
  private extractHashTags(content: string): string[] {
    // Match # followed by word characters, hyphens, or underscores
    // Exclude # at start of line (markdown headers) by requiring word boundary or space before
    const hashTagRegex = /(?:^|\s)#([\w-]+)/g
    const matches = content.matchAll(hashTagRegex)
    const tags = new Set<string>()
    
    for (const match of matches) {
      const tagName = match[1]
      if (tagName && tagName.length > 0 && tagName.length <= 50) {
        // Normalize: lowercase, trim
        const normalized = tagName.toLowerCase().trim()
        if (normalized.length > 0) {
          tags.add(normalized)
        }
      }
    }
    
    return Array.from(tags)
  }

  /**
   * Process a seed and extract/generate tags
   * 
   * 1. Extracts hash tags from seed content (e.g., #hashtag)
   * 2. Optionally calls OpenRouter to generate additional tags
   * 3. For each tag, ensures it exists in database (creates if needed)
   * 4. Creates ADD_TAG events for tags not already present
   */
  async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
    // Get existing tags from current state to avoid duplicates
    const existingTagNames = new Set((seed.currentState.tags || []).map(t => t.name.toLowerCase()))

    // Extract hash tags from content
    const hashTags = this.extractHashTags(seed.currentState.seed || seed.seed_content)
    
    // Generate additional tags using OpenRouter (if content has no hash tags or for additional suggestions)
    const aiGeneratedTags = await this.generateTags(seed, context)

    // Combine hash tags and AI-generated tags, prioritizing hash tags
    const allTags = [...hashTags, ...aiGeneratedTags]

    // Filter out tags that already exist
    const newTags = allTags.filter(tag => !existingTagNames.has(tag.toLowerCase()))

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

IMPORTANT: Return ONLY a JSON array of tag names as your final answer. Put the JSON array at the very end of your response. Example: ["work", "programming", "typescript"]`

    const userPrompt = `Extract tags from this text:\n\n${seed.currentState.seed}`

    try {
      const response = await context.openrouter.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3, // Lower temperature for more consistent tag extraction
          max_tokens: 1000, // Increased to handle reasoning models and prevent truncation
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
        // Some models put the answer at the end
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
        // Look for [ followed by content and ending with ]
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
      
      // Combine content and reasoning for processing
      const combined = `${reasoning}\n${content}`.trim()
      
      // Try to extract JSON from content first
      let jsonContent = extractJsonArray(content)
      
      // If not found in content, try reasoning
      if (!jsonContent && reasoning) {
        jsonContent = extractJsonArray(reasoning)
      }
      
      // If still not found, try combined text
      if (!jsonContent) {
        jsonContent = extractJsonArray(combined)
      }
      
      // If we still don't have valid JSON, check if response was truncated
      const finishReason = response.choices[0]?.finish_reason
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
        
        // If response was truncated, try to extract partial JSON from the end
        if (finishReason === 'length') {
          // Try to find JSON array at the end (might be incomplete)
          const lastBracket = combined.lastIndexOf(']')
          const firstBracket = combined.lastIndexOf('[')
          
          if (firstBracket !== -1) {
            // Extract from opening bracket to end (or closing bracket if found)
            const endPos = lastBracket !== -1 && lastBracket > firstBracket ? lastBracket + 1 : combined.length
            const partialJson = combined.substring(firstBracket, endPos)
            
            // Try to extract valid tags from partial JSON
            try {
              // Try to complete the JSON by adding closing bracket if needed
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
                console.warn('TagExtractionAutomation: Response was truncated, but extracted partial tags:', parsed)
                jsonContent = jsonToParse
              }
            } catch {
              // Try to extract tags from incomplete JSON manually using regex
              const tagMatches = partialJson.match(/"([^"]+)"/g)
              if (tagMatches && tagMatches.length > 0) {
                const extractedTags = tagMatches.map(m => m.replace(/"/g, ''))
                console.warn('TagExtractionAutomation: Response was truncated, extracted tags from partial JSON:', extractedTags)
                // Return early with extracted tags
                return extractedTags
                  .map(tag => {
                    if (typeof tag !== 'string') return null
                    return tag
                      .toLowerCase()
                      .trim()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, '')
                  })
                  .filter((tag): tag is string => tag !== null && tag.length > 0 && tag.length <= 50)
              }
            }
          }
        }
        
        // If we still don't have JSON, throw error
        if (!jsonContent) {
          throw new Error(
            `Could not extract JSON array from model response. ` +
            `Content: ${content ? `"${content.substring(0, 100)}..."` : 'empty'}, ` +
            `Reasoning: ${reasoning ? `"${reasoning.substring(0, 100)}..."` : 'empty'}, ` +
            `Finish reason: ${finishReason || 'unknown'}. ` +
            `Debug: ${JSON.stringify(debugInfo)}`
          )
        }
      }
      
      content = jsonContent

      // Parse JSON array from response
      // jsonContent should already be a clean JSON array string at this point
      let tags: string[]
      try {
        tags = JSON.parse(content) as string[]
      } catch (parseError) {
        throw new Error(`Failed to parse JSON from response. Content: ${content.substring(0, 200)}... Error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
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
      console.error('TagExtractionAutomation: Failed to generate tags:', error)
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

