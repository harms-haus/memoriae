// Seed CRUD routes
import { Router, Request, Response, NextFunction } from 'express'
import { SeedsService } from '../services/seeds'
import { authenticate } from '../middleware/auth'
import { queueAutomationsForSeed, addAutomationJob, automationQueue } from '../services/queue'
import { AutomationRegistry } from '../services/automation/registry'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * Helper function to resolve seed ID from either UUID or slug format
 * Returns the actual UUID for the seed, or null if not found
 */
async function resolveSeedId(identifier: string, userId: string): Promise<string | null> {
  if (!identifier) {
    return null
  }

  if (identifier.includes('/')) {
    // Slug format: get seed by slug and return its ID
    const seed = await SeedsService.getBySlug(identifier, userId)
    return seed ? seed.id : null
  } else {
    // UUID format: verify it exists and belongs to user
    const seed = await SeedsService.getById(identifier, userId)
    return seed ? seed.id : null
  }
}

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
 * GET /api/seeds/:hashId/:slug/automations
 * Get all available automations for a seed by hashId with slug hint
 */
router.get('/:hashId/:slug/automations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId, slug } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    // Get all automations from registry
    const registry = AutomationRegistry.getInstance()
    const automations = registry.getAll()

    // Return automation info (id, name, description, enabled)
    const automationList = automations.map((automation) => ({
      id: automation.id,
      name: automation.name,
      description: automation.description,
      enabled: automation.enabled,
    }))

    res.json(automationList)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/seeds/:hashId/automations
 * Get all available automations for a seed by hashId
 */
router.get('/:hashId/automations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Check if it's a full UUID (36 chars) - backward compatibility
    let seed
    if (hashId.length === 36) {
      seed = await SeedsService.getById(hashId, userId)
    } else {
      seed = await SeedsService.getByHashId(hashId, userId)
    }
    
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    // Get all automations from registry
    const registry = AutomationRegistry.getInstance()
    const automations = registry.getAll()

    // Return automation info (id, name, description, enabled)
    const automationList = automations.map((automation) => ({
      id: automation.id,
      name: automation.name,
      description: automation.description,
      enabled: automation.enabled,
    }))

    res.json(automationList)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/seeds/:hashId/:slug
 * Get a single seed by hashId with slug hint for collision resolution
 */
router.get('/:hashId/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId, slug } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)

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
 * GET /api/seeds/:hashId
 * Get a single seed by hashId (first 7 chars of UUID)
 * If multiple matches, returns the most recent one
 */
router.get('/:hashId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Check if it's a full UUID (36 chars) - backward compatibility
    if (hashId.length === 36) {
      const seed = await SeedsService.getById(hashId, userId)
      if (!seed) {
        res.status(404).json({ error: 'Seed not found' })
        return
      }
      res.json(seed)
      return
    }

    // Use hashId to find seed (slug hint not provided)
    const seed = await SeedsService.getByHashId(hashId, userId)

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

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required and must be a non-empty string' })
      return
    }

    const seed = await SeedsService.create(userId, { content: content.trim() })
    
    // Queue automation jobs for the new seed
    // Fire and forget - don't wait for automations to complete
    queueAutomationsForSeed(seed.id, userId).catch((error) => {
      // Log error but don't fail the request
      console.error('Failed to queue automations for seed:', error)
    })
    
    res.status(201).json(seed)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/seeds/:hashId/:slug
 * Update a seed by hashId with slug hint for collision resolution
 */
router.put('/:hashId/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId, slug } = req.params
    const { content } = req.body

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    const updateData: { content?: string } = {}
    if (content !== undefined) {
      if (typeof content !== 'string') {
        res.status(400).json({ error: 'Content must be a string' })
        return
      }
      updateData.content = content
    }

    const updatedSeed = await SeedsService.update(seedId, userId, updateData)

    if (!updatedSeed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    res.json(updatedSeed)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/seeds/:hashId
 * Update a seed by hashId
 */
router.put('/:hashId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId } = req.params
    const { content } = req.body

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Check if it's a full UUID (36 chars) - backward compatibility
    let seed
    if (hashId.length === 36) {
      seed = await SeedsService.getById(hashId, userId)
    } else {
      seed = await SeedsService.getByHashId(hashId, userId)
    }
    
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
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

    const updatedSeed = await SeedsService.update(seed.id, userId, updateData)

    if (!updatedSeed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    res.json(updatedSeed)
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/seeds/:hashId/:slug
 * Delete a seed by hashId with slug hint for collision resolution
 */
router.delete('/:hashId/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId, slug } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    const deleted = await SeedsService.delete(seedId, userId)

    if (!deleted) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/seeds/:hashId
 * Delete a seed by hashId
 */
router.delete('/:hashId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Check if it's a full UUID (36 chars) - backward compatibility
    let seed
    if (hashId.length === 36) {
      seed = await SeedsService.getById(hashId, userId)
    } else {
      seed = await SeedsService.getByHashId(hashId, userId)
    }
    
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const deleted = await SeedsService.delete(seed.id, userId)

    if (!deleted) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/seeds/:hashId/:slug/automations
 * Get all available automations for a seed by hashId with slug hint
 */
router.get('/:hashId/:slug/automations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId, slug } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    // Get all automations from registry
    const registry = AutomationRegistry.getInstance()
    const automations = registry.getAll()

    // Return automation info (id, name, description, enabled)
    const automationList = automations.map((automation) => ({
      id: automation.id,
      name: automation.name,
      description: automation.description,
      enabled: automation.enabled,
    }))

    res.json(automationList)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/seeds/:hashId/automations
 * Get all available automations for a seed by hashId
 */
router.get('/:hashId/automations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Check if it's a full UUID (36 chars) - backward compatibility
    let seed
    if (hashId.length === 36) {
      seed = await SeedsService.getById(hashId, userId)
    } else {
      seed = await SeedsService.getByHashId(hashId, userId)
    }
    
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    // Get all automations from registry
    const registry = AutomationRegistry.getInstance()
    const automations = registry.getAll()

    // Return automation info (id, name, description, enabled)
    const automationList = automations.map((automation) => ({
      id: automation.id,
      name: automation.name,
      description: automation.description,
      enabled: automation.enabled,
    }))

    res.json(automationList)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/seeds/:hashId/:slug/automations/:automationId/run
 * Manually trigger an automation for a seed by hashId with slug hint
 */
router.post('/:hashId/:slug/automations/:automationId/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId, slug, automationId } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    if (!automationId) {
      res.status(400).json({ error: 'Automation ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    // Verify automation exists
    const registry = AutomationRegistry.getInstance()
    const automation = registry.getById(automationId)
    if (!automation) {
      res.status(404).json({ error: 'Automation not found' })
      return
    }

    // Queue the automation job with higher priority for manual triggers
          // Use makeUnique: true to allow re-running the same automation
          console.log(`[Manual Trigger] Queuing automation ${automationId} for seed ${seedId} (user ${userId})`)
          const jobId = await addAutomationJob({
            seedId,
            automationId,
            userId,
            priority: 10, // Higher priority for manual triggers
            metadata: { manual: true },
          }, { makeUnique: true }) // Make job ID unique to allow re-running
          console.log(`[Manual Trigger] Job queued with ID: ${jobId}`)

          // Diagnostic: Check queue status immediately after adding job
          const waiting = await automationQueue.getWaitingCount()
          const active = await automationQueue.getActiveCount()
          console.log(`[Manual Trigger] Queue status after adding job - Waiting: ${waiting}, Active: ${active}`)
          
          // Try to get the job to verify it exists
          try {
            const job = await automationQueue.getJob(jobId)
            if (job) {
              const state = await job.getState()
              console.log(`[Manual Trigger] Job ${jobId} state: ${state}`)
            } else {
              console.warn(`[Manual Trigger] ⚠️ Job ${jobId} not found in queue!`)
            }
          } catch (err) {
            console.error(`[Manual Trigger] Error checking job ${jobId}:`, err)
          }

          res.status(202).json({
            message: 'Automation queued',
            jobId,
            automation: {
              id: automation.id,
              name: automation.name,
            },
          })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/seeds/:hashId/automations/:automationId/run
 * Manually trigger an automation for a seed by hashId
 */
router.post('/:hashId/automations/:automationId/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { hashId, automationId } = req.params

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    if (!automationId) {
      res.status(400).json({ error: 'Automation ID is required' })
      return
    }

    // Check if it's a full UUID (36 chars) - backward compatibility
    let seed
    if (hashId.length === 36) {
      seed = await SeedsService.getById(hashId, userId)
    } else {
      seed = await SeedsService.getByHashId(hashId, userId)
    }
    
    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    // Verify automation exists
    const registry = AutomationRegistry.getInstance()
    const automation = registry.getById(automationId)
    if (!automation) {
      res.status(404).json({ error: 'Automation not found' })
      return
    }

    // Queue the automation job with higher priority for manual triggers
    // Use makeUnique: true to allow re-running the same automation
    console.log(`[Manual Trigger] Queuing automation ${automationId} for seed ${seedId} (user ${userId})`)
    const jobId = await addAutomationJob({
      seedId,
      automationId,
      userId,
      priority: 10, // Higher priority for manual triggers
      metadata: { manual: true },
    }, { makeUnique: true }) // Make job ID unique to allow re-running
    console.log(`[Manual Trigger] Job queued with ID: ${jobId}`)

    // Diagnostic: Check queue status immediately after adding job
    const waiting = await automationQueue.getWaitingCount()
    const active = await automationQueue.getActiveCount()
    console.log(`[Manual Trigger] Queue status after adding job - Waiting: ${waiting}, Active: ${active}`)
    
    // Try to get the job to verify it exists
    try {
      const job = await automationQueue.getJob(jobId)
      if (job) {
        const state = await job.getState()
        console.log(`[Manual Trigger] Job ${jobId} state: ${state}`)
      } else {
        console.warn(`[Manual Trigger] ⚠️ Job ${jobId} not found in queue!`)
      }
    } catch (err) {
      console.error(`[Manual Trigger] Error checking job ${jobId}:`, err)
    }

    res.status(202).json({
      message: 'Automation queued',
      jobId,
      automation: {
        id: automation.id,
        name: automation.name,
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
