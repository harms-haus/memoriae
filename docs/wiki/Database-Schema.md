# Database Schema

This page provides complete documentation of the Memoriae database schema, including all tables, columns, indexes, foreign keys, and migration history.

## Schema Overview

Memoriae uses **PostgreSQL** with a transaction-based event sourcing architecture. The schema is managed through **Knex.js migrations** located in `backend/src/db/migrations/`.

## Core Tables

### users

OAuth user authentication data.

**Columns**:
- `id` (UUID, Primary Key) - Unique user identifier
- `email` (String, Not Null, Unique) - User email address
- `name` (String, Not Null) - User display name
- `provider` (String, Not Null) - OAuth provider: 'google' or 'github'
- `provider_id` (String, Not Null) - OAuth provider's user ID
- `created_at` (Timestamp, Not Null, Default: now()) - Account creation time

**Constraints**:
- Primary key on `id`
- Unique constraint on `email`
- Unique composite constraint on `[provider, provider_id]`

**Indexes**:
- Primary key index on `id`
- Unique index on `email`
- Unique composite index on `[provider, provider_id]`

**Migration**: `001_create_users.ts`

### seeds

Base seed (memory) metadata. Content stored in transactions.

**Columns**:
- `id` (UUID, Primary Key) - Unique seed identifier
- `user_id` (UUID, Not Null) - Owner of the seed
- `slug` (String(200), Nullable, Unique) - Human-readable URL slug
- `created_at` (Timestamp, Not Null, Default: now()) - Seed creation time

**Constraints**:
- Primary key on `id`
- Foreign key: `user_id` → `users.id` (CASCADE on delete)
- Unique constraint on `slug` (allows NULL)

**Indexes**:
- Primary key index on `id`
- Index on `user_id` (for user queries)
- Index on `created_at` (for sorting)
- Unique index on `slug` (for URL lookups)

**Migration**: `002_create_seeds.ts`, `028_add_seed_slug.ts`

**Note**: The `seed_content` column was removed in migration `017_remove_seed_content.ts`. Content is now stored only in transactions.

### seed_transactions

Immutable transaction records that modify seed state.

**Columns**:
- `id` (UUID, Primary Key) - Unique transaction identifier
- `seed_id` (UUID, Not Null) - Seed this transaction belongs to
- `transaction_type` (Enum, Not Null) - Type of transaction
- `transaction_data` (JSONB, Not Null) - Type-specific transaction data
- `created_at` (Timestamp, Not Null, Default: now()) - When transaction was created
- `automation_id` (UUID, Nullable) - Automation that created this transaction

**Transaction Types** (Enum: `seed_transaction_type`):
- `create_seed` - Initial seed creation
- `edit_content` - Content modification
- `add_tag` - Add a tag
- `remove_tag` - Remove a tag
- `set_category` - Set category (replaces existing)
- `remove_category` - Remove category
- `add_followup` - Add followup reference (deprecated)
- `add_sprout` - Add sprout reference

**Constraints**:
- Primary key on `id`
- Foreign key: `seed_id` → `seeds.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (SET NULL on delete)

**Indexes**:
- Primary key index on `id`
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
- `created_at` (Timestamp, Not Null, Default: now()) - Tag creation time

**Constraints**:
- Primary key on `id`
- Unique constraint on `name`

**Indexes**:
- Primary key index on `id`
- Unique index on `name`

**Migration**: `006_create_tags.ts`

**Note**: Tag state (name, color) is computed from `tag_transactions`. This table stores minimal metadata.

### tag_transactions

Immutable transaction records that modify tag state.

**Columns**:
- `id` (UUID, Primary Key) - Unique transaction identifier
- `tag_id` (UUID, Not Null) - Tag this transaction belongs to
- `transaction_type` (Enum, Not Null) - Type of transaction
- `transaction_data` (JSONB, Not Null) - Type-specific transaction data
- `created_at` (Timestamp, Not Null, Default: now()) - When transaction was created
- `automation_id` (UUID, Nullable) - Automation that created this transaction

**Transaction Types** (Enum: `tag_transaction_type`):
- `creation` - Initial tag creation
- `edit` - Name modification
- `set_color` - Color change

**Constraints**:
- Primary key on `id`
- Foreign key: `tag_id` → `tags.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (SET NULL on delete)

**Indexes**:
- Primary key index on `id`
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
- `created_at` (Timestamp, Not Null, Default: now()) - Category creation time

