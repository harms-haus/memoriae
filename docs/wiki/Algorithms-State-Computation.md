# Algorithms: State Computation

This page explains how state is computed from transactions using the transaction replay algorithm. State is never stored directly - it's always computed by replaying transactions chronologically.

## Core Principle

**State is computed, never stored**. All current state is derived by replaying transactions in chronological order. This ensures consistency and provides a complete audit trail of all changes.

## Seed State Computation

### Algorithm Overview

The `computeSeedState()` function in `backend/src/utils/seed-state.ts` implements the transaction replay algorithm:

1. **Sort transactions chronologically** (oldest first)
2. **Find creation transaction** (`create_seed`) - must exist
3. **Initialize state** from creation transaction
4. **Apply remaining transactions** in order
5. **Return computed state**

### Step-by-Step Process

```typescript
function computeSeedState(transactions: SeedTransaction[]): SeedState {
  // Step 1: Sort by creation time (oldest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
  )

  // Step 2: Find creation transaction
  const creationTransaction = sortedTransactions.find(
    (t) => t.transaction_type === 'create_seed'
  )
  if (!creationTransaction) {
    throw new Error('Seed must have a create_seed transaction')
  }

  // Step 3: Initialize state from creation
  const creationData = creationTransaction.transaction_data as CreateSeedTransactionData
  let state: SeedState = {
    seed: creationData.content,
    timestamp: creationTransaction.created_at,
    metadata: {},
    tags: [],
    categories: [],
  }

  // Step 4: Apply remaining transactions in order
  for (const transaction of sortedTransactions) {
    if (transaction.transaction_type === 'create_seed') {
      continue // Already processed
    }

    // Validate transaction before applying
    validateTransaction(transaction.transaction_type, transaction.transaction_data)

    // Apply transaction based on type
    switch (transaction.transaction_type) {
      case 'edit_content':
        state.seed = transaction.transaction_data.content
        break
      case 'add_tag':
        // Add tag if not already present (idempotent)
        if (!state.tags.some(t => t.id === data.tag_id)) {
          state.tags.push({ id: data.tag_id, name: data.tag_name })
        }
        break
      case 'remove_tag':
        state.tags = state.tags.filter(t => t.id !== data.tag_id)
        break
      case 'set_category':
        // Replace any existing category (seeds can only have one)
        state.categories = [{
          id: data.category_id,
          name: data.category_name,
          path: data.category_path,
        }]
        break
      case 'remove_category':
        state.categories = state.categories.filter(c => c.id !== data.category_id)
        break
      // add_followup and add_sprout don't affect seed state
    }
  }

  return state
}
```

### Transaction Application Logic

Each transaction type modifies state in a specific way:

#### create_seed
- **Effect**: Initializes state with content
- **Data**: `{ content: string }`
- **Validation**: Content must be non-empty string

#### edit_content
- **Effect**: Replaces entire content
- **Data**: `{ content: string }`
- **Note**: Full replacement, not incremental

#### add_tag
- **Effect**: Adds tag to tags array
- **Data**: `{ tag_id: string, tag_name: string }`
- **Idempotency**: Checks if tag already exists before adding

#### remove_tag
- **Effect**: Removes tag from tags array
- **Data**: `{ tag_id: string }`
- **Safety**: No error if tag doesn't exist

#### set_category
- **Effect**: Replaces entire categories array with single category
- **Data**: `{ category_id: string, category_name: string, category_path: string }`
- **Note**: Seeds can only have one category (replaces existing)

#### remove_category
- **Effect**: Removes category from categories array
- **Data**: `{ category_id: string }`
- **Safety**: No error if category doesn't exist

#### add_sprout
- **Effect**: None (sprouts are separate entities)
- **Data**: `{ sprout_id: string }`
- **Note**: Sprouts don't affect seed state computation

### Validation

Before applying each transaction, `validateTransaction()` checks:

1. **Transaction type** is valid
2. **Transaction data** matches expected structure for type
3. **Required fields** are present and correct types

**Example validation**:
```typescript
case 'add_tag': {
  const d = data as AddTagTransactionData
  if (typeof d.tag_id !== 'string' || typeof d.tag_name !== 'string') {
    throw new Error('add_tag transaction requires tag_id and tag_name strings')
  }
  break
}
```

### Error Handling

- **Invalid transactions**: Logged and skipped, computation continues
- **Missing creation transaction**: Throws error (cannot compute state)
- **Invalid transaction data**: Logged and skipped, computation continues

This ensures robustness - one bad transaction doesn't break entire state computation.

## Tag State Computation

### Algorithm

Similar to seed state computation, tag state is computed from `tag_transactions`:

**Location**: `backend/src/utils/tag-state.ts`

