# Data Structures

This page documents all data structures used in Memoriae, including database tables, TypeScript interfaces, and their relationships.

## Database Tables

### users

OAuth user authentication data.

**Columns**:
- `id` (UUID, Primary Key) - Unique user identifier
- `email` (String, Not Null, Unique) - User email address
- `name` (String, Not Null) - User display name
- `provider` (String, Not Null) - OAuth provider: 'google' or 'github'
- `provider_id` (String, Not Null) - OAuth provider's user ID
- `created_at` (Timestamp, Not Null) - Account creation time

**Constraints**:
- Unique constraint on `[provider, provider_id]` - One account per provider ID
- Foreign key references: None (root table)

**Indexes**:
- Primary key on `id`
- Unique index on `email`
- Unique composite index on `[provider, provider_id]`

**Migration**: `001_create_users.ts`

### seeds

Base seed (memory) metadata. Content is stored in transactions, not here.

**Columns**:
- `id` (UUID, Primary Key) - Unique seed identifier
- `user_id` (UUID, Not Null) - Owner of the seed
- `slug` (String, Nullable, Unique) - Human-readable URL slug (format: `{uuidPrefix}/{slug}`)
- `created_at` (Timestamp, Not Null) - Seed creation time

**Constraints**:
- Foreign key: `user_id` → `users.id` (CASCADE on delete)

**Indexes**:
- Primary key on `id`
- Index on `user_id` (for user queries)
- Index on `created_at` (for sorting)
- Unique index on `slug` (for URL lookups)

**Migration**: `002_create_seeds.ts`, `028_add_seed_slug.ts`

**Note**: The `seed_content` column was removed in migration `017_remove_seed_content.ts`. Content is now stored only in the `create_seed` transaction.

### seed_transactions

Immutable transaction records that modify seed state.

**Columns**:
- `id` (UUID, Primary Key) - Unique transaction identifier
- `seed_id` (UUID, Not Null) - Seed this transaction belongs to
- `transaction_type` (Enum, Not Null) - Type of transaction (see Transaction Types below)
- `transaction_data` (JSONB, Not Null) - Type-specific transaction data
- `created_at` (Timestamp, Not Null) - When transaction was created
- `automation_id` (UUID, Nullable) - Automation that created this transaction (null if manual)

**Transaction Types** (Enum: `seed_transaction_type`):
- `create_seed` - Initial seed creation
- `edit_content` - Content modification
- `add_tag` - Add a tag
- `remove_tag` - Remove a tag
- `set_category` - Set category (replaces existing)
- `remove_category` - Remove category
- `add_followup` - Add followup reference (deprecated, use `add_sprout`)
- `add_sprout` - Add sprout reference

**Constraints**:
- Foreign key: `seed_id` → `seeds.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (SET NULL on delete)

**Indexes**:
- Primary key on `id`
- Index on `seed_id` (for seed queries)
- Index on `created_at` (for chronological ordering)
- Index on `transaction_type` (for filtering)
- Composite index on `[seed_id, created_at]` (for timeline queries)

**Migration**: `015_create_seed_transactions.ts`, `033_update_seed_transactions_for_sprouts.ts`

### tags

Tag definitions with colors.

**Columns**:
- `id` (UUID, Primary Key) - Unique tag identifier
- `name` (String, Not Null, Unique) - Tag name (normalized, lowercase)
- `color` (String, Nullable) - Hex color code from style guide palette
- `created_at` (Timestamp, Not Null) - Tag creation time

**Constraints**:
- Unique constraint on `name` - One tag per name

**Indexes**:
- Primary key on `id`
- Unique index on `name`

**Migration**: `006_create_tags.ts`

**Note**: Tag state (name, color) is computed from `tag_transactions`. The `tags` table stores minimal metadata.

### tag_transactions

Immutable transaction records that modify tag state.

**Columns**:
- `id` (UUID, Primary Key) - Unique transaction identifier
- `tag_id` (UUID, Not Null) - Tag this transaction belongs to
- `transaction_type` (Enum, Not Null) - Type of transaction
- `transaction_data` (JSONB, Not Null) - Type-specific transaction data
- `created_at` (Timestamp, Not Null) - When transaction was created
- `automation_id` (UUID, Nullable) - Automation that created this transaction

**Transaction Types**:
- `creation` - Initial tag creation
- `edit` - Name modification
- `set_color` - Color change

**Constraints**:
- Foreign key: `tag_id` → `tags.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (SET NULL on delete)

