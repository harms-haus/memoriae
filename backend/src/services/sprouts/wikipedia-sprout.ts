// Wikipedia sprout handler - manages Wikipedia sprout state via transactions
import { v4 as uuidv4 } from 'uuid'
import db from '../../db/connection'
import { SproutsService } from '../sprouts'
import { SeedsService } from '../seeds'
import { SettingsService } from '../settings'
import { createOpenRouterClient } from '../openrouter/client'
import { ToolExecutor } from '../automation/tools/executor'
import type {
  Sprout,
  WikipediaReferenceSproutData,
  WikipediaSproutState,
  WikipediaTransaction,
  SproutWikipediaTransactionRow,
  WikipediaCreationTransactionData,
  WikipediaEditTransactionData,
} from '../../types/sprouts'
import type { Seed } from '../seeds'
import type { AutomationContext } from '../automation/base'
import log from 'loglevel'

const logHandler = log.getLogger('Handler:WikipediaSprout')

/**
 * Compute Wikipedia sprout state from transactions
 */
function computeWikipediaState(
  sprout: Sprout,
  transactions: WikipediaTransaction[]
): WikipediaSproutState {
  // Sort transactions by created_at (oldest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
  )

  // Find creation transaction (must be first)
  const creationTransaction = sortedTransactions.find(
    (t) => t.transaction_type === 'creation'
  )

  if (!creationTransaction) {
    throw new Error('Wikipedia sprout must have a creation transaction')
  }

  const creationData = creationTransaction.transaction_data as WikipediaCreationTransactionData

  // Start with initial state from creation
  let reference = creationData.reference
  let articleUrl = creationData.article_url
  let articleTitle = creationData.article_title
  let summary = creationData.summary

  // Process remaining transactions in order
  for (const transaction of sortedTransactions) {
    if (transaction.transaction_type === 'creation') {
      continue // Already processed
    }

    if (transaction.transaction_type === 'edit') {
      const editData = transaction.transaction_data as WikipediaEditTransactionData
      summary = editData.new_summary
    }
  }

  return {
    reference,
    article_url: articleUrl,
    article_title: articleTitle,
    summary,
    transactions: sortedTransactions,
  }
}

/**
 * Get computed state for a Wikipedia sprout
 */
export async function getWikipediaState(sprout: Sprout): Promise<WikipediaSproutState> {
  logHandler.debug(`getWikipediaState - Computing state for sprout ${sprout.id}`)
  try {
    // Get all transactions for this sprout
    const transactionRows = await db<SproutWikipediaTransactionRow>(
      'sprout_wikipedia_transactions'
    )
      .where({ sprout_id: sprout.id })
      .orderBy('created_at', 'asc')
      .select('*')

    const transactions: WikipediaTransaction[] = transactionRows.map((row) => ({
      id: row.id,
      sprout_id: row.sprout_id,
      transaction_type: row.transaction_type,
      transaction_data: row.transaction_data,
      created_at: new Date(row.created_at),
    }))

    return computeWikipediaState(sprout, transactions)
  } catch (error) {
    logHandler.error(`getWikipediaState - Error computing state for sprout ${sprout.id}:`, error)
    throw error
  }
}

/**
 * Edit a Wikipedia sprout summary (adds edit transaction)
 */
