# Category Change Service Testing Plan

## Overview
Test the category change detection service that monitors category changes and applies pressure to affected seeds.

## Test Categories

### 1. Category Change Detection Tests

#### handleCategoryRename
- ✅ Detects seeds with renamed category
- ✅ Detects seeds with child categories of renamed category
- ✅ Calculates pressure for affected seeds
- ✅ Handles hierarchical category paths correctly
- ✅ Skips if no seeds are affected
- ✅ Handles errors gracefully

#### handleCategoryAdd
- ✅ Detects seeds with parent category when child is added
- ✅ Calculates pressure for parent category seeds
- ✅ Skips if parentId is null (top-level category)
- ✅ Handles multiple affected seeds

#### handleCategoryRemove
- ✅ Detects seeds with removed category
- ✅ Detects seeds with child categories of removed category
- ✅ Calculates pressure for all affected seeds

#### handleCategoryMove
- ✅ Detects seeds with moved category
- ✅ Calculates pressure for affected seeds
- ✅ Handles null parent IDs correctly

### 2. Affected Seeds Detection Tests

#### findAffectedSeeds
- ✅ Finds seeds with direct category match
- ✅ Finds seeds with child categories (hierarchical)
- ✅ Finds seeds with parent category (for add_child)
- ✅ Removes duplicate seeds
- ✅ Returns empty array when no seeds affected
- ✅ Handles path-based queries correctly

### 3. Pressure Calculation Integration Tests

#### applyPressureForChange
- ✅ Iterates through all enabled automations
- ✅ Calculates pressure for each automation
- ✅ Adds pressure to pressure_points table
- ✅ Skips automations without IDs
- ✅ Handles calculation errors gracefully
- ✅ Processes seeds with correct user context
- ✅ Skips if no automations enabled

### 4. Error Handling Tests

- ✅ Handles database errors gracefully
- ✅ Handles missing seeds gracefully
- ✅ Handles automation errors without stopping batch
- ✅ Logs errors appropriately

## Mocking Strategy

1. **Database**: Mock Knex queries using in-memory store
2. **Automation Registry**: Mock registry.getEnabled() and automation methods
3. **PressurePointsService**: Mock addPressure calls
4. **SeedsService**: Mock getById calls
5. **OpenRouter Client**: Mock creation (not used for calculations)

## Test Data

- Mock categories with hierarchical structure
- Mock seeds with categories assigned
- Mock automations with calculatePressure methods
- Mock seed states with categories

## Coverage Goals

- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: 100%


