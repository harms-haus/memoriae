// Seed state computation from transactions
import type { SeedTransaction } from '../types/seed-transactions'
import type {
  CreateSeedTransactionData,
  EditContentTransactionData,
  AddTagTransactionData,
  RemoveTagTransactionData,
  AddCategoryTransactionData,
  RemoveCategoryTransactionData,
} from '../types/seed-transactions'

/**
 * Seed state structure
 */
export interface SeedState {
  seed: string
  timestamp: Date
  metadata: Record<string, unknown>
  tags?: Array<{ id: string; name: string }>
  categories?: Array<{ id: string; name: string; path: string }>
}

/**
 * Validate transaction data based on transaction type
 */
export function validateTransaction(
  type: SeedTransaction['transaction_type'],
  data: SeedTransaction['transaction_data']
): void {
  switch (type) {
    case 'create_seed': {
      const d = data as CreateSeedTransactionData
      if (typeof d.content !== 'string' || d.content.trim().length === 0) {
        throw new Error('create_seed transaction requires non-empty content string')
      }
      break
    }
    case 'edit_content': {
      const d = data as EditContentTransactionData
      if (typeof d.content !== 'string') {
        throw new Error('edit_content transaction requires content string')
      }
      break
    }
    case 'add_tag': {
      const d = data as AddTagTransactionData
      if (typeof d.tag_id !== 'string' || typeof d.tag_name !== 'string') {
        throw new Error('add_tag transaction requires tag_id and tag_name strings')
      }
      break
    }
    case 'remove_tag': {
      const d = data as RemoveTagTransactionData
      if (typeof d.tag_id !== 'string') {
        throw new Error('remove_tag transaction requires tag_id string')
      }
      break
    }
    case 'add_category': {
      const d = data as AddCategoryTransactionData
      if (
        typeof d.category_id !== 'string' ||
        typeof d.category_name !== 'string' ||
        typeof d.category_path !== 'string'
      ) {
        throw new Error('add_category transaction requires category_id, category_name, and category_path strings')
      }
      break
    }
    case 'remove_category': {
      const d = data as RemoveCategoryTransactionData
      if (typeof d.category_id !== 'string') {
        throw new Error('remove_category transaction requires category_id string')
      }
      break
    }
    case 'add_followup':
      // Followup transactions don't affect seed state, so validation is minimal
      break
    default:
      throw new Error(`Unknown transaction type: ${type}`)
  }
}

/**
 * Compute seed state by replaying transactions chronologically
 * Transactions must be sorted by created_at (oldest first)
 */
export function computeSeedState(transactions: SeedTransaction[]): SeedState {
  // Sort transactions by creation time (oldest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
  )

  // Find creation transaction (must be first)
  const creationTransaction = sortedTransactions.find(
    (t) => t.transaction_type === 'create_seed'
  )

  if (!creationTransaction) {
    throw new Error('Seed must have a create_seed transaction')
  }

  // Validate create_seed transaction before using it
  validateTransaction(creationTransaction.transaction_type, creationTransaction.transaction_data)

  const creationData = creationTransaction.transaction_data as CreateSeedTransactionData

  // Start with initial state from creation
  let state: SeedState = {
    seed: creationData.content,
    timestamp: creationTransaction.created_at,
    metadata: {},
    tags: [],
    categories: [],
  }

  // Process remaining transactions in order
  for (const transaction of sortedTransactions) {
    if (transaction.transaction_type === 'create_seed') {
      continue // Already processed
    }

    // Validate transaction before applying
    try {
      validateTransaction(transaction.transaction_type, transaction.transaction_data)
    } catch (error) {
      console.error(`Failed to validate transaction ${transaction.id}:`, error)
      // Skip invalid transactions but continue processing
      continue
    }

    // Apply transaction based on type
    switch (transaction.transaction_type) {
      case 'edit_content': {
        const data = transaction.transaction_data as EditContentTransactionData
        state.seed = data.content
        break
      }

      case 'add_tag': {
        const data = transaction.transaction_data as AddTagTransactionData
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
        break
      }

      case 'remove_tag': {
        const data = transaction.transaction_data as RemoveTagTransactionData
        if (state.tags) {
          state.tags = state.tags.filter(t => t.id !== data.tag_id)
        }
        break
      }

      case 'add_category': {
        const data = transaction.transaction_data as AddCategoryTransactionData
        if (!state.categories) {
          state.categories = []
        }
        // Check if category already exists (idempotent)
        if (!state.categories.some(c => c.id === data.category_id)) {
          state.categories.push({
            id: data.category_id,
            name: data.category_name,
            path: data.category_path,
          })
        }
        break
      }

      case 'remove_category': {
        const data = transaction.transaction_data as RemoveCategoryTransactionData
        if (state.categories) {
          state.categories = state.categories.filter(c => c.id !== data.category_id)
        }
        break
      }

      case 'add_followup':
        // Followup transactions don't affect seed state
        break

      default:
        // Unknown transaction type - log but continue
        console.warn(`Unknown transaction type: ${(transaction as any).transaction_type}`)
    }
  }

  return state
}

