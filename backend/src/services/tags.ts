// Tag service - handles tag operations with transaction pattern
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import { TagTransactionsService } from './tag-transactions'
import { computeTagState } from '../utils/tag-state'
import { computeCurrentState } from './seeds'
import type { TagTransaction } from '../types/tag-transactions'
import type { Seed, SeedRow } from './seeds'

/**
 * Tag record from database
 */
interface TagRow {
  id: string
  name: string
  color: string | null
  created_at: Date
}

/**
 * Tag interface matching frontend expectations
 */
export interface Tag {
  id: string
  name: string
  color: string
}

/**
 * Tag with current state and transactions
 */
export interface TagDetail extends Tag {
  currentState: {
    name: string
    color: string | null
    timestamp: Date
    metadata: Record<string, unknown>
  }
  transactions: TagTransaction[]
}

/**
 * Get all tags
 * Returns all tags in the database, ordered by name
 * Computes current state from transactions for each tag
 */
export async function getAllTags(): Promise<Tag[]> {
  const tags = await db<TagRow>('tags')
    .select('*')
    .orderBy('name', 'asc')

  // Compute current state from transactions for each tag
  const tagsWithState = await Promise.all(
    tags.map(async (tag) => {
      // Get all transactions for this tag
      const transactions = await TagTransactionsService.getByTagId(tag.id)
      
      // Compute current state from transactions
      // Only use transactions if there's a creation transaction (required by computeTagState)
      let currentState
      const hasCreationTransaction = transactions.some(
        (t) => t.transaction_type === 'creation'
      )
      
      if (transactions.length > 0 && hasCreationTransaction) {
        try {
          currentState = computeTagState(transactions)
        } catch (error) {
          // If computeTagState fails (e.g., invalid transaction data), fall back to direct tag data
          console.warn(`Failed to compute state from transactions for tag ${tag.id}:`, error)
          currentState = {
            name: tag.name,
            color: tag.color,
            timestamp: tag.created_at,
            metadata: {},
          }
        }
      } else {
        // Fallback to direct tag data if no transactions exist or no creation transaction
        // (migration compatibility for legacy tags)
        currentState = {
          name: tag.name,
          color: tag.color,
          timestamp: tag.created_at,
          metadata: {},
        }
      }

      // Return tag with computed state
      return {
        id: tag.id,
        name: currentState.name,
        color: currentState.color || '',
      }
    })
  )

  return tagsWithState
}

/**
 * Get tag by ID with current state computed from transactions
 */
export async function getById(tagId: string): Promise<TagDetail | null> {
  const tag = await db<TagRow>('tags')
    .where({ id: tagId })
    .first()

  if (!tag) {
    return null
  }

  // Get all transactions for this tag
  const transactions = await TagTransactionsService.getByTagId(tagId)
  
  // Compute current state from transactions
  let currentState
  if (transactions.length > 0) {
    currentState = computeTagState(transactions)
  } else {
    // Fallback to direct tag data if no transactions exist yet (migration compatibility)
    currentState = {
      name: tag.name,
      color: tag.color,
      timestamp: tag.created_at,
      metadata: {},
    }
  }

  return {
    id: tag.id,
    name: currentState.name,
    color: currentState.color || '',
    currentState,
    transactions,
  }
}

/**
 * Get tag by name (case-sensitive) with current state computed from transactions
 * PostgreSQL unique constraints are case-sensitive by default
 */
export async function getByName(tagName: string): Promise<TagDetail | null> {
  const tag = await db<TagRow>('tags')
    .where({ name: tagName })
    .first()

  if (!tag) {
    return null
  }

  // Get all transactions for this tag
  const transactions = await TagTransactionsService.getByTagId(tag.id)
  
  // Compute current state from transactions
  let currentState
  if (transactions.length > 0) {
    currentState = computeTagState(transactions)
  } else {
    // Fallback to direct tag data if no transactions exist yet (migration compatibility)
    currentState = {
      name: tag.name,
      color: tag.color,
      timestamp: tag.created_at,
      metadata: {},
    }
  }

  return {
    id: tag.id,
    name: currentState.name,
    color: currentState.color || '',
    currentState,
    transactions,
  }
}

/**
 * Get all seeds that use a specific tag by tag ID
 * Returns full Seed objects with currentState computed
 */
