<!-- faafa720-ed1f-4027-927d-b084270abb02 d1bcc504-a107-4f95-96c1-90028fca23e1 -->
# Sprouts System Implementation

## Overview

Replace the separate follow-up and musing systems with a unified "sprouts" system. Sprouts are specialized timeline items that appear in the seed's timeline alongside transactions. Each sprout type manages its own state internally.

## Database Schema

### 1. Create sprouts table

- **File**: `backend/src/db/migrations/XXX_create_sprouts.ts`
- Fields:
- `id` (UUID, primary key)
- `seed_id` (UUID, foreign key to seeds)
- `sprout_type` (enum: 'followup', 'musing', 'extra_context', 'fact_check')
- `sprout_data` (JSONB) - Type-specific data structure
- `created_at` (timestamp)
- `automation_id` (UUID, nullable, foreign key to automations)
- Indexes: `seed_id`, `created_at`, `sprout_type`, composite `(seed_id, created_at)`

### 2. Create sprout_followup_transactions table

- **File**: `backend/src/db/migrations/XXX_create_sprout_followup_transactions.ts`
- Fields:
- `id` (UUID, primary key)
- `sprout_id` (UUID, foreign key to sprouts)
- `transaction_type` (enum: 'creation', 'edit', 'dismissal', 'snooze')
- `transaction_data` (JSONB)
- `created_at` (timestamp)
- Indexes: `sprout_id`, `created_at`
- This moves the followup transaction system into the sprout type handler

### 3. Migration: Convert existing data

- **File**: `backend/src/db/migrations/XXX_migrate_followups_and_musings_to_sprouts.ts`
- Convert all `followups` → sprouts with type 'followup'
- Convert all `idea_musings` → sprouts with type 'musing'
- Migrate followup transactions to `sprout_followup_transactions`
- Preserve all existing data and relationships

## Backend Implementation

### 4. Create sprout types and interfaces

- **File**: `backend/src/types/sprouts.ts`
- Define `SproutType` enum
- Define `Sprout` interface (id, seed_id, sprout_type, sprout_data, created_at, automation_id)
- Define type-specific data interfaces:
- `FollowupSproutData` (due_time, message, dismissed, etc.)
- `MusingSproutData` (template_type, content, dismissed, completed, etc.)
- `ExtraContextSproutData` (placeholder)
- `FactCheckSproutData` (placeholder)
- Define `SproutFollowupTransaction` types (move from followups.ts)

### 5. Create SproutsService

- **File**: `backend/src/services/sprouts.ts`
- Methods:
- `getBySeedId(seedId)` - Get all sprouts for a seed, ordered by created_at
- `getById(sproutId)` - Get single sprout
- `create(data)` - Create new sprout
- `delete(sproutId)` - Delete sprout
- Generic sprout operations only; type-specific logic in handlers

### 6. Create sprout type handlers

- **File**: `backend/src/services/sprouts/followup-sprout.ts`
- Move transaction-based state logic from `FollowupService`
- Methods: `computeState(sprout)`, `edit(sproutId, data)`, `dismiss(sproutId)`, `snooze(sproutId, duration)`
- Uses `sprout_followup_transactions` table
- **File**: `backend/src/services/sprouts/musing-sprout.ts`
- Handle musing-specific operations
- Methods: `dismiss(sproutId)`, `complete(sproutId)`, `regenerate(sproutId)`
- **File**: `backend/src/services/sprouts/registry.ts`
- Registry pattern to get handler by sprout type
- `getHandler(sproutType)` returns appropriate handler

### 7. Create sprout routes

- **File**: `backend/src/routes/sprouts.ts`
- Endpoints:
- `GET /api/seeds/:seedId/sprouts` - Get all sprouts for seed
- `GET /api/sprouts/:sproutId` - Get sprout by ID
- `POST /api/seeds/:seedId/sprouts` - Create sprout
- `DELETE /api/sprouts/:sproutId` - Delete sprout
- `PUT /api/sprouts/:sproutId/followup/edit` - Edit followup sprout
- `POST /api/sprouts/:sproutId/followup/dismiss` - Dismiss followup sprout
- `POST /api/sprouts/:sproutId/followup/snooze` - Snooze followup sprout
- `POST /api/sprouts/:sproutId/musing/dismiss` - Dismiss musing sprout
- `POST /api/sprouts/:sproutId/musing/complete` - Complete musing sprout
- `POST /api/sprouts/:sproutId/musing/regenerate` - Regenerate musing sprout
- All routes require authentication
- Use sprout type handlers for type-specific operations

### 8. Update IdeaMusingAutomation

- **File**: `backend/src/services/automation/idea-musing.ts`
- Change `generateMusing()` to create a sprout (type 'musing') instead of `idea_musings` table entry
- Update `IdeaMusingsService.create()` calls to use `SproutsService.create()` with type 'musing'

### 9. Update FollowupAutomation

- **File**: `backend/src/services/automation/followup.ts`
- Change to create sprouts (type 'followup') instead of `followups` table entries
- Update `FollowupService.create()` calls to use `SproutsService.create()` with type 'followup'

