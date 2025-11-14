// Followup routes
import { Router, Request, Response, NextFunction } from 'express'
import { FollowupService } from '../services/followups'
import { SeedsService } from '../services/seeds'
import { authenticate } from '../middleware/auth'
import type { CreateFollowupDto, EditFollowupDto } from '../types/followups'

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

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const followups = await FollowupService.getBySeedId(seed.id)
    res.json(followups)
  } catch (error) {
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

    if (!seedId) {
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
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const followups = await FollowupService.getBySeedId(seed.id)
    res.json(followups)
  } catch (error) {
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

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Validate input
    if (!due_time || typeof due_time !== 'string') {
      res.status(400).json({ error: 'due_time is required and must be a string (ISO format)' })
      return
    }

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required and must be a string' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Validate due_time is a valid date
    const dueDate = new Date(due_time)
    if (isNaN(dueDate.getTime())) {
      res.status(400).json({ error: 'due_time must be a valid ISO date string' })
      return
    }

    const createData: CreateFollowupDto = {
      due_time,
      message: message.trim(),
    }

    const followup = await FollowupService.create(seed.id, createData, 'manual')
    res.status(201).json(followup)
  } catch (error) {
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

    if (!seedId) {
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    // Validate input
    if (!due_time || typeof due_time !== 'string') {
      res.status(400).json({ error: 'due_time is required and must be a string (ISO format)' })
      return
    }

    if (!message || typeof message !== 'string') {
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
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Validate due_time is a valid date
    const dueDate = new Date(due_time)
    if (isNaN(dueDate.getTime())) {
      res.status(400).json({ error: 'due_time must be a valid ISO date string' })
      return
    }

    const createData: CreateFollowupDto = {
      due_time,
      message: message.trim(),
    }

    const followup = await FollowupService.create(seed.id, createData, 'manual')
    res.status(201).json(followup)
  } catch (error) {
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

    if (!followupId) {
      res.status(400).json({ error: 'Followup ID is required' })
      return
    }

    // Get followup and verify ownership
    const followup = await FollowupService.getById(followupId)
    if (!followup) {
      res.status(404).json({ error: 'Followup not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(followup.seed_id, userId)
    if (!seed) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Validate input
    const editData: EditFollowupDto = {}
    if (due_time !== undefined) {
      if (typeof due_time !== 'string') {
        res.status(400).json({ error: 'due_time must be a string (ISO format)' })
        return
      }
      const dueDate = new Date(due_time)
      if (isNaN(dueDate.getTime())) {
        res.status(400).json({ error: 'due_time must be a valid ISO date string' })
        return
      }
      editData.due_time = due_time
    }

    if (message !== undefined) {
      if (typeof message !== 'string') {
        res.status(400).json({ error: 'message must be a string' })
        return
      }
      editData.message = message.trim()
    }

    if (Object.keys(editData).length === 0) {
      res.status(400).json({ error: 'At least one field (due_time or message) must be provided' })
      return
    }

    const updated = await FollowupService.edit(followupId, editData)
    res.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot edit dismissed followup') {
      res.status(400).json({ error: error.message })
      return
    }
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

    if (!followupId) {
      res.status(400).json({ error: 'Followup ID is required' })
      return
    }

    // Get followup and verify ownership
    const followup = await FollowupService.getById(followupId)
    if (!followup) {
      res.status(404).json({ error: 'Followup not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(followup.seed_id, userId)
    if (!seed) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Validate input
    if (duration_minutes === undefined || typeof duration_minutes !== 'number') {
      res.status(400).json({ error: 'duration_minutes is required and must be a number' })
      return
    }

    if (duration_minutes <= 0) {
      res.status(400).json({ error: 'duration_minutes must be greater than 0' })
      return
    }

    const updated = await FollowupService.snooze(followupId, duration_minutes, 'manual')
    res.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot snooze dismissed followup') {
      res.status(400).json({ error: error.message })
      return
    }
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

    if (!followupId) {
      res.status(400).json({ error: 'Followup ID is required' })
      return
    }

    // Get followup and verify ownership
    const followup = await FollowupService.getById(followupId)
    if (!followup) {
      res.status(404).json({ error: 'Followup not found' })
      return
    }

    // Verify seed ownership
    const seed = await SeedsService.getById(followup.seed_id, userId)
    if (!seed) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Validate input
    if (!type || (type !== 'followup' && type !== 'snooze')) {
      res.status(400).json({ error: 'type is required and must be "followup" or "snooze"' })
      return
    }

    const updated = await FollowupService.dismiss(followupId, type)
    res.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Followup already dismissed') {
      res.status(400).json({ error: error.message })
      return
    }
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
    const dueFollowups = await FollowupService.getDueFollowups(userId)
    res.json(dueFollowups)
  } catch (error) {
    next(error)
  }
})

export default router