```typescript
function computeTagState(transactions: TagTransaction[]): TagState {
  // Sort chronologically
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
  )

  // Find creation transaction
  const creationTransaction = sortedTransactions.find(
    (t) => t.transaction_type === 'creation'
  )
  if (!creationTransaction) {
    throw new Error('Tag must have a creation transaction')
  }

  // Initialize from creation
  const creationData = creationTransaction.transaction_data as CreationTransactionData
  let state: TagState = {
    name: creationData.name,
    color: creationData.color,
    timestamp: creationTransaction.created_at,
    metadata: {},
  }

  // Apply remaining transactions
  for (const transaction of sortedTransactions) {
    if (transaction.transaction_type === 'creation') {
      continue
    }

    switch (transaction.transaction_type) {
      case 'edit':
        state.name = transaction.transaction_data.name
        break
      case 'set_color':
        state.color = transaction.transaction_data.color
        break
    }
  }

  return state
}
```

### Transaction Types

- **creation**: Initializes tag with name and optional color
- **edit**: Changes tag name
- **set_color**: Changes or removes tag color

## Sprout State Computation

Sprouts have type-specific state computation. Each sprout type has its own computation function.

### Followup Sprout State

**Location**: `backend/src/services/sprouts/followup-sprout.ts`

```typescript
function computeFollowupState(
  sprout: Sprout,
  transactions: SproutFollowupTransaction[]
): FollowupSproutState {
  // Sort chronologically
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
  )

  // Find creation transaction
  const creationTransaction = sortedTransactions.find(
    (t) => t.transaction_type === 'creation'
  )
  if (!creationTransaction) {
    throw new Error('Followup sprout must have a creation transaction')
  }

  // Initialize from creation
  const creationData = creationTransaction.transaction_data as CreationTransactionData
  let dueTime = new Date(creationData.initial_time)
  let message = creationData.initial_message
  let dismissed = false
  let dismissedAt: Date | undefined

  // Apply remaining transactions
  for (const transaction of sortedTransactions) {
    if (transaction.transaction_type === 'creation') {
      continue
    }

    switch (transaction.transaction_type) {
      case 'edit':
        const editData = transaction.transaction_data as EditTransactionData
        if (editData.new_time) {
          dueTime = new Date(editData.new_time)
        }
        if (editData.new_message) {
          message = editData.new_message
        }
        break
      case 'dismissal':
        const dismissalData = transaction.transaction_data as DismissalTransactionData
        dismissed = true
        dismissedAt = new Date(dismissalData.dismissed_at)
        break
      case 'snooze':
        const snoozeData = transaction.transaction_data as SnoozeTransactionData
        dueTime = new Date(snoozeData.snoozed_at)
        dueTime.setMinutes(dueTime.getMinutes() + snoozeData.duration_minutes)
        break
    }
  }

  return {
    due_time: dueTime,
    message,
    dismissed,
    dismissed_at: dismissedAt,
    transactions: sortedTransactions,
  }
}
```

### Musing Sprout State

Musing sprouts store their state directly in `sprout_data` JSONB field. No transaction replay needed - state is the data itself.

**Structure**:
```typescript
interface MusingSproutData {
  template_type: 'numbered_ideas' | 'wikipedia_links' | 'markdown'
  content: MusingContent
  dismissed: boolean
  dismissed_at: string | null
  completed: boolean
  completed_at: string | null
}
```

### Wikipedia Sprout State

**Location**: `backend/src/services/sprouts/wikipedia-sprout.ts`

Similar to followup sprouts, Wikipedia sprout state is computed from `sprout_wikipedia_transactions`:

- **creation**: Initializes reference, article URL, title, and summary
- **edit**: Updates summary

## Performance Considerations

### Caching

State computation can be expensive for seeds with many transactions. Consider:

1. **Caching computed state** (with invalidation on new transactions)
2. **Lazy computation** (only compute when needed)
3. **Incremental updates** (only recompute affected parts)

**Current Implementation**: State is computed on-demand for each request. No caching is implemented yet.

### Optimization Strategies

1. **Index on `[seed_id, created_at]`**: Fast chronological ordering
2. **Limit transaction history**: Only fetch transactions needed for current state
3. **Batch computation**: Compute state for multiple seeds in parallel

## Transaction Ordering

### Chronological Ordering

Transactions must be sorted by `created_at` timestamp (oldest first) to ensure correct state computation.

**Why**: Later transactions may depend on earlier ones. For example:
- `add_tag` must come after `create_seed`
- `remove_tag` must come after corresponding `add_tag`

### Handling Concurrent Transactions

If two transactions have the same `created_at` timestamp:

1. **Database ordering**: PostgreSQL may return in any order
2. **Application ordering**: Sort by `id` as secondary key for determinism

**Current Implementation**: Sorts by `created_at` only. Same-timestamp transactions may apply in non-deterministic order.

## Related Documentation

- [Data Structures](Data-Structures) - Transaction data structures
- [Timeline System](Timeline-System) - Immutable event sourcing
- [Database Schema](Database-Schema) - Transaction table schema

