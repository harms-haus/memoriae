// Idea musing automation - identifies creative/exploratory idea seeds and generates daily musings
import { Automation, type AutomationContext, type AutomationProcessResult, type CategoryChange } from './base'
import type { Seed } from '../seeds'
import type { MusingTemplateType, MusingContent } from '../idea-musings'
import { SeedsService } from '../seeds'
import log from 'loglevel'

const logAutomation = log.getLogger('Automation:IdeaMusing')

/**
 * IdeaMusingAutomation - Identifies creative idea seeds and generates daily musings
 * 
 * This automation runs via scheduler (not per-seed). It:
 * 1. Identifies seeds that are creative/exploratory in nature
 * 2. Generates musings with LLM-selected templates
 * 3. Stores musings for daily display
 */
export class IdeaMusingAutomation extends Automation {
  readonly name = 'idea-musing'
  readonly description = 'Identifies creative idea seeds and generates daily musings'
  readonly handlerFnName = 'processIdeaMusing'

  /**
   * Process method - not used for this automation
   * This automation runs via scheduler, not per-seed
   */
  async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
    // This automation doesn't process seeds individually
    // It runs via scheduler to generate daily musings
    return { transactions: [] }
  }

  /**
   * Calculate pressure - minimal since this runs on schedule
   */
  calculatePressure(
    seed: Seed,
    context: AutomationContext,
    changes: CategoryChange[]
  ): number {
    // This automation runs on schedule, not based on pressure
    return 0
  }

  /**
   * Identify idea seeds using LLM
   * Returns array of seed IDs that are creative/exploratory in nature
   */
  async identifyIdeaSeeds(
    seeds: Seed[],
    context: AutomationContext
  ): Promise<Seed[]> {
    if (seeds.length === 0) {
      return []
    }

    const systemPrompt = `You are an assistant that identifies creative and exploratory "idea" seeds.

An "idea" seed is creative in nature and explores possibilities such as:
- Creating an application or software tool
- Building something (physical or digital)
- Learning about a topic or skill
- Wanting to do something in the future
- Exploring a concept or possibility
- Planning a project or initiative

Examples of idea seeds:
- "I want to build an app that tracks my reading habits"
- "Maybe I should learn about machine learning"
- "Idea: a tool that helps organize my thoughts"
- "I'm thinking about creating a personal finance tracker"
- "Would be cool to build a website for my portfolio"

NOT idea seeds (these are regular notes/memories):
- "Had a meeting with John today"
- "Remember to buy groceries"
- "Today I learned that..."
- "I need to finish my report by Friday"

Return ONLY a JSON array of seed IDs that are idea seeds. Each seed ID should be a string.
Format: ["seed-id-1", "seed-id-2", ...]

If no seeds are ideas, return an empty array: []`

    // Build user prompt with seed summaries
    const seedSummaries = seeds.map((seed, index) => {
      const content = seed.currentState.seed
      const preview = content.length > 200 ? content.substring(0, 200) + '...' : content
      return `Seed ${index + 1} (ID: ${seed.id}):\n${preview}`
    }).join('\n\n')

    const userPrompt = `Analyze these seeds and return the IDs of those that are creative/exploratory ideas:

${seedSummaries}

Return ONLY a JSON array of seed IDs (strings), or an empty array if none are ideas.`

    try {
      const response = await context.openrouter.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3,
          max_tokens: 2000,
        }
      )

      const message = response.choices[0]?.message
      if (!message) {
        throw new Error('OpenRouter response has no message')
      }

      let content = message.content?.trim() || ''
      const reasoning = (message as any).reasoning?.trim() || ''
      
      // Extract JSON array from response
      const extractJsonArray = (text: string): string[] | null => {
        if (!text) return null
        
        // Try to find JSON array in markdown code block
        let jsonMatch = text.match(/```(?:json)?\s*(\[.*?\])\s*```/s)
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1])
          } catch {
            // Continue to next pattern
          }
        }
        
        // Try to find JSON array anywhere
        jsonMatch = text.match(/\[(?:\s*"[^"]+"\s*,?\s*)+\]/s)
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0])
          } catch {
            // Continue
          }
        }
        
        // Check reasoning field if content didn't work
        if (reasoning) {
          return extractJsonArray(reasoning)
        }
        
        return null
      }

      const seedIds = extractJsonArray(content) || extractJsonArray(reasoning) || []
      
      if (!Array.isArray(seedIds)) {
        logAutomation.warn('LLM returned non-array for idea seed IDs')
        return []
      }

      // Filter seeds to only those identified
      const seedMap = new Map(seeds.map(s => [s.id, s]))
      return seedIds
        .filter((id): id is string => typeof id === 'string')
        .map(id => seedMap.get(id))
        .filter((seed): seed is Seed => seed !== undefined)
    } catch (error) {
      logAutomation.error('Error identifying idea seeds:', error)
      return []
    }
  }

  /**
   * Generate a musing for a seed
   * Uses LLM to select template type and generate content
   */
  async generateMusing(
    seed: Seed,
    context: AutomationContext
  ): Promise<{ templateType: MusingTemplateType; content: MusingContent } | null> {
    // Get category examples for comparison
    const categoryExamples = await this.getCategoryExamples(seed, context)

    const systemPrompt = `You are a creative assistant that generates musings to spark ideas.

You have three template types available:
1. "numbered_ideas" - A numbered list of ideas to enhance or expand the seed. The last item should always be a placeholder for a custom prompt (e.g., "Custom idea or prompt..."). Use this for seeds about creating apps, tools, or projects.
2. "wikipedia_links" - A list of Wikipedia article links related to the seed or similar ideas. Use this for learning topics or exploratory concepts.
3. "markdown" - Free-form markdown content for any niche situations. Use this when the other templates don't fit.

Based on the seed content, choose the most appropriate template type and generate content.

For "numbered_ideas", return:
{
  "template_type": "numbered_ideas",
  "content": {
    "ideas": ["idea 1", "idea 2", "idea 3", "Custom idea or prompt..."]
  }
}

For "wikipedia_links", return:
{
  "template_type": "wikipedia_links",
  "content": {
    "links": [
      {"title": "Article Title", "url": "https://en.wikipedia.org/wiki/Article_Title"},
      ...
    ]
  }
}

For "markdown", return:
{
  "template_type": "markdown",
  "content": {
    "markdown": "# Markdown content here\n\n..."
  }
}

Return ONLY valid JSON with the structure above.`

    const categoryContext = categoryExamples.length > 0
      ? `\n\nSimilar seeds in this category have included:\n${categoryExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}`
      : ''

    const userPrompt = `Generate a musing for this seed:

${seed.currentState.seed}${categoryContext}

Choose the most appropriate template type and generate engaging content to spark creativity.`

    try {
      const response = await context.openrouter.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.7, // Higher temperature for creativity
          max_tokens: 2000,
        }
      )

      const message = response.choices[0]?.message
      if (!message) {
        throw new Error('OpenRouter response has no message')
      }

      let content = message.content?.trim() || ''
      const reasoning = (message as any).reasoning?.trim() || ''
      
      // Extract JSON from response
      const extractJson = (text: string): any | null => {
        if (!text) return null
        
        // Try markdown code block
        let jsonMatch = text.match(/```(?:json)?\s*(\{.*?\})\s*```/s)
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1])
          } catch {
            // Continue
          }
        }
        
        // Try to find JSON object
        jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0])
          } catch {
            // Continue
          }
        }
        
        // Check reasoning
        if (reasoning) {
          return extractJson(reasoning)
        }
        
        return null
      }

      const result = extractJson(content) || extractJson(reasoning)
      
      if (!result || !result.template_type || !result.content) {
        logAutomation.warn('LLM returned invalid musing structure')
        return null
      }

      // Validate template type
      const validTemplateTypes: MusingTemplateType[] = ['numbered_ideas', 'wikipedia_links', 'markdown']
      if (!validTemplateTypes.includes(result.template_type)) {
        logAutomation.warn(`Invalid template type: ${result.template_type}`)
        return null
      }

      // Validate content structure based on template type
      if (result.template_type === 'numbered_ideas') {
        if (!result.content.ideas || !Array.isArray(result.content.ideas)) {
          logAutomation.warn('Invalid numbered_ideas content structure')
          return null
        }
        // Ensure last item is custom prompt placeholder if not already
        const ideas = result.content.ideas
        if (ideas.length === 0 || !ideas[ideas.length - 1].toLowerCase().includes('custom')) {
          ideas.push('Custom idea or prompt...')
        }
      } else if (result.template_type === 'wikipedia_links') {
        if (!result.content.links || !Array.isArray(result.content.links)) {
          logAutomation.warn('Invalid wikipedia_links content structure')
          return null
        }
        // Validate links have title and url
        for (const link of result.content.links) {
          if (!link.title || !link.url) {
            logAutomation.warn('Invalid link structure in wikipedia_links')
            return null
          }
        }
      } else if (result.template_type === 'markdown') {
        if (!result.content.markdown || typeof result.content.markdown !== 'string') {
          logAutomation.warn('Invalid markdown content structure')
          return null
        }
      }

      return {
        templateType: result.template_type as MusingTemplateType,
        content: result.content as MusingContent,
      }
    } catch (error) {
      logAutomation.error('Error generating musing:', error)
      return null
    }
  }

  /**
   * Get example seeds from the same category for context
   */
  private async getCategoryExamples(seed: Seed, context: AutomationContext): Promise<string[]> {
    const seedCategories = seed.currentState.categories || []
    if (seedCategories.length === 0) {
      return []
    }

    // Get other seeds in the same category
    const firstCategory = seedCategories[0]
    if (!firstCategory) {
      return []
    }
    const categoryId = firstCategory.id
    const otherSeeds = await SeedsService.getByUser(context.userId)
    
    const categorySeeds = otherSeeds.filter(s => {
      const sCategories = s.currentState.categories || []
      return sCategories.some(c => c.id === categoryId) && s.id !== seed.id
    })

    // Return previews of up to 3 examples
    return categorySeeds
      .slice(0, 3)
      .map(s => {
        const content = s.currentState.seed
        return content.length > 150 ? content.substring(0, 150) + '...' : content
      })
  }
}