**Constraints**:
- Primary key on `id`
- Foreign key: `parent_id` → `categories.id` (CASCADE on delete)

**Indexes**:
- Primary key index on `id`
- Index on `path` (for hierarchical queries)
- Index on `parent_id` (for parent-child relationships)

**Migration**: `005_create_categories.ts`

### sprouts

AI-generated content attached to seeds.

**Columns**:
- `id` (UUID, Primary Key) - Unique sprout identifier
- `seed_id` (UUID, Not Null) - Seed this sprout belongs to
- `sprout_type` (Enum, Not Null) - Type of sprout
- `sprout_data` (JSONB, Not Null) - Type-specific sprout data
- `created_at` (Timestamp, Not Null, Default: now()) - Sprout creation time
- `automation_id` (UUID, Nullable) - Automation that created this sprout

**Sprout Types** (Enum: `sprout_type`):
- `followup` - Followup question/reminder
- `musing` - Idea musing (numbered ideas, Wikipedia links, markdown)
- `extra_context` - Additional context (placeholder)
- `fact_check` - Fact checking (placeholder)
- `wikipedia_reference` - Wikipedia article reference

**Constraints**:
- Primary key on `id`
- Foreign key: `seed_id` → `seeds.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (SET NULL on delete)

**Indexes**:
- Primary key index on `id`
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
- `created_at` (Timestamp, Not Null, Default: now()) - When transaction was created

**Transaction Types** (Enum: `sprout_followup_transaction_type`):
- `creation` - Initial followup creation
- `edit` - Edit due time or message
- `dismissal` - Dismiss the followup
- `snooze` - Snooze the followup

**Constraints**:
- Primary key on `id`
- Foreign key: `sprout_id` → `sprouts.id` (CASCADE on delete)

**Indexes**:
- Primary key index on `id`
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
- `created_at` (Timestamp, Not Null, Default: now()) - When transaction was created

**Transaction Types** (Enum: `wikipedia_transaction_type`):
- `creation` - Initial Wikipedia reference creation
- `edit` - Edit summary

**Constraints**:
- Primary key on `id`
- Foreign key: `sprout_id` → `sprouts.id` (CASCADE on delete)

**Indexes**:
- Primary key index on `id`
- Index on `sprout_id` (for sprout queries)
- Index on `created_at` (for chronological ordering)

**Migration**: `035_create_sprout_wikipedia_transactions.ts`

## Automation Tables

### automations

Automation definitions and configuration.

**Columns**:
- `id` (UUID, Primary Key) - Unique automation identifier
- `name` (String, Not Null, Unique) - Automation name (e.g., 'tag', 'categorize')
- `description` (Text, Nullable) - Human-readable description
- `handler_fn_name` (String, Not Null) - Function name to call (matches Automation class)
- `enabled` (Boolean, Not Null, Default: true) - Whether automation is active
- `created_at` (Timestamp, Not Null, Default: now()) - Automation creation time

**Constraints**:
- Primary key on `id`
- Unique constraint on `name`

**Indexes**:
- Primary key index on `id`
- Unique index on `name`

**Migration**: `003_create_automations.ts`

### pressure_points

Tracks pressure accumulation for automation re-evaluation.

**Columns**:
- `seed_id` (UUID, Not Null) - Seed to re-evaluate
- `automation_id` (UUID, Not Null) - Automation to run
- `pressure_amount` (Decimal(10,2), Not Null, Default: 0) - Pressure value (0-100)
- `last_updated` (Timestamp, Not Null, Default: now()) - Last pressure update time

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
- `created_at` (Timestamp, Not Null, Default: now()) - When job was queued

**Constraints**:
- Primary key on `id`
- Foreign key: `seed_id` → `seeds.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (CASCADE on delete)

**Indexes**:
- Primary key index on `id`
- Index on `seed_id`
- Index on `automation_id`
- Index on `priority`
- Index on `created_at`
- Composite index on `[priority, created_at]` (for queue ordering)

**Migration**: `010_create_automation_queue.ts`

**Note**: This table is maintained for backward compatibility but jobs are now stored in Redis via BullMQ.

## User Settings

### user_settings

User preferences and configuration.

