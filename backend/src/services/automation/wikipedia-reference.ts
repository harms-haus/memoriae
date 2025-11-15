// Wikipedia reference automation - finds and summarizes Wikipedia articles for interesting references in seeds

import { v4 as uuidv4 } from 'uuid'
import { Automation, type AutomationContext, type AutomationProcessResult, type CategoryChange } from './base'
import type { Seed } from '../seeds'
import type { SeedTransaction } from '../../types/seed-transactions'
import { useToolsWithAI, wgetTool } from './tools'
import log from 'loglevel'

const logAutomation = log.getLogger('Automation:WikipediaReference')

/**
 * WikipediaReferenceAutomation - Finds Wikipedia articles for interesting references in seeds
 * 
 * 1. Analyzes seed content to identify interesting references (people, places, concepts, etc.)
 * 2. Picks 0 or 1 reference per execution
 * 3. Uses wget tool to search and fetch Wikipedia article
 * 4. Summarizes how the Wikipedia article relates to the seed
 * 5. Appends the summary to the seed content
 */
export class WikipediaReferenceAutomation extends Automation {
  readonly name = 'wikipedia-reference'
  readonly description = 'Finds and summarizes Wikipedia articles for interesting references in seeds'
  readonly handlerFnName = 'processWikipediaReference'

  /**
   * Process a seed and find Wikipedia references
   * 
   * 1. Uses AI to identify interesting references in the seed
   * 2. Picks 0 or 1 reference to research
  3. Uses wget to fetch Wikipedia search results and article
   * 4. Summarizes the relationship between the article and seed
   * 5. Appends summary to seed content
   */
  async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
    // Check if seed already has Wikipedia references (avoid duplicates)
    const existingContent = seed.currentState.seed
    if (existingContent.includes('## Wikipedia Reference')) {
      logAutomation.debug(`Seed ${seed.id} already has Wikipedia references, skipping`)
      return { transactions: [] }
    }

    // Step 1: Use AI with tools to identify interesting references
    const referenceResult = await this.identifyReference(seed, context)
    
    if (!referenceResult || !referenceResult.reference) {
      logAutomation.debug(`No interesting reference found for seed ${seed.id}`)
      return { transactions: [] }
    }

    const { reference, searchQuery } = referenceResult

