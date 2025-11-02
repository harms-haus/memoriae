# Queue System Testing Plan

## Overview
This document outlines the comprehensive testing plan for the BullMQ queue system implementation.

## Test Categories

### 1. Queue Service Tests (`queue.test.ts`)

#### Unit Tests for Job Management
- ✅ Adding single automation job to queue
- ✅ Adding job with custom priority
- ✅ Job ID generation (unique per automation+seed combo)
- ✅ Queue stats retrieval (waiting, active, completed, failed, delayed)
- ✅ Get job by ID
- ✅ Remove job from queue

#### Unit Tests for Batch Operations
- ✅ Queue all enabled automations for a seed
- ✅ Queue specific automations by ID
- ✅ Handle empty automation list gracefully
- ✅ Filter out disabled automations
- ✅ Filter out automations without IDs

#### Error Handling
- ✅ Handle missing automation in registry
- ✅ Handle invalid automation ID
- ✅ Handle queue connection errors

### 2. Queue Processor Tests (`processor.test.ts`)

#### Successful Job Processing
- ✅ Process automation job successfully
- ✅ Fetch seed from database
- ✅ Create OpenRouter client with user settings
- ✅ Execute automation process method
- ✅ Save events created by automation
- ✅ Update job progress to 100%

#### Error Scenarios
- ✅ Handle missing seed (seed not found)
- ✅ Handle missing automation in registry
- ✅ Handle disabled automation (skip gracefully)
- ✅ Handle missing API key (skip gracefully, log warning)
- ✅ Handle seed validation failure (skip gracefully)
- ✅ Handle automation process errors (should retry)
- ✅ Handle OpenRouter API errors (should retry)
- ✅ Handle event save errors (should fail job)

#### Worker Event Handlers
- ✅ Log completed jobs
- ✅ Log failed jobs with error details
- ✅ Handle worker errors

### 3. Integration Tests

#### Seed Creation Integration
- ✅ Create seed triggers automation queue
- ✅ Queue failure doesn't break seed creation
- ✅ Multiple automations queued correctly

#### Automation handlePressure Integration
- ✅ handlePressure adds job to queue with correct priority
- ✅ Priority calculation based on pressure amount
- ✅ Error handling when automation has no ID

### 4. Configuration & Setup Tests

#### Redis Connection
- ✅ Parse REDIS_URL correctly
- ✅ Use individual REDIS_HOST/PORT/PASSWORD if URL not provided
- ✅ Handle missing Redis connection gracefully

#### Queue Configuration
- ✅ Retry configuration (3 attempts, exponential backoff)
- ✅ Job cleanup policies (completed/failed job retention)
- ✅ Concurrency limits (5 concurrent jobs)

## Test Implementation Strategy

### Mocking Strategy
1. **BullMQ Queue/Worker**: Mock Queue and Worker classes to avoid requiring Redis in tests
2. **Database**: Mock Knex queries using test database or mocks
3. **Automation Registry**: Mock registry methods
4. **Services**: Mock SeedsService, EventsService for controlled test scenarios
5. **OpenRouter Client**: Mock client creation and API calls

### Test Data
- Mock seeds with valid structure
- Mock automations with proper IDs and enabled status
- Mock events with JSON Patch operations
- Mock user settings (API keys, models)

### Coverage Goals
- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: 100%

## Test Execution

```bash
# Run all queue tests
npm test -- queue

# Run with coverage
npm test -- queue --coverage

# Watch mode
npm test -- queue --watch
```

