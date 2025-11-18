// Category routes
import { Router, Request, Response, NextFunction } from 'express'
import { getAllCategories } from '../services/categories'
import { authenticate } from '../middleware/auth'
import log from 'loglevel'

const logRoutes = log.getLogger('Routes:Categories')
const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/categories
 * Get all categories for the authenticated user (hierarchical)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    logRoutes.debug(`GET / - Fetching categories for user ${userId}`)
    const categories = await getAllCategories(userId)
    logRoutes.info(`GET / - Found ${categories.length} categories for user ${userId}`)
    res.json(categories)
  } catch (error) {
    logRoutes.error('GET / - Error fetching categories:', error)
    next(error)
  }
})

export default router

