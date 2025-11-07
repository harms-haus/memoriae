// Follow-up automation - identifies seeds that require follow-ups using AI
// Creates followups (NOT timeline events) when processing seeds

import { Automation, type AutomationContext, type AutomationProcessResult, type CategoryChange } from './base'
import type { Seed } from '../seeds'
import { FollowupService } from '../followups'

/**
 * FollowupAutomation - Identifies seeds that require follow-ups
 * 
 * Uses OpenRouter AI to analyze seed content and determine if a follow-up is needed.
 * Only creates followups with high confidence (>85%) to ensure they are used sparingly.
 * 
 * Followups are NOT timeline events - they exist separately from the seed timeline system.
 */
export class FollowupAutomation extends Automation {
  readonly name = 'followup'
  readonly description = 'Identifies seeds that require follow-ups using AI analysis'
  readonly handlerFnName = 'processFollowup'

  /**
   * Process a seed and determine if it needs a follow-up
   * 
   * Uses OpenRouter to analyze seed content with high confidence threshold.
   * Only creates followup if confidence > 85% (very sparingly).
   * Returns empty events (followups are NOT timeline events).
   */
  async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
    // Check if seed already has followups
    const existingFollowups = await FollowupService.getBySeedId(seed.id)
    const hasActiveFollowup = existingFollowups.some(f => !f.dismissed)
    
    if (hasActiveFollowup) {
      // Seed already has an active followup, don't create another
      return { transactions: [] }
    }

    // Use OpenRouter to analyze seed content
    const analysis = await this.analyzeForFollowup(seed, context)

    // Only create followup if confidence > 85%
    if (analysis.confidence <= 85) {
      return { transactions: [] }
    }

    // Create followup
    await FollowupService.create(seed.id, {
      due_time: analysis.due_time.toISOString(),
      message: analysis.message,
    }, 'automatic')

    // Return empty transactions (followups are NOT timeline transactions)
    return { transactions: [] }
  }

  /**
   * Analyze seed content to determine if follow-up is needed
   * 
   * Uses OpenRouter AI to analyze the seed and return:
   * - confidence: 0-100 score indicating likelihood of needing follow-up
   * - due_time: When the follow-up should occur
   * - message: Why the follow-up is needed
   */
  private async analyzeForFollowup(
    seed: Seed,
    context: AutomationContext
  ): Promise<{
    confidence: number
    due_time: Date
    message: string
  }> {
    const systemPrompt = `You are a follow-up detection assistant. Analyze the given text and determine if it requires a follow-up action.

A follow-up is needed when:
- The text mentions a future task, deadline, or action item
- There's an explicit or implicit need to check back on something
- The text contains reminders, appointments, or time-sensitive information
- There's a clear indication that something needs to be revisited

IMPORTANT: Only suggest follow-ups with HIGH CONFIDENCE (>85%). Follow-ups should be used SPARINGLY and only when VERY LIKELY to be needed.

Return ONLY a JSON object with this exact structure:
{
  "confidence": <number 0-100>,
  "due_time": "<ISO 8601 date string>",
  "message": "<brief explanation of why follow-up is needed>"
}

If confidence is <= 85, set due_time to null and message to empty string.
If confidence > 85, provide a specific due_time (when the follow-up should occur) and a clear message explaining why.

Example high-confidence follow-up:
- "Call John tomorrow about the project" → confidence: 90, due_time: tomorrow, message: "Call John about the project"
- "Meeting scheduled for next Friday" → confidence: 95, due_time: next Friday, message: "Attend scheduled meeting"

Example low-confidence (should not create follow-up):
- "Had a nice conversation with Sarah" → confidence: 20, no follow-up needed
- "Working on a new feature" → confidence: 30, no follow-up needed`

    const userPrompt = `Analyze this text and determine if it requires a follow-up:\n\n${seed.currentState.seed}`

    try {
      const response = await context.openrouter.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3, // Lower temperature for more consistent analysis
          max_tokens: 500,
        }
      )

      const message = response.choices[0]?.message
      if (!message) {
        throw new Error('OpenRouter response has no message')
      }

      let content = message.content?.trim() || ''
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*(\{.*?\})\s*```/s) || content.match(/(\{.*\})/s)
      if (jsonMatch && jsonMatch[1]) {
        content = jsonMatch[1]
      }

      const parsed = JSON.parse(content)
      
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
        throw new Error('Invalid confidence value')
      }

      // If confidence is low, return early
      if (parsed.confidence <= 85) {
        return {
          confidence: parsed.confidence,
          due_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow (won't be used)
          message: '',
        }
      }

      // Validate due_time
      if (!parsed.due_time || typeof parsed.due_time !== 'string') {
        throw new Error('due_time is required when confidence > 85')
      }

      const dueTime = new Date(parsed.due_time)
      if (isNaN(dueTime.getTime())) {
        throw new Error('Invalid due_time format')
      }

      // Validate message
      if (!parsed.message || typeof parsed.message !== 'string') {
        throw new Error('message is required when confidence > 85')
      }

      return {
        confidence: parsed.confidence,
        due_time: dueTime,
        message: parsed.message.trim(),
      }
    } catch (error) {
      console.error('FollowupAutomation: Failed to analyze seed:', error)
      // Return low confidence on error - don't create followup
      return {
        confidence: 0,
        due_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
        message: '',
      }
    }
  }

  /**
   * Calculate pressure when categories change
   * 
   * Category changes don't affect followups, so always return 0
   */
  calculatePressure(
    seed: Seed,
    context: AutomationContext,
    changes: CategoryChange[]
  ): number {
    return 0
  }

  /**
   * Get the pressure threshold for this automation
   * 
   * Returns 100 to ensure this automation never auto-triggers from pressure
   */
  getPressureThreshold(): number {
    return 100
  }
}

