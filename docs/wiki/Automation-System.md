# Automation System

This page documents the automation framework that powers AI-driven features in Memoriae. Automations analyze seeds and create transactions automatically, with a pressure system for re-evaluation.

## Overview

Automations are background processes that:
1. **Analyze seeds** using AI (OpenRouter API)
2. **Create transactions** to modify seed state
3. **Respond to changes** via the pressure system
4. **Run asynchronously** via BullMQ job queue

## Automation Base Class

### Abstract Interface

**Location**: `backend/src/services/automation/base.ts`

All automations extend the `Automation` base class:

```typescript
abstract class Automation {
  abstract readonly name: string              // Unique identifier
  abstract readonly description: string       // Human-readable description
  abstract readonly handlerFnName: string     // Function name for registry
  
  // Core methods
  abstract process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult>
  abstract calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number
  
  // Optional methods with defaults
  async handlePressure(seed: Seed, pressure: number, context: AutomationContext): Promise<void>
  getPressureThreshold(): number  // Default: 50
  calculatePriority(pressure: number): number
  async validateSeed(seed: Seed, context: AutomationContext): Promise<boolean>
}
```

### Required Methods

#### process()

Main method that analyzes a seed and creates transactions:

```typescript
abstract process(
  seed: Seed,
  context: AutomationContext
): Promise<AutomationProcessResult>
```

**Returns**: Array of transactions to be saved to database.

**Example** (Tag Automation):
```typescript
async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
  // 1. Extract hash tags from content
  const hashTags = this.extractHashTags(seed.currentState.seed)
  
  // 2. Generate additional tags using AI
  const aiTags = await this.generateTags(seed, context)
  
  // 3. Create add_tag transactions
  const transactions = [...hashTags, ...aiTags].map(tag => ({
    seed_id: seed.id,
    transaction_type: 'add_tag',
    transaction_data: { tag_id: tag.id, tag_name: tag.name },
    automation_id: this.id,
  }))
  
  return { transactions }
}
```

#### calculatePressure()

Determines pressure amount when categories change:

```typescript
abstract calculatePressure(
  seed: Seed,
  context: AutomationContext,
  changes: CategoryChange[]
): number
```

**Returns**: Pressure value (0-100), where 0 = no pressure, 100 = maximum pressure.

**Example**:
```typescript
calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
  // If seed has no categories, no pressure
  if (seed.currentState.categories.length === 0) {
    return 0
  }
  
  // Check if seed's categories are affected
  const affectedIds = new Set(changes.map(c => c.categoryId))
  const isAffected = seed.currentState.categories.some(c => affectedIds.has(c.id))
  
  if (!isAffected) {
    return 0
  }
  
  // Calculate pressure based on change type
  let pressure = 0
  for (const change of changes) {
    switch (change.type) {
      case 'rename': pressure += 10; break
      case 'remove': pressure += 15; break
      // ...
    }
  }
  
  return Math.min(100, pressure)
}
```

### Optional Methods

#### handlePressure()

Called when pressure threshold is exceeded. Default implementation adds seed to queue:

```typescript
async handlePressure(
  seed: Seed,
  pressure: number,
  context: AutomationContext
): Promise<void> {
  await addAutomationJob({
    seedId: seed.id,
    automationId: this.id,
    userId: context.userId,
    priority: this.calculatePriority(pressure),
  })
}
```

#### getPressureThreshold()

Returns pressure threshold (default: 50). Override for custom thresholds.

#### calculatePriority()

Converts pressure to job priority (default: pressure value, 1-100).

#### validateSeed()

Optional validation before processing. Return `false` to skip processing.

## Automation Context

### Structure

**Location**: `backend/src/services/automation/base.ts`

```typescript
interface AutomationContext {
  openrouter: OpenRouterClient    // AI API client with user's API key
  userId: string                 // User ID
  toolExecutor: ToolExecutor      // Tool execution system
  metadata?: Record<string, unknown> // Optional metadata
}
```

### OpenRouter Client

**Location**: `backend/src/services/openrouter/client.ts`

Pre-configured with:
- User's API key (from `user_settings`)
- User's preferred model (from `user_settings`)
- Error handling and retry logic

### Tool Executor

**Location**: `backend/src/services/automation/tools/executor.ts`

