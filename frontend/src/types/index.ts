// Shared TypeScript types

export interface User {
  id: string
  email: string
  name: string
  provider: 'google' | 'github'
}

export interface AuthStatus {
  authenticated: boolean
  user: User | null
}

export interface SeedState {
  seed: string
  timestamp: string
  metadata: Record<string, unknown>
  tags?: Array<{ id: string; name: string }>
  categories?: Array<{ id: string; name: string; path: string }>
}

export interface Seed {
  id: string
  user_id: string
  created_at: string
  currentState: SeedState
  transactions?: SeedTransaction[] // Optional, for timeline view
}

export interface CreateSeedDto {
  content: string
}

// Seed transaction types
export type SeedTransactionType =
  | 'create_seed'
  | 'edit_content'
  | 'add_tag'
  | 'remove_tag'
  | 'add_category'
  | 'remove_category'
  | 'add_followup'

export interface CreateSeedTransactionData {
  content: string
}

export interface EditContentTransactionData {
  content: string
}

export interface AddTagTransactionData {
  tag_id: string
  tag_name: string
}

export interface RemoveTagTransactionData {
  tag_id: string
}

export interface AddCategoryTransactionData {
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

export type SeedTransactionData =
  | CreateSeedTransactionData
  | EditContentTransactionData
  | AddTagTransactionData
  | RemoveTagTransactionData
  | AddCategoryTransactionData
  | RemoveCategoryTransactionData
  | AddFollowupTransactionData

export interface SeedTransaction {
  id: string
  seed_id: string
  transaction_type: SeedTransactionType
  transaction_data: SeedTransactionData
  created_at: string
  automation_id: string | null
}

export interface CreateSeedTransactionDto {
  transaction_type: SeedTransactionType
  transaction_data: SeedTransactionData
  automation_id?: string | null
}

export interface SeedState {
  seed: string
  timestamp: string
  metadata: Record<string, unknown>
  tags?: Array<{ id: string; name: string }>
  categories?: Array<{ id: string; name: string; path: string }>
}

export interface SeedWithState extends Seed {
  current_state?: SeedState
  base_state?: SeedState
}

export interface Category {
  id: string
  parent_id: string | null
  name: string
  path: string
  created_at: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

// Follow-up system types
export type FollowupTransactionType = 'creation' | 'edit' | 'dismissal' | 'snooze'

export type FollowupTrigger = 'manual' | 'automatic'

export type DismissalType = 'followup' | 'snooze'

export type SnoozeMethod = 'manual' | 'automatic'

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

export interface FollowupTransaction {
  id: string
  followup_id: string
  transaction_type: FollowupTransactionType
  transaction_data: FollowupTransactionData
  created_at: string
}

export interface Followup {
  id: string
  seed_id: string
  created_at: string // ISO string
  due_time: string // ISO string
  message: string
  dismissed: boolean
  dismissed_at?: string // ISO string
  transactions: FollowupTransaction[]
}

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

export interface DueFollowup {
  followup_id: string
  seed_id: string
  user_id: string
  due_time: string // ISO string
  message: string
}
