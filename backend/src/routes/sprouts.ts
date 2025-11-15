// Sprout routes
import { Router, Request, Response, NextFunction } from 'express'
import { SproutsService } from '../services/sprouts'
import { SeedsService } from '../services/seeds'
import { authenticate } from '../middleware/auth'
import * as followupHandler from '../services/sprouts/followup-sprout'
import * as musingHandler from '../services/sprouts/musing-sprout'
import * as wikipediaHandler from '../services/sprouts/wikipedia-sprout'
import { SeedTransactionsService } from '../services/seed-transactions'
import type {
  EditFollowupSproutDto,
  SnoozeFollowupSproutDto,
  DismissFollowupSproutDto,
} from '../types/sprouts'
import log from 'loglevel'

const logRoutes = log.getLogger('Routes:Sprouts')
const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/seeds/:hashId/:slug/sprouts
 * Get all sprouts for a seed by hashId with slug hint
 */
router.get('/seeds/:hashId/:slug/sprouts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hashId, slug } = req.params
    const userId = req.user!.id

    logRoutes.debug(`GET /seeds/:hashId/:slug/sprouts - hashId: ${hashId}, slug: ${slug}`)

    if (!hashId) {
      logRoutes.warn(`GET /seeds/:hashId/:slug/sprouts - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`GET /seeds/:hashId/:slug/sprouts - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const sprouts = await SproutsService.getBySeedId(seed.id)
    logRoutes.info(`GET /seeds/:hashId/:slug/sprouts - Found ${sprouts.length} sprouts for seed ${seed.id}`)
    res.json(sprouts)
  } catch (error) {
    logRoutes.error(`GET /seeds/:hashId/:slug/sprouts - Error:`, error)
    next(error)
  }
})

/**
 * GET /api/seeds/:seedId/sprouts
 * Get all sprouts for a seed
 * Supports both hashId and full UUID (backward compatibility)
 */