**Columns**:
- `id` (UUID, Primary Key) - Unique settings identifier
- `user_id` (UUID, Not Null, Unique) - User these settings belong to
- `openrouter_api_key` (String, Nullable) - User's OpenRouter API key
- `openrouter_model` (String, Nullable) - Preferred AI model (e.g., 'openai/gpt-4')
- `openrouter_model_name` (String, Nullable) - Human-readable model name
- `timezone` (String, Nullable) - User's timezone (e.g., 'America/New_York')
- `created_at` (Timestamp, Not Null, Default: now()) - Settings creation time
- `updated_at` (Timestamp, Not Null, Default: now()) - Last update time

**Constraints**:
- Primary key on `id`
- Foreign key: `user_id` → `users.id` (CASCADE on delete)
- Unique constraint on `user_id` - One settings record per user

**Indexes**:
- Primary key index on `id`
- Unique index on `user_id`

**Migration**: `011_create_user_settings.ts`, `012_add_openrouter_model_name.ts`, `024_add_timezone_to_user_settings.ts`

## Idea Musing Tables

### idea_musings

Idea musing records (deprecated - now uses sprouts).

**Columns**:
- `id` (UUID, Primary Key) - Unique musing identifier
- `seed_id` (UUID, Not Null) - Seed this musing belongs to
- `template_type` (String, Not Null) - Template type: 'numbered_ideas', 'wikipedia_links', 'markdown'
- `content` (JSONB, Not Null) - Musing content
- `dismissed` (Boolean, Not Null, Default: false) - Whether musing is dismissed
- `dismissed_at` (Timestamp, Nullable) - When musing was dismissed
- `completed` (Boolean, Not Null, Default: false) - Whether musing is completed
- `completed_at` (Timestamp, Nullable) - When musing was completed
- `created_at` (Timestamp, Not Null, Default: now()) - Musing creation time
- `automation_id` (UUID, Nullable) - Automation that created this musing

**Constraints**:
- Primary key on `id`
- Foreign key: `seed_id` → `seeds.id` (CASCADE on delete)
- Foreign key: `automation_id` → `automations.id` (SET NULL on delete)

**Indexes**:
- Primary key index on `id`
- Index on `seed_id`
- Index on `created_at`

**Migration**: `025_create_idea_musings.ts`, `027_add_completed_to_idea_musings.ts`

**Note**: This table is deprecated. Idea musings are now stored as `sprouts` with `sprout_type = 'musing'`.

### idea_musing_shown_history

Tracks when idea musings were shown to users.

**Columns**:
- `id` (UUID, Primary Key) - Unique history record identifier
- `idea_musing_id` (UUID, Not Null) - Musing that was shown
- `user_id` (UUID, Not Null) - User who was shown the musing
- `shown_at` (Timestamp, Not Null, Default: now()) - When musing was shown

**Constraints**:
- Primary key on `id`
- Foreign key: `idea_musing_id` → `idea_musings.id` (CASCADE on delete)
- Foreign key: `user_id` → `users.id` (CASCADE on delete)

**Indexes**:
- Primary key index on `id`
- Index on `idea_musing_id`
- Index on `user_id`
- Index on `shown_at`

**Migration**: `026_create_idea_musing_shown_history.ts`

**Note**: This table is deprecated along with `idea_musings`.

## Deprecated Tables

### events

**Status**: Deprecated (replaced by `seed_transactions`)

**Migration**: `004_create_events.ts`, `020_deprecate_events_table.ts`

**Note**: Events table is kept for backward compatibility but new transactions are stored in `seed_transactions`.

### seed_tags

**Status**: Removed (tags now stored in seed state via transactions)

**Migration**: `007_create_seed_tags.ts`, `018_drop_seed_tags_table.ts`

### seed_categories

**Status**: Removed (categories now stored in seed state via transactions)

**Migration**: `008_create_seed_categories.ts`, `019_drop_seed_categories_table.ts`

### followups

**Status**: Deprecated (replaced by sprouts)

**Migration**: `013_create_followups.ts`, `032_migrate_followups_and_musings_to_sprouts.ts`

**Note**: Followups are now stored as `sprouts` with `sprout_type = 'followup'`.

### followup_transactions

**Status**: Deprecated (replaced by `sprout_followup_transactions`)

**Migration**: `014_create_followup_transactions.ts`, `032_migrate_followups_and_musings_to_sprouts.ts`

## Migration History

### Core Migrations

