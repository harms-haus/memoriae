// Tag routes
import { Router, Request, Response, NextFunction } from 'express'
import { getAllTags, getById, edit, setColor, getSeedsByTagId } from '../services/tags'
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
 * GET /api/tags/:id
 * Get tag with current state and transactions
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params
    if (!id) {
      res.status(400).json({ error: 'Tag ID is required' })
      return
    }
    
    const tag = await getById(id)
    
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
 * GET /api/tags/:id/seeds
 * Get seeds that use this tag
 */
router.get('/:id/seeds', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params
    if (!id) {
      res.status(400).json({ error: 'Tag ID is required' })
      return
    }
    
    const seeds = await getSeedsByTagId(id)
    res.json(seeds)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/tags/:id
 * Update tag (name/color) via transactions
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params
    if (!id) {
      res.status(400).json({ error: 'Tag ID is required' })
      return
    }
    
    const { name, color } = req.body
    
    let updatedTag
    
    if (name !== undefined && color !== undefined) {
      // Update both name and color
      updatedTag = await edit(id, { name })
      if (color !== null && typeof color === 'string') {
        updatedTag = await setColor(id, color)
      } else {
        updatedTag = await setColor(id, null)
      }
    } else if (name !== undefined) {
      // Update name only
      updatedTag = await edit(id, { name })
    } else if (color !== undefined) {
      // Update color only
      updatedTag = await setColor(id, color)
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

