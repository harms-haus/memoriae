// Tag state computation from transactions
import type { TagTransaction } from '../types/tag-transactions'
import type {
  CreationTransactionData,
  EditTransactionData,
  SetColorTransactionData,
} from '../types/tag-transactions'

/**
 * Tag state structure
 */
export interface TagState {
  name: string
  color: string | null
  timestamp: Date
  metadata: Record<string, unknown>
}

/**
 * Validate transaction data based on transaction type
 */
export function validateTransaction(
  type: TagTransaction['transaction_type'],
  data: TagTransaction['transaction_data']
): void {
  switch (type) {
    case 'creation': {
      const d = data as CreationTransactionData
      if (typeof d.name !== 'string' || d.name.trim().length === 0) {
        throw new Error('creation transaction requires non-empty name string')
      }
      if (d.color !== null && typeof d.color !== 'string') {
        throw new Error('creation transaction color must be null or string')
      }
      break
    }
    case 'edit': {
      const d = data as EditTransactionData
      if (typeof d.name !== 'string' || d.name.trim().length === 0) {
        throw new Error('edit transaction requires non-empty name string')
      }
      break
    }
    case 'set_color': {
      const d = data as SetColorTransactionData
      if (d.color !== null && typeof d.color !== 'string') {
        throw new Error('set_color transaction color must be null or string')
      }
      break
    }
    default:
      throw new Error(`Unknown transaction type: ${type}`)
  }
}

/**
 * Compute tag state by replaying transactions chronologically
 * Transactions must be sorted by created_at (oldest first)
 */
export function computeTagState(transactions: TagTransaction[]): TagState {
  // Sort transactions by creation time (oldest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
  )

  // Find creation transaction (must be first)
  const creationTransaction = sortedTransactions.find(
    (t) => t.transaction_type === 'creation'
  )

  if (!creationTransaction) {
    throw new Error('Tag must have a creation transaction')
  }

  // Validate creation transaction before using it
  validateTransaction(creationTransaction.transaction_type, creationTransaction.transaction_data)

  const creationData = creationTransaction.transaction_data as CreationTransactionData

  // Start with initial state from creation
  let state: TagState = {
    name: creationData.name,
    color: creationData.color,
    timestamp: creationTransaction.created_at,
    metadata: {},
  }

  // Process remaining transactions in order
  for (const transaction of sortedTransactions) {
    if (transaction.transaction_type === 'creation') {
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
      case 'edit': {
        const data = transaction.transaction_data as EditTransactionData
        state.name = data.name
        break
      }

      case 'set_color': {
        const data = transaction.transaction_data as SetColorTransactionData
        state.color = data.color
        break
      }

      default:
        // Unknown transaction type - log but continue
        console.warn(`Unknown transaction type: ${(transaction as any).transaction_type}`)
    }
  }

  return state
}
