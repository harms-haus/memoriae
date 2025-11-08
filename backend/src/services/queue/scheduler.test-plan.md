# Pressure Evaluation Scheduler Testing Plan

## Overview
Test the timer service that periodically evaluates pressure points and triggers re-evaluation when thresholds are exceeded.

## Critical Requirement
**The timer must NOT start automatically during tests.** All tests should manually control start/stop.

## Test Categories

### 1. Timer Control Tests

#### Start/Stop Behavior
- ✅ Scheduler doesn't start automatically (no auto-start)
- ✅ start() begins periodic evaluation
- ✅ stop() stops evaluation and clears interval
- ✅ start() after stop() works correctly
- ✅ Multiple start() calls are idempotent
- ✅ stop() waits for in-progress evaluation
- ✅ stop() timeout after 5 seconds

#### isActive() Method
- ✅ Returns false before start()
- ✅ Returns true after start()
- ✅ Returns false after stop()

### 2. Pressure Evaluation Tests

#### evaluatePressurePoints
- ✅ Gets all pressure points exceeding threshold
- ✅ Skips if no pressure points exceed threshold
- ✅ Processes each exceeded pressure point
- ✅ Skips disabled automations
- ✅ Skips missing automations gracefully
- ✅ Skips missing seeds gracefully
- ✅ Calls automation.handlePressure() for each exceeded point
- ✅ Logs successful triggers
- ✅ Handles errors without stopping batch

### 3. Periodic Execution Tests

#### Interval Behavior
- ✅ Runs immediately on start()
- ✅ Runs again after interval
- ✅ Uses QUEUE_CHECK_INTERVAL from config
- ✅ Skips if previous evaluation still running (concurrent protection)
- ✅ Processes correctly when interval fires

### 4. Integration Tests

#### Queue Triggering
- ✅ handlePressure() adds job to queue
- ✅ Correct seed ID passed to queue
- ✅ Correct automation ID passed to queue
- ✅ Correct user ID passed to queue
- ✅ Priority calculated correctly

#### Context Creation
- ✅ Creates correct AutomationContext
- ✅ Gets user ID from seed
- ✅ Creates OpenRouter client (even if not used)

### 5. Error Handling Tests

- ✅ Database errors don't crash scheduler
- ✅ Missing automation handled gracefully
- ✅ Missing seed handled gracefully
- ✅ handlePressure errors don't stop batch
- ✅ Logs errors appropriately

## Mocking Strategy

1. **Timers**: Use vi.useFakeTimers() to control time
2. **Database**: Mock Knex queries
3. **PressurePointsService**: Mock getExceededThresholds()
4. **SeedsService**: Mock getById()
5. **Automation Registry**: Mock getById() and automation methods
6. **Queue**: Mock addAutomationJob (via handlePressure)
7. **Config**: Mock config.queue.checkInterval

## Test Data

- Mock pressure points above/below thresholds
- Mock automations with thresholds
- Mock seeds with current state
- Mock user IDs

## Coverage Goals

- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: 100%

## Test Execution Pattern

```typescript
// All tests should follow this pattern:
beforeEach(() => {
  vi.useFakeTimers() // Control time
  // Setup mocks
})

afterEach(() => {
  // Ensure scheduler is stopped
  scheduler.stop()
  vi.useRealTimers()
})

it('should not start automatically', () => {
  // Scheduler should not be running
  expect(scheduler.isActive()).toBe(false)
})
```





