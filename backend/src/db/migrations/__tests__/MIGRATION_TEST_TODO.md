# Migration Testing TODO

## Overview

Testing plan for database migrations 001-010. Each migration will be tested for:

- Schema creation (tables, columns, types, constraints)
- Indexes (existence and correctness)
- Foreign keys (relationships and CASCADE behavior)
- Rollback functionality
- Edge cases and data integrity

## Shared Test Infrastructure

- [x] Create migration test utilities file (`migration-test-helpers.ts`)
  - [x] `setupTestDatabase()` - Create fresh test DB connection
  - [x] `teardownTestDatabase()` - Clean up DB connection
  - [x] `runMigrationsUpTo()` - Run migrations up to specific migration
  - [x] `getTableInfo()` - Get table schema information
  - [x] `getIndexes()` - Get all indexes for a table
  - [x] `getForeignKeys()` - Get all foreign keys for a table
  - [x] `createTestUser()` - Helper to create test user data
  - [x] `createTestSeed()` - Helper to create test seed data
  - [x] Suppress logs/errors/warnings during tests

## Migration 001: create_users

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `email` is unique
  - [x] Composite unique constraint on `[provider, provider_id]`
  - [x] `created_at` has default value
- [x] Test constraints
  - [x] Cannot insert duplicate email
  - [x] Cannot insert duplicate `[provider, provider_id]` combination
  - [x] Can insert same email with different provider
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [ ] Very long email strings are handled
  - [ ] Special characters in email/provider_id

## Migration 002: create_seeds

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] Foreign key to `users` table
  - [x] Indexes on `user_id` and `created_at`
- [x] Test foreign key constraints
  - [x] Cannot insert seed with non-existent user_id
  - [x] CASCADE delete works (deleting user deletes seeds)
- [x] Test rollback
  - [x] Table is dropped on rollback
  - [x] Foreign key constraint is removed
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [ ] Very long seed_content is handled
  - [x] Empty seed_content is allowed

## Migration 003: create_automations

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `name` is unique
  - [x] `enabled` defaults to true
- [x] Test constraints
  - [x] Cannot insert duplicate name
  - [x] `enabled` can be set to false
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [ ] Very long name/description strings are handled
  - [x] NULL description is allowed

## Migration 004: create_events

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] Foreign keys to `seeds` and `automations`
  - [x] `enabled` defaults to true
  - [x] `automation_id` can be NULL
- [x] Test indexes
  - [x] Index on `seed_id`
  - [x] Index on `enabled`
  - [x] Index on `created_at`
  - [x] Composite index on `[seed_id, enabled, created_at]`
- [x] Test foreign key constraints
  - [x] Cannot insert event with non-existent seed_id
  - [x] Can insert event with NULL automation_id
  - [x] Can insert event with valid automation_id
  - [x] CASCADE delete works (deleting seed deletes events)
  - [x] SET NULL works (deleting automation sets automation_id to NULL)
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [ ] Invalid JSON in patch_json is handled
  - [ ] Very large patch_json is handled

## Migration 005: create_categories

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] Self-referencing foreign key on `parent_id`
  - [x] Indexes on `path` and `parent_id`
- [x] Test self-referencing foreign key
  - [x] Can create root category (parent_id = NULL)
  - [x] Can create child category with valid parent_id
  - [x] Cannot create child category with non-existent parent_id
  - [x] CASCADE delete works (deleting parent deletes children)
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [ ] Very long name/path strings are handled
  - [ ] Circular parent relationships are prevented (if applicable)

## Migration 006: create_tags

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `name` is unique
- [x] Test constraints
  - [x] Cannot insert duplicate name
  - [x] `color` can be NULL
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [ ] Very long name strings are handled
  - [ ] Special characters in name are handled

## Migration 007: create_seed_tags

- [x] Test table creation
  - [x] Table exists after migration
  - [x] Composite primary key on `[seed_id, tag_id]`
  - [x] Foreign keys to `seeds`, `tags`, and `events`
  - [x] Indexes on `seed_id` and `tag_id`
- [x] Test composite primary key
  - [x] Cannot insert duplicate `[seed_id, tag_id]` combination
  - [x] Can insert same seed_id with different tag_id
  - [x] Can insert same tag_id with different seed_id
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent seed_id
  - [x] Cannot insert with non-existent tag_id
  - [x] Can insert with NULL added_by_event_id
  - [ ] Can insert with valid added_by_event_id
  - [x] CASCADE delete works (deleting seed/tag deletes junction records)
  - [ ] SET NULL works (deleting event sets added_by_event_id to NULL)
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 008: create_seed_categories

