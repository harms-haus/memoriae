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
  seed_content: string
  created_at: string
  currentState: SeedState
}

export interface CreateSeedDto {
  content: string
}

export interface Event {
  id: string
  seed_id: string
  event_type: string
  patch_json: Array<{
    op: 'add' | 'remove' | 'replace'
    path: string
    value?: unknown
  }>
  enabled: boolean
  created_at: string
  automation_id: string | null
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
