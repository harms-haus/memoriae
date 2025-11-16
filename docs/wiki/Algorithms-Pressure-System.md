# Algorithms: Pressure System

This page explains how the pressure system works to trigger automation re-evaluation when categories change. Pressure is a metric (0-100) that accumulates and triggers re-processing when thresholds are crossed.

## Overview

The pressure system ensures automations re-evaluate seeds when related categories change. For example, if a category is renamed, seeds in that category may need updated tags or categories.

## Pressure Calculation

### Core Concept

**Pressure** is a numeric value (0-100) that represents how much a category change affects whether an automation should re-process a seed. Higher pressure means more impact.

### Calculation Algorithm

Each automation implements `calculatePressure()` method that determines pressure based on:

1. **Seed's current categories** - Does the seed belong to affected categories?
2. **Category change type** - Different changes have different impact
3. **Automation-specific logic** - Each automation may weight changes differently

**Location**: `backend/src/services/automation/base.ts`

```typescript
abstract calculatePressure(
  seed: Seed,
  context: AutomationContext,
  changes: CategoryChange[]
): number
```

### Category Change Types

**Location**: `backend/src/services/automation/base.ts`

```typescript
interface CategoryChange {
  type: 'rename' | 'add_child' | 'remove' | 'move'
  categoryId: string
  oldPath?: string
  newPath?: string
  parentId?: string
  oldParentId?: string
  newParentId?: string
}
```

### Example: Tag Automation Pressure

**Location**: `backend/src/services/automation/tag.ts`

```typescript
calculatePressure(
  seed: Seed,
  context: AutomationContext,
  changes: CategoryChange[]
): number {
  // If seed has no categories, category changes don't affect tags much
  const seedCategories = seed.currentState.categories || []
  if (seedCategories.length === 0) {
    return 0
  }

  // Check if seed's categories are affected by the changes
  const affectedCategoryIds = new Set(changes.map(c => c.categoryId))
  const isAffected = seedCategories.some(cat => affectedCategoryIds.has(cat.id))

  if (!isAffected) {
    return 0
  }

  // Calculate pressure based on change type
  let totalPressure = 0
  for (const change of changes) {
    switch (change.type) {
      case 'rename':
        totalPressure += 10  // Moderate impact
        break
      case 'add_child':
        totalPressure += 5   // Low impact
        break
      case 'remove':
        totalPressure += 15  // High impact
        break
      case 'move':
        totalPressure += 10  // Moderate impact
        break
    }
  }

  // Cap at 100
  return Math.min(100, totalPressure)
}
```

### Pressure Values by Change Type

Typical pressure values (automation-specific):

- **rename**: 10-15 - Category name changed, may affect tag/category names
- **add_child**: 5 - New subcategory added, low impact
- **remove**: 15-20 - Category removed, high impact
- **move**: 10-15 - Category moved in hierarchy, moderate impact

## Pressure Accumulation

### Adding Pressure

**Location**: `backend/src/services/pressure.ts`

When category changes occur, pressure is added to existing pressure:

```typescript
static async addPressure(
  seedId: string,
  automationId: string,
  pressureAmount: number
): Promise<PressurePoint> {
  // Clamp to 0-100 range
  const clampedAmount = Math.max(0, Math.min(100, pressureAmount))

  // Get existing pressure point
  const existing = await db('pressure_points')
    .where({ seed_id: seedId, automation_id: automationId })
    .first()

  if (existing) {
    // Add to existing pressure, cap at 100
    const existingPressure = parseFloat(existing.pressure_amount)
    const newPressure = Math.min(100, existingPressure + clampedAmount)

    await db('pressure_points')
      .where({ seed_id: seedId, automation_id: automationId })
      .update({
        pressure_amount: newPressure,
        last_updated: new Date(),
      })
  } else {
    // Create new pressure point
    await db('pressure_points').insert({
      seed_id: seedId,
      automation_id: automationId,
      pressure_amount: clampedAmount,
      last_updated: new Date(),
    })
  }
}
```

### Pressure Capping

Pressure is always capped at 100:
- **Additive**: New pressure is added to existing
- **Capped**: Result cannot exceed 100
- **Persistent**: Stored in `pressure_points` table

## Threshold Detection

### Threshold Configuration

Each automation defines its pressure threshold:

**Location**: `backend/src/services/automation/base.ts`

```typescript
getPressureThreshold(): number {
  return 50  // Default threshold
}
```

Automations can override this to set custom thresholds.

### Threshold Checking

**Location**: `backend/src/services/pressure.ts`

```typescript
static exceedsThreshold(pressurePoint: PressurePoint): boolean {
  if (pressurePoint.threshold === undefined) {
    return false
  }
  return pressurePoint.pressure_amount >= pressurePoint.threshold
}
```

### Finding Exceeded Thresholds

**Location**: `backend/src/services/pressure.ts`

