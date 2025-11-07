// Tag transaction system types and interfaces

export type TagTransactionType = 
  | 'creation'      // Initial tag creation
  | 'edit'          // Name edits
  | 'set_color'     // Color changes

/**
 * Transaction data structures for each transaction type
 */
export interface CreationTransactionData {
  name: string
  color: string | null
}

export interface EditTransactionData {
  name: string  // New name
}

export interface SetColorTransactionData {
  color: string | null  // New color (can be null to remove color)
}

export type TagTransactionData =
  | CreationTransactionData
  | EditTransactionData
  | SetColorTransactionData

/**
 * Database row for tag_transactions table
 */
export interface TagTransactionRow {
  id: string
  tag_id: string
  transaction_type: TagTransactionType
  transaction_data: TagTransactionData
  created_at: Date
  automation_id: string | null
}

/**
 * Transaction with computed state
 */
export interface TagTransaction {
  id: string
  tag_id: string
  transaction_type: TagTransactionType
  transaction_data: TagTransactionData
  created_at: Date
  automation_id: string | null
}

/**
 * DTOs for API requests
 */
export interface CreateTagTransactionDto {
  transaction_type: TagTransactionType
  transaction_data: TagTransactionData
  automation_id?: string | null
}
