// Search routes
import { Router, Request, Response, NextFunction } from 'express'
import { SeedsService } from '../services/seeds'
import { authenticate } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/search
 * Full-text search across seeds, tags, and categories
 * Query parameters:
 *   - q: search query string
 *   - category: filter by category ID (optional)
 *   - tags: comma-separated tag IDs (optional)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { q, category, tags } = req.query

    // Get all seeds for user
    let seeds = await SeedsService.getByUser(userId)

    // Apply text search filter
    if (q && typeof q === 'string' && q.trim()) {
      const query = q.toLowerCase().trim()
      seeds = seeds.filter(seed => {
        const content = (seed.currentState?.seed || seed.seed_content).toLowerCase()
        const tagNames = (seed.currentState?.tags || []).map(t => t.name.toLowerCase()).join(' ')
        const categoryNames = (seed.currentState?.categories || []).map(c => c.name.toLowerCase()).join(' ')
        return content.includes(query) || tagNames.includes(query) || categoryNames.includes(query)
      })
    }

    // Apply category filter
    if (category && typeof category === 'string') {
      seeds = seeds.filter(seed => {
        const seedCategoryIds = (seed.currentState?.categories || []).map(c => c.id)
        return seedCategoryIds.includes(category)
      })
    }

    // Apply tag filter
    if (tags && typeof tags === 'string') {
      const tagIds = tags.split(',').map(t => t.trim()).filter(Boolean)
      if (tagIds.length > 0) {
        seeds = seeds.filter(seed => {
          const seedTagIds = (seed.currentState?.tags || []).map(t => t.id)
          return tagIds.some(tagId => seedTagIds.includes(tagId))
        })
      }
    }

    res.json(seeds)
  } catch (error) {
    next(error)
  }
})

export default router



