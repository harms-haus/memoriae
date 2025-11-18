// Tag extraction automation - extracts hash tags from seed content and generates additional tags using OpenRouter AI
// Creates add_tag transactions when processing seeds

import { v4 as uuidv4 } from 'uuid'
import db from '../../db/connection'
import { Automation, type AutomationContext, type AutomationProcessResult, type CategoryChange } from './base'
import type { Seed } from '../seeds'
import type { SeedTransaction } from '../../types/seed-transactions'
import { create, setColor } from '../tags'
import log from 'loglevel'

const logAutomation = log.getLogger('Automation:Tag')

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
 * 3. Creates add_tag transactions for each extracted/generated tag.
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
   * 4. Creates add_tag transactions for tags not already present
   */
  async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
    // Get existing tags from current state to avoid duplicates
    const existingTagIds = new Set((seed.currentState.tags || []).map(t => t.id))
    const existingTagNames = new Set((seed.currentState.tags || []).map(t => t.name.toLowerCase()))

    // Extract hash tags from content (these don't have colors)
    const hashTags = this.extractHashTags(seed.currentState.seed)
    
    // Generate additional tags using OpenRouter (if content has no hash tags or for additional suggestions)
    const aiGeneratedTags = await this.generateTags(seed, context)

    // Convert hash tags to same format as AI tags (no color)
    const hashTagObjects = hashTags.map(name => ({ name, color: null as string | null }))

    // Combine hash tags and AI-generated tags, prioritizing hash tags
    const allTags = [...hashTagObjects, ...aiGeneratedTags]

    // Filter out tags that already exist
    const newTags = allTags.filter(tag => !existingTagNames.has(tag.name.toLowerCase()))

    if (newTags.length === 0) {
      // No new tags to add
      return { transactions: [] }
    }

    // Ensure all tags exist in database and get/create them
    const tagRecords = await Promise.all(
      newTags.map(tag => this.ensureTagExists(tag.name, tag.color))
    )

    // Filter out tags that are already in the seed's state (by ID)
    const tagsToAdd = tagRecords.filter(tag => !existingTagIds.has(tag.id))

    if (tagsToAdd.length === 0) {
      return { transactions: [] }
    }

    // Create add_tag transactions for each new tag
    const transactions: SeedTransaction[] = []

    for (const tagRecord of tagsToAdd) {
      transactions.push({
        id: uuidv4(), // Will be regenerated when saved, but needed for type
        seed_id: seed.id,
        transaction_type: 'add_tag',
        transaction_data: {
          tag_id: tagRecord.id,
          tag_name: tagRecord.name,
        },
        created_at: new Date(),
        automation_id: this.id || null,
      })
    }

    return {
      transactions,
      metadata: {
        tagsGenerated: tagsToAdd.length,
        tagNames: tagsToAdd.map(t => t.name),
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
   * Calls OpenRouter to analyze seed content and extract relevant tags with colors.
   * Returns array of objects with name and color.
   */
  private async generateTags(seed: Seed, context: AutomationContext): Promise<Array<{ name: string; color: string | null }>> {
    // Get all existing tags with colors from database
    const existingTags = await db<TagRow>('tags')
      .select('name', 'color')
      .orderBy('name', 'asc')
    
    const existingTagNames = existingTags.map(t => t.name).join(', ') || 'none'

    // Group tags by color to identify domains
    const colorGroups = new Map<string, string[]>()
    existingTags.forEach(tag => {
      if (tag.color) {
        const tags = colorGroups.get(tag.color) || []
        tags.push(tag.name)
        colorGroups.set(tag.color, tags)
      }
    })

    // Build color context string for prompt
    const colorContext = colorGroups.size > 0
      ? Array.from(colorGroups.entries())
          .map(([color, tagNames]) => `- ${color}: ${tagNames.join(', ')}`)
          .join('\n')
      : 'No existing tags with colors yet.'

    const systemPrompt = `You are a tag extraction assistant. Analyze the given text and extract no more than 8 relevant tags that best describe the content.

Tags should be:
- Short (1-2 words when possible)
- Descriptive and relevant
- Lowercase
- Use hyphens for multi-word tags (e.g., "machine-learning" not "machine learning")

Prefer tags that are not already directly stated in the seed's text.
Prefer tags that already exist in the database: [${existingTagNames}]

Existing tags are grouped by color (domain):
${colorContext}

When suggesting new tags, assign a color that matches the domain/theme of similar existing tags.
If a tag is similar to existing tags in a color group, use that same color.
If no similar tags exist, choose an appropriate color from the style guide palette:
- Yellow (#ffd43b): General, work, productivity
- Blue (#4fc3f7): Technology, programming, technical
- Green (#66bb6a): Nature, health, growth
- Purple (#ab47bc): Creative, art, design
- Pink (#ec407a): Personal, relationships, emotions
- Orange (#ff9800): Energy, action, urgency

CRITICAL: Return ONLY a JSON array of objects as your final answer. Put the JSON array at the very end of your response.
Each object should have "name" (string) and "color" (hex color string) properties.
Example: [{"name": "work", "color": "#ffd43b"}, {"name": "programming", "color": "#4fc3f7"}, {"name": "typescript", "color": "#4fc3f7"}]

Do not include any reasoning or explanation - only the JSON array.`

    const userPrompt = `Extract tags from this text:\n\n${seed.currentState.seed}`

    try {
      const response = await context.openrouter.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3, // Lower temperature for more consistent tag extraction
          max_tokens: 8000, // Increased significantly to handle reasoning models that output long reasoning before content
        },
        {
          automationId: this.id,
          automationName: this.name,
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
        
        // Pattern 2: JSON array with double quotes (multiline) - more lenient
        jsonMatch = text.match(/\[(?:\s*"[^"]+"\s*,?\s*)+\]/s)
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[0]) // Validate
            return jsonMatch[0]
          } catch {
            // Not valid JSON, continue
          }
        }
        
        // Pattern 3: JSON array with single quotes (less common but possible)
        jsonMatch = text.match(/\[(?:\s*'[^']+'\s*,?\s*)+\]/s)
        if (jsonMatch) {
          const converted = jsonMatch[0].replace(/'/g, '"')
          try {
            JSON.parse(converted) // Validate
            return converted
          } catch {
            // Not valid JSON, continue
          }
        }
        
        // Pattern 4: Look for array-like structure at the end of text (most important for reasoning models)
        // Check last 500 characters first (reasoning models often put answer at the end)
        const endText = text.slice(-500)
        const lines = endText.split('\n')
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i]?.trim()
          if (line && line.startsWith('[')) {
            // Try to find complete JSON array starting from this line
            const startIdx = text.lastIndexOf(line)
            if (startIdx !== -1) {
              // Try to extract from here to end, or find closing bracket
              const remaining = text.substring(startIdx)
              const closingBracket = remaining.indexOf(']')
              if (closingBracket !== -1) {
                const candidate = remaining.substring(0, closingBracket + 1)
                try {
                  const parsed = JSON.parse(candidate.trim())
                  if (Array.isArray(parsed)) {
                    return candidate.trim()
                  }
                } catch {
                  // Not valid JSON, continue
                }
              }
            }
          }
        }
        
        // Pattern 5: Look for array-like structure anywhere in the text (check all lines)
        const allLines = text.split('\n')
        for (let i = allLines.length - 1; i >= 0; i--) {
          const line = allLines[i]?.trim()
          if (line && line.startsWith('[') && line.endsWith(']')) {
            try {
              JSON.parse(line) // Validate it's valid JSON
              return line
            } catch {
              // Not valid JSON, continue
            }
          }
        }
        
        // Pattern 6: Try to find JSON array anywhere in the text (more lenient, greedy)
        // Look for [ followed by content and ending with ]
        const jsonArrayPattern = /\[[\s\S]{0,500}?\]/g
        const matches = Array.from(text.matchAll(jsonArrayPattern))
        // Check matches from end to start (most recent first)
        for (let i = matches.length - 1; i >= 0; i--) {
          const match = matches[i]
          if (match && match[0]) {
            try {
              const parsed = JSON.parse(match[0].trim())
              if (Array.isArray(parsed) && parsed.length > 0) {
                return match[0].trim()
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
      
      // If not found in content, try reasoning (reasoning models often put answer here)
      if (!jsonContent && reasoning) {
        jsonContent = extractJsonArray(reasoning)
      }
      
      // If still not found, try the last portion of reasoning (where answer often appears)
      if (!jsonContent && reasoning && reasoning.length > 500) {
        const lastPortion = reasoning.slice(-1000) // Last 1000 chars
        jsonContent = extractJsonArray(lastPortion)
      }
      
      // If still not found, try combined text
      let combined = `${reasoning}\n${content}`.trim()
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
                logAutomation.warn('Response was truncated, but extracted partial tags:', parsed)
                jsonContent = jsonToParse
              }
            } catch {
              // Try to extract tags from incomplete JSON manually using regex
              const tagMatches = partialJson.match(/"([^"]+)"/g)
              if (tagMatches && tagMatches.length > 0) {
                const extractedTags = tagMatches.map((m: string) => m.replace(/"/g, ''))
                logAutomation.warn('Response was truncated, extracted tags from partial JSON:', extractedTags)
                // Return early with extracted tags (no colors for truncated responses)
                const result: Array<{ name: string; color: string | null }> = []
                for (const tag of extractedTags) {
                  if (typeof tag !== 'string') continue
                  const normalizedName = tag
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '')
                  
                  if (normalizedName.length > 0 && normalizedName.length <= 50) {
                    result.push({
                      name: normalizedName,
                      color: null,
                    })
                  }
                }
                return result
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
      let tags: Array<{ name: string; color: string | null }>
      try {
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) {
          throw new Error('OpenRouter response is not an array')
        }
        tags = parsed
      } catch (parseError) {
        throw new Error(`Failed to parse JSON from response. Content: ${content.substring(0, 200)}... Error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }

      // Validate and normalize tags
      return tags
        .map(tag => {
          // Handle both object format {name, color} and legacy string format
          let tagName: string
          let tagColor: string | null = null

          if (typeof tag === 'string') {
            // Legacy format: just a string
            tagName = tag
          } else if (typeof tag === 'object' && tag !== null && 'name' in tag) {
            // New format: object with name and optional color
            tagName = String(tag.name)
            if ('color' in tag && tag.color) {
              const color = String(tag.color)
              // Validate color format (hex or CSS color name)
              if (/^#[0-9A-Fa-f]{6}$/.test(color) || /^[a-z]+$/i.test(color)) {
                tagColor = color
              }
            }
          } else {
            return null
          }

          // Normalize tag name: lowercase, trim, replace spaces with hyphens
          const normalizedName = tagName
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') // Remove invalid characters

          if (normalizedName.length === 0 || normalizedName.length > 50) {
            return null
          }

          return {
            name: normalizedName,
            color: tagColor,
          }
        })
        .filter((tag): tag is { name: string; color: string | null } => tag !== null)
    } catch (error) {
      logAutomation.error('Failed to generate tags:', error)
      // Return empty array on error - don't fail the automation
      return []
    }
  }

  /**
   * Ensure a tag exists in the database
   * Creates the tag if it doesn't exist, otherwise returns existing tag
   * If tag exists but has no color and color is provided, updates it via transaction
   */
  private async ensureTagExists(tagName: string, color: string | null = null, automationId?: string): Promise<TagRow> {
    // Normalize tag name for lookup (lowercase, trimmed)
    const normalizedName = tagName.toLowerCase().trim()

    // Try to find existing tag by name
    const existing = await db<TagRow>('tags')
      .where({ name: normalizedName })
      .first()

    if (existing) {
      // If tag exists but has no color and color is provided, update it via transaction
      if (!existing.color && color) {
        try {
          await setColor(existing.id, color)
        } catch (error) {
          logAutomation.warn(`Failed to set color for tag ${existing.id}:`, error)
        }
        return { ...existing, color }
      }
      return existing
    }

    // Create new tag with creation transaction
    try {
      const createdTag = await create({
        name: normalizedName,
        color: color || null,
      })
      
      return {
        id: createdTag.id,
        name: createdTag.name,
        color: createdTag.color || null,
        created_at: createdTag.currentState.timestamp,
      }
    } catch (error) {
      // Handle race condition: if tag was created by another concurrent call,
      // catch duplicate key error and fetch existing tag
      const pgError = error as { code?: string; constraint?: string; message?: string; cause?: { code?: string; constraint?: string; message?: string } }
      const errorCode = pgError.code || pgError.cause?.code
      const errorConstraint = pgError.constraint || pgError.cause?.constraint
      const errorMessage = pgError.message || pgError.cause?.message || String(error)
      
      // Check for duplicate key error (code 23505) on tags_name_unique constraint
      const isDuplicateKeyError = errorCode === '23505' && 
        (errorConstraint === 'tags_name_unique' || errorMessage.includes('tags_name_unique'))
      
      if (isDuplicateKeyError) {
        // Tag was created concurrently, fetch it now
        const existing = await db<TagRow>('tags')
          .where({ name: normalizedName })
          .first()
        
        if (existing) {
          // If tag exists but has no color and color is provided, update it via transaction
          if (!existing.color && color) {
            try {
              await setColor(existing.id, color)
            } catch (setColorError) {
              logAutomation.warn(`Failed to set color for tag ${existing.id}:`, setColorError)
            }
            return { ...existing, color }
          }
          return existing
        }
      }
      
      // Re-throw if it's not a duplicate key error or if we couldn't find the tag
      throw new Error(`Failed to create tag: ${tagName}`, { cause: error })
    }
  }
}

