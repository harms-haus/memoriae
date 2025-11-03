# Pressure Points Service - Testing Plan

## Overview

This document outlines a comprehensive testing plan for the pressure points service. The service tracks pressure per seed/automation and detects when pressure crosses thresholds, triggering automation re-evaluation.

## Design Requirements (from memoriae-web-app-implementation-fe49a05f.plan.md)

- Pressure is tracked per seed/automation pair in `pressure_points` table
- Pressure amount is 0-100 scale
- Pressure accumulates when category changes occur
- Each automation has a configurable threshold (default: 50)
- When pressure >= threshold, automation should re-process the seed
- Pressure points table: `seed_id`, `automation_id`, `pressure_amount`, `last_updated`

## Test Categories

### 1. Basic CRUD Operations

#### 1.1 Create/Read Operations
- ✅ Test `get()` - retrieves existing pressure point
- ✅ Test `get()` - returns null for non-existent pressure point
- ✅ Test `getBySeedId()` - retrieves all pressure points for a seed
- ✅ Test `getBySeedId()` - returns empty array for seed with no pressure points
- ✅ Test `getByAutomationId()` - retrieves all pressure points for an automation
- ✅ Test `getByAutomationId()` - returns empty array for automation with no pressure points
- ✅ Test `getAll()` - retrieves all pressure points
- ✅ Test `getAll()` - returns empty array when no pressure points exist

#### 1.2 Update Operations
- ✅ Test `addPressure()` - creates new pressure point when none exists
- ✅ Test `addPressure()` - adds to existing pressure amount
- ✅ Test `addPressure()` - caps pressure at 100 (doesn't exceed 100)
- ✅ Test `addPressure()` - handles negative pressure (clamps to 0)
- ✅ Test `addPressure()` - handles pressure > 100 (clamps to 100)
- ✅ Test `addPressure()` - updates last_updated timestamp
- ✅ Test `setPressure()` - sets exact pressure value
- ✅ Test `setPressure()` - creates new pressure point if doesn't exist
- ✅ Test `setPressure()` - updates existing pressure point
- ✅ Test `setPressure()` - caps pressure at 100
- ✅ Test `setPressure()` - handles negative pressure (clamps to 0)
- ✅ Test `resetPressure()` - sets pressure to 0
- ✅ Test `resetPressure()` - creates pressure point at 0 if doesn't exist
- ✅ Test `resetAllForSeed()` - resets all pressure for a seed
- ✅ Test `resetAllForAutomation()` - resets all pressure for an automation

#### 1.3 Delete Operations
- ✅ Test `delete()` - deletes existing pressure point
- ✅ Test `delete()` - returns false for non-existent pressure point
- ✅ Test `deleteAllForSeed()` - deletes all pressure points for a seed
- ✅ Test `deleteAllForSeed()` - returns 0 if seed has no pressure points
- ✅ Test `deleteAllForAutomation()` - deletes all pressure points for an automation
- ✅ Test `deleteAllForAutomation()` - returns 0 if automation has no pressure points

### 2. Threshold Detection

#### 2.1 Threshold Calculation
- ✅ Test `enrichWithThreshold()` - adds threshold from automation
- ✅ Test `enrichWithThreshold()` - uses default threshold (50) if automation not found
- ✅ Test `enrichWithThreshold()` - uses automation's custom threshold if set
- ✅ Test `exceedsThreshold()` - returns true when pressure >= threshold
- ✅ Test `exceedsThreshold()` - returns false when pressure < threshold
- ✅ Test `exceedsThreshold()` - returns false when threshold is undefined

#### 2.2 Exceeded Threshold Queries
- ✅ Test `getExceededThresholds()` - returns only pressure points that exceed threshold
- ✅ Test `getExceededThresholds()` - filters by automation ID when provided
- ✅ Test `getExceededThresholds()` - returns empty array when no thresholds exceeded
- ✅ Test `getExceededThresholds()` - handles pressure exactly at threshold (>=)
- ✅ Test `getExceededThresholds()` - works with custom automation thresholds

### 3. Integration with Automation System

#### 3.1 Automation Registry Integration
- ✅ Test pressure points work with registered automations
- ✅ Test pressure points work when automation not in registry
- ✅ Test threshold calculation uses automation's getPressureThreshold()
- ✅ Test custom threshold automations are handled correctly

#### 3.2 Pressure Accumulation
- ✅ Test multiple `addPressure()` calls accumulate correctly
- ✅ Test pressure accumulation stops at 100 (caps)
- ✅ Test different automations for same seed maintain separate pressure

### 4. Edge Cases and Error Handling

#### 4.1 Invalid Inputs
- ✅ Test `addPressure()` with NaN (should handle gracefully)
- ✅ Test `setPressure()` with NaN (should handle gracefully)
- ✅ Test empty string IDs (should fail appropriately)
- ✅ Test invalid UUID format (should fail appropriately)

#### 4.2 Database Constraints
- ✅ Test foreign key constraint on seed_id (should fail if seed doesn't exist)
- ✅ Test foreign key constraint on automation_id (should fail if automation doesn't exist)
- ✅ Test composite primary key (seed_id + automation_id) prevents duplicates
- ✅ Test cascade delete when seed is deleted
- ✅ Test cascade delete when automation is deleted

#### 4.3 Boundary Conditions
- ✅ Test pressure at exactly 0
- ✅ Test pressure at exactly 100
- ✅ Test threshold at exactly 0
- ✅ Test threshold at exactly 100
- ✅ Test pressure exactly equals threshold (should exceed)

### 5. Performance Considerations

#### 5.1 Query Performance
- ✅ Test `getExceededThresholds()` performs well with many pressure points
- ✅ Test indexes are used effectively (manual verification)
- ✅ Test bulk operations (resetAllForSeed, resetAllForAutomation)

### 6. Real-World Scenarios

#### 6.1 Category Change Simulation
- ✅ Test simulating category rename adds pressure to affected seeds
- ✅ Test simulating category remove adds pressure to affected seeds
- ✅ Test simulating category move adds pressure to affected seeds
- ✅ Test simulating category add_child adds pressure to parent category seeds
- ✅ Test multiple category changes accumulate pressure correctly

#### 6.2 Threshold Crossing
- ✅ Test pressure starts below threshold, then crosses threshold
- ✅ Test pressure crosses threshold, then gets reset, then crosses again
- ✅ Test multiple automations for same seed have independent thresholds
- ✅ Test automation with low threshold (e.g., 10) vs high threshold (e.g., 80)

## Test Implementation Strategy

1. **Unit Tests**: Test individual methods in isolation
2. **Integration Tests**: Test with real database (test database)
3. **Mock Dependencies**: Mock AutomationRegistry for threshold tests
4. **Test Data**: Use test fixtures for seeds and automations
5. **Cleanup**: Ensure test database is cleaned between tests

## Test Files Structure

```
backend/src/services/
  pressure.ts
  pressure.test.ts  # Main test file
```

## Success Criteria

All tests must pass:
- ✅ All CRUD operations work correctly
- ✅ Threshold detection works accurately
- ✅ Edge cases are handled gracefully
- ✅ Integration with automation system works
- ✅ Database constraints are respected
- ✅ Performance is acceptable

## Notes

- Use test database for integration tests
- Clean up test data after each test
- Use transactions where possible for test isolation
- Mock AutomationRegistry for threshold-related tests
- Test with real automations when testing integration

