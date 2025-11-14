// Tag routes
import { Router, Request, Response, NextFunction } from 'express'
import { getAllTags, getByName, edit, setColor, getSeedsByTagName } from '../services/tags'
import { authenticate } from '../middleware/auth'
import log from 'loglevel'

const logRoutes = log.getLogger('Routes:Tags')
const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/tags
 * Get all tags
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logRoutes.debug('GET / - Fetching all tags')
    const tags = await getAllTags()
    logRoutes.info(`GET / - Found ${tags.length} tags`)
    res.json(tags)
  } catch (error) {
    logRoutes.error('GET / - Error fetching tags:', error)
    next(error)
  }
})

/**
 * GET /api/tags/:name
 * Get tag by name (case-sensitive) with current state and transactions
 */
router.get('/:name', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.params
    logRoutes.debug(`GET /:name - Fetching tag: ${name}`)
    
    if (!name) {
      logRoutes.warn(`GET /:name - Missing tag name`)
      res.status(400).json({ error: 'Tag name is required' })
      return
    }
    
    // Decode URL-encoded tag name
    const decodedName = decodeURIComponent(name)
    
    const tag = await getByName(decodedName)
    
    if (!tag) {
      logRoutes.warn(`GET /:name - Tag not found: ${decodedName}`)
      res.status(404).json({ error: 'Tag not found' })
      return
    }
    
    logRoutes.info(`GET /:name - Found tag ${tag.id}`)
    res.json(tag)
  } catch (error) {
    logRoutes.error(`GET /:name - Error:`, error)
    next(error)
  }
})

/**
 * GET /api/tags/:name/seeds
 * Get seeds that use this tag (by name, case-sensitive)
 */
router.get('/:name/seeds', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.params
    logRoutes.debug(`GET /:name/seeds - Fetching seeds for tag: ${name}`)
    
    if (!name) {
      logRoutes.warn(`GET /:name/seeds - Missing tag name`)
      res.status(400).json({ error: 'Tag name is required' })
      return
    }
    
    // Decode URL-encoded tag name
    const decodedName = decodeURIComponent(name)
    
    const seeds = await getSeedsByTagName(decodedName)
    logRoutes.info(`GET /:name/seeds - Found ${seeds.length} seeds for tag ${decodedName}`)
    res.json(seeds)
  } catch (error) {
    logRoutes.error(`GET /:name/seeds - Error:`, error)
    next(error)
  }
})

/**
 * PUT /api/tags/:name
 * Update tag (name/color) via transactions (by name, case-sensitive)
 */
router.put('/:name', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name: tagName } = req.params
    const { name, color } = req.body
    
    logRoutes.debug(`PUT /:name - Updating tag: ${tagName}, name: ${name !== undefined}, color: ${color !== undefined}`)
    
    if (!tagName) {
      logRoutes.warn(`PUT /:name - Missing tag name`)
      res.status(400).json({ error: 'Tag name is required' })
      return
    }
    
    // Decode URL-encoded tag name
    const decodedName = decodeURIComponent(tagName)
    
    // Get tag by name to get its ID
    const tag = await getByName(decodedName)
    if (!tag) {
      logRoutes.warn(`PUT /:name - Tag not found: ${decodedName}`)
      res.status(404).json({ error: 'Tag not found' })
      return
    }
    
    let updatedTag
    
    if (name !== undefined && color !== undefined) {
      // Update both name and color
      updatedTag = await edit(tag.id, { name })
      if (color !== null && typeof color === 'string') {
        updatedTag = await setColor(tag.id, color)
      } else {
        updatedTag = await setColor(tag.id, null)
      }
    } else if (name !== undefined) {
      // Update name only
      updatedTag = await edit(tag.id, { name })
    } else if (color !== undefined) {
      // Update color only
      updatedTag = await setColor(tag.id, color)
    } else {
      logRoutes.warn(`PUT /:name - No fields to update for tag ${tag.id}`)
      res.status(400).json({ error: 'No fields to update' })
      return
    }
    
    logRoutes.info(`PUT /:name - Updated tag ${tag.id}`)
    res.json(updatedTag)
  } catch (error) {
    logRoutes.error(`PUT /:name - Error:`, error)
    next(error)
  }
})

export default router

