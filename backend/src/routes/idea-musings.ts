// Idea musings routes
import { Router, Request, Response, NextFunction } from 'express'
import { IdeaMusingsService } from '../services/idea-musings'
import { SeedsService } from '../services/seeds'
import { SeedTransactionsService } from '../services/seed-transactions'
import { SettingsService } from '../services/settings'
import { createOpenRouterClient } from '../services/openrouter/client'
import { IdeaMusingAutomation } from '../services/automation/idea-musing'
import { authenticate } from '../middleware/auth'
import db from '../db/connection'

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
    const musings = await IdeaMusingsService.getDailyMusings(userId)
    res.json(musings)
  } catch (error: any) {
    // Handle case where table doesn't exist yet
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      res.json([])
      return
    }
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
    
    // Get user settings (for API key)
    const settings = await SettingsService.getByUserId(userId)
    
    if (!settings.openrouter_api_key) {
      res.status(400).json({ error: 'OpenRouter API key not configured' })
      return
    }

    // Get all seeds for user
    const allSeeds = await SeedsService.getByUser(userId)
    
    if (allSeeds.length === 0) {
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
      res.status(400).json({ error: 'All seeds have been shown recently. Try again tomorrow.' })
      return
    }

    // Create OpenRouter client
    const openrouterClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )

    // Create automation context
    const context = {
      openrouter: openrouterClient,
      userId,
    }

    // Get automation
    const automation = new IdeaMusingAutomation()

    // Identify idea seeds
    const ideaSeeds = await automation.identifyIdeaSeeds(candidateSeeds, context)

    if (ideaSeeds.length === 0) {
      res.json({ message: 'No idea seeds found. Try creating more creative/exploratory seeds.', musingsCreated: 0 })
      return
    }

    // Limit to max musings per day
    const maxMusings = 10
    const seedsToProcess = ideaSeeds.slice(0, maxMusings)

    // Generate musings for each seed
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    let musingsCreated = 0
    for (const seed of seedsToProcess) {
      try {
        const musing = await automation.generateMusing(seed, context)
        
        if (musing) {
          await IdeaMusingsService.create(seed.id, musing.templateType, musing.content)
          await IdeaMusingsService.recordShown(seed.id, today)
          musingsCreated++
        }
      } catch (error) {
        console.error(`Error generating musing for seed ${seed.id}:`, error)
        // Continue with next seed
      }
    }

    res.json({ message: `Generated ${musingsCreated} musings`, musingsCreated })
  } catch (error: any) {
    // Handle case where table doesn't exist yet
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      res.status(500).json({ error: 'Database tables not set up. Please run migrations first.' })
      return
    }
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

    if (!seedId) {
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(seedId, userId)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const musings = await IdeaMusingsService.getBySeedId(seedId)
    res.json(musings)
  } catch (error) {
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

    if (!id) {
      res.status(400).json({ error: 'Musing ID is required' })
      return
    }

    try {
      const musing = await IdeaMusingsService.dismiss(id, userId)
      res.json(musing)
    } catch (error: any) {
      if (error.message === 'Musing not found' || error.message === 'Musing does not belong to user') {
        res.status(404).json({ error: 'Musing not found' })
        return
      }
      throw error
    }
  } catch (error) {
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

    if (!id) {
      res.status(400).json({ error: 'Musing ID is required' })
      return
    }

    // Get musing
    const musing = await IdeaMusingsService.getById(id)
    if (!musing) {
      res.status(404).json({ error: 'Musing not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(musing.seed_id, userId)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get user settings
    const settings = await SettingsService.getByUserId(userId)
    if (!settings.openrouter_api_key) {
      res.status(400).json({ error: 'OpenRouter API key not configured' })
      return
    }

    // Create OpenRouter client
    const openrouterClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )

    // Create automation context
    const context = {
      openrouter: openrouterClient,
      userId,
    }

    // Get automation
    const automation = new IdeaMusingAutomation()

    // Generate new musing
    const newMusing = await automation.generateMusing(seed, context)
    if (!newMusing) {
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

    res.json(regenerated)
  } catch (error) {
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

    if (!id) {
      res.status(400).json({ error: 'Musing ID is required' })
      return
    }

    if (ideaIndex === undefined || typeof ideaIndex !== 'number') {
      res.status(400).json({ error: 'ideaIndex is required and must be a number' })
      return
    }

    // Get musing
    const musing = await IdeaMusingsService.getById(id)
    if (!musing) {
      res.status(404).json({ error: 'Musing not found' })
      return
    }

    // Verify template type
    if (musing.template_type !== 'numbered_ideas') {
      res.status(400).json({ error: 'Musing is not a numbered_ideas template' })
      return
    }

    const content = musing.content as { ideas: string[] }
    if (!content.ideas || !Array.isArray(content.ideas)) {
      res.status(400).json({ error: 'Invalid musing content' })
      return
    }

    if (ideaIndex < 0 || ideaIndex >= content.ideas.length) {
      res.status(400).json({ error: 'Invalid idea index' })
      return
    }

    const idea = content.ideas[ideaIndex]

    // Verify seed ownership
    const seed = await SeedsService.getById(musing.seed_id, userId)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get user settings
    const settings = await SettingsService.getByUserId(userId)
    if (!settings.openrouter_api_key) {
      res.status(400).json({ error: 'OpenRouter API key not configured' })
      return
    }

    // Create OpenRouter client
    const openrouterClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )

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

      // If confirm is true, create transaction
      if (confirm === true) {
        await SeedTransactionsService.create({
          seed_id: seed.id,
          transaction_type: 'edit_content',
          transaction_data: {
            content: newContent,
          },
          automation_id: null,
        })

        res.json({ applied: true, content: newContent })
      } else {
        // Return preview
        res.json({ preview: newContent })
      }
    } catch (error) {
      console.error('Error applying idea:', error)
      res.status(500).json({ error: 'Failed to apply idea' })
    }
  } catch (error) {
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

    if (!id) {
      res.status(400).json({ error: 'Musing ID is required' })
      return
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'prompt is required and must be a non-empty string' })
      return
    }

    // Get musing
    const musing = await IdeaMusingsService.getById(id)
    if (!musing) {
      res.status(404).json({ error: 'Musing not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(musing.seed_id, userId)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get user settings
    const settings = await SettingsService.getByUserId(userId)
    if (!settings.openrouter_api_key) {
      res.status(400).json({ error: 'OpenRouter API key not configured' })
      return
    }

    // Create OpenRouter client
    const openrouterClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model || undefined
    )

    // Send prompt to LLM with seed context
    const systemPrompt = `You are a creative assistant. Respond to the user's prompt while considering the seed content provided.

Return ONLY your response, no explanation or metadata.`

    const userPrompt = `Seed content:
${seed.currentState.seed}

User prompt:
${prompt.trim()}

Respond to the prompt considering the seed content.`

    try {
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

      // If confirm is true, create transaction with combined content
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

        res.json({ applied: true, content: combinedContent })
      } else {
        // Return preview
        res.json({ preview: llmResponse })
      }
    } catch (error) {
      console.error('Error prompting LLM:', error)
      res.status(500).json({ error: 'Failed to process prompt' })
    }
  } catch (error) {
    next(error)
  }
})

export default router

