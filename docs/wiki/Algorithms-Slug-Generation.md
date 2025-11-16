# Algorithms: Slug Generation

This page explains how unique, human-readable URLs are generated for seeds. Slugs combine a UUID prefix with a normalized text slug, with collision detection and resolution.

## Overview

Seeds have both a UUID (for database operations) and a slug (for human-readable URLs). Slugs are generated from seed content and include a UUID prefix to ensure uniqueness.

## Slug Format

### Structure

**Format**: `{uuidPrefix}/{slug}`

**Components**:
- `uuidPrefix` - First 7 characters of seed UUID
- `slug` - Normalized text from seed content

**Examples**:
- `abc1234/my-first-seed`
- `def5678/meeting-notes`
- `xyz9012/important-idea-2` (collision resolved)

## Slugification Algorithm

### Text Normalization

**Location**: `backend/src/utils/slug.ts`

```typescript
function slugify(text: string, maxLength: number = 50): string {
  return text
    .toLowerCase()                    // Convert to lowercase
    .trim()                           // Remove leading/trailing whitespace
    .substring(0, maxLength)          // Limit length
    .replace(/[^\w\s-]/g, '')        // Remove special characters
    .replace(/\s+/g, '-')            // Replace spaces with hyphens
    .replace(/-+/g, '-')             // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
}
```

### Normalization Steps

1. **Lowercase**: `"My Seed"` → `"my seed"`
2. **Trim**: `"  my seed  "` → `"my seed"`
3. **Limit length**: First 50 characters
4. **Remove special chars**: `"my@seed#123"` → `"myseed123"`
5. **Spaces to hyphens**: `"my seed"` → `"my-seed"`
6. **Collapse hyphens**: `"my---seed"` → `"my-seed"`
7. **Trim hyphens**: `"-my-seed-"` → `"my-seed"`

### Examples

- `"My First Seed"` → `"my-first-seed"`
- `"Meeting @ 3pm #important"` → `"meeting-3pm-important"`
- `"   Multiple   Spaces   "` → `"multiple-spaces"`
- `"Special!!!Chars###"` → `"specialchars"`

## UUID Prefix Extraction

### Algorithm

**Location**: `backend/src/services/seeds.ts`

```typescript
const id = uuidv4()  // e.g., "abc12345-def6-7890-abcd-ef1234567890"
const uuidPrefix = id.substring(0, 7)  // "abc1234"
```

**Purpose**: Ensures uniqueness even if text slugs collide.

**Length**: 7 characters provides good balance:
- Short enough for readable URLs
- Long enough to avoid collisions (36^7 = ~78 billion combinations)

## Full Slug Generation

### Algorithm

**Location**: `backend/src/utils/slug.ts`

```typescript
async function generateSeedSlug(
  content: string,
  uuidPrefix: string
): Promise<string> {
  // Extract first ~50 characters of content for slug
  const textForSlug = content.trim().substring(0, 50)
  const baseSlug = slugify(textForSlug)
  
  // If slug is empty after processing, use a default
  const slugPart = baseSlug || 'seed'
  
  // Build full slug: {uuidPrefix}/{slug}
  const fullSlug = `${uuidPrefix}/${slugPart}`
  
  // Check for collisions and append number if needed
  let finalSlug = fullSlug
  let counter = 2
  
  while (true) {
    const existing = await db('seeds')
      .where({ slug: finalSlug })
      .first()
    
    if (!existing) {
      break // No collision, use this slug
    }
    
    // Collision detected, append number
    finalSlug = `${uuidPrefix}/${slugPart}-${counter}`
    counter++
  }
  
  return finalSlug
}
```

### Algorithm Steps

1. **Extract text**: First 50 characters of content
2. **Normalize**: Apply slugification
3. **Handle empty**: Use "seed" if slug is empty
4. **Build full slug**: Combine UUID prefix and slug
5. **Check collision**: Query database for existing slug
6. **Resolve collision**: Append `-2`, `-3`, etc. until unique
7. **Return**: Unique slug

## Collision Detection

### Database Query

```typescript
const existing = await db('seeds')
  .where({ slug: finalSlug })
  .first()
```

**Index**: Unique index on `slug` column ensures fast lookups.

**Query Performance**: O(log n) with index, very fast.

### Collision Scenarios

1. **Same content, different UUIDs**: Very unlikely (UUID prefix prevents)
2. **Similar content, same UUID prefix**: Possible if same user creates seeds with similar content
3. **Empty content**: All resolve to `{uuidPrefix}/seed`, collisions resolved with numbers

## Collision Resolution

### Number Appending

When collision detected:

1. **First collision**: Append `-2`
   - `abc1234/my-seed` (exists)
   - `abc1234/my-seed-2` (new)

2. **Subsequent collisions**: Increment number
   - `abc1234/my-seed-2` (exists)
   - `abc1234/my-seed-3` (new)

3. **Continue until unique**: Keep incrementing until no collision

### Algorithm

```typescript
let finalSlug = fullSlug
let counter = 2

while (true) {
  const existing = await db('seeds')
    .where({ slug: finalSlug })
    .first()
  
  if (!existing) {
    break // No collision, use this slug
  }
  
  // Collision detected, append number
  finalSlug = `${uuidPrefix}/${slugPart}-${counter}`
  counter++
}
```

### Examples

**Scenario 1**: Same content, different UUIDs (no collision)
- Seed 1: `abc1234/my-seed`
- Seed 2: `def5678/my-seed` (different UUID prefix, no collision)

**Scenario 2**: Same UUID prefix, similar content (collision resolved)
- Seed 1: `abc1234/my-seed`
- Seed 2: `abc1234/my-seed-2` (collision, resolved)
- Seed 3: `abc1234/my-seed-3` (collision, resolved)

