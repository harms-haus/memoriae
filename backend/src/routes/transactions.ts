// Seed transactions routes for timeline management
import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { SeedTransactionsService } from '../services/seed-transactions'
import { SeedsService } from '../services/seeds'
import db from '../db/connection'
import { computeSeedState } from '../utils/seed-state'

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
 * GET /api/seeds/:hashId/:slug/transactions
 * Get full timeline of transactions for a seed by hashId with slug hint
 */
router.get('/seeds/:hashId/:slug/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { hashId, slug } = req.params
    const userId = req.user!.id

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

    // Get all transactions for the seed
    const transactions = await SeedTransactionsService.getBySeedId(seed.id)

    res.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
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

    // Get all transactions for the seed
    const transactions = await SeedTransactionsService.getBySeedId(seed.id)

    res.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
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

    // Get all transactions
    const transactions = await SeedTransactionsService.getBySeedId(seed.id)

    // Compute current state by replaying transactions
    const currentState = computeSeedState(transactions)

    res.json({
      seed_id: seed.id,
      current_state: {
        ...currentState,
        timestamp: currentState.timestamp.toISOString(),
      },
      transactions_applied: transactions.length,
    })
  } catch (error) {
    console.error('Error computing seed state:', error)
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

    // Get all transactions
    const transactions = await SeedTransactionsService.getBySeedId(seed.id)

    // Compute current state by replaying transactions
    const currentState = computeSeedState(transactions)

    res.json({
      seed_id: seed.id,
      current_state: {
        ...currentState,
        timestamp: currentState.timestamp.toISOString(),
      },
      transactions_applied: transactions.length,
    })
  } catch (error) {
    console.error('Error computing seed state:', error)
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

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Validate input
    if (!transaction_type || typeof transaction_type !== 'string') {
      res.status(400).json({ error: 'transaction_type is required and must be a string' })
      return
    }

    if (!transaction_data || typeof transaction_data !== 'object') {
      res.status(400).json({ error: 'transaction_data is required and must be an object' })
      return
    }

    // Use hashId as primary identifier, slug as hint for collision resolution
    const seed = await SeedsService.getByHashId(hashId, userId, slug)
    if (!seed) {
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

    res.status(201).json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
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

    if (!hashId) {
      res.status(400).json({ error: 'Hash ID is required' })
      return
    }

    // Validate input
    if (!transaction_type || typeof transaction_type !== 'string') {
      res.status(400).json({ error: 'transaction_type is required and must be a string' })
      return
    }

    if (!transaction_data || typeof transaction_data !== 'object') {
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

    res.status(201).json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
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

    if (!transactionId) {
      res.status(400).json({ error: 'Transaction ID is required' })
      return
    }

    const transaction = await SeedTransactionsService.getById(transactionId)
    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' })
      return
    }

    // Verify seed ownership
    const seed = await db('seeds')
      .where({ id: transaction.seed_id, user_id: userId })
      .first()

    if (!seed) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    res.json(transaction)
  } catch (error) {
    console.error('Error fetching transaction:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router



