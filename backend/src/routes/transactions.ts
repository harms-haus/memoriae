// Seed transactions routes for timeline management
import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { SeedTransactionsService } from '../services/seed-transactions'
import { SeedsService } from '../services/seeds'
import db from '../db/connection'
import { computeSeedState } from '../utils/seed-state'
import log from 'loglevel'

const logRoutes = log.getLogger('Routes:Transactions')
const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/seeds/:hashId/:slug/transactions
 * Get full timeline of transactions for a seed by hashId with slug hint
 */
router.get('/seeds/:hashId/:slug/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hashId, slug } = req.params
    const userId = req.user!.id

    logRoutes.debug(`GET /seeds/:hashId/:slug/transactions - hashId: ${hashId}, slug: ${slug}`)

    if (!hashId) {
      logRoutes.warn(`GET /seeds/:hashId/:slug/transactions - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`GET /seeds/:hashId/:slug/transactions - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get all transactions for the seed
    const transactions = await SeedTransactionsService.getBySeedId(seed.id)

    logRoutes.info(`GET /seeds/:hashId/:slug/transactions - Found ${transactions.length} transactions for seed ${seed.id}`)
    res.json(transactions)
  } catch (error) {
    logRoutes.error(`GET /seeds/:hashId/:slug/transactions - Error:`, error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/seeds/:hashId/transactions
 * Get full timeline of transactions for a seed by hashId
 */
router.get('/seeds/:hashId/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hashId } = req.params
    const userId = req.user!.id

    logRoutes.debug(`GET /seeds/:hashId/transactions - hashId: ${hashId}`)

    if (!hashId) {
      logRoutes.warn(`GET /seeds/:hashId/transactions - Missing hashId`)
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
      logRoutes.warn(`GET /seeds/:hashId/transactions - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get all transactions for the seed
    const transactions = await SeedTransactionsService.getBySeedId(seed.id)

    logRoutes.info(`GET /seeds/:hashId/transactions - Found ${transactions.length} transactions for seed ${seed.id}`)
    res.json(transactions)
  } catch (error) {
    logRoutes.error(`GET /seeds/:hashId/transactions - Error:`, error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/seeds/:hashId/:slug/state
 * Get computed current state of a seed by hashId with slug hint
 */
router.get('/seeds/:hashId/:slug/state', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hashId, slug } = req.params
    const userId = req.user!.id

    logRoutes.debug(`GET /seeds/:hashId/:slug/state - hashId: ${hashId}, slug: ${slug}`)

    if (!hashId) {
      logRoutes.warn(`GET /seeds/:hashId/:slug/state - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`GET /seeds/:hashId/:slug/state - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get all transactions
    const transactions = await SeedTransactionsService.getBySeedId(seed.id)

    // Compute current state by replaying transactions
    const currentState = computeSeedState(transactions)

    logRoutes.info(`GET /seeds/:hashId/:slug/state - Computed state for seed ${seed.id} with ${transactions.length} transactions`)
    res.json({
      seed_id: seed.id,
      current_state: {
        ...currentState,
        timestamp: currentState.timestamp.toISOString(),
      },
      transactions_applied: transactions.length,
    })
  } catch (error) {
    logRoutes.error(`GET /seeds/:hashId/:slug/state - Error:`, error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/seeds/:hashId/state
 * Get computed current state of a seed by hashId
 */
router.get('/seeds/:hashId/state', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hashId } = req.params
    const userId = req.user!.id

    logRoutes.debug(`GET /seeds/:hashId/state - hashId: ${hashId}`)

    if (!hashId) {
      logRoutes.warn(`GET /seeds/:hashId/state - Missing hashId`)
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
      logRoutes.warn(`GET /seeds/:hashId/state - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get all transactions
    const transactions = await SeedTransactionsService.getBySeedId(seed.id)

    // Compute current state by replaying transactions
    const currentState = computeSeedState(transactions)

    logRoutes.info(`GET /seeds/:hashId/state - Computed state for seed ${seed.id} with ${transactions.length} transactions`)
    res.json({
      seed_id: seed.id,
      current_state: {
        ...currentState,
        timestamp: currentState.timestamp.toISOString(),
      },
      transactions_applied: transactions.length,
    })
  } catch (error) {
    logRoutes.error(`GET /seeds/:hashId/state - Error:`, error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/seeds/:hashId/:slug/transactions
 * Create a new transaction for a seed by hashId with slug hint
 */
router.post('/seeds/:hashId/:slug/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hashId, slug } = req.params
    const userId = req.user!.id
    const { transaction_type, transaction_data, automation_id } = req.body

    logRoutes.debug(`POST /seeds/:hashId/:slug/transactions - hashId: ${hashId}, slug: ${slug}, type: ${transaction_type}`)

    if (!hashId) {
      logRoutes.warn(`POST /seeds/:hashId/:slug/transactions - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Validate input
    if (!transaction_type || typeof transaction_type !== 'string') {
      logRoutes.warn(`POST /seeds/:hashId/:slug/transactions - Invalid transaction_type`)
      res.status(400).json({ error: 'transaction_type is required and must be a string' })
      return
    }

    if (!transaction_data || typeof transaction_data !== 'object') {
      logRoutes.warn(`POST /seeds/:hashId/:slug/transactions - Invalid transaction_data`)
      res.status(400).json({ error: 'transaction_data is required and must be an object' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
      logRoutes.warn(`POST /seeds/:hashId/:slug/transactions - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const resolvedSeedId = seed.id

    // Create transaction
    const transaction = await SeedTransactionsService.create({
      seed_id: resolvedSeedId,
      transaction_type: transaction_type as any,
      transaction_data: transaction_data as any,
      automation_id: automation_id || null,
    })

    logRoutes.info(`POST /seeds/:hashId/:slug/transactions - Created transaction ${transaction.id} for seed ${resolvedSeedId}`)
    res.status(201).json(transaction)
  } catch (error) {
    logRoutes.error(`POST /seeds/:hashId/:slug/transactions - Error:`, error)
    if (error instanceof Error && error.message.includes('not allowed')) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/seeds/:hashId/transactions
 * Create a new transaction for a seed by hashId
 */
router.post('/seeds/:hashId/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hashId } = req.params
    const userId = req.user!.id
    const { transaction_type, transaction_data, automation_id } = req.body

    logRoutes.debug(`POST /seeds/:hashId/transactions - hashId: ${hashId}, type: ${transaction_type}`)

    if (!hashId) {
      logRoutes.warn(`POST /seeds/:hashId/transactions - Missing hashId`)
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Validate input
    if (!transaction_type || typeof transaction_type !== 'string') {
      logRoutes.warn(`POST /seeds/:hashId/transactions - Invalid transaction_type`)
      res.status(400).json({ error: 'transaction_type is required and must be a string' })
      return
    }

    if (!transaction_data || typeof transaction_data !== 'object') {
      logRoutes.warn(`POST /seeds/:hashId/transactions - Invalid transaction_data`)
      res.status(400).json({ error: 'transaction_data is required and must be an object' })
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
      logRoutes.warn(`POST /seeds/:hashId/transactions - Seed not found: ${hashId}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }
    const resolvedSeedId = seed.id

    // Create transaction
    const transaction = await SeedTransactionsService.create({
      seed_id: resolvedSeedId,
      transaction_type: transaction_type as any,
      transaction_data: transaction_data as any,
      automation_id: automation_id || null,
    })

    logRoutes.info(`POST /seeds/:hashId/transactions - Created transaction ${transaction.id} for seed ${resolvedSeedId}`)
    res.status(201).json(transaction)
  } catch (error) {
    logRoutes.error(`POST /seeds/:hashId/transactions - Error:`, error)
    if (error instanceof Error && error.message.includes('not allowed')) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/transactions/:transactionId
 * Get a specific transaction by ID
 */
router.get('/transactions/:transactionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.params
    const userId = req.user!.id

    logRoutes.debug(`GET /transactions/:transactionId - transactionId: ${transactionId}`)

    if (!transactionId) {
      logRoutes.warn(`GET /transactions/:transactionId - Missing transactionId`)
      res.status(400).json({ error: 'Transaction ID is required' })
      return
    }

    const transaction = await SeedTransactionsService.getById(transactionId)
    if (!transaction) {
      logRoutes.warn(`GET /transactions/:transactionId - Transaction not found: ${transactionId}`)
      res.status(404).json({ error: 'Transaction not found' })
      return
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: transaction.seed_id, user_id: userId })
      .first()

    if (!seed) {
      logRoutes.warn(`GET /transactions/:transactionId - Seed not found or access denied: ${transaction.seed_id}`)
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    logRoutes.info(`GET /transactions/:transactionId - Found transaction ${transactionId}`)
    res.json(transaction)
  } catch (error) {
    logRoutes.error(`GET /transactions/:transactionId - Error:`, error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router



