# Testing Plan: Transaction-Based Seed State System

## Overview

This plan covers testing for the migration from event-based to transaction-based seed state system. All seed state is now stored exclusively in an ordered, immutable transaction list.

## Core Principles

1. **All seed state exists exclusively in transactions** - No base state stored separately
2. **Transactions are immutable** - No toggle/undo functionality
3. **State is computed by replaying transactions** - Chronological order, all transactions applied
4. **Transaction types are typed** - `create_seed`, `edit_content`, `add_tag`, `remove_tag`, `add_category`, `remove_category`, `add_followup`

## Test Categories

### 1. Database Migrations

#### 1.1 Migration 015: Create seed_transactions table
- [ ] Table exists with correct schema
- [ ] Enum type `seed_transaction_type` has all 7 values
- [ ] Foreign keys to seeds and automations work
- [ ] Indexes are created correctly
- [ ] JSONB column accepts transaction_data

#### 1.2 Migration 016: Remove seed_content column
- [ ] `seed_content` column is removed from seeds table
- [ ] Seeds table only has: id, user_id, created_at

#### 1.3 Migrations 017-018: Drop junction tables
- [ ] `seed_tags` table is dropped
- [ ] `seed_categories` table is dropped

#### 1.4 Migration 019: Deprecate events table
- [ ] Migration runs without error (no-op for now)

### 2. Backend: Transaction Service

#### 2.1 SeedTransactionsService.create()
- [ ] Creates transaction with correct data
- [ ] Handles JSONB transaction_data correctly
- [ ] Sets created_at timestamp
- [ ] Links to automation_id when provided
- [ ] Returns transaction with correct structure

#### 2.2 SeedTransactionsService.createMany()
- [ ] Creates multiple transactions atomically
- [ ] Handles JSONB for each transaction
- [ ] Returns all created transactions

#### 2.3 SeedTransactionsService.getBySeedId()
- [ ] Returns all transactions for seed
- [ ] Ordered by created_at ascending
- [ ] Returns empty array if no transactions

#### 2.4 SeedTransactionsService.getById()
- [ ] Returns transaction by ID
- [ ] Returns null if not found

#### 2.5 SeedTransactionsService.verifySeedOwnership()
- [ ] Returns true if seed belongs to user
- [ ] Returns false if seed doesn't exist or belongs to different user

### 3. Backend: State Computation

#### 3.1 computeSeedState() - Basic functionality
- [ ] Requires create_seed transaction (throws if missing)
- [ ] Replays transactions in chronological order
- [ ] Returns correct initial state from create_seed

#### 3.2 computeSeedState() - Content edits
- [ ] edit_content transaction updates seed content
- [ ] Multiple edits apply in order
- [ ] Latest edit_content determines final content

#### 3.3 computeSeedState() - Tag operations
- [ ] add_tag transaction adds tag to state
- [ ] Multiple add_tag transactions add multiple tags
- [ ] remove_tag transaction removes tag
- [ ] Idempotent: adding same tag twice doesn't duplicate
- [ ] Removing non-existent tag doesn't error

#### 3.4 computeSeedState() - Category operations
- [ ] add_category transaction adds category to state
- [ ] Multiple add_category transactions add multiple categories
- [ ] remove_category transaction removes category
- [ ] Idempotent: adding same category twice doesn't duplicate

#### 3.5 computeSeedState() - Followup operations
- [ ] add_followup transaction doesn't affect seed state
- [ ] Multiple add_followup transactions are ignored in state computation

#### 3.6 computeSeedState() - Error handling
- [ ] Invalid transaction type is skipped (logs error, continues)
- [ ] Invalid transaction_data is skipped (logs error, continues)
- [ ] Missing required fields in transaction_data is handled gracefully

#### 3.7 validateTransaction()
- [ ] Validates create_seed transaction data
- [ ] Validates edit_content transaction data
- [ ] Validates add_tag transaction data
- [ ] Validates remove_tag transaction data
- [ ] Validates add_category transaction data
- [ ] Validates remove_category transaction data
- [ ] Throws error for invalid transaction data

### 4. Backend: Seeds Service

#### 4.1 SeedsService.create()
- [ ] Creates seed row in database
- [ ] Creates create_seed transaction atomically
- [ ] Returns seed with computed currentState
- [ ] State includes content from create_seed transaction
- [ ] State has correct timestamp from transaction

#### 4.2 SeedsService.getById()
- [ ] Returns seed with computed state from transactions
- [ ] Returns null if seed doesn't exist
- [ ] Returns null if seed doesn't belong to user
- [ ] State is computed correctly from all transactions

#### 4.3 SeedsService.getByUser()
- [ ] Returns all seeds for user
- [ ] Each seed has computed currentState
- [ ] Ordered by created_at descending

#### 4.4 SeedsService.update()
- [ ] Creates edit_content transaction
- [ ] Doesn't modify seed row directly
- [ ] Returns seed with updated computed state
- [ ] Multiple updates create multiple transactions

#### 4.5 SeedsService.delete()
- [ ] Deletes seed (cascades to transactions)
- [ ] Returns true if deleted
- [ ] Returns false if not found or wrong user

### 5. Backend: Automations

#### 5.1 TagExtractionAutomation
- [ ] Creates add_tag transactions (not events)
- [ ] Returns transactions array in AutomationProcessResult
- [ ] Doesn't create duplicate tags
- [ ] Handles hash tags and AI-generated tags

#### 5.2 CategorizeAutomation
- [ ] Creates add_category transactions (not events)
- [ ] Returns transactions array in AutomationProcessResult
- [ ] Doesn't create duplicate categories