    // Step 2: Use wget to search Wikipedia
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchQuery)}&limit=1&format=json`
    const searchResults = await context.toolExecutor.execute({
      toolName: 'wget',
      arguments: [searchUrl, 30000],
      rawText: `wget("${searchUrl}", 30000)`,
    })

    if (!searchResults.success || typeof searchResults.result !== 'string') {
      logAutomation.warn(`Failed to fetch Wikipedia search results for "${searchQuery}"`)
      return { transactions: [] }
    }

    // Check if result is an error message (wget returns error messages as strings)
    const resultString = searchResults.result as string
    if (resultString.startsWith('Error:')) {
      logAutomation.warn(`Wikipedia search failed for "${searchQuery}": ${resultString}`)
      return { transactions: [] }
    }

    // Parse Wikipedia API response (OpenSearch format: [query, [titles], [descriptions], [urls]])
    let articleUrl: string | null = null
    try {
      const searchData = JSON.parse(resultString)
      if (Array.isArray(searchData) && searchData.length >= 4) {
        const urls = searchData[3]
        if (Array.isArray(urls) && urls.length > 0 && urls[0]) {
          articleUrl = urls[0] as string
        }
      }
    } catch (error) {
      logAutomation.warn(`Failed to parse Wikipedia search results: ${error}`)
      return { transactions: [] }
    }

    if (!articleUrl) {
      logAutomation.debug(`No Wikipedia article found for "${searchQuery}"`)
      return { transactions: [] }
    }

    // Step 3: Fetch the Wikipedia article content
    // Extract article title from URL (e.g., "Human_chimerism" from "/wiki/Human_chimerism")
    const articleTitle = articleUrl.split('/wiki/')[1]
    if (!articleTitle) {
      logAutomation.warn(`Could not extract article title from URL: ${articleUrl}`)
      return { transactions: [] }
    }
    const articleApiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(articleTitle)}&format=json`
    const articleResult = await context.toolExecutor.execute({
      toolName: 'wget',
      arguments: [articleApiUrl, 30000],
      rawText: `wget("${articleApiUrl}", 30000)`,
    })

    if (!articleResult.success || typeof articleResult.result !== 'string') {
      logAutomation.warn(`Failed to fetch Wikipedia article content from ${articleUrl}`)
      return { transactions: [] }
    }

    // Check if result is an error message (wget returns error messages as strings)
    const articleResultString = articleResult.result as string
    if (articleResultString.startsWith('Error:')) {
      logAutomation.warn(`Wikipedia article fetch failed for ${articleUrl}: ${articleResultString}`)
      return { transactions: [] }
    }

    // Parse article content
    let articleText: string | null = null
    try {
      const articleData = JSON.parse(articleResultString) as {
        query?: {
          pages?: Record<string, { extract?: string }>
        }
      }
      const pages = articleData.query?.pages
      if (pages && typeof pages === 'object') {
        const pageIds = Object.keys(pages)
        if (pageIds.length > 0) {
          const pageId = pageIds[0]
          if (pageId) {
            const page = pages[pageId]
            if (page && typeof page === 'object' && 'extract' in page && typeof page.extract === 'string') {
              articleText = page.extract
            }
          }
        }
      }
    } catch (error) {
      logAutomation.warn(`Failed to parse Wikipedia article content: ${error}`)
      return { transactions: [] }
    }

    if (!articleText) {
      logAutomation.debug(`No article text found for "${searchQuery}"`)
      return { transactions: [] }
    }

    // Step 4: Use AI to summarize the relationship
    const summary = await this.summarizeReference(seed, reference, articleText, articleUrl, context)

    if (!summary) {
      logAutomation.debug(`Failed to generate summary for reference "${reference}"`)
      return { transactions: [] }
    }

    // Step 5: Append summary to seed content
    const newContent = `${existingContent}\n\n## Wikipedia Reference\n\n**${reference}**\n\n${summary}`

    const transaction: SeedTransaction = {
      id: uuidv4(),
      seed_id: seed.id,
      transaction_type: 'edit_content',
      transaction_data: {
        content: newContent,
      },
      created_at: new Date(),
      automation_id: this.id || null,
    }

    logAutomation.info(`Added Wikipedia reference for "${reference}" to seed ${seed.id}`)

    return {
      transactions: [transaction],
      metadata: {
        reference,
        articleUrl,
      },
    }
  }

  /**
   * Identify an interesting reference in the seed using AI with tools
   */
  private async identifyReference(seed: Seed, context: AutomationContext): Promise<{
    reference: string
    searchQuery: string
  } | null> {
    const systemPrompt = `You are an assistant that identifies interesting references in text that would benefit from Wikipedia research.

Your task is to identify ONE interesting reference (person, place, concept, event, etc.) that:
1. Is mentioned or alluded to in the seed content
2. Would benefit from Wikipedia research to provide context
3. Is not too obscure (should have a Wikipedia article)
4. Is relevant to understanding or expanding the seed's idea

Return a JSON object with:
- "reference": The name/title of the reference (e.g., "Human chimerism", "Quantum entanglement")
- "searchQuery": The search query to use for Wikipedia (may be the same as reference or slightly different)
- "reason": Brief explanation of why this reference is interesting

If no interesting reference is found, return null.`

    const userPrompt = `Analyze this seed content and identify ONE interesting reference that would benefit from Wikipedia research:

${seed.currentState.seed}

Return JSON only.`

    try {
      const result = await useToolsWithAI({
        baseSystemPrompt: systemPrompt,
        userPrompt,
        tools: [wgetTool],
        openrouter: context.openrouter,
        maxIterations: 5,
      })

      // Parse result
      let parsed: {
        reference?: string
        searchQuery?: string
        reason?: string
      } | null = null

      if (typeof result === 'string') {
        try {
          parsed = JSON.parse(result)
        } catch {
          // Try to extract JSON from string
          const jsonMatch = result.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0])
          }
        }
      } else if (typeof result === 'object' && result !== null) {
        parsed = result as { reference?: string; searchQuery?: string; reason?: string }
      }

      if (!parsed || !parsed.reference || parsed.reference === 'null') {
        return null
      }

      return {
        reference: parsed.reference,
        searchQuery: parsed.searchQuery || parsed.reference,
      }
    } catch (error) {
      logAutomation.error(`Error identifying reference: ${error}`)
      return null
    }
  }

  /**
   * Summarize how the Wikipedia article relates to the seed
   */
  private async summarizeReference(
    seed: Seed,
    reference: string,
    articleText: string,
    articleUrl: string,
    context: AutomationContext
  ): Promise<string | null> {
    const systemPrompt = `You are an assistant that summarizes Wikipedia articles in the context of seed ideas.

Your task is to:
1. Read the Wikipedia article excerpt
2. Identify key information relevant to the seed's idea
3. Explain how this information might change or reinforce the seed's idea
4. Write a concise summary (2-4 paragraphs)

Be specific and insightful. Focus on connections between the Wikipedia content and the seed's idea.`

    const userPrompt = `Seed content:
${seed.currentState.seed}

Wikipedia article about "${reference}":
${articleText.substring(0, 2000)}${articleText.length > 2000 ? '...' : ''}

Article URL: ${articleUrl}

Summarize how this Wikipedia article relates to the seed's idea. Explain how it might change or reinforce the idea.`

    try {
      const result = await context.openrouter.generateText(
        userPrompt,
        systemPrompt,
        {
          temperature: 0.7,
          max_tokens: 1000,
        }
      )

      if (!result || result.trim().length === 0) {
        return null
      }

      return result.trim() + `\n\n[Read more on Wikipedia](${articleUrl})`
    } catch (error) {
      logAutomation.error(`Error summarizing reference: ${error}`)
      return null
    }
  }

  /**
   * Calculate pressure when categories change
   * 
   * Wikipedia references might need updating if categories change,
   * as different categories might highlight different references.
   */
  calculatePressure(
    seed: Seed,
    context: AutomationContext,
    changes: CategoryChange[]
  ): number {
    // Low pressure - category changes don't strongly affect Wikipedia references
    // But some pressure to re-evaluate if seed is in affected category
    const seedCategories = seed.currentState.categories || []
    if (seedCategories.length === 0) {
      return 0
    }

    const affectedCategoryIds = new Set(changes.map(c => c.categoryId))
    const isAffected = seedCategories.some(sc => affectedCategoryIds.has(sc.id))

    if (!isAffected) {
      return 0
    }

    // Moderate pressure for category changes
    return 5
  }

  /**
   * Handle pressure when threshold is reached
   * 
   * Default implementation is fine - will re-process seed
   */
}

