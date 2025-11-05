// Category routes
import { Router, Request, Response, NextFunction } from 'express'
import { getAllCategories } from '../services/categories'
import { authenticate } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/categories
 * Get all categories (hierarchical)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await getAllCategories()
    res.json(categories)
  } catch (error) {
    next(error)
  }
})

export default router