### 10. Update seed transactions

- **File**: `backend/src/db/migrations/XXX_update_seed_transactions_for_sprouts.ts`
- Remove `add_followup` from `seed_transaction_type` enum
- Add `add_sprout` transaction type
- Update `seed-state.ts` to handle `add_sprout` transactions
- Update `FollowupService` to create `add_sprout` transaction instead of `add_followup`

### 11. Deprecate old services and delete them

- They will not be used again

## Frontend Implementation

### 12. Create sprout types

- **File**: `frontend/src/types/index.ts`
- Add `Sprout`, `SproutType`, and type-specific data interfaces
- Match backend types

### 13. Update API client

- **File**: `frontend/src/services/api.ts`
- Add sprout endpoints:
- `getSproutsBySeedId(seedId)`
- `getSproutById(sproutId)`
- `createSprout(seedId, data)`
- `deleteSprout(sproutId)`
- Type-specific methods (followup, musing operations)

### 14. Create SproutDetailView

- **File**: `frontend/src/components/views/SproutDetailView.tsx`
- Route: `/sprouts/:sproutId`
- Display sprout based on type:
- Followup: Show due time, message, actions (edit, snooze, dismiss), transaction history
- Musing: Show template content, actions (dismiss, complete, regenerate)
- Placeholder types: Show basic info
- Use sprout type-specific components

### 15. Create sprout type components

- **File**: `frontend/src/components/SproutDetail/FollowupSproutDetail.tsx`
- Display followup sprout details
- Edit, snooze, dismiss actions
- Transaction history display
- **File**: `frontend/src/components/SproutDetail/MusingSproutDetail.tsx`
- Display musing sprout details
- Use existing musing content components (NumberedIdeasMusing, etc.)
- Dismiss, complete, regenerate actions
- **File**: `frontend/src/components/SproutDetail/SproutDetail.tsx`
- Router component that selects appropriate type component

### 16. Update SeedDetailView

- **File**: `frontend/src/components/views/SeedDetailView.tsx`
- Remove `FollowupsPanel` import and usage
- Update timeline to include sprouts alongside transactions
- Make sprouts clickable → navigate to `/sprouts/:sproutId`
- Update `TransactionHistoryList` or create unified timeline component that shows both transactions and sprouts

### 17. Create unified timeline component

- **File**: `frontend/src/components/SeedTimeline/SeedTimeline.tsx`
- Combines seed transactions and sprouts
- Orders by `created_at` chronologically
- Renders transactions and sprouts with appropriate styling
- Makes sprouts clickable (navigate to detail view)
- Shows sprout type indicators

### 18. Update routing

- **File**: `frontend/src/App.tsx`
- Add route: `/sprouts/:sproutId` → `SproutDetailView`
- Add route: `/sprouts/:hashId/sprout-slug` → `SproutDetailView`
- Add `SproutDetailWrapper` similar to `SeedDetailWrapper`

### 19. Remove FollowupsPanel

- **File**: `frontend/src/components/FollowupsPanel/` (delete entire directory)
- Remove from all imports and usages
- Remove all tests

### 20. Update MusingsView (if needed)

- **File**: `frontend/src/components/views/MusingsView.tsx`
- Update to fetch musing sprouts instead of `idea_musings`
- Update API calls to use sprout endpoints

## Testing

### 21. Backend tests

- **File**: `backend/src/services/sprouts.test.ts`
- Test `SproutsService` CRUD operations
- Test sprout type handlers (followup, musing)
- Test migration of existing data

### 22. Frontend tests

- Test `SproutDetailView` rendering for each type
- Test navigation from timeline to sprout detail
- Test sprout creation and editing

## Migration Strategy

### 23. Data migration script

- Run migration to convert existing followups and musings
- Verify data integrity
- Test sprout creation and retrieval
- Monitor for any data loss

### 24. Immediate deprecation

- Remove old code immediately

### To-dos

- [x] Create sprouts table migration with sprout_type enum and sprout_data JSONB
- [x] Create sprout_followup_transactions table for followup sprout state management
- [x] Create migration to convert existing followups and musings to sprouts
- [x] Create TypeScript types for sprouts and type-specific data structures
- [x] Create SproutsService with basic CRUD operations
- [x] Create FollowupSprout handler with transaction-based state logic
- [x] Create MusingSprout handler with musing-specific operations
- [x] Create sprout type handler registry
- [x] Create sprout API routes with type-specific endpoints
- [x] Update IdeaMusingAutomation and FollowupAutomation to create sprouts
- [x] Update seed_transactions to use add_sprout instead of add_followup
- [x] Add sprout TypeScript types to frontend
- [x] Add sprout API methods to frontend API client
- [x] Create SproutDetailView component with routing
- [x] Create FollowupSproutDetail and MusingSproutDetail components
- [x] Remove FollowupsPanel and update SeedDetailView timeline to include sprouts
- [x] Create unified timeline component showing transactions and sprouts
- [x] Add sprout detail route to App.tsx
- [x] Delete FollowupsPanel component directory and all references
- [x] Update MusingsView to use sprout API endpoints