- [x] Test table creation
  - [x] Table exists after migration
  - [x] Composite primary key on `[seed_id, category_id]`
  - [x] Foreign keys to `seeds`, `categories`, and `events`
  - [x] Indexes on `seed_id` and `category_id`
- [x] Test composite primary key
  - [x] Cannot insert duplicate `[seed_id, category_id]` combination
  - [ ] Can insert same seed_id with different category_id
  - [ ] Can insert same category_id with different seed_id
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent seed_id
  - [x] Cannot insert with non-existent category_id
  - [x] Can insert with NULL added_by_event_id
  - [ ] Can insert with valid added_by_event_id
  - [x] CASCADE delete works (deleting seed/category deletes junction records)
  - [ ] SET NULL works (deleting event sets added_by_event_id to NULL)
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 009: create_pressure_points

- [x] Test table creation
  - [x] Table exists after migration
  - [x] Composite primary key on `[seed_id, automation_id]`
  - [x] Foreign keys to `seeds` and `automations`
  - [x] `pressure_amount` defaults to 0
  - [x] Indexes on `automation_id`, `pressure_amount`, and composite `[automation_id, pressure_amount]`
- [x] Test composite primary key
  - [x] Cannot insert duplicate `[seed_id, automation_id]` combination
  - [x] Can update existing record
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent seed_id
  - [x] Cannot insert with non-existent automation_id
  - [x] CASCADE delete works (deleting seed/automation deletes pressure points)
- [x] Test decimal precision
  - [x] `pressure_amount` accepts decimal values (0-100)
  - [x] Default value is 0
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [ ] Negative pressure_amount values
  - [ ] Pressure_amount > 100

## Migration 010: create_automation_queue

- [x] Test table creation
  - [x] Table exists after migration
  - [x] Primary key on `id` (UUID)
  - [x] Foreign keys to `seeds` and `automations`
  - [x] `priority` defaults to 0
  - [x] Indexes on `seed_id`, `automation_id`, `priority`, `created_at`, and composite `[priority, created_at]`
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent seed_id
  - [x] Cannot insert with non-existent automation_id
  - [x] CASCADE delete works (deleting seed/automation deletes queue entries)
- [x] Test priority
  - [x] `priority` defaults to 0
  - [ ] Can set positive and negative priority values
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [ ] Very large priority values

## Migration 011: create_user_settings

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `user_id` is unique
  - [x] Foreign key to `users` table
  - [x] Index on `user_id`
  - [x] `created_at` and `updated_at` have default values
- [x] Test constraints
  - [x] Cannot insert duplicate user_id
  - [x] `openrouter_api_key` can be NULL
  - [x] `openrouter_model` can be NULL
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent user_id
  - [x] CASCADE delete works (deleting user deletes settings)
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 012: add_openrouter_model_name

- [x] Test column addition
  - [x] Column exists after migration
  - [x] Column type is correct (string)
  - [x] Column is nullable
- [x] Test rollback
  - [x] Column is removed on rollback
- [x] Edge cases
  - [x] Existing records are unaffected
  - [x] Can insert NULL value
  - [x] Can insert string value

## Migration 013: create_followups

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] Foreign key to `seeds` table
  - [x] Index on `seed_id`
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent seed_id
  - [x] CASCADE delete works (deleting seed deletes followups)
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 014: create_followup_transactions

- [x] Test enum type creation
  - [x] Enum type `followup_transaction_type` exists
  - [x] Enum has correct values: 'creation', 'edit', 'dismissal', 'snooze'
- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `transaction_type` uses enum type
  - [x] Foreign key to `followups` table
  - [x] Indexes on `followup_id`, `created_at`, and `transaction_type`
- [x] Test enum constraints
  - [x] Cannot insert invalid enum value
  - [x] Can insert valid enum values
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent followup_id
  - [x] CASCADE delete works (deleting followup deletes transactions)
- [x] Test rollback
  - [x] Table is dropped on rollback
  - [x] Enum type is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 015: create_seed_transactions

- [x] Test enum type creation
  - [x] Enum type `seed_transaction_type` exists
  - [x] Enum has correct values: 'create_seed', 'edit_content', 'add_tag', 'remove_tag', 'add_category', 'remove_category', 'add_followup'
- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `transaction_type` uses enum type
  - [x] Foreign keys to `seeds` and `automations`
  - [x] `automation_id` can be NULL
  - [x] Indexes on `seed_id`, `created_at`, `transaction_type`, and composite `[seed_id, created_at]`