Allows automations to execute tools during AI processing:
- Function calling support
- Tool registry
- Result handling

## Automation Registry

### Singleton Pattern

**Location**: `backend/src/services/automation/registry.ts`

```typescript
class AutomationRegistry {
  private static instance: AutomationRegistry
  private automations: Map<string, Automation> = new Map()
  
  static getInstance(): AutomationRegistry {
    if (!AutomationRegistry.instance) {
      AutomationRegistry.instance = new AutomationRegistry()
    }
    return AutomationRegistry.instance
  }
}
```

### Registration

Automations are registered on server startup:

```typescript
const registry = AutomationRegistry.getInstance()
await registry.loadFromDatabase([
  new TagExtractionAutomation(),
  new CategorizeAutomation(),
  new FollowupAutomation(),
  new IdeaMusingAutomation(),
  new WikipediaReferenceAutomation(),
])
```

### Lookup

```typescript
getById(id: string): Automation | undefined
getByName(name: string): Automation | undefined
getAll(): Automation[]
getEnabled(): Automation[]
```

## Built-in Automations

### Tag Extraction Automation

**Location**: `backend/src/services/automation/tag.ts`

**Purpose**: Extracts hash tags from content and generates additional tags using AI.

**Process**:
1. Extract hash tags (e.g., `#hashtag`) from content using regex
2. Call OpenRouter API to generate additional relevant tags
3. Ensure tags exist in database (create if needed)
4. Create `add_tag` transactions for new tags

**Pressure**: Moderate (10-15) when categories change.

### Categorize Automation

**Location**: `backend/src/services/automation/categorize.ts`

**Purpose**: Assigns hierarchical categories to seeds using AI.

**Process**:
1. Call OpenRouter API to analyze seed content
2. Generate category path suggestions (e.g., "/work/projects")
3. Ensure category hierarchy exists (create parents if needed)
4. Create `set_category` transaction

**Pressure**: High (15-20) when categories change.

### Followup Automation

**Location**: `backend/src/services/automation/followup.ts`

**Purpose**: Generates followup questions/reminders for seeds.

**Process**:
1. Analyze seed content using AI
2. Generate relevant followup questions
3. Create followup sprout with due time and message

**Pressure**: Low (5-10) when categories change.

### Idea Musing Automation

**Location**: `backend/src/services/automation/idea-musing.ts`

**Purpose**: Generates idea musings for seeds identified as "ideas".

**Process**:
1. Identify seeds that are "ideas" (using AI)
2. Schedule musings based on time and limits
3. Generate musing content (numbered ideas, Wikipedia links, markdown)
4. Create musing sprout

**Scheduling**: Time-based (default: 02:00), daily limits, exclusion days.

### Wikipedia Reference Automation

**Location**: `backend/src/services/automation/wikipedia-reference.ts`

**Purpose**: Adds Wikipedia article references for mentioned topics.

**Process**:
1. Extract references from seed content using AI
2. Fetch Wikipedia article information
3. Generate summary using AI
4. Create Wikipedia sprout with article link and summary

**Pressure**: Low (5) when categories change.

## Queue Processing

### Job Structure

**Location**: `backend/src/services/queue/queue.ts`

```typescript
interface AutomationJobData {
  seedId: string
  automationId: string
  userId: string
  priority: number  // Higher = processed sooner
}
```

### Worker

**Location**: `backend/src/services/queue/processor.ts`

```typescript
const automationWorker = new Worker<AutomationJobData>(
  'automation',
  async (job: Job<AutomationJobData>) => {
    const { seedId, automationId, userId } = job.data
    
    // 1. Get automation
    const automation = AutomationRegistry.getById(automationId)
    
    // 2. Get seed with current state
    const seed = await SeedsService.getById(seedId, userId)
    
    // 3. Get user settings (API key, model)
    const settings = await SettingsService.getByUserId(userId)
    
    // 4. Create OpenRouter client
    const openrouterClient = createOpenRouterClient(
      settings.openrouter_api_key,
      settings.openrouter_model
    )
    
    // 5. Create context
    const context = {
      openrouter: openrouterClient,
      userId,
      toolExecutor: new ToolExecutor(),
    }
    
    // 6. Run automation
    const result = await automation.process(seed, context)
    
    // 7. Save transactions
    if (result.transactions.length > 0) {
      await SeedTransactionsService.createMany(result.transactions)
    }
  },
  {
    concurrency: 5,  // Process 5 jobs concurrently
    removeOnComplete: { age: 3600 },  // Keep completed jobs for 1 hour
    removeOnFail: { age: 86400 },     // Keep failed jobs for 24 hours
  }
)
```

