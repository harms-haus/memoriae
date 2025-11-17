// Frontend utility to compute seed state at a specific point in time
import type { SeedTransaction } from '../types'

export interface SeedState {
  seed: string
  timestamp: Date
  metadata: Record<string, unknown>
  tags?: Array<{ id: string; name: string }>
  categories?: Array<{ id: string; name: string; path: string }>
}

/**
 * Compute seed state by replaying transactions chronologically up to a specific point in time
 * @param transactions - All transactions for the seed (will be filtered to up to targetTime)
 * @param targetTime - Optional timestamp to compute state up to (defaults to latest)
 * @returns The computed state at that point in time
 */
export function computeSeedStateAtTime(
  transactions: SeedTransaction[],
  targetTime?: Date | string
): SeedState {
  // Convert targetTime to Date if string
  const target = targetTime 
    ? (typeof targetTime === 'string' ? new Date(targetTime) : targetTime)
    : undefined

  // Filter transactions up to target time (if specified)
  const relevantTransactions = target
    ? transactions.filter(t => new Date(t.created_at).getTime() <= target.getTime())
    : transactions

  // Sort transactions by creation time (oldest first)
  const sortedTransactions = [...relevantTransactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Find creation transaction (must exist)
  const creationTransaction = sortedTransactions.find(
    (t) => t.transaction_type === 'create_seed'
  )

  if (!creationTransaction) {
    throw new Error('Seed must have a create_seed transaction')
  }

  const creationData = creationTransaction.transaction_data as { content: string }

  // Start with initial state from creation
  let state: SeedState = {
    seed: creationData.content,
    timestamp: new Date(creationTransaction.created_at),
    metadata: {},
    tags: [],
    categories: [],
  }

  // Process remaining transactions in order
  for (const transaction of sortedTransactions) {
    if (transaction.transaction_type === 'create_seed') {
      continue // Already processed
    }

    // Apply transaction based on type
    switch (transaction.transaction_type) {
      case 'edit_content': {
        const data = transaction.transaction_data as { content: string }
        state.seed = data.content
        state.timestamp = new Date(transaction.created_at)
        break
      }

      case 'add_tag': {
        const data = transaction.transaction_data as { tag_id: string; tag_name: string }
        if (!state.tags) {
          state.tags = []
        }
        // Check if tag already exists (idempotent)
        if (!state.tags.some(t => t.id === data.tag_id)) {
          state.tags.push({
            id: data.tag_id,
            name: data.tag_name,
          })
        }
        state.timestamp = new Date(transaction.created_at)
        break
      }

      case 'remove_tag': {
        const data = transaction.transaction_data as { tag_id: string }
        if (state.tags) {
          state.tags = state.tags.filter(t => t.id !== data.tag_id)
        }
        state.timestamp = new Date(transaction.created_at)
        break
      }

      case 'set_category': {
        const data = transaction.transaction_data as { 
          category_id: string
          category_name: string
          category_path: string
        }
        // Replace any existing category with the new one (seeds can only have one category)
        state.categories = [{
          id: data.category_id,
          name: data.category_name,
          path: data.category_path,
        }]
        state.timestamp = new Date(transaction.created_at)
        break
      }

      case 'remove_category': {
        const data = transaction.transaction_data as { category_id: string }
        if (state.categories) {
          state.categories = state.categories.filter(c => c.id !== data.category_id)
        }
        state.timestamp = new Date(transaction.created_at)
        break
      }

      case 'add_followup':
      case 'add_sprout':
        // These don't affect seed state
        break

      default:
        // Unknown transaction type - skip
        break
    }
  }

  return state
}

