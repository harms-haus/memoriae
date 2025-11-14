// Search routes
import { Router, Request, Response, NextFunction } from 'express'
import { SeedsService } from '../services/seeds'
import { authenticate } from '../middleware/auth'
import log from 'loglevel'

const logRoutes = log.getLogger('Routes:Search')
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

    logRoutes.debug(`GET / - Search for user ${userId}`, { q, category, tags })

    // Get all seeds for user
    let seeds = await SeedsService.getByUser(userId)

    // Apply text search filter
    if (q && typeof q === 'string' && q.trim()) {
      const query = q.toLowerCase().trim()
      const beforeCount = seeds.length
      seeds = seeds.filter(seed => {
        const content = (seed.currentState?.seed || '').toLowerCase()
        const tagNames = (seed.currentState?.tags || []).map(t => t.name.toLowerCase()).join(' ')
        const categoryNames = (seed.currentState?.categories || []).map(c => c.name.toLowerCase()).join(' ')
        return content.includes(query) || tagNames.includes(query) || categoryNames.includes(query)
      })
      logRoutes.debug(`GET / - Text search "${query}" filtered ${beforeCount} seeds to ${seeds.length}`)
    }

    // Apply category filter
    if (category && typeof category === 'string') {
      const beforeCount = seeds.length
      seeds = seeds.filter(seed => {
        const seedCategoryIds = (seed.currentState?.categories || []).map(c => c.id)
        return seedCategoryIds.includes(category)
      })
      logRoutes.debug(`GET / - Category filter "${category}" filtered ${beforeCount} seeds to ${seeds.length}`)
    }

    // Apply tag filter
    if (tags && typeof tags === 'string') {
      const tagIds = tags.split(',').map(t => t.trim()).filter(Boolean)
      if (tagIds.length > 0) {
        const beforeCount = seeds.length
        seeds = seeds.filter(seed => {
          const seedTagIds = (seed.currentState?.tags || []).map(t => t.id)
          return tagIds.some(tagId => seedTagIds.includes(tagId))
        })
        logRoutes.debug(`GET / - Tag filter "${tags}" filtered ${beforeCount} seeds to ${seeds.length}`)
      }
    }

    logRoutes.info(`GET / - Search returned ${seeds.length} seeds for user ${userId}`)
    res.json(seeds)
  } catch (error) {
    logRoutes.error(`GET / - Error searching for user ${req.user!.id}:`, error)
    next(error)
  }
})

export default router



