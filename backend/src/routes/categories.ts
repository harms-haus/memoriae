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
 * Get all categories (hierarchical)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logRoutes.debug('GET / - Fetching all categories')
    const categories = await getAllCategories()
    logRoutes.info(`GET / - Found ${categories.length} categories`)
    res.json(categories)
  } catch (error) {
    logRoutes.error('GET / - Error fetching categories:', error)
    next(error)
  }
})

export default router