**Indexes**:
- Primary key on `id`
- Index on `tag_id` (for tag queries)
- Index on `created_at` (for chronological ordering)

**Migration**: `023_create_tag_transactions.ts`

### categories

Hierarchical category structure with path-based organization.

**Columns**:
- `id` (UUID, Primary Key) - Unique category identifier
- `parent_id` (UUID, Nullable) - Parent category (self-referencing)
- `name` (String, Not Null) - Category name
- `path` (String, Not Null) - Full path (e.g., "/work/projects/web")
- `created_at` (Timestamp, Not Null) - Category creation time

**Constraints**:
- Foreign key: `parent_id` → `categories.id` (CASCADE on delete)

**Indexes**:
- Primary key on `id`
- Index on `path` (for hierarchical queries)
- Index on `parent_id` (for parent-child relationships)

**Migration**: `005_create_categories.ts`

**Path Format**: `/parent/child/grandchild` - Always starts with `/`, segments separated by `/`

### sprouts

AI-generated content attached to seeds (followups, musings, references).

**Columns**:
- `id` (UUID, Primary Key) - Unique sprout identifier
- `seed_id` (UUID, Not Null) - Seed this sprout belongs to
- `sprout_type` (Enum, Not Null) - Type of sprout
- `sprout_data` (JSONB, Not Null) - Type-specific sprout data
- `created_at` (Timestamp, Not Null) - Sprout creation time
- `automation_id` (UUID, Nullable) - Automation that created this sprout

**Sprout Types** (Enum: `sprout_type`):
- `followup` - Followup question/reminder
- `musing` - Idea musing (numbered ideas, Wikipedia links, markdown)
- `extra_context` - Additional context (placeholder)
- `fact_check` - Fact checking (placeholder)
- `wikipedia_reference` - Wikipedia article reference

**Constraints**:
- Foreign key: `seed_id` → `seeds.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (SET NULL on delete)

**Indexes**:
- Primary key on `id`
- Index on `seed_id` (for seed queries)
- Index on `created_at` (for sorting)
- Index on `sprout_type` (for filtering)
- Composite index on `[seed_id, created_at]` (for timeline queries)

**Migration**: `030_create_sprouts.ts`, `034_add_wikipedia_sprout_type.ts`

### sprout_followup_transactions

Immutable transaction records that modify followup sprout state.

**Columns**:
- `id` (UUID, Primary Key) - Unique transaction identifier
- `sprout_id` (UUID, Not Null) - Sprout this transaction belongs to
- `transaction_type` (Enum, Not Null) - Type of transaction
- `transaction_data` (JSONB, Not Null) - Type-specific transaction data
- `created_at` (Timestamp, Not Null) - When transaction was created

**Transaction Types**:
- `creation` - Initial followup creation
- `edit` - Edit due time or message
- `dismissal` - Dismiss the followup
- `snooze` - Snooze the followup

**Constraints**:
- Foreign key: `sprout_id` → `sprouts.id` (CASCADE on delete)

**Indexes**:
- Primary key on `id`
- Index on `sprout_id` (for sprout queries)
- Index on `created_at` (for chronological ordering)

**Migration**: `031_create_sprout_followup_transactions.ts`

### sprout_wikipedia_transactions

Immutable transaction records that modify Wikipedia sprout state.

**Columns**:
- `id` (UUID, Primary Key) - Unique transaction identifier
- `sprout_id` (UUID, Not Null) - Sprout this transaction belongs to
- `transaction_type` (Enum, Not Null) - Type of transaction
- `transaction_data` (JSONB, Not Null) - Type-specific transaction data
- `created_at` (Timestamp, Not Null) - When transaction was created

**Transaction Types**:
- `creation` - Initial Wikipedia reference creation
- `edit` - Edit summary

**Constraints**:
- Foreign key: `sprout_id` → `sprouts.id` (CASCADE on delete)

**Indexes**:
- Primary key on `id`
- Index on `sprout_id` (for sprout queries)
- Index on `created_at` (for chronological ordering)

**Migration**: `035_create_sprout_wikipedia_transactions.ts`

### automations

Automation definitions and configuration.

**Columns**:
- `id` (UUID, Primary Key) - Unique automation identifier
- `name` (String, Not Null, Unique) - Automation name (e.g., 'tag', 'categorize')
- `description` (Text, Nullable) - Human-readable description
- `handler_fn_name` (String, Not Null) - Function name to call (matches Automation class)
- `enabled` (Boolean, Not Null, Default: true) - Whether automation is active
- `created_at` (Timestamp, Not Null) - Automation creation time

**Constraints**:
- Unique constraint on `name` - One automation per name

**Indexes**:
- Primary key on `id`
- Unique index on `name`

**Migration**: `003_create_automations.ts`

### pressure_points

Tracks pressure accumulation for automation re-evaluation.

**Columns**:
- `seed_id` (UUID, Not Null) - Seed to re-evaluate
- `automation_id` (UUID, Not Null) - Automation to run
- `pressure_amount` (Decimal(10,2), Not Null, Default: 0) - Pressure value (0-100)
- `last_updated` (Timestamp, Not Null) - Last pressure update time

**Constraints**:
- Composite primary key on `[seed_id, automation_id]` - One pressure point per seed/automation pair
- Foreign key: `seed_id` → `seeds.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (CASCADE on delete)

