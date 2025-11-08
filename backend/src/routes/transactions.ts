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
 * GET /api/seeds/:seedId/transactions
 * Get full timeline of transactions for a seed (supports both UUID and slug formats)
 */
router.get('/seeds/:seedId/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seedId } = req.params
    const userId = req.user!.id

    if (!seedId) {
      res.status(400).json({ error: 'Seed ID or slug is required' })
      return
    }

    // Resolve to actual UUID and verify seed ownership
    const resolvedSeedId = await resolveSeedId(seedId, userId)
    if (!resolvedSeedId) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get all transactions for the seed
    const transactions = await SeedTransactionsService.getBySeedId(resolvedSeedId)

    res.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/seeds/:seedId/state
 * Get computed current state of a seed (replayed from transactions)
 * Supports both UUID and slug formats
 */
router.get('/seeds/:seedId/state', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seedId } = req.params
    const userId = req.user!.id

    if (!seedId) {
      res.status(400).json({ error: 'Seed ID or slug is required' })
      return
    }

    // Resolve to actual UUID and verify seed ownership
    const resolvedSeedId = await resolveSeedId(seedId, userId)
    if (!resolvedSeedId) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

    // Get all transactions
    const transactions = await SeedTransactionsService.getBySeedId(resolvedSeedId)

    // Compute current state by replaying transactions
    const currentState = computeSeedState(transactions)

    res.json({
      seed_id: resolvedSeedId,
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
 * POST /api/seeds/:seedId/transactions
 * Create a new transaction for a seed (supports both UUID and slug formats)
 */
router.post('/seeds/:seedId/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seedId } = req.params
    const userId = req.user!.id
    const { transaction_type, transaction_data, automation_id } = req.body

    if (!seedId) {
      res.status(400).json({ error: 'Seed ID or slug is required' })
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

    // Resolve to actual UUID and verify seed ownership
    const resolvedSeedId = await resolveSeedId(seedId, userId)
    if (!resolvedSeedId) {
      res.status(404).json({ error: 'Seed not found' })
      return
    }

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