router.get('/seeds/:seedId/sprouts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { seedId } = req.params

    logRoutes.debug(`GET /seeds/:seedId/sprouts - seedId: ${seedId}`)

    if (!seedId) {
      logRoutes.warn(`GET /seeds/:seedId/sprouts - Missing seedId`)
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    // Check if it's a full UUID (36 chars) - backward compatibility
    let seed
    if (seedId.length === 36) {
      seed = await SeedsService.getById(seedId, userId)
    } else {
      // Otherwise treat as hashId
      seed = await SeedsService.getByHashId(seedId, userId)
    }

    if (!seed) {
      logRoutes.warn(`GET /seeds/:seedId/sprouts - Seed not found: ${seedId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const sprouts = await SproutsService.getBySeedId(seed.id)
    logRoutes.info(`GET /seeds/:seedId/sprouts - Found ${sprouts.length} sprouts for seed ${seed.id}`)
    res.json(sprouts)
  } catch (error) {
    logRoutes.error(`GET /seeds/:seedId/sprouts - Error:`, error)
    next(error)
  }
})

/**
 * GET /api/sprouts/:sproutId
 * Get a single sprout by ID
 */
router.get('/sprouts/:sproutId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params

    logRoutes.debug(`GET /sprouts/:sproutId - sproutId: ${sproutId}`)

    if (!sproutId) {
      logRoutes.warn(`GET /sprouts/:sproutId - Missing sproutId`)
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`GET /sprouts/:sproutId - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const sprout = await SproutsService.getById(sproutId)
    if (!sprout) {
      logRoutes.warn(`GET /sprouts/:sproutId - Sprout not found: ${sproutId}`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    logRoutes.info(`GET /sprouts/:sproutId - Found sprout ${sproutId}`)
    res.json(sprout)
  } catch (error) {
    logRoutes.error(`GET /sprouts/:sproutId - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/seeds/:hashId/:slug/sprouts
 * Create a new sprout manually by hashId with slug hint
 */
router.post('/seeds/:hashId/:slug/sprouts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hashId, slug } = req.params
    const userId = req.user!.id
    const { sprout_type, sprout_data } = req.body

    logRoutes.debug(`POST /seeds/:hashId/:slug/sprouts - hashId: ${hashId}, slug: ${slug}, type: ${sprout_type}`)

    if (!hashId) {
      logRoutes.warn(`POST /seeds/:hashId/:slug/sprouts - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    if (!sprout_type || !sprout_data) {
      logRoutes.warn(`POST /seeds/:hashId/:slug/sprouts - Missing sprout_type or sprout_data`)
      res.status(400).json({ error: 'sprout_type and sprout_data are required' })
      return
    }

    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`POST /seeds/:hashId/:slug/sprouts - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const sprout = await SproutsService.create({
      seed_id: seed.id,
      sprout_type,
      sprout_data,
      automation_id: null,
    })

    // Create add_sprout transaction on the seed
    await SeedTransactionsService.create({
      seed_id: seed.id,
      transaction_type: 'add_sprout',
      transaction_data: {
        sprout_id: sprout.id,
      },
      automation_id: null,
    })

    logRoutes.info(`POST /seeds/:hashId/:slug/sprouts - Created sprout ${sprout.id} for seed ${seed.id}`)
    res.status(201).json(sprout)
  } catch (error) {
    logRoutes.error(`POST /seeds/:hashId/:slug/sprouts - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/seeds/:seedId/sprouts
 * Create a new sprout manually
 * Supports both hashId and full UUID (backward compatibility)
 */
router.post('/seeds/:seedId/sprouts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { seedId } = req.params
    const { sprout_type, sprout_data } = req.body

    logRoutes.debug(`POST /seeds/:seedId/sprouts - seedId: ${seedId}, type: ${sprout_type}`)

    if (!seedId) {
      logRoutes.warn(`POST /seeds/:seedId/sprouts - Missing seedId`)
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    if (!sprout_type || !sprout_data) {
      logRoutes.warn(`POST /seeds/:seedId/sprouts - Missing sprout_type or sprout_data`)
      res.status(400).json({ error: 'sprout_type and sprout_data are required' })
      return
    }

    // Check if it's a full UUID (36 chars) - backward compatibility
    let seed
    if (seedId.length === 36) {
      seed = await SeedsService.getById(seedId, userId)
    } else {
      // Otherwise treat as hashId
      seed = await SeedsService.getByHashId(seedId, userId)
    }

    if (!seed) {
      logRoutes.warn(`POST /seeds/:seedId/sprouts - Seed not found: ${seedId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const sprout = await SproutsService.create({
      seed_id: seed.id,
      sprout_type,
      sprout_data,
      automation_id: null,
    })

    // Create add_sprout transaction on the seed
    await SeedTransactionsService.create({
      seed_id: seed.id,
      transaction_type: 'add_sprout',
      transaction_data: {
        sprout_id: sprout.id,
      },
      automation_id: null,
    })

    logRoutes.info(`POST /seeds/:seedId/sprouts - Created sprout ${sprout.id} for seed ${seed.id}`)
    res.status(201).json(sprout)
  } catch (error) {
    logRoutes.error(`POST /seeds/:seedId/sprouts - Error:`, error)
    next(error)
  }
})

/**
 * DELETE /api/sprouts/:sproutId
 * Delete a sprout
 */
router.delete('/sprouts/:sproutId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params

    logRoutes.debug(`DELETE /sprouts/:sproutId - sproutId: ${sproutId}`)

    if (!sproutId) {
      logRoutes.warn(`DELETE /sprouts/:sproutId - Missing sproutId`)
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`DELETE /sprouts/:sproutId - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const deleted = await SproutsService.delete(sproutId)
    if (!deleted) {
      logRoutes.warn(`DELETE /sprouts/:sproutId - Sprout not found: ${sproutId}`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    logRoutes.info(`DELETE /sprouts/:sproutId - Deleted sprout ${sproutId}`)
    res.status(204).send()
  } catch (error) {
    logRoutes.error(`DELETE /sprouts/:sproutId - Error:`, error)
    next(error)
  }
})

// ===== Followup sprout type-specific routes =====

/**
 * PUT /api/sprouts/:sproutId/followup/edit
 * Edit a followup sprout
 */
router.put('/sprouts/:sproutId/followup/edit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params
    const data: EditFollowupSproutDto = req.body

    logRoutes.debug(`PUT /sprouts/:sproutId/followup/edit - sproutId: ${sproutId}`)

    if (!sproutId) {
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`PUT /sprouts/:sproutId/followup/edit - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const state = await followupHandler.editFollowup(sproutId, data)
    logRoutes.info(`PUT /sprouts/:sproutId/followup/edit - Edited sprout ${sproutId}`)
    res.json(state)
  } catch (error: any) {
    if (error.message === 'Sprout not found' || error.message === 'Sprout is not a followup type') {
      res.status(404).json({ error: error.message })
      return
    }
    if (error.message === 'Cannot edit dismissed followup sprout') {
      res.status(400).json({ error: error.message })
      return
    }
    logRoutes.error(`PUT /sprouts/:sproutId/followup/edit - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/sprouts/:sproutId/followup/dismiss
 * Dismiss a followup sprout
 */
router.post('/sprouts/:sproutId/followup/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params
    const data: DismissFollowupSproutDto = req.body

    logRoutes.debug(`POST /sprouts/:sproutId/followup/dismiss - sproutId: ${sproutId}`)

    if (!sproutId) {
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`POST /sprouts/:sproutId/followup/dismiss - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const state = await followupHandler.dismissFollowup(sproutId, data)
    logRoutes.info(`POST /sprouts/:sproutId/followup/dismiss - Dismissed sprout ${sproutId}`)
    res.json(state)
  } catch (error: any) {
    if (error.message === 'Sprout not found' || error.message === 'Sprout is not a followup type') {
      res.status(404).json({ error: error.message })
      return
    }
    logRoutes.error(`POST /sprouts/:sproutId/followup/dismiss - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/sprouts/:sproutId/followup/snooze
 * Snooze a followup sprout
 */
router.post('/sprouts/:sproutId/followup/snooze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params
    const data: SnoozeFollowupSproutDto = req.body

    logRoutes.debug(`POST /sprouts/:sproutId/followup/snooze - sproutId: ${sproutId}`)

    if (!sproutId) {
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    if (!data.duration_minutes || typeof data.duration_minutes !== 'number') {
      logRoutes.warn(`POST /sprouts/:sproutId/followup/snooze - Invalid duration_minutes`)
      res.status(400).json({ error: 'duration_minutes is required and must be a number' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`POST /sprouts/:sproutId/followup/snooze - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const state = await followupHandler.snoozeFollowup(sproutId, data, 'manual')
    logRoutes.info(`POST /sprouts/:sproutId/followup/snooze - Snoozed sprout ${sproutId}`)
    res.json(state)
  } catch (error: any) {
    if (error.message === 'Sprout not found' || error.message === 'Sprout is not a followup type') {
      res.status(404).json({ error: error.message })
      return
    }
    if (error.message === 'Cannot snooze dismissed followup sprout') {
      res.status(400).json({ error: error.message })
      return
    }
    logRoutes.error(`POST /sprouts/:sproutId/followup/snooze - Error:`, error)
    next(error)
  }
})

// ===== Musing sprout type-specific routes =====

/**
 * POST /api/sprouts/:sproutId/musing/dismiss
 * Dismiss a musing sprout
 */
router.post('/sprouts/:sproutId/musing/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params

    logRoutes.debug(`POST /sprouts/:sproutId/musing/dismiss - sproutId: ${sproutId}`)

    if (!sproutId) {
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`POST /sprouts/:sproutId/musing/dismiss - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const sprout = await musingHandler.dismissMusing(sproutId)
    logRoutes.info(`POST /sprouts/:sproutId/musing/dismiss - Dismissed sprout ${sproutId}`)
    // Return sprout with sprout_data properties flattened for convenience
    res.json({
      ...sprout,
      ...(sprout.sprout_data as any),
    })
  } catch (error: any) {
    if (error.message === 'Sprout not found' || error.message === 'Sprout is not a musing type') {
      res.status(404).json({ error: error.message })
      return
    }
    logRoutes.error(`POST /sprouts/:sproutId/musing/dismiss - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/sprouts/:sproutId/musing/complete
 * Complete a musing sprout
 */
router.post('/sprouts/:sproutId/musing/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params

    logRoutes.debug(`POST /sprouts/:sproutId/musing/complete - sproutId: ${sproutId}`)

    if (!sproutId) {
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`POST /sprouts/:sproutId/musing/complete - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const sprout = await musingHandler.completeMusing(sproutId)
    logRoutes.info(`POST /sprouts/:sproutId/musing/complete - Completed sprout ${sproutId}`)
    // Return sprout with sprout_data properties flattened for convenience
    res.json({
      ...sprout,
      ...(sprout.sprout_data as any),
    })
  } catch (error: any) {
    if (error.message === 'Sprout not found' || error.message === 'Sprout is not a musing type') {
      res.status(404).json({ error: error.message })
      return
    }
    logRoutes.error(`POST /sprouts/:sproutId/musing/complete - Error:`, error)
    next(error)
  }
})

// ===== Wikipedia sprout type-specific routes =====

/**
 * GET /api/sprouts/:sproutId/wikipedia
 * Get computed Wikipedia sprout state
 */
router.get('/sprouts/:sproutId/wikipedia', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params

    logRoutes.debug(`GET /sprouts/:sproutId/wikipedia - sproutId: ${sproutId}`)

    if (!sproutId) {
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`GET /sprouts/:sproutId/wikipedia - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const sprout = await SproutsService.getById(sproutId)
    if (!sprout) {
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    if (sprout.sprout_type !== 'wikipedia_reference') {
      res.status(400).json({ error: 'Sprout is not a Wikipedia reference type' })
      return
    }

    const state = await wikipediaHandler.getWikipediaState(sprout)
    logRoutes.info(`GET /sprouts/:sproutId/wikipedia - Retrieved state for sprout ${sproutId}`)
    res.json(state)
  } catch (error: any) {
    if (error.message === 'Sprout not found' || error.message === 'Sprout is not a Wikipedia reference type' || error.message === 'Wikipedia sprout must have a creation transaction') {
      res.status(404).json({ error: error.message })
      return
    }
    logRoutes.error(`GET /sprouts/:sproutId/wikipedia - Error:`, error)
    next(error)
  }
})

/**
 * PUT /api/sprouts/:sproutId/wikipedia
 * Edit a Wikipedia sprout summary
 */
router.put('/sprouts/:sproutId/wikipedia', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params
    const { summary } = req.body

    logRoutes.debug(`PUT /sprouts/:sproutId/wikipedia - sproutId: ${sproutId}`)

    if (!sproutId) {
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    if (!summary || typeof summary !== 'string') {
      res.status(400).json({ error: 'Summary is required and must be a string' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`PUT /sprouts/:sproutId/wikipedia - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const state = await wikipediaHandler.editWikipediaSummary(sproutId, summary)
    logRoutes.info(`PUT /sprouts/:sproutId/wikipedia - Edited sprout ${sproutId}`)
    res.json(state)
  } catch (error: any) {
    if (error.message === 'Sprout not found' || error.message === 'Sprout is not a Wikipedia reference type') {
      res.status(404).json({ error: error.message })
      return
    }
    logRoutes.error(`PUT /sprouts/:sproutId/wikipedia - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/sprouts/:sproutId/wikipedia/regenerate
 * Regenerate a Wikipedia sprout by re-fetching the article and regenerating the summary
 */
router.post('/sprouts/:sproutId/wikipedia/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { sproutId } = req.params

    logRoutes.debug(`POST /sprouts/:sproutId/wikipedia/regenerate - sproutId: ${sproutId}`)

    if (!sproutId) {
      res.status(400).json({ error: 'Sprout ID is required' })
      return
    }

    // Verify sprout belongs to user
    const ownsSprout = await SproutsService.verifySproutOwnership(sproutId, userId)
    if (!ownsSprout) {
      logRoutes.warn(`POST /sprouts/:sproutId/wikipedia/regenerate - Sprout ${sproutId} not found or not owned by user`)
      res.status(404).json({ error: 'Sprout not found' })
      return
    }

    const state = await wikipediaHandler.regenerateWikipediaSprout(sproutId, userId)
    logRoutes.info(`POST /sprouts/:sproutId/wikipedia/regenerate - Regenerated sprout ${sproutId}`)
    res.json(state)
  } catch (error: any) {
    if (error.message === 'Sprout not found' || 
        error.message === 'Sprout is not a Wikipedia reference type' ||
        error.message === 'Seed not found or access denied' ||
        error.message === 'OpenRouter API key not configured' ||
        error.message === 'Failed to fetch Wikipedia article' ||
        error.message === 'Failed to generate summary') {
      res.status(400).json({ error: error.message })
      return
    }
    logRoutes.error(`POST /sprouts/:sproutId/wikipedia/regenerate - Error:`, error)
    next(error)
  }
})

export default router