export async function editWikipediaSummary(
  sproutId: string,
  newSummary: string
): Promise<WikipediaSproutState> {
  logHandler.debug(`editWikipediaSummary - Editing sprout ${sproutId}`)
  try {
    const sprout = await SproutsService.getById(sproutId)
    if (!sprout) {
      throw new Error('Sprout not found')
    }

    if (sprout.sprout_type !== 'wikipedia_reference') {
      throw new Error('Sprout is not a Wikipedia reference type')
    }

    // Get current state (this will throw if no creation transaction exists)
    let currentState: WikipediaSproutState
    try {
      currentState = await getWikipediaState(sprout)
    } catch (error: any) {
      // If error is about missing creation transaction, that's a data integrity issue
      // But we should still throw the original error
      throw error
    }

    // Check if anything changed
    if (currentState.summary === newSummary) {
      // No changes, return current state
      return currentState
    }

    // Create edit transaction
    const editData: WikipediaEditTransactionData = {
      old_summary: currentState.summary,
      new_summary: newSummary,
    }

    await db<SproutWikipediaTransactionRow>('sprout_wikipedia_transactions').insert({
      id: uuidv4(),
      sprout_id: sproutId,
      transaction_type: 'edit',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(editData)]),
      created_at: new Date(),
    })

    // Return updated state
    return await getWikipediaState(sprout)
  } catch (error) {
    logHandler.error(`editWikipediaSummary - Error editing sprout ${sproutId}:`, error)
    throw error
  }
}

/**
 * Create a Wikipedia sprout with creation transaction
 */
export async function createWikipediaSprout(
  seedId: string,
  data: WikipediaReferenceSproutData,
  automationId: string | null = null
): Promise<Sprout> {
  logHandler.debug(`createWikipediaSprout - Creating Wikipedia sprout for seed ${seedId}`)
  try {
    const now = new Date()

    // Create sprout with initial data
    const sprout = await SproutsService.create({
      seed_id: seedId,
      sprout_type: 'wikipedia_reference',
      sprout_data: data,
      automation_id: automationId,
    })

    // Create creation transaction
    const creationData: WikipediaCreationTransactionData = {
      reference: data.reference,
      article_url: data.article_url,
      article_title: data.article_title,
      summary: data.summary,
    }

    await db<SproutWikipediaTransactionRow>('sprout_wikipedia_transactions').insert({
      id: uuidv4(),
      sprout_id: sprout.id,
      transaction_type: 'creation',
      transaction_data: db.raw('?::jsonb', [JSON.stringify(creationData)]),
      created_at: now,
    })

    logHandler.info(`createWikipediaSprout - Created Wikipedia sprout ${sprout.id} for seed ${seedId}`)
    return sprout
  } catch (error) {
    logHandler.error(`createWikipediaSprout - Error creating Wikipedia sprout for seed ${seedId}:`, error)
    throw error
  }
}

/**
 * Fetch Wikipedia article content from URL
 */
