// Follow-up automation - identifies seeds that require follow-ups using AI
// Creates followups (NOT timeline events) when processing seeds

import { Automation, type AutomationContext, type AutomationProcessResult, type CategoryChange } from './base'
import type { Seed } from '../seeds'
import * as followupHandler from '../sprouts/followup-sprout'
import { SproutsService } from '../sprouts'
import { SeedTransactionsService } from '../seed-transactions'
import { SettingsService } from '../settings'
import { DateTime } from 'luxon'
import log from 'loglevel'

const logAutomation = log.getLogger('Automation:Followup')

/**
 * FollowupAutomation - Identifies seeds that require follow-ups
 * 
 * Uses OpenRouter AI to analyze seed content and determine if a follow-up is needed.
 * Only creates followups with high confidence (>60%) to ensure they are used sparingly.
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
   * Only creates followup if confidence > 60% (very sparingly).
   * Returns empty events (followups are NOT timeline events).
   */
  async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
    // Check if seed already has active followup sprouts
    const existingSprouts = await SproutsService.getBySeedId(seed.id)
    const followupSprouts = existingSprouts.filter(s => s.sprout_type === 'followup')
    
    // Check if any followup sprout is not dismissed by checking transactions
    // We need to import getFollowupState to check dismissal status
    const { getFollowupState } = await import('../sprouts/followup-sprout')
    
    let hasActiveFollowup = false
    for (const sprout of followupSprouts) {
      try {
        const state = await getFollowupState(sprout)
        if (!state.dismissed) {
          hasActiveFollowup = true
          break
        }
      } catch (error) {
        // If we can't compute state, assume it's active to be safe
        logAutomation.warn(`Could not compute state for sprout ${sprout.id}, assuming active`)
        hasActiveFollowup = true
        break
      }
    }
    
    if (hasActiveFollowup) {
      // Seed already has an active followup, don't create another
      return { transactions: [] }
    }

    // Use OpenRouter to analyze seed content
    const analysis = await this.analyzeForFollowup(seed, context)

    // Only create followup if confidence > 60%
    if (analysis.confidence <= 60) {
      return { transactions: [] }
    }

    // Create followup sprout
    const { sprout } = await followupHandler.createFollowupSprout(
      seed.id,
      analysis.due_time.toISOString(),
      analysis.message,
      'automatic',
      this.id
    )

    // Create add_sprout transaction on the seed
    await SeedTransactionsService.create({
      seed_id: seed.id,
      transaction_type: 'add_sprout',
      transaction_data: {
        sprout_id: sprout.id,
      },
      automation_id: this.id || null,
    })

    // Return empty transactions (sprouts are tracked separately, not as timeline events)
    return { transactions: [] }
  }

  /**
   * Analyze seed content to determine if follow-up is needed
   * 
   * Uses OpenRouter AI to analyze the seed and return:
   * - confidence: 0-100 score indicating likelihood of needing follow-up
   * - due_time: When the follow-up should occur (in UTC)
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
    // Get user settings to determine timezone
    const settings = await SettingsService.getByUserId(context.userId)
    // Use user's timezone or fallback to system timezone (using Intl as fallback since DateTime.now().zoneName may return 'system')
    const userTimezone = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    // Get current date/time for relative date calculations in user's timezone
    const now = DateTime.now().setZone(userTimezone)
    const currentDateISO = now.toUTC().toISO() || ''
    const currentDateReadable = now.toLocaleString({ 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    })

    const systemPrompt = `You are a follow-up detection assistant. Analyze the given text and determine if it requires a follow-up action.

A follow-up is needed when:
- The text mentions a future task, deadline, or action item
- There's an explicit or implicit need to check back on something (e.g., "I should look that up", "I need to", "I should check")
- The text contains reminders, appointments, or time-sensitive information
- There's a clear indication that something needs to be revisited

IMPORTANT: Only suggest follow-ups with HIGH CONFIDENCE (>60%). Follow-ups should be used SPARINGLY and only when VERY LIKELY to be needed.

HANDLING RELATIVE TIME REFERENCES:
When the text mentions relative time periods, choose appropriate breakpoints:
- "next week" → Use the upcoming Sunday (start of next week) at 9:00 AM
- "in [month]" (e.g., "in december") → Use the 1st of that month at 9:00 AM
- "next [day]" (e.g., "next Friday") → Use that specific date at 9:00 AM
- "tomorrow" → Use tomorrow at 9:00 AM
- Vague future references + action intent → Use a reasonable breakpoint (e.g., Sunday for "next week", 1st of month for months)

DEFAULT TIMES:
- Use 9:00 AM as the default time for followups (good alert time)
- For week-based references, prefer Sunday as the breakpoint
- For month-based references, prefer the 1st of the month

Return ONLY a JSON object with this exact structure:
{
  "confidence": <number 0-100>,
  "due_time": "<ISO 8601 date string>",
  "message": "<brief explanation of why follow-up is needed>"
}

If confidence is low, you may set due_time to an empty string or any default value (it won't be used), and set message to empty string.
If confidence medium or higher, you MUST provide a valid due_time as an ISO 8601 date string (e.g., "2024-01-15T09:00:00Z") and a non-empty message explaining why.

CRITICAL: due_time MUST be a valid ISO 8601 date string (YYYY-MM-DDTHH:mm:ssZ format). Calculate the actual date and time based on the current date provided below.

Example high-confidence follow-ups:
- "Pretty sure I have an appointment next week. I should look that up" → confidence: high, due_time: [next Sunday at 9am], message: "Look up appointment details"
- "In december I need to take a bunch of time off" → confidence: very high, due_time: [Dec 1st at 9am], message: "Take time off in December"
- "Call John tomorrow about the project" → confidence: very high, due_time: [tomorrow at 9am], message: "Call John about the project"
- "Meeting scheduled for next Friday" → confidence: extremely high, due_time: [next Friday at 9am], message: "Attend scheduled meeting"
Example low-confidence (should not create follow-up):
- "Had a nice conversation with Sarah" → confidence: very low, no follow-up needed
- "Working on a new feature" → confidence: very low, no follow-up needed
- "I met with John today about that job opportunity" - confidence: low, past-tense action, no follow-up necessary
- "I'm going to the gym tomorrow" - confidence: low, future-tense, but no reminder seems needed as the user is confident about their action
- "I get to see Santa tomorrow!" - confidence: low, more of a statement than a reminder or memory jogger`

    const userPrompt = `Current date and time: ${currentDateISO} (${currentDateReadable})

Analyze this text and determine if it requires a follow-up:

${seed.currentState.seed}`

    try {
      const response = await context.openrouter.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3, // Lower temperature for more consistent analysis
          max_tokens: 500,
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
      if (parsed.confidence <= 60) {
        return {
          confidence: parsed.confidence,
          due_time: DateTime.now().plus({ days: 1 }).toJSDate(), // Default to tomorrow (won't be used)
          message: '',
        }
      }

      // Validate due_time - if invalid, treat as low confidence
      if (!parsed.due_time || typeof parsed.due_time !== 'string') {
        logAutomation.warn(`AI returned confidence ${parsed.confidence} but missing due_time. Treating as low confidence.`)
        return {
          confidence: parsed.confidence,
          due_time: DateTime.now().plus({ days: 1 }).toJSDate(),
          message: '',
        }
      }

      // Parse the due_time - AI should return ISO string, but we need to interpret it in user's timezone
      // If the AI returns a time without timezone (e.g., "2024-01-15T09:00:00"), interpret it as user's timezone
      let dueTime: Date
      try {
        const timeStr = parsed.due_time.trim()
        
        let dt: DateTime
        
        // If timezone is already specified (ends with Z or +/-), parse directly
        if (timeStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(timeStr)) {
          dt = DateTime.fromISO(timeStr)
        } else {
          // No timezone specified - interpret as user's timezone and convert to UTC
          dt = DateTime.fromISO(timeStr, { zone: userTimezone })
        }
        
        if (!dt.isValid) {
          throw new Error(`Invalid date: ${dt.invalidReason} - ${dt.invalidExplanation}`)
        }
        
        dueTime = dt.toUTC().toJSDate()
      } catch (error) {
        logAutomation.warn(`Failed to parse due_time "${parsed.due_time}" in timezone ${userTimezone}:`, error)
        return {
          confidence: parsed.confidence,
          due_time: DateTime.now().plus({ days: 1 }).toJSDate(),
          message: '',
        }
      }
      
      if (isNaN(dueTime.getTime())) {
        logAutomation.warn(`AI returned confidence ${parsed.confidence} but invalid due_time format: ${parsed.due_time}. Treating as low confidence.`)
        return {
          confidence: parsed.confidence,
          due_time: DateTime.now().plus({ days: 1 }).toJSDate(),
          message: '',
        }
      }

      // Validate message - if invalid, treat as low confidence
      if (!parsed.message || typeof parsed.message !== 'string' || parsed.message.trim().length === 0) {
        logAutomation.warn(`AI returned confidence ${parsed.confidence} but missing or empty message. Treating as low confidence.`)
        return {
          confidence: parsed.confidence,
          due_time: DateTime.now().plus({ days: 1 }).toJSDate(),
          message: '',
        }
      }

      return {
        confidence: parsed.confidence,
        due_time: dueTime, // This is now in UTC
        message: parsed.message.trim(),
      }
    } catch (error) {
      logAutomation.error('Failed to analyze seed:', error)
      // Return low confidence on error - don't create followup
      return {
        confidence: 0,
        due_time: DateTime.now().plus({ days: 1 }).toJSDate(),
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