- [x] Test enum constraints
  - [x] Cannot insert invalid enum value
  - [x] Can insert valid enum values
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent seed_id
  - [x] Can insert with NULL automation_id
  - [x] Can insert with valid automation_id
  - [x] CASCADE delete works (deleting seed deletes transactions)
  - [x] SET NULL works (deleting automation sets automation_id to NULL)
- [x] Test rollback
  - [x] Table is dropped on rollback
  - [x] Enum type is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 017: remove_seed_content

- [x] Test data migration
  - [x] Seeds without create_seed transactions are deleted
  - [x] Seeds with create_seed transactions are preserved
  - [x] Related data (transactions, events, junction tables) is cleaned up
- [x] Test column removal
  - [x] `seed_content` column is removed from seeds table
  - [x] Other columns remain intact
- [x] Test rollback
  - [x] Column is restored on rollback
  - [x] Column is NOT NULL (as per original schema)
- [x] Edge cases
  - [x] Handles empty seeds table
  - [x] Handles seeds with no related data

## Migration 018: drop_seed_tags_table

- [x] Test table removal
  - [x] Table does not exist after migration
  - [x] Other tables remain intact
- [x] Test rollback
  - [x] Table is recreated on rollback
  - [x] Table has correct schema (composite primary key, foreign keys, indexes)
- [x] Edge cases
  - [x] Handles case where table doesn't exist (idempotent)

## Migration 019: drop_seed_categories_table

- [x] Test table removal
  - [x] Table does not exist after migration
  - [x] Other tables remain intact
- [x] Test rollback
  - [x] Table is recreated on rollback
  - [x] Table has correct schema (composite primary key, foreign keys, indexes)
- [x] Edge cases
  - [x] Handles case where table doesn't exist (idempotent)

## Migration 020: deprecate_events_table

- [x] Test migration execution
  - [x] Migration runs without errors (no-op)
  - [x] Events table still exists (not dropped)
  - [x] No schema changes occur
- [x] Test rollback
  - [x] Rollback runs without errors (no-op)
  - [x] No schema changes occur
- [x] Edge cases
  - [x] Migration is idempotent

## Migration 021: cleanup_invalid_seeds

- [x] Test data migration
  - [x] Seeds without create_seed transactions are deleted
  - [x] Seeds with invalid create_seed transaction data are deleted
  - [x] Seeds with empty content in create_seed are deleted
  - [x] Valid seeds are preserved
  - [x] Related data (transactions, events, followups, junction tables) is cleaned up
- [x] Test rollback
  - [x] Rollback is no-op (cannot restore deleted seeds)
- [x] Edge cases
  - [x] Handles empty seeds table
  - [x] Handles seeds with no related data
  - [x] Handles seeds with all types of related data

## Migration 022: change_add_category_to_set_category

- [x] Test enum value change
  - [x] Enum type is recreated with 'set_category' instead of 'add_category'
  - [x] Existing 'add_category' transactions are updated to 'set_category'
  - [x] Other enum values remain unchanged
  - [x] Cannot insert 'add_category' after migration
  - [x] Can insert 'set_category' after migration
- [x] Test rollback
  - [x] Enum type is recreated with 'add_category'
  - [x] Existing 'set_category' transactions are updated back to 'add_category'
  - [x] Cannot insert 'set_category' after rollback
  - [x] Can insert 'add_category' after rollback
- [x] Edge cases
  - [x] Handles seeds with no transactions
  - [x] Handles seeds with only non-category transactions

## Migration 023: create_tag_transactions

- [x] Test enum type creation
  - [x] Enum type `tag_transaction_type` exists
  - [x] Enum has correct values: 'creation', 'edit', 'set_color'
- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `transaction_type` uses enum type
  - [x] Foreign keys to `tags` and `automations`
  - [x] `automation_id` can be NULL
  - [x] Indexes on `tag_id`, `created_at`, `transaction_type`, and composite `[tag_id, created_at]`
- [x] Test enum constraints
  - [x] Cannot insert invalid enum value
  - [x] Can insert valid enum values
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent tag_id
  - [x] Can insert with NULL automation_id
  - [x] Can insert with valid automation_id
  - [x] CASCADE delete works (deleting tag deletes transactions)
  - [x] SET NULL works (deleting automation sets automation_id to NULL)
- [x] Test rollback
  - [x] Table is dropped on rollback
  - [x] Enum type is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 024: add_timezone_to_user_settings

- [x] Test column addition
  - [x] Column exists after migration
  - [x] Column type is correct (string)
  - [x] Column is nullable
- [x] Test rollback
  - [x] Column is removed on rollback
