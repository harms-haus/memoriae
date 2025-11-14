// Seed CRUD routes
import { Router, Request, Response, NextFunction } from 'express'
import { SeedsService } from '../services/seeds'
import { authenticate } from '../middleware/auth'
import { queueAutomationsForSeed, addAutomationJob, automationQueue } from '../services/queue'
import { AutomationRegistry } from '../services/automation/registry'
import log from 'loglevel'

const logRoutes = log.getLogger('Routes:Seeds')
const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/seeds
 * Get all seeds for the authenticated user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    logRoutes.debug(`GET / - Fetching seeds for user ${userId}`)
    const seeds = await SeedsService.getByUser(userId)
    logRoutes.info(`GET / - Found ${seeds.length} seeds for user ${userId}`)
    res.json(seeds)
  } catch (error) {
    logRoutes.error(`GET / - Error fetching seeds for user ${req.user!.id}:`, error)
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

    logRoutes.debug(`GET /:hashId/:slug/automations - hashId: ${hashId}, slug: ${slug}`)

    if (!hashId) {
      logRoutes.warn(`GET /:hashId/:slug/automations - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`GET /:hashId/:slug/automations - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

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

    logRoutes.info(`GET /:hashId/:slug/automations - Found ${automationList.length} automations for seed ${seed.id}`)
    res.json(automationList)
  } catch (error) {
    logRoutes.error(`GET /:hashId/:slug/automations - Error:`, error)
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

    logRoutes.debug(`GET /:hashId/automations - hashId: ${hashId}`)

    if (!hashId) {
      logRoutes.warn(`GET /:hashId/automations - Missing hashId`)
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
      logRoutes.warn(`GET /:hashId/automations - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

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

    logRoutes.info(`GET /:hashId/automations - Found ${automationList.length} automations for seed ${seed.id}`)
    res.json(automationList)
  } catch (error) {
    logRoutes.error(`GET /:hashId/automations - Error:`, error)
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

    logRoutes.debug(`GET /:hashId/:slug - hashId: ${hashId}, slug: ${slug}`)

    if (!hashId) {
      logRoutes.warn(`GET /:hashId/:slug - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)

    if (!seed) {
      logRoutes.warn(`GET /:hashId/:slug - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    logRoutes.info(`GET /:hashId/:slug - Found seed ${seed.id}`)
    res.json(seed)
  } catch (error) {
    logRoutes.error(`GET /:hashId/:slug - Error:`, error)
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

    logRoutes.debug(`GET /:hashId - hashId: ${hashId}`)

    if (!hashId) {
      logRoutes.warn(`GET /:hashId - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Check if it's a full UUID (36 chars) - backward compatibility
    if (hashId.length === 36) {
      const seed = await SeedsService.getById(hashId, userId)
      if (!seed) {
        logRoutes.warn(`GET /:hashId - Seed not found: ${hashId}`)
        res.status(404).json({ error: 'Seed not found' })
        return
      }
      logRoutes.info(`GET /:hashId - Found seed ${seed.id}`)
      res.json(seed)
      return
    }

    // Use hashId to find seed (slug hint not provided)
    const seed = await SeedsService.getByHashId(hashId, userId)

    if (!seed) {
      logRoutes.warn(`GET /:hashId - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    logRoutes.info(`GET /:hashId - Found seed ${seed.id}`)
    res.json(seed)
  } catch (error) {
    logRoutes.error(`GET /:hashId - Error:`, error)
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

    logRoutes.debug(`POST / - Creating seed for user ${userId}, content length: ${content?.length || 0}`)

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      logRoutes.warn(`POST / - Invalid content for user ${userId}`)
      res.status(400).json({ error: 'Content is required and must be a non-empty string' })
      return
    }

    const seed = await SeedsService.create(userId, { content: content.trim() })
    
    logRoutes.info(`POST / - Created seed ${seed.id} for user ${userId}`)
    
    // Queue automation jobs for the new seed
    // Fire and forget - don't wait for automations to complete
    queueAutomationsForSeed(seed.id, userId).catch((error) => {
      // Log error but don't fail the request
      logRoutes.error(`Failed to queue automations for seed ${seed.id}:`, error)
    })
    
    res.status(201).json(seed)
  } catch (error) {
    logRoutes.error(`POST / - Error creating seed for user ${req.user!.id}:`, error)
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

    logRoutes.debug(`PUT /:hashId/:slug - hashId: ${hashId}, slug: ${slug}, content length: ${content?.length || 0}`)

    if (!hashId) {
      logRoutes.warn(`PUT /:hashId/:slug - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`PUT /:hashId/:slug - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    const updateData: { content?: string } = {}
    if (content !== undefined) {
      if (typeof content !== 'string') {
        logRoutes.warn(`PUT /:hashId/:slug - Invalid content type for seed ${seedId}`)
        res.status(400).json({ error: 'Content must be a string' })
        return
      }
      updateData.content = content
    }

    const updatedSeed = await SeedsService.update(seedId, userId, updateData)

    if (!updatedSeed) {
      logRoutes.warn(`PUT /:hashId/:slug - Seed not found after update: ${seedId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    logRoutes.info(`PUT /:hashId/:slug - Updated seed ${seedId}`)
    res.json(updatedSeed)
  } catch (error) {
    logRoutes.error(`PUT /:hashId/:slug - Error:`, error)
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

    logRoutes.debug(`PUT /:hashId - hashId: ${hashId}, content length: ${content?.length || 0}`)

    if (!hashId) {
      logRoutes.warn(`PUT /:hashId - Missing hashId`)
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
      logRoutes.warn(`PUT /:hashId - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const updateData: { content?: string } = {}
    if (content !== undefined) {
      if (typeof content !== 'string') {
        logRoutes.warn(`PUT /:hashId - Invalid content type for seed ${seed.id}`)
        res.status(400).json({ error: 'Content must be a string' })
        return
      }
      updateData.content = content
    }

    const updatedSeed = await SeedsService.update(seed.id, userId, updateData)

    if (!updatedSeed) {
      logRoutes.warn(`PUT /:hashId - Seed not found after update: ${seed.id}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    logRoutes.info(`PUT /:hashId - Updated seed ${seed.id}`)
    res.json(updatedSeed)
  } catch (error) {
    logRoutes.error(`PUT /:hashId - Error:`, error)
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

    logRoutes.debug(`DELETE /:hashId/:slug - hashId: ${hashId}, slug: ${slug}`)

    if (!hashId) {
      logRoutes.warn(`DELETE /:hashId/:slug - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`DELETE /:hashId/:slug - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    const deleted = await SeedsService.delete(seedId, userId)

    if (!deleted) {
      logRoutes.warn(`DELETE /:hashId/:slug - Seed not found after delete attempt: ${seedId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    logRoutes.info(`DELETE /:hashId/:slug - Deleted seed ${seedId}`)
    res.status(204).send()
  } catch (error) {
    logRoutes.error(`DELETE /:hashId/:slug - Error:`, error)
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

    logRoutes.debug(`DELETE /:hashId - hashId: ${hashId}`)

    if (!hashId) {
      logRoutes.warn(`DELETE /:hashId - Missing hashId`)
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
      logRoutes.warn(`DELETE /:hashId - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    const deleted = await SeedsService.delete(seed.id, userId)

    if (!deleted) {
      logRoutes.warn(`DELETE /:hashId - Seed not found after delete attempt: ${seed.id}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    logRoutes.info(`DELETE /:hashId - Deleted seed ${seed.id}`)
    res.status(204).send()
  } catch (error) {
    logRoutes.error(`DELETE /:hashId - Error:`, error)
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

    logRoutes.debug(`GET /:hashId/:slug/automations - hashId: ${hashId}, slug: ${slug}`)

    if (!hashId) {
      logRoutes.warn(`GET /:hashId/:slug/automations - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`GET /:hashId/:slug/automations - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

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

    logRoutes.info(`GET /:hashId/:slug/automations - Found ${automationList.length} automations for seed ${seed.id}`)
    res.json(automationList)
  } catch (error) {
    logRoutes.error(`GET /:hashId/:slug/automations - Error:`, error)
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

    logRoutes.debug(`GET /:hashId/automations - hashId: ${hashId}`)

    if (!hashId) {
      logRoutes.warn(`GET /:hashId/automations - Missing hashId`)
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
      logRoutes.warn(`GET /:hashId/automations - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

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

    logRoutes.info(`GET /:hashId/automations - Found ${automationList.length} automations for seed ${seed.id}`)
    res.json(automationList)
  } catch (error) {
    logRoutes.error(`GET /:hashId/automations - Error:`, error)
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

    logRoutes.debug(`POST /:hashId/:slug/automations/:automationId/run - hashId: ${hashId}, slug: ${slug}, automationId: ${automationId}`)

    if (!hashId) {
      logRoutes.warn(`POST /:hashId/:slug/automations/:automationId/run - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    if (!automationId) {
      logRoutes.warn(`POST /:hashId/:slug/automations/:automationId/run - Missing automationId`)
      res.status(400).json({ error: 'Automation ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`POST /:hashId/:slug/automations/:automationId/run - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    // Verify automation exists
    const registry = AutomationRegistry.getInstance()
    const automation = registry.getById(automationId)
    if (!automation) {
      logRoutes.warn(`POST /:hashId/:slug/automations/:automationId/run - Automation not found: ${automationId}`)
      res.status(404).json({ error: 'Automation not found' })
      return
    }

    // Queue the automation job with higher priority for manual triggers
          // Use makeUnique: true to allow re-running the same automation
          logRoutes.info(`[Manual Trigger] Queuing automation ${automationId} for seed ${seedId} (user ${userId})`)
          const jobId = await addAutomationJob({
            seedId,
            automationId,
            userId,
            priority: 10, // Higher priority for manual triggers
            metadata: { manual: true },
          }, { makeUnique: true }) // Make job ID unique to allow re-running
          logRoutes.debug(`[Manual Trigger] Job queued with ID: ${jobId}`)

          // Diagnostic: Check queue status immediately after adding job
          const waiting = await automationQueue.getWaitingCount()
          const active = await automationQueue.getActiveCount()
          logRoutes.debug(`[Manual Trigger] Queue status after adding job - Waiting: ${waiting}, Active: ${active}`)
          
          // Try to get the job to verify it exists
          try {
            const job = await automationQueue.getJob(jobId)
            if (job) {
              const state = await job.getState()
              logRoutes.debug(`[Manual Trigger] Job ${jobId} state: ${state}`)
            } else {
              logRoutes.warn(`[Manual Trigger] Job ${jobId} not found in queue!`)
            }
          } catch (err) {
            logRoutes.error(`[Manual Trigger] Error checking job ${jobId}:`, err)
          }

          logRoutes.info(`POST /:hashId/:slug/automations/:automationId/run - Queued automation ${automationId} for seed ${seedId}, jobId: ${jobId}`)
          res.status(202).json({
            message: 'Automation queued',
            jobId,
            automation: {
              id: automation.id,
              name: automation.name,
            },
          })
  } catch (error) {
    logRoutes.error(`POST /:hashId/:slug/automations/:automationId/run - Error:`, error)
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

    logRoutes.debug(`POST /:hashId/automations/:automationId/run - hashId: ${hashId}, automationId: ${automationId}`)

    if (!hashId) {
      logRoutes.warn(`POST /:hashId/automations/:automationId/run - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    if (!automationId) {
      logRoutes.warn(`POST /:hashId/automations/:automationId/run - Missing automationId`)
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
      logRoutes.warn(`POST /:hashId/automations/:automationId/run - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const seedId = seed.id

    // Verify automation exists
    const registry = AutomationRegistry.getInstance()
    const automation = registry.getById(automationId)
    if (!automation) {
      logRoutes.warn(`POST /:hashId/automations/:automationId/run - Automation not found: ${automationId}`)
      res.status(404).json({ error: 'Automation not found' })
      return
    }

    // Queue the automation job with higher priority for manual triggers
    // Use makeUnique: true to allow re-running the same automation
    logRoutes.info(`[Manual Trigger] Queuing automation ${automationId} for seed ${seedId} (user ${userId})`)
    const jobId = await addAutomationJob({
      seedId,
      automationId,
      userId,
      priority: 10, // Higher priority for manual triggers
      metadata: { manual: true },
    }, { makeUnique: true }) // Make job ID unique to allow re-running
    logRoutes.debug(`[Manual Trigger] Job queued with ID: ${jobId}`)

    // Diagnostic: Check queue status immediately after adding job
    const waiting = await automationQueue.getWaitingCount()
    const active = await automationQueue.getActiveCount()
    logRoutes.debug(`[Manual Trigger] Queue status after adding job - Waiting: ${waiting}, Active: ${active}`)
    
    // Try to get the job to verify it exists
    try {
      const job = await automationQueue.getJob(jobId)
      if (job) {
        const state = await job.getState()
        logRoutes.debug(`[Manual Trigger] Job ${jobId} state: ${state}`)
      } else {
        logRoutes.warn(`[Manual Trigger] Job ${jobId} not found in queue!`)
      }
    } catch (err) {
      logRoutes.error(`[Manual Trigger] Error checking job ${jobId}:`, err)
    }

    logRoutes.info(`POST /:hashId/automations/:automationId/run - Queued automation ${automationId} for seed ${seedId}, jobId: ${jobId}`)
    res.status(202).json({
      message: 'Automation queued',
      jobId,
      automation: {
        id: automation.id,
        name: automation.name,
      },
    })
  } catch (error) {
    logRoutes.error(`POST /:hashId/automations/:automationId/run - Error:`, error)
    next(error)
  }
})

export default router
