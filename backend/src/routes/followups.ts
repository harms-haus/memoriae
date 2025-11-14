// Followup routes
import { Router, Request, Response, NextFunction } from 'express'
import { FollowupService } from '../services/followups'
import { SeedsService } from '../services/seeds'
import { authenticate } from '../middleware/auth'
import type { CreateFollowupDto, EditFollowupDto } from '../types/followups'
import log from 'loglevel'

const logRoutes = log.getLogger('Routes:Followups')
const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/seeds/:hashId/:slug/followups
 * Get all followups for a seed by hashId with slug hint
 */
router.get('/seeds/:hashId/:slug/followups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hashId, slug } = req.params
    const userId = req.user!.id

    logRoutes.debug(`GET /seeds/:hashId/:slug/followups - hashId: ${hashId}, slug: ${slug}`)

    if (!hashId) {
      logRoutes.warn(`GET /seeds/:hashId/:slug/followups - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`GET /seeds/:hashId/:slug/followups - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const followups = await FollowupService.getBySeedId(seed.id)
    logRoutes.info(`GET /seeds/:hashId/:slug/followups - Found ${followups.length} followups for seed ${seed.id}`)
    res.json(followups)
  } catch (error) {
    logRoutes.error(`GET /seeds/:hashId/:slug/followups - Error:`, error)
    next(error)
  }
})

/**
 * GET /api/seeds/:seedId/followups
 * Get all followups for a seed
 * Supports both hashId and full UUID (backward compatibility)
 */
