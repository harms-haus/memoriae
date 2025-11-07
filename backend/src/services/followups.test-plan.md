# Follow-up System Testing Plan

## Overview
This document outlines a comprehensive testing plan for the follow-up system, covering database migrations, backend services, API routes, automation, scheduler, and frontend components.

## Test Categories

### 1. Database Migrations
**File**: `backend/src/db/migrations/013_create_followups.ts` and `014_create_followup_transactions.ts`

**Tests**:
- ✅ Migration creates `followups` table with correct schema (id, seed_id, foreign key, indexes)
- ✅ Migration creates `followup_transactions` table with correct schema (id, followup_id, transaction_type enum, transaction_data jsonb, created_at, foreign key, indexes)
- ✅ Migration creates enum type `followup_transaction_type` with correct values
- ✅ Rollback drops tables and enum correctly
- ✅ Foreign key constraints work correctly (CASCADE on delete)
- ✅ Indexes are created correctly

### 2. Backend Service: FollowupService
**File**: `backend/src/services/followups.ts`

**Tests**:
- ✅ `computeFollowupState` correctly rebuilds state from transactions
  - Handles creation transaction (sets initial time, message, created_at)
  - Applies edit transactions in order (updates time/message)
  - Applies snooze transactions (adds duration to due_time)
  - Applies dismissal transaction (sets dismissed flag and dismissed_at)
  - Handles multiple transactions in chronological order
  - Handles transactions out of order (sorts by created_at)
  - Throws error if no creation transaction exists
- ✅ `getBySeedId` returns all followups for a seed with computed state
  - Returns empty array when no followups exist
  - Returns followups with all transactions
  - Computes state correctly for each followup
- ✅ `getById` returns single followup with computed state
  - Returns null for non-existent followup
  - Returns followup with all transactions
- ✅ `create` creates followup with creation transaction
  - Creates followup row
  - Creates creation transaction with correct data (trigger, initial_time, initial_message)
  - Returns computed state
  - Handles both 'manual' and 'automatic' triggers
- ✅ `edit` creates edit transaction
  - Creates edit transaction with old/new values
  - Only includes old values if they changed
  - Updates computed state correctly
  - Throws error if followup doesn't exist
  - Throws error if followup is dismissed
- ✅ `snooze` creates snooze transaction
  - Creates snooze transaction with duration and method
  - Updates computed due_time correctly
  - Throws error if followup doesn't exist
  - Throws error if followup is dismissed
  - Handles both 'manual' and 'automatic' methods
- ✅ `dismiss` creates dismissal transaction
  - Creates dismissal transaction with type and dismissed_at
  - Sets dismissed flag correctly
  - Throws error if followup doesn't exist
- ✅ `getDueFollowups` returns due followups for user
  - Returns only non-dismissed followups
  - Returns only followups where due_time is in the past
  - Includes user_id from seed
  - Excludes followups that are snoozed into the future
  - Handles multiple snoozes correctly

### 3. Backend Service: NotificationService
**File**: `backend/src/services/notifications.ts`

**Tests**:
- ✅ `checkDueFollowups` delegates to FollowupService correctly
  - Calls FollowupService.getDueFollowups with correct userId
  - Returns result from FollowupService

### 4. Backend Automation: FollowupAutomation
**File**: `backend/src/services/automation/followup.ts`

**Tests**:
- ✅ `process` analyzes seed and creates followup if confidence > 85%
  - Calls OpenRouter API with correct prompt
  - Parses AI response correctly
  - Creates followup with 'automatic' trigger if confidence > 85%
  - Does not create followup if confidence <= 85%
  - Does not create followup if seed already has active followup
  - Returns empty events array (followups are NOT timeline events)
  - Handles AI errors gracefully (returns empty events)
- ✅ `calculatePressure` always returns 0
  - Category changes don't affect followups
- ✅ `getPressureThreshold` returns 100
  - Never auto-triggers from pressure
- ✅ `analyzeSeedForFollowup` calls OpenRouter correctly
  - Uses correct system and user prompts
  - Parses JSON response correctly
  - Validates response structure
  - Returns low confidence on error

### 5. Backend Scheduler: FollowupNotificationScheduler
**File**: `backend/src/services/queue/followup-scheduler.ts`

**Tests**:
- ✅ `start` begins periodic checking
  - Sets up interval for 1 minute
  - Runs check immediately on start
  - Prevents multiple starts
- ✅ `stop` stops scheduler gracefully
  - Clears interval
  - Waits for in-progress checks to complete
  - Handles timeout gracefully
- ✅ `checkDueFollowups` checks all users and auto-snoozes
  - Gets all users from database
  - Checks each user for due followups
  - Auto-snoozes followups 30+ minutes past due by 90 minutes
  - Prevents infinite snoozes (checks last transaction)
  - Handles errors per user without stopping entire process
  - Skips if previous check still running

### 6. Backend Routes: Followups Routes
**File**: `backend/src/routes/followups.ts`

**Tests**:
- ✅ `GET /api/seeds/:seedId/followups` requires authentication
- ✅ `GET /api/seeds/:seedId/followups` returns followups for seed
  - Verifies seed ownership
  - Returns 404 if seed doesn't exist
  - Returns 404 if seed belongs to different user
  - Returns followups with computed state
- ✅ `POST /api/seeds/:seedId/followups` creates followup manually
  - Requires authentication
  - Validates input (due_time, message)
  - Creates followup with 'manual' trigger
  - Returns created followup
  - Verifies seed ownership
