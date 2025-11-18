// Idea musings routes
import { Router, Request, Response, NextFunction } from 'express'
import { IdeaMusingsService } from '../services/idea-musings'
import { SeedsService } from '../services/seeds'
import { SeedTransactionsService } from '../services/seed-transactions'
import { SettingsService } from '../services/settings'
import { createOpenRouterClient } from '../services/openrouter/client'
import { TrackedOpenRouterClient } from '../services/openrouter/tracked-client'
import { IdeaMusingAutomation } from '../services/automation/idea-musing'
import { authenticate } from '../middleware/auth'
import db from '../db/connection'
import log from 'loglevel'

const logRoutes = log.getLogger('Routes:IdeaMusings')
const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/idea-musings
 * Get today's musings for authenticated user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    logRoutes.debug(`GET / - Fetching daily musings for user ${userId}`)
    const musings = await IdeaMusingsService.getDailyMusings(userId)
    logRoutes.info(`GET / - Found ${musings.length} musings for user ${userId}`)
    res.json(musings)
  } catch (error: any) {
    // Handle case where table doesn't exist yet
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      logRoutes.debug(`GET / - Table doesn't exist yet, returning empty array`)
      res.json([])
      return
    }
    logRoutes.error(`GET / - Error fetching musings for user ${req.user!.id}:`, error)
    next(error)
  }
})

/**
 * POST /api/idea-musings/generate
 * Manually trigger musing generation for the authenticated user
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    
    logRoutes.info(`POST /generate - Generating musings for user ${userId}`)
    
    // Get user settings (for API key)
    const settings = await SettingsService.getByUserId(userId)
    
    if (!settings.openrouter_api_key) {
      logRoutes.warn(`POST /generate - No OpenRouter API key for user ${userId}`)
      res.status(400).json({ error: 'OpenRouter API key not configured' })
      return
    }

    // Get all seeds for user
    const allSeeds = await SeedsService.getByUser(userId)
    
    if (allSeeds.length === 0) {
      logRoutes.warn(`POST /generate - No seeds found for user ${userId}`)
      res.status(400).json({ error: 'No seeds found. Create some seeds first.' })
      return
    }

    // Get seeds that were shown in last N days
    const excludeDays = 2
    let excludedSeedIds: Set<string>
    try {
      excludedSeedIds = await IdeaMusingsService.getSeedsShownInLastDays(excludeDays)
    } catch (error: any) {
      // If table doesn't exist, no seeds are excluded
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        excludedSeedIds = new Set()
      } else {
        throw error
      }
    }

    // Filter out excluded seeds
    const candidateSeeds = allSeeds.filter(seed => !excludedSeedIds.has(seed.id))

    if (candidateSeeds.length === 0) {
      logRoutes.warn(`POST /generate - All seeds shown recently for user ${userId}`)
      res.status(400).json({ error: 'All seeds have been shown recently. Try again tomorrow.' })
      return
    }

    // Create OpenRouter client
    const baseClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )

    // Wrap with tracking
    const openrouterClient = new TrackedOpenRouterClient(baseClient, {
      userId,
      automationName: 'idea-musings-manual',
    })

    // Create tool executor
    const { ToolExecutor } = await import('../services/automation/tools/executor')
    const toolExecutor = new ToolExecutor()

    // Create automation context
    const context = {
      openrouter: openrouterClient,
      userId,
      toolExecutor,
    }

    // Get automation
    const automation = new IdeaMusingAutomation()

    // Identify idea seeds
    logRoutes.debug(`POST /generate - Identifying idea seeds from ${candidateSeeds.length} candidates`)
    const ideaSeeds = await automation.identifyIdeaSeeds(candidateSeeds, context)

    if (ideaSeeds.length === 0) {
      logRoutes.info(`POST /generate - No idea seeds found for user ${userId}`)
      res.json({ message: 'No idea seeds found. Try creating more creative/exploratory seeds.', musingsCreated: 0 })
      return
    }

    // Limit to max musings per day
    const maxMusings = 10
    const seedsToProcess = ideaSeeds.slice(0, maxMusings)

    logRoutes.info(`POST /generate - Processing ${seedsToProcess.length} idea seeds for user ${userId}`)

    // Generate musings for each seed
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    let musingsCreated = 0
    for (const seed of seedsToProcess) {
      try {
        const musing = await automation.generateMusing(seed, context)
        
        if (musing) {
          const { createMusingSprout } = await import('../services/sprouts/musing-sprout')
          const { SeedTransactionsService } = await import('../services/seed-transactions')
          
          // Create musing sprout
          const sprout = await createMusingSprout(
            seed.id,
            musing.templateType,
            musing.content,
            null // Manual generation, no automation_id
          )
          
          // Create add_sprout transaction on the seed
          await SeedTransactionsService.create({
            seed_id: seed.id,
            transaction_type: 'add_sprout',
            transaction_data: {
              sprout_id: sprout.id,
            },
            automation_id: null,
          })
          
          // Record shown (keep for backward compatibility)
          await IdeaMusingsService.recordShown(seed.id, today).catch(() => {
            // Ignore errors if table doesn't exist
          })
          
          musingsCreated++
          logRoutes.debug(`POST /generate - Created musing sprout for seed ${seed.id} (template: ${musing.templateType})`)
        }
      } catch (error) {
        logRoutes.error(`POST /generate - Error generating musing for seed ${seed.id}:`, error)
        // Continue with next seed
      }
    }

    logRoutes.info(`POST /generate - Generated ${musingsCreated} musings for user ${userId}`)
    res.json({ message: `Generated ${musingsCreated} musings`, musingsCreated })
  } catch (error: any) {
    // Handle case where table doesn't exist yet
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      logRoutes.error(`POST /generate - Database tables not set up for user ${req.user!.id}`)
      res.status(500).json({ error: 'Database tables not set up. Please run migrations first.' })
      return
    }
    logRoutes.error(`POST /generate - Error for user ${req.user!.id}:`, error)
    next(error)
  }
})

/**
 * GET /api/idea-musings/seed/:seedId
 * Get musings for a specific seed
 */