### Job Addition

When a seed is created or updated:

```typescript
async function queueAutomations(seedId: string, userId: string): Promise<void> {
  const registry = AutomationRegistry.getInstance()
  const automations = registry.getEnabled()
  
  for (const automation of automations) {
    await addAutomationJob({
      seedId,
      automationId: automation.id!,
      userId,
      priority: 0,  // Default priority
    })
  }
}
```

## Tool Execution System

### Tool Executor

**Location**: `backend/src/services/automation/tools/executor.ts`

Allows automations to execute tools during AI processing:

```typescript
class ToolExecutor {
  async executeTool(toolName: string, args: unknown): Promise<unknown> {
    const tool = ToolRegistry.get(toolName)
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`)
    }
    return await tool.execute(args)
  }
}
```

### Built-in Tools

Tools available for automations to use:
- Category lookup
- Tag lookup
- Seed search
- (More tools can be added)

## Pressure System Integration

### Category Change Detection

**Location**: `backend/src/services/category-change-service.ts`

When categories change:
1. `CategoryChangeService` detects the change
2. Finds all affected seeds
3. For each automation, calculates pressure
4. Adds pressure to `pressure_points` table

### Threshold Evaluation

**Location**: `backend/src/services/queue/scheduler.ts`

Scheduler periodically:
1. Checks all pressure points
2. Finds those exceeding thresholds
3. Calls `automation.handlePressure()` for each
4. Typically adds seed to queue for re-processing

See [Algorithms: Pressure System](Algorithms-Pressure-System) for details.

## Error Handling

### Automation Errors

If automation fails:
1. **Error logged** - Detailed error information
2. **Job marked failed** - Stored in Redis for 24 hours
3. **Retry logic** - BullMQ handles retries automatically
4. **User not blocked** - Seed creation/update succeeds even if automation fails

### OpenRouter API Errors

If OpenRouter API fails:
1. **Error caught** - Automation handles gracefully
2. **Empty result** - Returns no transactions (doesn't fail)
3. **Logged** - Error logged for debugging
4. **User notified** - (Future: user notification system)

## Automation Lifecycle

### 1. Seed Created/Updated

```typescript
// Seed created
const seed = await SeedsService.create(userId, { content: "..." })

// Queue automations
await queueAutomations(seed.id, userId)
```

### 2. Job Queued

```typescript
// Job added to Redis queue
await automationQueue.add('automation', {
  seedId: seed.id,
  automationId: automation.id,
  userId,
  priority: 0,
})
```

### 3. Worker Processes

```typescript
// Worker picks up job
const result = await automation.process(seed, context)

// Transactions saved
await SeedTransactionsService.createMany(result.transactions)
```

### 4. State Updated

```typescript
// Next time seed is fetched, state is recomputed
const seed = await SeedsService.getById(seedId, userId)
// seed.currentState includes new tags/categories from automation
```

## Creating New Automations

### Steps

1. **Create automation class** extending `Automation`:
```typescript
export class MyAutomation extends Automation {
  readonly name = 'my-automation'
  readonly description = 'Does something useful'
  readonly handlerFnName = 'processMyAutomation'
  
  async process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult> {
    // Implementation
  }
  
  calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
    // Implementation
  }
}
```

2. **Register in registry** (on server startup):
```typescript
await registry.loadFromDatabase([
  // ... existing automations
  new MyAutomation(),
])
```

3. **Add to database** (via migration or manual insert):
```sql
INSERT INTO automations (id, name, description, handler_fn_name, enabled)
VALUES (uuid_generate_v4(), 'my-automation', 'Does something useful', 'processMyAutomation', true);
```

## Related Documentation

- [Algorithms: Pressure System](Algorithms-Pressure-System) - Pressure calculation details
- [Algorithms: State Computation](Algorithms-State-Computation) - How transactions create state
- [Timeline System](Timeline-System) - Transaction-based event sourcing
- [Backend Patterns](Backend-Patterns) - Service layer patterns