router.get('/seeds/:seedId/followups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { seedId } = req.params

    logRoutes.debug(`GET /seeds/:seedId/followups - seedId: ${seedId}`)

    if (!seedId) {
      logRoutes.warn(`GET /seeds/:seedId/followups - Missing seedId`)
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
      logRoutes.warn(`GET /seeds/:seedId/followups - Seed not found: ${seedId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const followups = await FollowupService.getBySeedId(seed.id)
    logRoutes.info(`GET /seeds/:seedId/followups - Found ${followups.length} followups for seed ${seed.id}`)
    res.json(followups)
  } catch (error) {
    logRoutes.error(`GET /seeds/:seedId/followups - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/seeds/:hashId/:slug/followups
 * Create a new followup manually by hashId with slug hint
 */
router.post('/seeds/:hashId/:slug/followups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hashId, slug } = req.params
    const userId = req.user!.id
    const { due_time, message } = req.body

    logRoutes.debug(`POST /seeds/:hashId/:slug/followups - hashId: ${hashId}, slug: ${slug}, due_time: ${due_time}`)

    if (!hashId) {
      logRoutes.warn(`POST /seeds/:hashId/:slug/followups - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Validate input
    if (!due_time || typeof due_time !== 'string') {
      logRoutes.warn(`POST /seeds/:hashId/:slug/followups - Invalid due_time`)
      res.status(400).json({ error: 'due_time is required and must be a string (ISO format)' })
      return
    }

    if (!message || typeof message !== 'string') {
      logRoutes.warn(`POST /seeds/:hashId/:slug/followups - Invalid message`)
      res.status(400).json({ error: 'message is required and must be a string' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`POST /seeds/:hashId/:slug/followups - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Validate due_time is a valid date
    const dueDate = new Date(due_time)
    if (isNaN(dueDate.getTime())) {
      logRoutes.warn(`POST /seeds/:hashId/:slug/followups - Invalid due_time format: ${due_time}`)
      res.status(400).json({ error: 'due_time must be a valid ISO date string' })
      return
    }

    const createData: CreateFollowupDto = {
      due_time,
      message: message.trim(),
    }

    const followup = await FollowupService.create(seed.id, createData, 'manual')
    logRoutes.info(`POST /seeds/:hashId/:slug/followups - Created followup ${followup.id} for seed ${seed.id}`)
    res.status(201).json(followup)
  } catch (error) {
    logRoutes.error(`POST /seeds/:hashId/:slug/followups - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/seeds/:seedId/followups
 * Create a new followup manually
 * Supports both hashId and full UUID (backward compatibility)
 */
router.post('/seeds/:seedId/followups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { seedId } = req.params
    const { due_time, message } = req.body

    logRoutes.debug(`POST /seeds/:seedId/followups - seedId: ${seedId}, due_time: ${due_time}`)

    if (!seedId) {
      logRoutes.warn(`POST /seeds/:seedId/followups - Missing seedId`)
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    // Validate input
    if (!due_time || typeof due_time !== 'string') {
      logRoutes.warn(`POST /seeds/:seedId/followups - Invalid due_time`)
      res.status(400).json({ error: 'due_time is required and must be a string (ISO format)' })
      return
    }

    if (!message || typeof message !== 'string') {
      logRoutes.warn(`POST /seeds/:seedId/followups - Invalid message`)
      res.status(400).json({ error: 'message is required and must be a string' })
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
      logRoutes.warn(`POST /seeds/:seedId/followups - Seed not found: ${seedId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Validate due_time is a valid date
    const dueDate = new Date(due_time)
    if (isNaN(dueDate.getTime())) {
      logRoutes.warn(`POST /seeds/:seedId/followups - Invalid due_time format: ${due_time}`)
      res.status(400).json({ error: 'due_time must be a valid ISO date string' })
      return
    }

    const createData: CreateFollowupDto = {
      due_time,
      message: message.trim(),
    }

    const followup = await FollowupService.create(seed.id, createData, 'manual')
    logRoutes.info(`POST /seeds/:seedId/followups - Created followup ${followup.id} for seed ${seed.id}`)
    res.status(201).json(followup)
  } catch (error) {
    logRoutes.error(`POST /seeds/:seedId/followups - Error:`, error)
    next(error)
  }
})

/**
 * PUT /api/followups/:followupId
 * Edit a followup (time and/or message)
 */
router.put('/followups/:followupId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { followupId } = req.params
    const { due_time, message } = req.body

    logRoutes.debug(`PUT /followups/:followupId - followupId: ${followupId}, hasDueTime: ${due_time !== undefined}, hasMessage: ${message !== undefined}`)

    if (!followupId) {
      logRoutes.warn(`PUT /followups/:followupId - Missing followupId`)
      res.status(400).json({ error: 'Followup ID is required' })
      return
    }

    // Get followup and verify ownership
    const followup = await FollowupService.getById(followupId)
    if (!followup) {
      logRoutes.warn(`PUT /followups/:followupId - Followup not found: ${followupId}`)
      res.status(404).json({ error: 'Followup not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(followup.seed_id, userId)
    if (!seed) {
      logRoutes.warn(`PUT /followups/:followupId - Access denied for followup ${followupId}`)
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Validate input
    const editData: EditFollowupDto = {}
    if (due_time !== undefined) {
      if (typeof due_time !== 'string') {
        logRoutes.warn(`PUT /followups/:followupId - Invalid due_time type`)
        res.status(400).json({ error: 'due_time must be a string (ISO format)' })
        return
      }
      const dueDate = new Date(due_time)
      if (isNaN(dueDate.getTime())) {
        logRoutes.warn(`PUT /followups/:followupId - Invalid due_time format: ${due_time}`)
        res.status(400).json({ error: 'due_time must be a valid ISO date string' })
        return
      }
      editData.due_time = due_time
    }

    if (message !== undefined) {
      if (typeof message !== 'string') {
        logRoutes.warn(`PUT /followups/:followupId - Invalid message type`)
        res.status(400).json({ error: 'message must be a string' })
        return
      }
      editData.message = message.trim()
    }

    if (Object.keys(editData).length === 0) {
      logRoutes.warn(`PUT /followups/:followupId - No fields to update`)
      res.status(400).json({ error: 'At least one field (due_time or message) must be provided' })
      return
    }

    const updated = await FollowupService.edit(followupId, editData)
    logRoutes.info(`PUT /followups/:followupId - Updated followup ${followupId}`)
    res.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot edit dismissed followup') {
      logRoutes.warn(`PUT /followups/:followupId - Cannot edit dismissed followup: ${req.params.followupId}`)
      res.status(400).json({ error: error.message })
      return
    }
    logRoutes.error(`PUT /followups/:followupId - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/followups/:followupId/snooze
 * Snooze a followup
 */
router.post('/followups/:followupId/snooze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { followupId } = req.params
    const { duration_minutes } = req.body

    logRoutes.debug(`POST /followups/:followupId/snooze - followupId: ${followupId}, duration_minutes: ${duration_minutes}`)

    if (!followupId) {
      logRoutes.warn(`POST /followups/:followupId/snooze - Missing followupId`)
      res.status(400).json({ error: 'Followup ID is required' })
      return
    }

    // Get followup and verify ownership
    const followup = await FollowupService.getById(followupId)
    if (!followup) {
      logRoutes.warn(`POST /followups/:followupId/snooze - Followup not found: ${followupId}`)
      res.status(404).json({ error: 'Followup not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(followup.seed_id, userId)
    if (!seed) {
      logRoutes.warn(`POST /followups/:followupId/snooze - Access denied for followup ${followupId}`)
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Validate input
    if (duration_minutes === undefined || typeof duration_minutes !== 'number') {
      logRoutes.warn(`POST /followups/:followupId/snooze - Invalid duration_minutes`)
      res.status(400).json({ error: 'duration_minutes is required and must be a number' })
      return
    }

    if (duration_minutes <= 0) {
      logRoutes.warn(`POST /followups/:followupId/snooze - Invalid duration_minutes value: ${duration_minutes}`)
      res.status(400).json({ error: 'duration_minutes must be greater than 0' })
      return
    }

    const updated = await FollowupService.snooze(followupId, duration_minutes, 'manual')
    logRoutes.info(`POST /followups/:followupId/snooze - Snoozed followup ${followupId} for ${duration_minutes} minutes`)
    res.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot snooze dismissed followup') {
      logRoutes.warn(`POST /followups/:followupId/snooze - Cannot snooze dismissed followup: ${req.params.followupId}`)
      res.status(400).json({ error: error.message })
      return
    }
    logRoutes.error(`POST /followups/:followupId/snooze - Error:`, error)
    next(error)
  }
})

/**
 * POST /api/followups/:followupId/dismiss
 * Dismiss a followup
 */
router.post('/followups/:followupId/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { followupId } = req.params
    const { type } = req.body

    logRoutes.debug(`POST /followups/:followupId/dismiss - followupId: ${followupId}, type: ${type}`)

    if (!followupId) {
      logRoutes.warn(`POST /followups/:followupId/dismiss - Missing followupId`)
      res.status(400).json({ error: 'Followup ID is required' })
      return
    }

    // Get followup and verify ownership
    const followup = await FollowupService.getById(followupId)
    if (!followup) {
      logRoutes.warn(`POST /followups/:followupId/dismiss - Followup not found: ${followupId}`)
      res.status(404).json({ error: 'Followup not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(followup.seed_id, userId)
    if (!seed) {
      logRoutes.warn(`POST /followups/:followupId/dismiss - Access denied for followup ${followupId}`)
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Validate input
    if (!type || (type !== 'followup' && type !== 'snooze')) {
      logRoutes.warn(`POST /followups/:followupId/dismiss - Invalid type: ${type}`)
      res.status(400).json({ error: 'type is required and must be "followup" or "snooze"' })
      return
    }

    const updated = await FollowupService.dismiss(followupId, type)
    logRoutes.info(`POST /followups/:followupId/dismiss - Dismissed followup ${followupId} (type: ${type})`)
    res.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Followup already dismissed') {
      logRoutes.warn(`POST /followups/:followupId/dismiss - Followup already dismissed: ${req.params.followupId}`)
      res.status(400).json({ error: error.message })
      return
    }
    logRoutes.error(`POST /followups/:followupId/dismiss - Error:`, error)
    next(error)
  }
})

/**
 * GET /api/followups/due
 * Get all due followups for the authenticated user
 */
router.get('/followups/due', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    logRoutes.debug(`GET /followups/due - Fetching due followups for user ${userId}`)
    const dueFollowups = await FollowupService.getDueFollowups(userId)
    logRoutes.info(`GET /followups/due - Found ${dueFollowups.length} due followups for user ${userId}`)
    res.json(dueFollowups)
  } catch (error) {
    logRoutes.error(`GET /followups/due - Error fetching due followups for user ${req.user!.id}:`, error)
    next(error)
  }
})

export default router

