# Timeline System

This page documents the immutable timeline and event sourcing system used in Memoriae. All changes to seeds are recorded as transactions, creating a complete history that can be navigated and explored.

## Core Principle

**Immutability First**: Seeds are immutable. All changes create new transactions. The current state is computed by replaying transactions chronologically.

## Transaction-Based Event Sourcing

### Concept

Instead of storing current state directly, Memoriae stores:
1. **Base transaction** - Initial `create_seed` transaction
2. **Modification transactions** - All subsequent changes

Current state is **computed** by replaying transactions, never stored.

### Benefits

1. **Complete History**: Every change is recorded
2. **Audit Trail**: Know who/what/when for every change
3. **Time Travel**: Can reconstruct state at any point in time
4. **No Data Loss**: Even "deleted" data exists in transactions
5. **Consistency**: State always computed from same source of truth

## Transaction Types

### Seed Transactions

**Location**: `backend/src/types/seed-transactions.ts`

All transactions that modify seed state:

- **`create_seed`** - Initial seed creation with content
- **`edit_content`** - Content modification
- **`add_tag`** - Add a tag to the seed
- **`remove_tag`** - Remove a tag from the seed
- **`set_category`** - Set category (replaces existing)
- **`remove_category`** - Remove category
- **`add_sprout`** - Add reference to AI-generated sprout

### Transaction Structure

```typescript
interface SeedTransaction {
  id: string                    // Unique transaction ID
  seed_id: string              // Seed this transaction belongs to
  transaction_type: SeedTransactionType
  transaction_data: SeedTransactionData  // Type-specific data
  created_at: Date             // When transaction was created
  automation_id: string | null // Automation that created it (null if manual)
}
```

## State Computation

### Algorithm

**Location**: `backend/src/utils/seed-state.ts`

State is computed by replaying transactions:

```typescript
function computeSeedState(transactions: SeedTransaction[]): SeedState {
  // 1. Sort chronologically (oldest first)
  const sorted = transactions.sort((a, b) => 
    a.created_at.getTime() - b.created_at.getTime()
  )
  
  // 2. Find creation transaction
  const creation = sorted.find(t => t.transaction_type === 'create_seed')
  
  // 3. Initialize state
  let state: SeedState = {
    seed: creation.transaction_data.content,
    timestamp: creation.created_at,
    metadata: {},
    tags: [],
    categories: [],
  }
  
  // 4. Apply remaining transactions in order
  for (const transaction of sorted) {
    if (transaction.transaction_type === 'create_seed') continue
    
    // Apply transaction based on type
    switch (transaction.transaction_type) {
      case 'edit_content':
        state.seed = transaction.transaction_data.content
        break
      case 'add_tag':
        state.tags.push(transaction.transaction_data)
        break
      // ... other transaction types
    }
  }
  
  return state
}
```

See [Algorithms: State Computation](Algorithms-State-Computation) for detailed algorithm.

## Timeline Visualization

### Frontend Component

**Location**: `frontend/src/components/SeedTimeline/SeedTimeline.tsx`

The timeline component displays all transactions chronologically:

```typescript
export function SeedTimeline({ 
  transactions, 
  sprouts, 
  tags = [], 
  getColor 
}: SeedTimelineProps) {
  // Group transactions by date
  const grouped = groupByDate(transactions)
  
  // Render timeline
  return (
    <div className="timeline">
      {Object.entries(grouped).map(([date, txs]) => (
        <TimelineDay key={date} date={date} transactions={txs} />
      ))}
    </div>
  )
}
```

### Timeline Features

1. **Chronological Display**: Transactions shown in order
2. **Date Grouping**: Grouped by date for readability
3. **Transaction Details**: Shows what changed
4. **Automation Attribution**: Shows which automation created transaction
5. **Sprout Integration**: Displays related sprouts

## Immutability Guarantees

### No Direct Mutations

**Never do this**:
```typescript
// ❌ BAD: Direct mutation
seed.currentState.seed = "new content"
await db('seeds').update({ seed_content: "new content" })
```

**Always do this**:
```typescript
// ✅ GOOD: Create transaction
await SeedTransactionsService.create({
  seed_id: seed.id,
  transaction_type: 'edit_content',
  transaction_data: { content: "new content" },
})
```

### Transaction Creation

**Location**: `backend/src/services/seed-transactions.ts`

