// Follow-up system types and interfaces

export type FollowupTransactionType = 'creation' | 'edit' | 'dismissal' | 'snooze'

export type FollowupTrigger = 'manual' | 'automatic'

export type DismissalType = 'followup' | 'snooze'

export type SnoozeMethod = 'manual' | 'automatic'

/**
 * Transaction data structures for each transaction type
 */
export interface CreationTransactionData {
  trigger: FollowupTrigger
  initial_time: string // ISO string
  initial_message: string
}

export interface EditTransactionData {
  old_time?: string // ISO string
  new_time: string // ISO string
  old_message?: string
  new_message: string
}

export interface DismissalTransactionData {
  dismissed_at: string // ISO string
  type: DismissalType
}

export interface SnoozeTransactionData {
  snoozed_at: string // ISO string
  duration_minutes: number
  method: SnoozeMethod
}

export type FollowupTransactionData =
  | CreationTransactionData
  | EditTransactionData
  | DismissalTransactionData
  | SnoozeTransactionData

/**
 * Database row for followup_transactions table
 */
export interface FollowupTransactionRow {
  id: string
  followup_id: string
  transaction_type: FollowupTransactionType
  transaction_data: FollowupTransactionData
  created_at: Date
}

/**
 * Database row for followups table
 */
export interface FollowupRow {
  id: string
  seed_id: string
}

/**
 * Computed followup state (rebuilt from transactions)
 */
export interface Followup {
  id: string
  seed_id: string
  created_at: Date // From creation transaction
  due_time: Date // Computed from creation + edits + snoozes
  message: string // Current message (from creation + edits)
  dismissed: boolean // True if dismissed transaction exists
  dismissed_at?: Date // From dismissal transaction if dismissed
  transactions: FollowupTransaction[]
}

/**
 * Transaction with computed state
 */
export interface FollowupTransaction {
  id: string
  followup_id: string
  transaction_type: FollowupTransactionType
  transaction_data: FollowupTransactionData
  created_at: Date
}

/**
 * DTOs for API requests
 */
export interface CreateFollowupDto {
  due_time: string // ISO string
  message: string
}

export interface EditFollowupDto {
  due_time?: string // ISO string
  message?: string
}

export interface SnoozeFollowupDto {
  duration_minutes: number
}

export interface DismissFollowupDto {
  type: DismissalType
}

/**
 * Due followup with user info for notifications
 */
export interface DueFollowup {
  followup_id: string
  seed_id: string
  user_id: string
  due_time: Date
  message: string
}