```typescript
static async getExceededThresholds(automationId?: string): Promise<PressurePoint[]> {
  const allPressurePoints = automationId
    ? await this.getByAutomationId(automationId)
    : await this.getAll()

  // Filter to only those that exceed threshold
  return allPressurePoints.filter(point => this.exceedsThreshold(point))
}
```

## Scheduler Evaluation

### Pressure Evaluation Scheduler

**Location**: `backend/src/services/queue/scheduler.ts`

The scheduler periodically checks for exceeded thresholds and triggers re-evaluation:

```typescript
class PressureEvaluationScheduler {
  private async evaluatePressurePoints(): Promise<void> {
    // Get all pressure points that exceed their threshold
    const exceededPoints = await PressurePointsService.getExceededThresholds()

    if (exceededPoints.length === 0) {
      return
    }

    const registry = AutomationRegistry.getInstance()

    // Process each exceeded pressure point
    for (const point of exceededPoints) {
      // Get the automation
      const automation = registry.getById(point.automation_id)
      if (!automation || !automation.enabled) {
        continue
      }

      // Get the seed
      const seed = await SeedsService.getById(point.seed_id, userId)

      // Create automation context
      const context = {
        openrouter: openrouterClient,
        userId,
        toolExecutor,
      }

      // Call automation's handlePressure method
      await automation.handlePressure(seed, point.pressure_amount, context)
    }
  }
}
```

### Scheduler Interval

**Default**: 30 seconds (`QUEUE_CHECK_INTERVAL` environment variable)

**Configuration**: `backend/src/config.ts`

The scheduler:
1. Runs on configurable interval (default: 30s)
2. Checks all pressure points
3. Finds those exceeding thresholds
4. Triggers `handlePressure()` for each

### Error Handling

**Connection Pool Management**:
- Detects connection pool exhaustion
- Skips evaluations after consecutive errors
- Implements recovery delay (1 minute)
- Resets error counter on successful queries

**Timeout Protection**:
- Wraps database queries with timeouts
- Prevents hanging queries from blocking scheduler
- Default timeout: 5 seconds

## Pressure Handling

### Default Implementation

**Location**: `backend/src/services/automation/base.ts`

When threshold is exceeded, `handlePressure()` is called:

```typescript
async handlePressure(
  seed: Seed,
  pressure: number,
  context: AutomationContext
): Promise<void> {
  // Default: add to queue for re-processing
  if (!this.id) {
    throw new Error(`Automation "${this.name}" does not have an ID`)
  }

  const { addAutomationJob } = await import('../queue/queue')
  
  await addAutomationJob({
    seedId: seed.id,
    automationId: this.id,
    userId: context.userId,
    priority: this.calculatePriority(pressure),
  })
}
```

### Priority Calculation

Priority is calculated from pressure:

```typescript
calculatePriority(pressure: number): number {
  // Default: priority is based on pressure
  return Math.min(100, Math.max(1, Math.round(pressure)))
}
```

Higher pressure = higher priority = processed sooner.

## Category Change Detection

### CategoryChangeService

**Location**: `backend/src/services/category-change-service.ts`

When categories are modified, `CategoryChangeService` detects changes and calculates pressure:

```typescript
class CategoryChangeService {
  async handleCategoryRename(
    categoryId: string,
    oldName: string,
    newName: string
  ): Promise<void> {
    // Detect change
    const change: CategoryChange = {
      type: 'rename',
      categoryId,
      oldPath: oldPath,
      newPath: newPath,
    }

    // Find affected seeds
    const affectedSeeds = await this.getSeedsInCategory(categoryId)

    // Calculate and add pressure for each automation
    for (const seed of affectedSeeds) {
      for (const automation of automations) {
        const pressure = automation.calculatePressure(seed, context, [change])
        if (pressure > 0) {
          await PressurePointsService.addPressure(
            seed.id,
            automation.id,
            pressure
          )
        }
      }
    }
  }
}
```

### Change Types Handled

1. **Rename**: Category name or path changed
2. **Add Child**: New subcategory added
3. **Remove**: Category deleted
4. **Move**: Category moved to different parent

## Pressure Reset

### Resetting Pressure

After automation processes a seed, pressure should be reset:

```typescript
static async resetPressure(
  seedId: string,
  automationId: string
): Promise<PressurePoint> {
  return this.setPressure(seedId, automationId, 0)
}
```

**When to reset**:
- After successful automation processing
- After manual re-evaluation
- When category changes are reverted

## Performance Considerations

### Database Queries

**Indexes**:
- `[automation_id, pressure_amount]` - Fast threshold queries
- `seed_id` - Fast seed lookups
- `pressure_amount` - Fast sorting

### Scheduler Efficiency

- **Batch processing**: Processes multiple pressure points in one cycle
- **Connection pooling**: Reuses database connections
- **Timeout protection**: Prevents hanging queries
- **Error recovery**: Skips cycles after errors to allow pool recovery

## Related Documentation

- [Automation System](Automation-System) - Automation framework
- [Algorithms: Category Hierarchy](Algorithms-Category-Hierarchy) - Category structure
- [Database Schema](Database-Schema) - Pressure points table

