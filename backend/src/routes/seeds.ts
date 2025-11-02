// Seed CRUD routes
import { Router, Request, Response, NextFunction } from 'express'
import { SeedsService } from '../services/seeds'
import { authenticate } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/seeds
 * Get all seeds for the authenticated user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const seeds = await SeedsService.getByUser(userId)
    res.json(seeds)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/seeds/:id
 * Get a single seed by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { id } = req.params

    if (!id) {
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    const seed = await SeedsService.getById(id, userId)

    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    res.json(seed)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/seeds
 * Create a new seed
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { content } = req.body

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required and must be a string' })
      return
    }

    const seed = await SeedsService.create(userId, { content })
    res.status(201).json(seed)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/seeds/:id
 * Update a seed
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const { content } = req.body

    if (!id) {
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    const updateData: { content?: string } = {}
    if (content !== undefined) {
      if (typeof content !== 'string') {
        res.status(400).json({ error: 'Content must be a string' })
        return
      }
      updateData.content = content
    }

    const seed = await SeedsService.update(id, userId, updateData)

    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    res.json(seed)
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/seeds/:id
 * Delete a seed
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { id } = req.params

    if (!id) {
      res.status(400).json({ error: 'Seed ID is required' })
      return
    }

    const deleted = await SeedsService.delete(id, userId)

    if (!deleted) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