- ✅ `PUT /api/followups/:followupId` edits followup
  - Requires authentication
  - Validates input
  - Updates followup
  - Returns updated followup
  - Verifies followup ownership via seed
  - Returns 404 if followup doesn't exist
  - Returns 400 if followup is dismissed
- ✅ `POST /api/followups/:followupId/snooze` snoozes followup
  - Requires authentication
  - Validates input (duration_minutes)
  - Creates snooze transaction with 'manual' method
  - Returns updated followup
  - Verifies followup ownership
  - Returns 404 if followup doesn't exist
  - Returns 400 if followup is dismissed
- ✅ `POST /api/followups/:followupId/dismiss` dismisses followup
  - Requires authentication
  - Validates input (type)
  - Creates dismissal transaction
  - Returns updated followup
  - Verifies followup ownership
  - Returns 404 if followup doesn't exist
- ✅ `GET /api/followups/due` returns due followups for authenticated user
  - Requires authentication
  - Returns only due followups for user
  - Returns empty array if none due

### 7. Frontend Service: Notifications
**File**: `frontend/src/services/notifications.ts`

**Tests**:
- ✅ `requestPermission` requests browser notification permission
  - Returns current permission if already granted/denied
  - Requests permission if default
  - Handles browsers without Notification API
- ✅ `checkDueFollowups` calls API correctly
  - Calls api.getDueFollowups()
  - Returns empty array on error
- ✅ `showNotification` shows browser notification
  - Only shows if permission granted
  - Prevents duplicate notifications
  - Sets correct notification properties
  - Handles click to navigate to seed
  - Cleans up shown IDs after 5 minutes
- ✅ `setupNotificationPolling` sets up polling
  - Checks immediately on setup
  - Sets up 30-second interval
  - Returns cleanup function
  - Prevents multiple polling setups
- ✅ `stopNotificationPolling` stops polling
  - Clears interval
  - Handles null interval

### 8. Frontend Hook: useFollowupNotifications
**File**: `frontend/src/hooks/useFollowupNotifications.ts`

**Tests**:
- ✅ Requests permission on mount
- ✅ Sets up polling if permission granted
- ✅ Stops polling on unmount
- ✅ Handles permission denial gracefully

### 9. Frontend Components: FollowupsPanel
**File**: `frontend/src/components/FollowupsPanel/FollowupsPanel.tsx`

**Tests**:
- ✅ Renders loading state
- ✅ Renders error state with retry
- ✅ Renders empty state
- ✅ Renders list of followups
- ✅ Opens create modal on button click
- ✅ Loads followups on mount
- ✅ Reloads followups after create

### 10. Frontend Components: FollowupItem
**File**: `frontend/src/components/FollowupsPanel/FollowupItem.tsx`

**Tests**:
- ✅ Renders followup message and due time
- ✅ Formats due time correctly (relative and absolute)
- ✅ Shows dismissed badge when dismissed
- ✅ Shows action buttons when not dismissed
- ✅ Hides action buttons when dismissed
- ✅ Opens edit modal on edit click
- ✅ Opens snooze modal on snooze click
- ✅ Calls dismiss API on dismiss click
- ✅ Shows transaction history panel

### 11. Frontend Components: CreateFollowupModal
**File**: `frontend/src/components/FollowupsPanel/CreateFollowupModal.tsx`

**Tests**:
- ✅ Renders form with time picker and message input
- ✅ Validates required fields
- ✅ Calls API on submit
- ✅ Closes modal on success
- ✅ Shows error on failure
- ✅ Calls onCreated callback

### 12. Frontend Components: EditFollowupModal
**File**: `frontend/src/components/FollowupsPanel/EditFollowupModal.tsx`

**Tests**:
- ✅ Pre-fills form with current values
- ✅ Validates required fields
- ✅ Calls API on submit
- ✅ Closes modal on success
- ✅ Shows error on failure
- ✅ Calls onUpdated callback

### 13. Frontend Components: SnoozeModal
**File**: `frontend/src/components/FollowupsPanel/SnoozeModal.tsx`

**Tests**:
- ✅ Renders duration options
- ✅ Allows custom duration input
- ✅ Validates custom duration
- ✅ Calls API on submit
- ✅ Closes modal on success
- ✅ Shows error on failure
- ✅ Calls onSnoozed callback

### 14. Frontend Components: FollowupTransactions
**File**: `frontend/src/components/FollowupsPanel/FollowupTransactions.tsx`

**Tests**:
- ✅ Renders all transactions
- ✅ Formats dates correctly
- ✅ Shows correct transaction type labels
- ✅ Shows correct transaction data for each type
  - Creation: shows trigger
  - Edit: shows old/new values
  - Snooze: shows duration and method
  - Dismissal: shows type

## Implementation Order

1. Database migration tests (verify schema)
2. FollowupService unit tests (core logic)
3. NotificationService unit tests (simple delegation)
4. FollowupAutomation unit tests (AI integration)
5. FollowupNotificationScheduler unit tests (timer logic)
6. Followups routes integration tests (API endpoints)
7. Frontend service tests (notifications)
8. Frontend hook tests (useFollowupNotifications)
9. Frontend component tests (UI components)

## Test Data Setup

- Create test users
- Create test seeds
- Create test followups with various transaction histories
- Mock OpenRouter API responses
- Mock browser Notification API

## Coverage Goals

- 90%+ code coverage for backend services
- 80%+ code coverage for backend routes
- 70%+ code coverage for frontend components
- All critical paths tested
- All error cases tested
- All edge cases tested