**Scenario 3**: Empty content (collision resolved)
- Seed 1: `abc1234/seed`
- Seed 2: `abc1234/seed-2` (collision, resolved)

## Slug Lookup

### Finding Seed by Slug

**Location**: `backend/src/services/seeds.ts`

```typescript
static async getBySlug(slug: string, userId: string): Promise<Seed | null> {
  const seed = await db('seeds')
    .where({ slug, user_id: userId })
    .first()

  if (!seed) {
    return null
  }

  const currentState = await computeCurrentState(seed.id)
  return {
    ...seed,
    currentState,
  } as Seed
}
```

### Hash ID Lookup

For backward compatibility, seeds can also be found by hash ID (first 7 characters of UUID):

**Location**: `backend/src/services/seeds.ts`

```typescript
static async getByHashId(
  hashId: string,
  userId: string,
  slugHint?: string
): Promise<Seed | null> {
  // Find all seeds with matching hash ID
  const seeds = await db('seeds')
    .where('id', 'like', `${hashId}%`)
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')

  if (seeds.length === 0) {
    return null
  }

  if (seeds.length === 1) {
    // Single match, return it
    return seeds[0]
  }

  // Multiple matches - use slug hint to find best match
  if (slugHint) {
    // Find seed with slug that most closely matches the hint
    let bestMatch: SeedRow | null = null
    let bestScore = 0

    for (const seed of seeds) {
      if (!seed.slug) continue

      const slugPart = seed.slug.includes('/') 
        ? seed.slug.split('/').slice(1).join('/')
        : seed.slug

      // Calculate similarity score
      let score = 0
      const hintLower = slugHint.toLowerCase()
      const slugLower = slugPart.toLowerCase()

      if (slugLower.includes(hintLower)) {
        score = hintLower.length / slugLower.length
      } else if (hintLower.includes(slugLower)) {
        score = slugLower.length / hintLower.length
      } else {
        // Check for common substring
        const commonLength = getCommonSubstringLength(hintLower, slugLower)
        score = commonLength / Math.max(hintLower.length, slugLower.length)
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = seed
      }
    }

    // If we found a good match (score > 0.3), use it
    if (bestMatch && bestScore > 0.3) {
      return bestMatch
    }
  }

  // No good match found, return most recent
  return seeds[0]
}
```

## Slug Backfilling

### Migration

**Location**: `backend/src/db/migrations/029_backfill_seed_slugs.ts`

Existing seeds without slugs are backfilled:

```typescript
async function up(knex: Knex): Promise<void> {
  const seeds = await knex('seeds')
    .select('id')
    .whereNull('slug')
  
  for (const seed of seeds) {
    // Get the create_seed transaction to extract content
    const createTransaction = await knex('seed_transactions')
      .where({ seed_id: seed.id, transaction_type: 'create_seed' })
      .first()
    
    if (!createTransaction) {
      continue // Skip seeds without creation transaction
    }
    
    // Extract content from transaction_data
    const transactionData = createTransaction.transaction_data
    const content = typeof transactionData === 'object' && 
                    transactionData !== null && 
                    'content' in transactionData
      ? String(transactionData.content)
      : ''
    
    if (!content || content.trim().length === 0) {
      continue // Skip empty content
    }
    
    // Get UUID prefix (first 7 characters)
    const uuidPrefix = seed.id.substring(0, 7)
    
    // Generate slug
    const slug = await generateSeedSlug(content, uuidPrefix)
    
    // Update seed with slug
    await knex('seeds')
      .where({ id: seed.id })
      .update({ slug })
  }
}
```

## URL Generation

### Frontend URL Format

**Location**: `frontend/src/services/api.ts`

```typescript
private formatSeedPath(seedId: string): string {
  // If seedId looks like a slug (contains /), use it directly
  if (seedId.includes('/')) {
    return `/seed/${seedId}`
  }
  
  // Otherwise, it's a UUID - will need to look up slug
  return `/seed/${seedId}`
}
```

### Route Handling

Frontend routes handle both UUIDs and slugs:
- `/seed/{uuid}` - UUID-based lookup
- `/seed/{uuidPrefix}/{slug}` - Slug-based lookup

Backend resolves both to the same seed.

## Performance Considerations

### Database Index

**Unique Index on Slug**:
```sql
CREATE UNIQUE INDEX idx_seeds_slug ON seeds(slug);
```

**Benefits**:
- Fast collision detection: O(log n)
- Fast slug lookups: O(log n)
- Enforces uniqueness at database level

### Collision Resolution

**Worst Case**: If many seeds have same content and UUID prefix:
- First seed: 1 query
- Second seed: 2 queries (check original, check -2)
- Third seed: 3 queries (check original, check -2, check -3)
- **Average**: O(n) queries for n collisions

**Mitigation**: UUID prefix makes collisions very rare in practice.

## Edge Cases

### Empty Content

**Handling**: Default to `"seed"` if slugification produces empty string.

**Example**: Content is only special characters → `"seed"`

### Very Long Content

**Handling**: Truncate to first 50 characters before slugification.

**Example**: 1000 character content → First 50 chars → Slugified

### Special Characters Only

**Handling**: After removing special characters, if empty, use `"seed"`.

**Example**: `"!!!###@@@"` → After removal: `""` → Default: `"seed"`

### Unicode Characters

**Handling**: `\w` in regex matches Unicode word characters, preserved in slug.

**Example**: `"Café"` → `"café"` (preserved)

## Related Documentation

- [Data Structures](Data-Structures) - Seeds table structure
- [Database Schema](Database-Schema) - Slug column and indexes
- [Backend Patterns](Backend-Patterns) - Service layer usage