- [x] Edge cases
  - [x] Existing records are unaffected
  - [x] Can insert NULL value
  - [x] Can insert IANA timezone string value

## Migration 025: create_idea_musings

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] Foreign key to `seeds` table
  - [x] `dismissed` defaults to false
  - [x] `dismissed_at` can be NULL
  - [x] Indexes on `seed_id`, `created_at`, and `dismissed`
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent seed_id
  - [x] CASCADE delete works (deleting seed deletes musings)
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [x] JSONB content can store structured data

## Migration 026: create_idea_musing_shown_history

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] Foreign key to `seeds` table
  - [x] `shown_date` is date type
  - [x] Indexes on `seed_id`, `shown_date`, and composite `[seed_id, shown_date]`
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent seed_id
  - [x] CASCADE delete works (deleting seed deletes history)
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [x] Can insert multiple history entries for same seed

## Migration 027: add_completed_to_idea_musings

- [x] Test column addition
  - [x] `completed` column exists after migration
  - [x] `completed` defaults to false
  - [x] `completed_at` column exists and is nullable
  - [x] Index on `completed` exists
- [x] Test rollback
  - [x] Columns are removed on rollback
  - [x] Index is removed on rollback
- [x] Edge cases
  - [x] Existing records have `completed = false`
  - [x] Can set `completed = true` with `completed_at`
  - [x] Can set `completed_at` to NULL

## Migration 028: add_seed_slug

- [x] Test column addition
  - [x] `slug` column exists after migration
  - [x] Column type is correct (string, max 200)
  - [x] Column is nullable
  - [x] Unique constraint on `slug` exists
  - [x] Index on `slug` exists
- [x] Test constraints
  - [x] Cannot insert duplicate slug
  - [x] Can insert NULL slug (multiple)
  - [x] Can insert unique slug
- [x] Test rollback
  - [x] Column is removed on rollback
  - [x] Unique constraint is removed
  - [x] Index is removed
- [x] Edge cases
  - [x] Existing records have NULL slug
  - [ ] Very long slug strings are handled

## Migration 029: backfill_seed_slugs

- [x] Test data migration
  - [x] Seeds without slugs get slugs generated
  - [x] Slugs are generated from create_seed transaction content
  - [x] Seeds without create_seed transactions are skipped
  - [x] Seeds with empty content are skipped
  - [x] UUID prefix is used in slug generation
- [x] Test rollback
  - [x] All slugs are set to NULL
- [x] Edge cases
  - [x] Handles seeds with no create_seed transaction
  - [x] Handles seeds with empty content
  - [x] Handles duplicate slug generation (should be handled by slug utility)

## Migration 030: create_sprouts

- [x] Test enum type creation
  - [x] Enum type `sprout_type` exists
  - [x] Enum has correct values: 'followup', 'musing', 'extra_context', 'fact_check'
- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `sprout_type` uses enum type
  - [x] Foreign keys to `seeds` and `automations`
  - [x] `automation_id` can be NULL
  - [x] Indexes on `seed_id`, `created_at`, `sprout_type`, and composite `[seed_id, created_at]`
- [x] Test enum constraints
  - [x] Cannot insert invalid enum value
  - [x] Can insert valid enum values
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent seed_id
  - [x] Can insert with NULL automation_id
  - [x] Can insert with valid automation_id
  - [x] CASCADE delete works (deleting seed deletes sprouts)
  - [x] SET NULL works (deleting automation sets automation_id to NULL)
- [x] Test rollback
  - [x] Table is dropped on rollback
  - [x] Enum type is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 031: create_sprout_followup_transactions

- [x] Test enum type creation
  - [x] Enum type `sprout_followup_transaction_type` exists
  - [x] Enum has correct values: 'creation', 'edit', 'dismissal', 'snooze'
- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `transaction_type` uses enum type
  - [x] Foreign key to `sprouts` table
  - [x] Indexes on `sprout_id`, `created_at`, and `transaction_type`
- [x] Test enum constraints
  - [x] Cannot insert invalid enum value
  - [x] Can insert valid enum values
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent sprout_id
  - [x] CASCADE delete works (deleting sprout deletes transactions)
- [x] Test rollback
  - [x] Table is dropped on rollback
  - [x] Enum type is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 032: migrate_followups_and_musings_to_sprouts

- [x] Test data migration
  - [x] Followups are migrated to sprouts with type 'followup'
  - [x] Followup transactions are migrated to sprout_followup_transactions
  - [x] Idea musings are migrated to sprouts with type 'musing'
  - [x] Sprout IDs match original followup/musing IDs
  - [x] Sprout data contains correct fields from original records
