// Seed transaction system types and interfaces

export type SeedTransactionType =
  | 'create_seed'      // Initial seed creation
  | 'edit_content'     // Content edits
  | 'add_tag'          // Add a tag
  | 'remove_tag'       // Remove a tag
  | 'set_category'     // Set a category (replaces any existing category)
  | 'remove_category'  // Remove a category
  | 'add_followup'     // Add a followup reference (deprecated, use add_sprout)
  | 'add_sprout'       // Add a sprout reference

/**
 * Transaction data structures for each transaction type
 */
export interface CreateSeedTransactionData {
  content: string
}

export interface EditContentTransactionData {
  content: string  // New content (replaces previous)
}

export interface AddTagTransactionData {
  tag_id: string
  tag_name: string
}

export interface RemoveTagTransactionData {
  tag_id: string
  tag_name?: string // Optional for backward compatibility, but should be included for display purposes
}

export interface SetCategoryTransactionData {
  category_id: string
  category_name: string
  category_path: string
}

export interface RemoveCategoryTransactionData {
  category_id: string
}

export interface AddFollowupTransactionData {
  followup_id: string
}

export interface AddSproutTransactionData {
  sprout_id: string
}

export type SeedTransactionData =
  | CreateSeedTransactionData
  | EditContentTransactionData
  | AddTagTransactionData
  | RemoveTagTransactionData
  | SetCategoryTransactionData
  | RemoveCategoryTransactionData
  | AddFollowupTransactionData
  | AddSproutTransactionData

/**
 * Database row for seed_transactions table
 */
export interface SeedTransactionRow {
  id: string
  seed_id: string
  transaction_type: SeedTransactionType
  transaction_data: SeedTransactionData
  created_at: Date
  automation_id: string | null
}

/**
 * Transaction with computed state
 */
export interface SeedTransaction {
  id: string
  seed_id: string
  transaction_type: SeedTransactionType
  transaction_data: SeedTransactionData
  created_at: Date
  automation_id: string | null
}

/**
 * DTOs for API requests
 */
export interface CreateSeedTransactionDto {
  transaction_type: SeedTransactionType
  transaction_data: SeedTransactionData
  automation_id?: string | null
}