async function fetchWikipediaArticle(articleUrl: string, toolExecutor: ToolExecutor): Promise<{
  articleText: string
  articleTitle: string
} | null> {
  // Extract article title from URL (e.g., "Human_chimerism" from "/wiki/Human_chimerism")
  const extractedTitle = articleUrl.split('/wiki/')[1]
  if (!extractedTitle) {
    logHandler.warn(`Could not extract article title from URL: ${articleUrl}`)
    return null
  }

  // Include redirects=1 to explicitly request redirect information
  const articleApiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${encodeURIComponent(extractedTitle)}&format=json`
  const articleResult = await toolExecutor.execute({
    toolName: 'wget',
    arguments: [articleApiUrl, 30000],
    rawText: `wget("${articleApiUrl}", 30000)`,
  })

  if (!articleResult.success || typeof articleResult.result !== 'string') {
    logHandler.warn(`Failed to fetch Wikipedia article content from ${articleUrl}`)
    return null
  }

  // Check if result is an error message
  const articleResultString = articleResult.result as string
  if (articleResultString.startsWith('Error:')) {
    logHandler.warn(`Wikipedia article fetch failed for ${articleUrl}: ${articleResultString}`)
    return null
  }

  // Parse article content
  let articleText: string | null = null
  let articleTitle: string | null = null
  try {
    const articleData = JSON.parse(articleResultString) as {
      query?: {
        pages?: Record<string, {
          extract?: string
          title?: string
          missing?: boolean
          invalid?: boolean
        }>
        redirects?: Array<{ from: string; to: string }>
      }
    }

    // Check for redirects (for logging/debugging)
    const redirects = articleData.query?.redirects
    if (redirects && redirects.length > 0) {
      logHandler.debug(`Wikipedia redirect: ${redirects.map(r => `${r.from} → ${r.to}`).join(', ')}`)
    }

    const pages = articleData.query?.pages
    if (pages && typeof pages === 'object') {
      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId]
        if (page && typeof page === 'object') {
          if (page.missing || page.invalid) {
            continue
          }

          if (page.title && !articleTitle) {
            articleTitle = page.title
          }

          if ('extract' in page && typeof page.extract === 'string' && page.extract.trim().length > 0) {
            articleText = page.extract
            if (page.title && !articleTitle) {
              articleTitle = page.title
            }
            break
          }
        }
      }
    }
  } catch (error) {
    logHandler.warn(`Failed to parse Wikipedia article content: ${error}`)
    return null
  }

  if (!articleText) {
    logHandler.debug(`No article text found for ${articleUrl}`)
    return null
  }

  return {
    articleText,
    articleTitle: articleTitle || extractedTitle.replace(/_/g, ' '),
  }
}

/**
 * Summarize how the Wikipedia article relates to the seed
 */
async function summarizeReference(
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

Write in a casual, direct style. Get straight to the point. Avoid filler words and phrases like "according to", "provides a", "which technically applies to", "exhibits characteristics", "this reinforces", "this distinction adds important context", etc. 

Instead of: "According to the article, a human chimera is defined as..."
Write: "A human chimera is defined as..."

Instead of: "This reinforces the seed's premise by establishing..."
Write: "The woman is a great example of a human chimera because..."

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

    return result.trim()
  } catch (error) {
    logHandler.error(`Error summarizing reference: ${error}`)
    return null
  }
}

/**
 * Regenerate a Wikipedia sprout by re-fetching the article and regenerating the summary
 */
export async function regenerateWikipediaSprout(
  sproutId: string,
  userId: string
): Promise<WikipediaSproutState> {
  logHandler.debug(`regenerateWikipediaSprout - Regenerating sprout ${sproutId} for user ${userId}`)
  try {
    // 1. Get the sprout and verify ownership
    const sprout = await SproutsService.getById(sproutId)
    if (!sprout) {
      throw new Error('Sprout not found')
    }

    if (sprout.sprout_type !== 'wikipedia_reference') {
      throw new Error('Sprout is not a Wikipedia reference type')
    }

    // Verify sprout belongs to user (via seed ownership)
    const seed = await SeedsService.getById(sprout.seed_id, userId)
    if (!seed) {
      throw new Error('Seed not found or access denied')
    }

    // 2. Get current state
    const currentState = await getWikipediaState(sprout)

    // 3. Get user settings for OpenRouter API key
    const settings = await SettingsService.getByUserId(userId)
    if (!settings.openrouter_api_key) {
      throw new Error('OpenRouter API key not configured')
    }

    // 4. Create OpenRouter client and tool executor
    const openrouterClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )
    const toolExecutor = new ToolExecutor()

    // 5. Create automation context
    const context: AutomationContext = {
      openrouter: openrouterClient,
      userId,
      toolExecutor,
    }

    // 6. Re-fetch the Wikipedia article
    const articleData = await fetchWikipediaArticle(currentState.article_url, toolExecutor)
    if (!articleData) {
      throw new Error('Failed to fetch Wikipedia article')
    }

    // 7. Re-generate the summary
    const newSummary = await summarizeReference(
      seed,
      currentState.reference,
      articleData.articleText,
      currentState.article_url,
      context
    )

    if (!newSummary) {
      throw new Error('Failed to generate summary')
    }

    // 8. Update the sprout with new summary
    return await editWikipediaSummary(sproutId, newSummary)
  } catch (error) {
    logHandler.error(`regenerateWikipediaSprout - Error regenerating sprout ${sproutId}:`, error)
    throw error
  }
}

