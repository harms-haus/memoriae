// Sprout system types and interfaces

export type SproutType = 'followup' | 'musing' | 'extra_context' | 'fact_check'

/**
 * Database row for sprouts table
 */
export interface SproutRow {
  id: string
  seed_id: string
  sprout_type: SproutType
  sprout_data: unknown // JSONB - will be typed based on sprout_type
  created_at: Date
  automation_id: string | null
}

/**
 * Base Sprout interface
 */
export interface Sprout {
  id: string
  seed_id: string
  sprout_type: SproutType
  sprout_data: SproutData
  created_at: Date
  automation_id: string | null
}

/**
 * Union type for all sprout data types
 */
export type SproutData =
  | FollowupSproutData
  | MusingSproutData
  | ExtraContextSproutData
  | FactCheckSproutData

/**
 * Followup sprout data (stored in sprout_data JSONB)
 * State is computed from sprout_followup_transactions
 */
export interface FollowupSproutData {
  trigger: 'manual' | 'automatic'
  initial_time: string // ISO string
  initial_message: string
}

/**
 * Musing sprout data (stored in sprout_data JSONB)
 */
export interface MusingSproutData {
  template_type: 'numbered_ideas' | 'wikipedia_links' | 'markdown'
  content: MusingContent
  dismissed: boolean
  dismissed_at: string | null // ISO string
  completed: boolean
  completed_at: string | null // ISO string
}

/**
 * Musing content types (from idea-musings.ts)
 */
export interface NumberedIdeasContent {
  ideas: string[]
}

export interface WikipediaLinksContent {
  links: Array<{
    title: string
    url: string
  }>
}

export interface MarkdownContent {
  markdown: string
}

export type MusingContent = NumberedIdeasContent | WikipediaLinksContent | MarkdownContent

/**
 * Extra context sprout data (placeholder for future implementation)
 */
export interface ExtraContextSproutData {
  // Placeholder - to be implemented
  [key: string]: unknown
}

/**
 * Fact check sprout data (placeholder for future implementation)
 */
export interface FactCheckSproutData {
  // Placeholder - to be implemented
  [key: string]: unknown
}

/**
 * Sprout followup transaction types (moved from followups.ts)
 */
export type SproutFollowupTransactionType = 'creation' | 'edit' | 'dismissal' | 'snooze'

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

export type SproutFollowupTransactionData =
  | CreationTransactionData
  | EditTransactionData
  | DismissalTransactionData
  | SnoozeTransactionData

/**
 * Database row for sprout_followup_transactions table
 */
export interface SproutFollowupTransactionRow {
  id: string
  sprout_id: string
  transaction_type: SproutFollowupTransactionType
  transaction_data: SproutFollowupTransactionData
  created_at: Date
}

/**
 * Sprout followup transaction with computed state
 */
export interface SproutFollowupTransaction {
  id: string
  sprout_id: string
  transaction_type: SproutFollowupTransactionType
  transaction_data: SproutFollowupTransactionData
  created_at: Date
}

/**
 * Computed followup sprout state (rebuilt from transactions)
 */
export interface FollowupSproutState {
  due_time: Date
  message: string
  dismissed: boolean
  dismissed_at?: Date
  transactions: SproutFollowupTransaction[]
}

/**
 * DTOs for API requests
 */
export interface CreateSproutDto {
  sprout_type: SproutType
  sprout_data: SproutData
  automation_id?: string | null
}

export interface CreateFollowupSproutDto {
  due_time: string // ISO string
  message: string
  trigger?: 'manual' | 'automatic'
}

export interface EditFollowupSproutDto {
  due_time?: string // ISO string
  message?: string
}

export interface SnoozeFollowupSproutDto {
  duration_minutes: number
}

export interface DismissFollowupSproutDto {
  type: DismissalType
}

export interface CreateMusingSproutDto {
  template_type: 'numbered_ideas' | 'wikipedia_links' | 'markdown'
  content: MusingContent
}