router.get('/seed/:seedId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { seedId } = req.params

    logRoutes.debug(`GET /seed/:seedId - Fetching musings for seed ${seedId}`)

    if (!seedId) {
      logRoutes.warn(`GET /seed/:seedId - Missing seedId`)
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(seedId, userId)
    if (!seed) {
      logRoutes.warn(`GET /seed/:seedId - Seed not found or access denied: ${seedId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const musings = await IdeaMusingsService.getBySeedId(seedId)
    logRoutes.info(`GET /seed/:seedId - Found ${musings.length} musings for seed ${seedId}`)
    res.json(musings)
  } catch (error) {
    logRoutes.error(`GET /seed/:seedId - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/idea-musings/:id/dismiss
 * Dismiss a musing
 */
router.post('/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { id } = req.params

    logRoutes.debug(`POST /:id/dismiss - Dismissing musing ${id} for user ${userId}`)

    if (!id) {
      logRoutes.warn(`POST /:id/dismiss - Missing musing ID`)
      res.status(400).json({ error: 'Musing ID is required' })
      return
    }

    try {
      const musing = await IdeaMusingsService.dismiss(id, userId)
      logRoutes.info(`POST /:id/dismiss - Dismissed musing ${id} for user ${userId}`)
      res.json(musing)
    } catch (error: any) {
      if (error.message === 'Musing not found' || error.message === 'Musing does not belong to user') {
        logRoutes.warn(`POST /:id/dismiss - Musing not found or access denied: ${id}`)
        res.status(404).json({ error: 'Musing not found' })
        return
      }
      throw error
    }
  } catch (error) {
    logRoutes.error(`POST /:id/dismiss - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/idea-musings/:id/regenerate
 * Regenerate a musing
 */
router.post('/:id/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { id } = req.params

    logRoutes.info(`POST /:id/regenerate - Regenerating musing ${id} for user ${userId}`)

    if (!id) {
      logRoutes.warn(`POST /:id/regenerate - Missing musing ID`)
      res.status(400).json({ error: 'Musing ID is required' })
      return
    }

    // Get musing
    const musing = await IdeaMusingsService.getById(id)
    if (!musing) {
      logRoutes.warn(`POST /:id/regenerate - Musing not found: ${id}`)
      res.status(404).json({ error: 'Musing not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(musing.seed_id, userId)
    if (!seed) {
      logRoutes.warn(`POST /:id/regenerate - Seed not found or access denied: ${musing.seed_id}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get user settings
    const settings = await SettingsService.getByUserId(userId)
    if (!settings.openrouter_api_key) {
      logRoutes.warn(`POST /:id/regenerate - No OpenRouter API key for user ${userId}`)
      res.status(400).json({ error: 'OpenRouter API key not configured' })
      return
    }

    // Create OpenRouter client
    const baseClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )

    // Wrap with tracking
    const openrouterClient = new TrackedOpenRouterClient(baseClient, {
      userId,
      automationName: 'idea-musings-manual',
    })

    // Create tool executor
    const { ToolExecutor } = await import('../services/automation/tools/executor')
    const toolExecutor = new ToolExecutor()

    // Create automation context
    const context = {
      openrouter: openrouterClient,
      userId,
      toolExecutor,
    }

    // Get automation
    const automation = new IdeaMusingAutomation()

    // Generate new musing
    logRoutes.debug(`POST /:id/regenerate - Generating new musing for seed ${seed.id}`)
    const newMusing = await automation.generateMusing(seed, context)
    if (!newMusing) {
      logRoutes.error(`POST /:id/regenerate - Failed to generate musing for seed ${seed.id}`)
      res.status(500).json({ error: 'Failed to generate musing' })
      return
    }

    // Delete old musing and create new one
    await db('idea_musings').where({ id: musing.id }).delete()
    const regenerated = await IdeaMusingsService.create(
      seed.id,
      newMusing.templateType,
      newMusing.content
    )

    logRoutes.info(`POST /:id/regenerate - Regenerated musing ${id} for seed ${seed.id}`)
    res.json(regenerated)
  } catch (error) {
    logRoutes.error(`POST /:id/regenerate - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/idea-musings/:id/apply-idea
 * Apply an idea from numbered list (returns preview, or applies if confirm=true)
 */
router.post('/:id/apply-idea', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const { ideaIndex, confirm } = req.body

    logRoutes.debug(`POST /:id/apply-idea - musing: ${id}, ideaIndex: ${ideaIndex}, confirm: ${confirm}`)

    if (!id) {
      logRoutes.warn(`POST /:id/apply-idea - Missing musing ID`)
      res.status(400).json({ error: 'Musing ID is required' })
      return
    }

    if (ideaIndex === undefined || typeof ideaIndex !== 'number') {
      logRoutes.warn(`POST /:id/apply-idea - Invalid ideaIndex`)
      res.status(400).json({ error: 'ideaIndex is required and must be a number' })
      return
    }

    // Get musing
    const musing = await IdeaMusingsService.getById(id)
    if (!musing) {
      logRoutes.warn(`POST /:id/apply-idea - Musing not found: ${id}`)
      res.status(404).json({ error: 'Musing not found' })
      return
    }

    // Verify template type
    if (musing.template_type !== 'numbered_ideas') {
      logRoutes.warn(`POST /:id/apply-idea - Invalid template type: ${musing.template_type}`)
      res.status(400).json({ error: 'Musing is not a numbered_ideas template' })
      return
    }

    const content = musing.content as { ideas: string[] }
    if (!content.ideas || !Array.isArray(content.ideas)) {
      logRoutes.warn(`POST /:id/apply-idea - Invalid musing content structure`)
      res.status(400).json({ error: 'Invalid musing content' })
      return
    }

    if (ideaIndex < 0 || ideaIndex >= content.ideas.length) {
      logRoutes.warn(`POST /:id/apply-idea - Invalid idea index: ${ideaIndex}`)
      res.status(400).json({ error: 'Invalid idea index' })
      return
    }

    const idea = content.ideas[ideaIndex]

    // Verify seed ownership
    const seed = await SeedsService.getById(musing.seed_id, userId)
    if (!seed) {
      logRoutes.warn(`POST /:id/apply-idea - Seed not found or access denied: ${musing.seed_id}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get user settings
    const settings = await SettingsService.getByUserId(userId)
    if (!settings.openrouter_api_key) {
      logRoutes.warn(`POST /:id/apply-idea - No OpenRouter API key for user ${userId}`)
      res.status(400).json({ error: 'OpenRouter API key not configured' })
      return
    }

    // Create OpenRouter client
    const baseClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )

    // Wrap with tracking
    const openrouterClient = new TrackedOpenRouterClient(baseClient, {
      userId,
      automationName: 'idea-musings-manual',
    })

    // Generate combined content
    const systemPrompt = `You are a content editor. Combine the given idea with the existing seed content while preserving the seed's current format and style.

The seed content should be enhanced with the idea, not replaced. Keep the original tone and structure as much as possible.

Return ONLY the combined content, no explanation or metadata.`

    const userPrompt = `Seed content:
${seed.currentState.seed}

Idea to incorporate:
${idea}

Combine them while keeping the seed's format and style.`

    try {
      logRoutes.debug(`POST /:id/apply-idea - Calling OpenRouter to combine idea with seed content`)
      const response = await openrouterClient.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.5,
          max_tokens: 2000,
        }
      )

      const message = response.choices[0]?.message
      if (!message) {
        throw new Error('OpenRouter response has no message')
      }

      const newContent = message.content?.trim() || ''

      // If confirm is true, create transaction and mark musing as complete
      if (confirm === true) {
        await SeedTransactionsService.create({
          seed_id: seed.id,
          transaction_type: 'edit_content',
          transaction_data: {
            content: newContent,
          },
          automation_id: null,
        })

        // Mark musing as complete
        await IdeaMusingsService.markComplete(id, userId)

        logRoutes.info(`POST /:id/apply-idea - Applied idea ${ideaIndex} to seed ${seed.id}, marked musing ${id} as complete`)
        res.json({ applied: true, content: newContent })
      } else {
        // Return preview
        logRoutes.debug(`POST /:id/apply-idea - Returning preview for idea ${ideaIndex}`)
        res.json({ preview: newContent })
      }
    } catch (error) {
      logRoutes.error(`POST /:id/apply-idea - Error applying idea for musing ${id}:`, error)
      res.status(500).json({ error: 'Failed to apply idea' })
    }
  } catch (error) {
    logRoutes.error(`POST /:id/apply-idea - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/idea-musings/:id/prompt-llm
 * Send custom prompt to LLM (returns preview, or applies if confirm=true)
 */
router.post('/:id/prompt-llm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const { prompt, confirm } = req.body

    logRoutes.debug(`POST /:id/prompt-llm - musing: ${id}, prompt length: ${prompt?.length || 0}, confirm: ${confirm}`)

    if (!id) {
      logRoutes.warn(`POST /:id/prompt-llm - Missing musing ID`)
      res.status(400).json({ error: 'Musing ID is required' })
      return
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      logRoutes.warn(`POST /:id/prompt-llm - Invalid prompt`)
      res.status(400).json({ error: 'prompt is required and must be a non-empty string' })
      return
    }

    // Get musing
    const musing = await IdeaMusingsService.getById(id)
    if (!musing) {
      logRoutes.warn(`POST /:id/prompt-llm - Musing not found: ${id}`)
      res.status(404).json({ error: 'Musing not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(musing.seed_id, userId)
    if (!seed) {
      logRoutes.warn(`POST /:id/prompt-llm - Seed not found or access denied: ${musing.seed_id}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get user settings
    const settings = await SettingsService.getByUserId(userId)
    if (!settings.openrouter_api_key) {
      logRoutes.warn(`POST /:id/prompt-llm - No OpenRouter API key for user ${userId}`)
      res.status(400).json({ error: 'OpenRouter API key not configured' })
      return
    }

    // Create OpenRouter client
    const baseClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )

    // Wrap with tracking
    const openrouterClient = new TrackedOpenRouterClient(baseClient, {
      userId,
      automationName: 'idea-musings-manual',
    })

    // Send prompt to LLM with seed context
    const systemPrompt = `You are a creative assistant. Respond to the user's prompt while considering the seed content provided.

Return ONLY your response, no explanation or metadata.`

    const userPrompt = `Seed content:
${seed.currentState.seed}

User prompt:
${prompt.trim()}

Respond to the prompt considering the seed content.`

    try {
      logRoutes.debug(`POST /:id/prompt-llm - Calling OpenRouter with custom prompt`)
      const response = await openrouterClient.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.7,
          max_tokens: 2000,
        }
      )

      const message = response.choices[0]?.message
      if (!message) {
        throw new Error('OpenRouter response has no message')
      }

      const llmResponse = message.content?.trim() || ''

      // If confirm is true, create transaction with combined content and mark musing as complete
      if (confirm === true) {
        // Combine seed content with LLM response
        const combinedContent = `${seed.currentState.seed}\n\n${llmResponse}`

        await SeedTransactionsService.create({
          seed_id: seed.id,
          transaction_type: 'edit_content',
          transaction_data: {
            content: combinedContent,
          },
          automation_id: null,
        })

        // Mark musing as complete
        await IdeaMusingsService.markComplete(id, userId)

        logRoutes.info(`POST /:id/prompt-llm - Applied LLM response to seed ${seed.id}, marked musing ${id} as complete`)
        res.json({ applied: true, content: combinedContent })
      } else {
        // Return preview
        logRoutes.debug(`POST /:id/prompt-llm - Returning preview`)
        res.json({ preview: llmResponse })
      }
    } catch (error) {
      logRoutes.error(`POST /:id/prompt-llm - Error prompting LLM for musing ${id}:`, error)
      res.status(500).json({ error: 'Failed to process prompt' })
    }
  } catch (error) {
    logRoutes.error(`POST /:id/prompt-llm - Error:`, error)
    next(error)
  }
})

export default router