- [x] Test edge cases
  - [x] Followups without creation transactions are skipped
  - [x] Handles case where followups table doesn't exist
  - [x] Handles case where idea_musings table doesn't exist
  - [x] Handles empty tables
- [x] Test rollback
  - [x] Rollback is no-op (one-way migration)
- [x] Edge cases
  - [x] Handles followups with no transactions
  - [x] Handles musings with all fields populated

## Migration 033: update_seed_transactions_for_sprouts

- [x] Test enum value addition
  - [x] 'add_sprout' is added to seed_transaction_type enum
  - [x] Existing 'add_followup' transactions are updated to 'add_sprout'
  - [x] Transaction data is updated (followup_id -> sprout_id)
  - [x] Other enum values remain unchanged
  - [x] Cannot insert 'add_followup' after migration
  - [x] Can insert 'add_sprout' after migration
- [x] Test rollback
  - [x] 'add_sprout' transactions are updated back to 'add_followup'
  - [x] Transaction data is updated back (sprout_id -> followup_id)
  - [x] Can insert 'add_followup' after rollback
  - [x] Note: 'add_sprout' remains in enum (PostgreSQL limitation, but transactions are converted back)
- [x] Edge cases
  - [x] Handles seeds with no transactions
  - [x] Handles seeds with only non-followup transactions

## Migration 034: add_wikipedia_sprout_type

- [x] Test enum value addition
  - [x] 'wikipedia_reference' is added to sprout_type enum
  - [x] Existing enum values remain unchanged
  - [x] Can insert 'wikipedia_reference' after migration
- [x] Test rollback
  - [x] Rollback is no-op (PostgreSQL cannot remove enum values)
  - [x] 'wikipedia_reference' remains in enum after rollback
- [x] Edge cases
  - [x] Migration is idempotent (can run multiple times)

## Migration 035: create_sprout_wikipedia_transactions

- [x] Test enum type creation
  - [x] Enum type `sprout_wikipedia_transaction_type` exists
  - [x] Enum has correct values: 'creation', 'edit'
- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID)
  - [x] `transaction_type` uses enum type
  - [x] Foreign key to `sprouts` table
  - [x] Indexes on `sprout_id`, `created_at`, and `transaction_type`
- [x] Test enum constraints
  - [x] Cannot insert invalid enum value
  - [x] Can insert valid enum values
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent sprout_id
  - [x] CASCADE delete works (deleting sprout deletes transactions)
- [x] Test rollback
  - [x] Table is dropped on rollback
  - [x] Enum type is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected

## Migration 036: add_user_id_to_categories

- [x] Test column addition
  - [x] `user_id` column is added (nullable initially)
  - [x] Existing categories get user_id from associated seeds
  - [x] Orphaned categories (no associated seeds) are deleted
  - [x] Column becomes NOT NULL after data migration
- [x] Test foreign key and index
  - [x] Foreign key to `users` table is created
  - [x] Index on `user_id` is created
  - [x] CASCADE delete works (deleting user deletes categories)
- [x] Test rollback
  - [x] Column is removed on rollback
  - [x] Foreign key is removed
  - [x] Index is removed
- [x] Edge cases
  - [x] Handles categories with no associated seeds
  - [x] Handles categories with multiple associated seeds (uses first user_id)

## Migration 037: create_token_usage

- [x] Test table creation
  - [x] Table exists after migration
  - [x] All columns exist with correct types
  - [x] Primary key on `id` (UUID) with default gen_random_uuid()
  - [x] Foreign keys to `users` and `automations`
  - [x] `automation_id` can be NULL
  - [x] `cached_input_tokens` and `cached_output_tokens` default to 0
  - [x] Indexes on `user_id`, `automation_id`, `created_at`, and `model`
- [x] Test foreign key constraints
  - [x] Cannot insert with non-existent user_id
  - [x] Can insert with NULL automation_id
  - [x] Can insert with valid automation_id
  - [x] CASCADE delete works (deleting user deletes token usage)
  - [x] SET NULL works (deleting automation sets automation_id to NULL)
- [x] Test rollback
  - [x] Table is dropped on rollback
- [x] Edge cases
  - [x] NULL values in required fields are rejected
  - [x] Can store large token counts
  - [x] JSONB messages can store structured data

## Test Execution

- [ ] All tests pass in isolation
- [ ] All tests pass when run sequentially
- [x] Tests clean up properly (no leftover data)
- [x] Tests have appropriate timeouts
- [x] Logs/errors/warnings are suppressed during tests