#### 5.3 FollowupAutomation
- [ ] Returns transactions array (empty, since followups are separate)
- [ ] Creates followup via FollowupService
- [ ] FollowupService creates add_followup transaction on seed

### 6. Backend: Queue Processor

#### 6.1 processAutomationJob()
- [ ] Saves transactions from AutomationProcessResult
- [ ] Uses SeedTransactionsService.createMany()
- [ ] Doesn't reference EventsService
- [ ] Handles empty transactions array

### 7. Backend: Routes

#### 7.1 GET /api/seeds/:seedId/transactions
- [ ] Returns all transactions for seed
- [ ] Requires authentication
- [ ] Verifies seed ownership
- [ ] Returns 404 if seed not found

#### 7.2 GET /api/seeds/:seedId/state
- [ ] Returns computed current state
- [ ] Requires authentication
- [ ] Verifies seed ownership
- [ ] State computed from all transactions

#### 7.3 POST /api/seeds/:seedId/transactions
- [ ] Creates new transaction
- [ ] Validates transaction_type
- [ ] Validates transaction_data
- [ ] Requires authentication
- [ ] Verifies seed ownership

#### 7.4 GET /api/transactions/:transactionId
- [ ] Returns transaction by ID
- [ ] Requires authentication
- [ ] Verifies seed ownership

#### 7.5 Events routes removed
- [ ] No /api/seeds/:seedId/timeline endpoint
- [ ] No /api/seeds/:seedId/events endpoints
- [ ] No toggle/delete event endpoints

### 8. Backend: Integration Tests

#### 8.1 Seed creation flow
- [ ] Create seed → creates seed row + create_seed transaction
- [ ] Query seed → returns computed state
- [ ] State matches create_seed content

#### 8.2 Seed update flow
- [ ] Update seed content → creates edit_content transaction
- [ ] Query seed → returns updated state
- [ ] State matches latest edit_content

#### 8.3 Tag automation flow
- [ ] Run tag automation → creates add_tag transactions
- [ ] Query seed → state includes tags
- [ ] Multiple automations don't duplicate tags

#### 8.4 Category automation flow
- [ ] Run categorize automation → creates add_category transactions
- [ ] Query seed → state includes categories

#### 8.5 Followup creation flow
- [ ] Create followup → creates add_followup transaction on seed
- [ ] Query seed transactions → includes add_followup
- [ ] Seed state not affected by add_followup

#### 8.6 Transaction timeline
- [ ] Multiple transactions applied in order
- [ ] State reflects all transactions
- [ ] Transaction order matters (later transactions override earlier)

### 9. Frontend: Types

#### 9.1 Seed interface
- [ ] No seed_content field
- [ ] Has transactions? field (optional)
- [ ] Has currentState field

#### 9.2 Transaction types
- [ ] SeedTransactionType has all 7 types
- [ ] Transaction data interfaces match backend
- [ ] SeedTransaction interface matches backend

#### 9.3 Event interface removed
- [ ] No Event interface (or marked deprecated and unused)

### 10. Frontend: API Client

#### 10.1 Transaction endpoints
- [ ] getSeedTransactions() calls correct endpoint
- [ ] createSeedTransaction() calls correct endpoint
- [ ] getSeedTransaction() calls correct endpoint

#### 10.2 Deprecated endpoints removed
- [ ] No getSeedTimeline() method (or redirects to transactions)

### 11. Frontend: Components

#### 11.1 SeedDetailView
- [ ] Fetches transactions instead of events
- [ ] Displays transaction timeline
- [ ] No toggle functionality
- [ ] Computes state from transactions
- [ ] Handles empty transactions list

#### 11.2 SeedEditor
- [ ] Creates seed with content
- [ ] Updates seed content (creates edit_content transaction)

#### 11.3 TimelineView
- [ ] Displays seeds with currentState
- [ ] No seed_content references

#### 11.4 Other views
- [ ] SeedsView uses currentState.seed (not seed_content)
- [ ] CategoriesView uses currentState.seed (not seed_content)

### 12. Test Data Updates

#### 12.1 Mock seeds
- [ ] Remove seed_content from mock data
- [ ] Add currentState to mock data
- [ ] Add transactions array to mock data (optional)

#### 12.2 Test helpers
- [ ] createMockSeed() doesn't include seed_content
- [ ] createMockSeed() includes currentState
- [ ] createMockTransaction() helper function

### 13. Error Cases

#### 13.1 Missing create_seed transaction
- [ ] computeSeedState() throws error
- [ ] SeedsService handles gracefully

#### 13.2 Invalid transaction data
- [ ] validateTransaction() throws
- [ ] computeSeedState() skips invalid transactions

#### 13.3 Database errors
- [ ] Transaction creation failures handled
- [ ] State computation failures handled

### 14. Performance

#### 14.1 Large transaction lists
- [ ] State computation handles 100+ transactions
- [ ] Query performance acceptable with indexes
- [ ] No N+1 query problems

### 15. Migration Verification

#### 15.1 Fresh database
- [ ] New seeds work correctly
- [ ] Transactions created properly
- [ ] State computed correctly

#### 15.2 No legacy data
- [ ] No references to events table in code
- [ ] No references to seed_content in code
- [ ] No references to seed_tags/seed_categories in code

## Implementation Order

1. Fix build errors (COMPLETED)
2. Update test mocks and helpers
3. Fix unit tests (state computation, services)
4. Fix integration tests (routes, automations)
5. Fix frontend tests
6. Verify all tests pass
7. Document any remaining issues

## Success Criteria

- [ ] All build errors resolved
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All frontend tests pass
- [ ] No references to deprecated code
- [ ] State computation works correctly
- [ ] Transactions are immutable
- [ ] All seed state comes from transactions