1. `001_create_users.ts` - User authentication
2. `002_create_seeds.ts` - Seed base table
3. `003_create_automations.ts` - Automation definitions
4. `004_create_events.ts` - Events (deprecated)
5. `005_create_categories.ts` - Category hierarchy
6. `006_create_tags.ts` - Tag definitions
7. `007_create_seed_tags.ts` - Seed-tag relationships (removed)
8. `008_create_seed_categories.ts` - Seed-category relationships (removed)
9. `009_create_pressure_points.ts` - Pressure tracking
10. `010_create_automation_queue.ts` - Queue table (deprecated)
11. `011_create_user_settings.ts` - User preferences
12. `012_add_openrouter_model_name.ts` - Model name field
13. `013_create_followups.ts` - Followups (deprecated)
14. `014_create_followup_transactions.ts` - Followup transactions (deprecated)
15. `015_create_seed_transactions.ts` - Seed transaction system
16. `017_remove_seed_content.ts` - Remove seed_content column
17. `018_drop_seed_tags_table.ts` - Remove seed_tags table
18. `019_drop_seed_categories_table.ts` - Remove seed_categories table
19. `020_deprecate_events_table.ts` - Mark events as deprecated
20. `021_cleanup_invalid_seeds.ts` - Cleanup migration
21. `022_change_add_category_to_set_category.ts` - Transaction type change
22. `023_create_tag_transactions.ts` - Tag transaction system
23. `024_add_timezone_to_user_settings.ts` - Timezone support
24. `025_create_idea_musings.ts` - Idea musings (deprecated)
25. `026_create_idea_musing_shown_history.ts` - Musing history (deprecated)
26. `027_add_completed_to_idea_musings.ts` - Completed field
27. `028_add_seed_slug.ts` - Slug column
28. `029_backfill_seed_slugs.ts` - Slug backfill
29. `030_create_sprouts.ts` - Sprout system
30. `031_create_sprout_followup_transactions.ts` - Followup sprout transactions
31. `032_migrate_followups_and_musings_to_sprouts.ts` - Data migration
32. `033_update_seed_transactions_for_sprouts.ts` - Sprout transaction support
33. `034_add_wikipedia_sprout_type.ts` - Wikipedia sprout type
34. `035_create_sprout_wikipedia_transactions.ts` - Wikipedia sprout transactions

## Index Strategy

### Performance Indexes

**User Queries**:
- `seeds.user_id` - Fast user seed lookups
- `seed_transactions.seed_id` - Fast transaction queries

**Timeline Queries**:
- `[seed_id, created_at]` - Chronological ordering
- `[sprout_id, created_at]` - Sprout timeline

**Hierarchical Queries**:
- `categories.path` - Path-based queries
- `categories.parent_id` - Parent-child relationships

**Pressure System**:
- `[automation_id, pressure_amount]` - Threshold detection
- `pressure_points.automation_id` - Automation queries

**Search and Lookup**:
- `seeds.slug` - URL lookups
- `tags.name` - Tag name lookups

## Foreign Key Relationships

### Cascade Deletes

- `seeds.user_id` → `users.id` (CASCADE) - Deleting user deletes all seeds
- `seed_transactions.seed_id` → `seeds.id` (CASCADE) - Deleting seed deletes transactions
- `sprouts.seed_id` → `seeds.id` (CASCADE) - Deleting seed deletes sprouts
- `categories.parent_id` → `categories.id` (CASCADE) - Deleting category deletes children

### Set NULL on Delete

- `seed_transactions.automation_id` → `automations.id` (SET NULL) - Keep transactions if automation deleted
- `sprouts.automation_id` → `automations.id` (SET NULL) - Keep sprouts if automation deleted

## Query Patterns

### Common Queries

**Get seed with state**:
```sql
SELECT * FROM seeds WHERE id = ? AND user_id = ?
-- Then compute state from seed_transactions
```

**Get transactions chronologically**:
```sql
SELECT * FROM seed_transactions
WHERE seed_id = ?
ORDER BY created_at ASC
```

**Get categories in hierarchy**:
```sql
SELECT * FROM categories
WHERE path LIKE '/parent/%'
ORDER BY path
```

**Get pressure points exceeding threshold**:
```sql
SELECT * FROM pressure_points
WHERE automation_id = ? AND pressure_amount >= ?
ORDER BY pressure_amount DESC
```

## Related Documentation

- [Data Structures](Data-Structures) - TypeScript interfaces
- [Algorithms: State Computation](Algorithms-State-Computation) - State computation
- [Algorithms: Category Hierarchy](Algorithms-Category-Hierarchy) - Category queries
- [Database Patterns](Backend-Patterns#database-query-patterns) - Query patterns

