// Settings routes
import { Router, Request, Response, NextFunction } from 'express'
import { SettingsService } from '../services/settings'
import { authenticate } from '../middleware/auth'
import { OpenRouterClient } from '../services/openrouter/client'
import { Info } from 'luxon'
import log from 'loglevel'

const logRoutes = log.getLogger('Routes:Settings')
const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/settings
 * Get current user's settings
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    logRoutes.debug(`GET / - Fetching settings for user ${userId}`)
    const settings = await SettingsService.getByUserId(userId)
    logRoutes.info(`GET / - Found settings for user ${userId}`)
    res.json(settings)
  } catch (error) {
    logRoutes.error(`GET / - Error fetching settings for user ${req.user!.id}:`, error)
    next(error)
  }
})

/**
 * PUT /api/settings
 * Update current user's settings
 */
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const updates = req.body as {
      openrouter_api_key?: string | null
      openrouter_model?: string | null
      openrouter_model_name?: string | null
      timezone?: string | null
    }

    logRoutes.debug(`PUT / - Updating settings for user ${userId}`, {
      hasApiKey: updates.openrouter_api_key !== undefined,
      hasModel: updates.openrouter_model !== undefined,
      hasModelName: updates.openrouter_model_name !== undefined,
      hasTimezone: updates.timezone !== undefined,
    })

    // Validate input
    if (updates.openrouter_api_key !== undefined && typeof updates.openrouter_api_key !== 'string' && updates.openrouter_api_key !== null) {
      logRoutes.warn(`PUT / - Invalid openrouter_api_key type for user ${userId}`)
      res.status(400).json({ error: 'openrouter_api_key must be a string or null' })
      return
    }

    if (updates.openrouter_model !== undefined && typeof updates.openrouter_model !== 'string' && updates.openrouter_model !== null) {
      logRoutes.warn(`PUT / - Invalid openrouter_model type for user ${userId}`)
      res.status(400).json({ error: 'openrouter_model must be a string or null' })
      return
    }

    if (updates.openrouter_model_name !== undefined && typeof updates.openrouter_model_name !== 'string' && updates.openrouter_model_name !== null) {
      logRoutes.warn(`PUT / - Invalid openrouter_model_name type for user ${userId}`)
      res.status(400).json({ error: 'openrouter_model_name must be a string or null' })
      return
    }

    if (updates.timezone !== undefined && typeof updates.timezone !== 'string' && updates.timezone !== null) {
      logRoutes.warn(`PUT / - Invalid timezone type for user ${userId}`)
      res.status(400).json({ error: 'timezone must be a string or null' })
      return
    }

    // Validate timezone format if provided (IANA timezone identifier)
    if (updates.timezone !== undefined && updates.timezone !== null) {
      if (!Info.isValidIANAZone(updates.timezone)) {
        logRoutes.warn(`PUT / - Invalid timezone format for user ${userId}: ${updates.timezone}`)
        res.status(400).json({ error: 'Invalid IANA timezone identifier' })
        return
      }
    }

    const settings = await SettingsService.update(userId, updates)
    logRoutes.info(`PUT / - Updated settings for user ${userId}`)
    res.json(settings)
  } catch (error) {
    logRoutes.error(`PUT / - Error updating settings for user ${req.user!.id}:`, error)
    // Ensure error is an Error instance
    if (error instanceof Error) {
      next(error)
    } else {
      next(new Error(String(error)))
    }
  }
})

/**
 * POST /api/settings/models
 * Fetch available models from OpenRouter using provided API key
 */
router.post('/models', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { api_key } = req.body as { api_key?: string }

    logRoutes.debug('POST /models - Fetching OpenRouter models')

    if (!api_key || typeof api_key !== 'string') {
      logRoutes.warn('POST /models - Missing or invalid api_key')
      res.status(400).json({ error: 'api_key is required' })
      return
    }

    // Create OpenRouter client with provided API key
    const client = new OpenRouterClient({
      apiKey: api_key,
    })

    // Fetch models
    const models = await client.getModels()

    // Format response
    const formattedModels = models.map(model => ({
      id: model.id,
      name: model.name || model.id,
    }))

    logRoutes.info(`POST /models - Fetched ${formattedModels.length} models from OpenRouter`)
    res.json({ models: formattedModels })
  } catch (error) {
    logRoutes.error('POST /models - Error fetching OpenRouter models:', error)
    res.status(500).json({ error: 'Failed to fetch models from OpenRouter' })
  }
})

export default router

