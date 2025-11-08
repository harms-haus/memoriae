// Tag routes
import { Router, Request, Response, NextFunction } from 'express'
import { getAllTags, getById, getByName, edit, setColor, getSeedsByTagId, getSeedsByTagName } from '../services/tags'
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

/**
 * GET /api/tags/:name
 * Get tag by name (case-sensitive) with current state and transactions
 */
router.get('/:name', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.params
    if (!name) {
      res.status(400).json({ error: 'Tag name is required' })
      return
    }
    
    // Decode URL-encoded tag name
    const decodedName = decodeURIComponent(name)
    
    const tag = await getByName(decodedName)
    
    if (!tag) {
      res.status(404).json({ error: 'Tag not found' })
      return
    }
    
    res.json(tag)
  } catch (error) {
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
    if (!name) {
      res.status(400).json({ error: 'Tag name is required' })
      return
    }
    
    // Decode URL-encoded tag name
    const decodedName = decodeURIComponent(name)
    
    const seeds = await getSeedsByTagName(decodedName)
    res.json(seeds)
  } catch (error) {
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
    if (!tagName) {
      res.status(400).json({ error: 'Tag name is required' })
      return
    }
    
    // Decode URL-encoded tag name
    const decodedName = decodeURIComponent(tagName)
    
    // Get tag by name to get its ID
    const tag = await getByName(decodedName)
    if (!tag) {
      res.status(404).json({ error: 'Tag not found' })
      return
    }
    
    const { name, color } = req.body
    
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
      res.status(400).json({ error: 'No fields to update' })
      return
    }
    
    res.json(updatedTag)
  } catch (error) {
    next(error)
  }
})

export default router

