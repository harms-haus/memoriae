// Tag routes
import { Router, Request, Response, NextFunction } from 'express'
import { getAllTags } from '../services/tags'
import { authenticate } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/tags
 * Get all tags
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await getAllTags()
    res.json(tags)
  } catch (error) {
    next(error)
  }
})

export default router