**Indexes**:
- Composite primary key on `[seed_id, automation_id]`
- Index on `automation_id` (for automation queries)
- Index on `pressure_amount` (for threshold queries)
- Composite index on `[automation_id, pressure_amount]` (for threshold detection)

**Migration**: `009_create_pressure_points.ts`

### automation_queue

Queue of pending automation jobs (deprecated - now uses BullMQ/Redis).

**Columns**:
- `id` (UUID, Primary Key) - Unique queue item identifier
- `seed_id` (UUID, Not Null) - Seed to process
- `automation_id` (UUID, Not Null) - Automation to run
- `priority` (Integer, Not Null, Default: 0) - Job priority (higher = more priority)
- `created_at` (Timestamp, Not Null) - When job was queued

**Constraints**:
- Foreign key: `seed_id` → `seeds.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (CASCADE on delete)

**Indexes**:
- Primary key on `id`
- Index on `seed_id`
- Index on `automation_id`
- Index on `priority`
- Index on `created_at`
- Composite index on `[priority, created_at]` (for queue ordering)

**Migration**: `010_create_automation_queue.ts`

**Note**: This table is maintained for backward compatibility but jobs are now stored in Redis via BullMQ.

### user_settings

User preferences and configuration.

**Columns**:
- `id` (UUID, Primary Key) - Unique settings identifier
- `user_id` (UUID, Not Null, Unique) - User these settings belong to
- `openrouter_api_key` (String, Nullable) - User's OpenRouter API key
- `openrouter_model` (String, Nullable) - Preferred AI model (e.g., 'openai/gpt-4')
- `timezone` (String, Nullable) - User's timezone (e.g., 'America/New_York')
- `created_at` (Timestamp, Not Null) - Settings creation time
- `updated_at` (Timestamp, Not Null) - Last update time

**Constraints**:
- Foreign key: `user_id` → `users.id` (CASCADE on delete)
- Unique constraint on `user_id` - One settings record per user

**Indexes**:
- Primary key on `id`
- Unique index on `user_id`

**Migration**: `011_create_user_settings.ts`, `012_add_openrouter_model_name.ts`, `024_add_timezone_to_user_settings.ts`

## TypeScript Interfaces

### SeedState

Computed seed state structure.

**Location**: `backend/src/utils/seed-state.ts`, `frontend/src/types/index.ts`

```typescript
interface SeedState {
  seed: string                    // Current content
  timestamp: Date                 // Creation timestamp
  metadata: Record<string, unknown> // Additional metadata
  tags?: Array<{                  // Current tags
    id: string
    name: string
  }>
  categories?: Array<{            // Current categories
    id: string
    name: string
    path: string
  }>
}
```

**Computation**: State is computed by `computeSeedState()` function from `seed_transactions`.

### SeedTransaction

Transaction record with type-safe data.

**Location**: `backend/src/types/seed-transactions.ts`

```typescript
interface SeedTransaction {
  id: string
  seed_id: string
  transaction_type: SeedTransactionType
  transaction_data: SeedTransactionData
  created_at: Date
  automation_id: string | null
}
```

**Transaction Data Types**:
- `CreateSeedTransactionData`: `{ content: string }`
- `EditContentTransactionData`: `{ content: string }`
- `AddTagTransactionData`: `{ tag_id: string, tag_name: string }`
- `RemoveTagTransactionData`: `{ tag_id: string, tag_name?: string }`
- `SetCategoryTransactionData`: `{ category_id: string, category_name: string, category_path: string }`
- `RemoveCategoryTransactionData`: `{ category_id: string }`
- `AddSproutTransactionData`: `{ sprout_id: string }`

### TagState

Computed tag state structure.

**Location**: `backend/src/utils/tag-state.ts`

```typescript
interface TagState {
  name: string
  color: string | null
  timestamp: Date
  metadata: Record<string, unknown>
}
```

**Computation**: State is computed by `computeTagState()` function from `tag_transactions`.

### Category

Category structure with hierarchy.

**Location**: `backend/src/services/categories.ts`, `frontend/src/types/index.ts`

```typescript
interface Category {
  id: string
  parent_id: string | null
  name: string
  path: string
  created_at: string
}
```

### Sprout

Sprout structure with type-specific data.

**Location**: `backend/src/types/sprouts.ts`

```typescript
interface Sprout {
  id: string
  seed_id: string
  sprout_type: SproutType
  sprout_data: SproutData
  created_at: Date
  automation_id: string | null
}
```

**Sprout Data Types**:
- `FollowupSproutData`: `{ trigger: 'manual' | 'automatic', initial_time: string, initial_message: string }`
- `MusingSproutData`: `{ template_type: 'numbered_ideas' | 'wikipedia_links' | 'markdown', content: MusingContent, dismissed: boolean, dismissed_at: string | null, completed: boolean, completed_at: string | null }`
- `WikipediaReferenceSproutData`: `{ reference: string, article_url: string, article_title: string, summary: string }`

### AutomationContext

Context passed to automation methods.

**Location**: `backend/src/services/automation/base.ts`

```typescript
interface AutomationContext {
  openrouter: OpenRouterClient    // AI API client
  userId: string                  // User ID
  toolExecutor: ToolExecutor      // Tool execution
  metadata?: Record<string, unknown> // Optional metadata
}
```

## Frontend Types

### Seed

Seed with computed state.

**Location**: `frontend/src/types/index.ts`

```typescript
interface Seed {
  id: string
  user_id: string
  created_at: string
  slug?: string | null
  currentState: SeedState
  transactions?: SeedTransaction[] // Optional, for timeline view
}
```

### User

User information.

**Location**: `frontend/src/types/index.ts`

```typescript
interface User {
  id: string
  email: string
  name: string
  provider: 'google' | 'github'
}
```

### Tag

Tag with color.

**Location**: `frontend/src/types/index.ts`

```typescript
interface Tag {
  id: string
  name: string
  color: string
}
```

## Data Relationships

### Seed Relationships

```
seeds
  ├── seed_transactions (1:N) - All state changes
  ├── sprouts (1:N) - AI-generated content
  └── pressure_points (1:N) - Automation pressure tracking
```

### Tag Relationships

```
tags
  └── tag_transactions (1:N) - All state changes
```

### Category Relationships

```
categories
  ├── parent_id → categories (self-referencing, N:1)
  └── children (1:N via parent_id)
```

### Sprout Relationships

```
sprouts
  ├── sprout_followup_transactions (1:N, if type='followup')
  └── sprout_wikipedia_transactions (1:N, if type='wikipedia_reference')
```

### Automation Relationships

```
automations
  ├── seed_transactions (1:N) - Transactions created by automation
  ├── sprouts (1:N) - Sprouts created by automation
  ├── pressure_points (1:N) - Pressure tracking
  └── automation_queue (1:N) - Queued jobs (deprecated)
```

## Related Documentation

- [Database Schema](Database-Schema) - Complete schema with all migrations
- [Algorithms: State Computation](Algorithms-State-Computation) - How state is computed
- [Timeline System](Timeline-System) - Transaction-based event sourcing

