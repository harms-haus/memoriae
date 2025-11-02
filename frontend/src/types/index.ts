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
  patch_json: unknown[]
  enabled: boolean
  created_at: string
  automation_id: string | null
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