```typescript
static async create(data: CreateSeedTransactionDto): Promise<SeedTransaction> {
  const transaction: SeedTransaction = {
    id: uuidv4(),
    seed_id: data.seed_id,
    transaction_type: data.transaction_type,
    transaction_data: data.transaction_data,
    created_at: new Date(),
    automation_id: data.automation_id || null,
  }
  
  await db('seed_transactions').insert(transaction)
  return transaction
}
```

## Transaction Toggling (Future)

### Concept

While not yet implemented, the system is designed to support toggling transactions on/off:

**Planned Structure**:
```typescript
interface SeedTransaction {
  // ... existing fields
  enabled: boolean  // Future: can disable transactions
}
```

**Use Case**: 
- Disable a transaction to see state without that change
- Re-enable to restore the change
- Explore "what if" scenarios

**Current State**: All transactions are always enabled. Toggling is a future enhancement.

## Transaction Attribution

### Manual vs Automated

Transactions can be created by:
1. **User actions** - Manual edits, tag additions, etc.
2. **Automations** - AI-powered tag/category generation

**Identification**:
- `automation_id = null` → Manual transaction
- `automation_id = <uuid>` → Created by automation

### Automation Tracking

This allows:
- Seeing which automations made which changes
- Understanding AI-generated content
- Debugging automation behavior

## Timeline Queries

### Getting Timeline

**Location**: `backend/src/routes/transactions.ts`

```typescript
router.get('/seeds/:seedId/transactions', async (req, res) => {
  const transactions = await SeedTransactionsService.getBySeedId(seedId)
  res.json(transactions)
})
```

### Query Pattern

```typescript
static async getBySeedId(seedId: string): Promise<SeedTransaction[]> {
  return await db('seed_transactions')
    .where({ seed_id: seedId })
    .orderBy('created_at', 'asc')  // Chronological order
    .select('*')
}
```

**Index**: Composite index on `[seed_id, created_at]` ensures fast queries.

## State Caching (Future)

### Current Implementation

State is computed on-demand for each request. No caching is implemented.

### Future Optimization

Potential caching strategies:
1. **Compute on write**: Compute state when transaction is created
2. **Cache with invalidation**: Cache computed state, invalidate on new transaction
3. **Incremental updates**: Only recompute affected parts

**Trade-offs**:
- **Current**: Always accurate, but slower
- **Cached**: Faster, but requires invalidation logic

## Transaction Validation

### Validation Rules

**Location**: `backend/src/utils/seed-state.ts`

Before applying transactions, they are validated:

```typescript
function validateTransaction(
  type: SeedTransactionType,
  data: SeedTransactionData
): void {
  switch (type) {
    case 'create_seed':
      if (typeof data.content !== 'string' || data.content.trim().length === 0) {
        throw new Error('create_seed requires non-empty content')
      }
      break
    case 'add_tag':
      if (typeof data.tag_id !== 'string' || typeof data.tag_name !== 'string') {
        throw new Error('add_tag requires tag_id and tag_name')
      }
      break
    // ... other validations
  }
}
```

### Error Handling

Invalid transactions are:
1. **Logged** - Error logged for debugging
2. **Skipped** - Transaction not applied, computation continues
3. **Not deleted** - Transaction remains in database for audit

This ensures robustness - one bad transaction doesn't break entire state.

## Related Systems

### Tag Transactions

Tags also use transaction-based state:
- `tag_transactions` table
- Similar replay algorithm
- See [Algorithms: State Computation](Algorithms-State-Computation)

### Sprout Transactions

Sprouts have type-specific transactions:
- `sprout_followup_transactions` - Followup state changes
- `sprout_wikipedia_transactions` - Wikipedia reference changes
- Similar replay patterns

## Performance Considerations

### Transaction Count

As seeds accumulate transactions, computation time increases:
- **Small seeds** (< 10 transactions): < 1ms
- **Medium seeds** (10-100 transactions): 1-10ms
- **Large seeds** (> 100 transactions): 10-100ms

### Optimization Strategies

1. **Limit transaction history**: Only fetch transactions needed
2. **Batch computation**: Compute multiple seeds in parallel
3. **Caching**: Cache computed states (with invalidation)
4. **Indexes**: Ensure fast transaction queries

## Related Documentation

- [Algorithms: State Computation](Algorithms-State-Computation) - Detailed computation algorithm
- [Data Structures](Data-Structures) - Transaction data structures
- [Database Schema](Database-Schema) - Transaction table schema
- [Automation System](Automation-System) - How automations create transactions