export async function getSeedsByTagId(tagId: string): Promise<Seed[]> {
  // Look for seed transactions of type 'add_tag' with this tag_id
  const tagTransactions = await db('seed_transactions')
    .select('seed_id', 'created_at')
    .where('transaction_type', 'add_tag')
    .whereRaw("transaction_data->>'tag_id' = ?", [tagId])
    .orderBy('created_at', 'desc')
    .limit(50) // Limit to most recent 50 seeds

  if (tagTransactions.length === 0) {
    return []
  }

  // Get the seed rows for these transactions
  const seedIds = tagTransactions.map(t => t.seed_id)
  const seedRows = await db<SeedRow>('seeds')
    .select('id', 'user_id', 'created_at')
    .whereIn('id', seedIds)

  // Compute current state for each seed and combine with transaction timestamps
  const seedsWithState = await Promise.all(
    seedRows.map(async (seedRow) => {
      const currentState = await computeCurrentState(seedRow.id)
      const transaction = tagTransactions.find(t => t.seed_id === seedRow.id)
      
      return {
        ...seedRow,
        currentState,
        tag_added_at: transaction?.created_at || seedRow.created_at,
      }
    })
  )

  // Sort by tag_added_at (most recent first) and remove tag_added_at (not part of Seed interface)
  return seedsWithState
    .sort((a, b) => 
      new Date(b.tag_added_at).getTime() - new Date(a.tag_added_at).getTime()
    )
    .map(({ tag_added_at, ...seed }) => seed)
}

/**
 * Get all seeds that use a specific tag by tag name (case-sensitive)
 * Returns full Seed objects with currentState computed
 */
export async function getSeedsByTagName(tagName: string): Promise<Seed[]> {
  // First get the tag by name to get its ID
  const tag = await db<TagRow>('tags')
    .where({ name: tagName })
    .first()

  if (!tag) {
    return []
  }

  // Use the existing getSeedsByTagId function
  return getSeedsByTagId(tag.id)
}

/**
 * Create a new tag with creation transaction
 */
export async function create(data: { name: string; color?: string | null }): Promise<TagDetail> {
  // Validate name is required and non-empty
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new Error('Name is required and must be a non-empty string')
  }

  const id = uuidv4()
  const now = new Date()
  const trimmedName = data.name.trim()

  // Use a database transaction to ensure atomicity
  return await db.transaction(async (trx) => {
    // Create tag row
    const [tag] = await trx<TagRow>('tags')
      .insert({
        id,
        name: trimmedName,
        color: data.color || null,
        created_at: now,
      })
      .returning('*')

    if (!tag) {
      throw new Error('Failed to create tag: insert did not return a result')
    }

    // Create creation transaction within the same database transaction
    await trx('tag_transactions')
      .insert({
        id: uuidv4(),
        tag_id: id,
        transaction_type: 'creation',
        transaction_data: trx.raw('?::jsonb', [JSON.stringify({ 
          name: trimmedName, 
          color: data.color || null 
        })]),
        created_at: now,
        automation_id: null,
      })

    // Return tag - state will be computed after transaction commits
    return tag
  }).then(async (tag) => {
    // Get transactions to compute state (after commit)
    const transactions = await TagTransactionsService.getByTagId(tag.id)
    const currentState = computeTagState(transactions)
    
    return {
      id: tag.id,
      name: currentState.name,
      color: currentState.color || '',
      currentState,
      transactions,
    }
  })
}

/**
 * Edit a tag name (creates an edit transaction)
 */
export async function edit(tagId: string, data: { name: string }): Promise<TagDetail> {
  // Verify tag exists
  const existing = await db<TagRow>('tags')
    .where({ id: tagId })
    .first()

  if (!existing) {
    throw new Error('Tag not found')
  }

  // Validate name is required and non-empty
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new Error('Name is required and must be a non-empty string')
  }

  const trimmedName = data.name.trim()

  // Create edit transaction
  await TagTransactionsService.create({
    tag_id: tagId,
    transaction_type: 'edit',
    transaction_data: {
      name: trimmedName,
    },
    automation_id: null,
  })

  // Get updated tag with computed state
  const tag = await getById(tagId)
  if (!tag) {
    throw new Error('Failed to get updated tag')
  }

  return tag
}

/**
 * Set tag color (creates a set_color transaction)
 */
export async function setColor(tagId: string, color: string | null): Promise<TagDetail> {
  // Verify tag exists
  const existing = await db<TagRow>('tags')
    .where({ id: tagId })
    .first()

  if (!existing) {
    throw new Error('Tag not found')
  }

  // Create set_color transaction
  await TagTransactionsService.create({
    tag_id: tagId,
    transaction_type: 'set_color',
    transaction_data: {
      color: color,
    },
    automation_id: null,
  })

  // Get updated tag with computed state
  const tag = await getById(tagId)
  if (!tag) {
    throw new Error('Failed to get updated tag')
  }

  return tag
}

