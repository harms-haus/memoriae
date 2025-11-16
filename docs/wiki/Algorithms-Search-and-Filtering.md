# Algorithms: Search and Filtering

This page explains how search and filtering work in Memoriae, including full-text search, tag filtering, category filtering, and sorting algorithms.

## Overview

Memoriae supports multiple search and filtering mechanisms:
- **Full-text search**: Search across seed content, tags, and categories
- **Tag filtering**: Filter by one or more tags
- **Category filtering**: Filter by category
- **Combined filtering**: Apply multiple filters simultaneously
- **Sorting**: Sort by date, alphabetical, etc.

## Full-Text Search

### Algorithm

**Location**: `backend/src/routes/search.ts`, `frontend/src/components/views/SeedsView.tsx`

Full-text search searches across multiple fields:

```typescript
function searchSeeds(seeds: Seed[], query: string): Seed[] {
  const queryLower = query.toLowerCase().trim()
  
  return seeds.filter(seed => {
    // Search in content
    const content = (seed.currentState?.seed || '').toLowerCase()
    
    // Search in tag names
    const tagNames = (seed.currentState?.tags || [])
      .map(t => t.name.toLowerCase())
      .join(' ')
    
    // Search in category names
    const categoryNames = (seed.currentState?.categories || [])
      .map(c => c.name.toLowerCase())
      .join(' ')
    
    // Match if query appears in any field
    return content.includes(queryLower) ||
           tagNames.includes(queryLower) ||
           categoryNames.includes(queryLower)
  })
}
```

### Search Fields

1. **Seed Content**: Full text of seed (`currentState.seed`)
2. **Tag Names**: All tag names joined with spaces
3. **Category Names**: All category names joined with spaces

### Matching Logic

- **Case-insensitive**: All comparisons use lowercase
- **Substring matching**: Uses `includes()` for partial matches
- **OR logic**: Matches if query appears in ANY field

### Examples

**Query**: `"meeting"`

**Matches**:
- Seed content: `"Meeting notes from today"` ✓
- Tag name: `"meeting"` ✓
- Category name: `"Meetings"` ✓

**Query**: `"work project"`

**Matches**:
- Seed content: `"Working on a new project"` ✓ (contains both words)
- Tag names: `"work"` and `"project"` ✓ (contains both)
- Category: `"Work Projects"` ✓ (contains both words)

## Tag Filtering

### Algorithm

**Location**: `frontend/src/components/views/SeedsView.tsx`

Tag filtering uses set intersection:

```typescript
function filterByTags(seeds: Seed[], selectedTags: Set<string>): Seed[] {
  if (selectedTags.size === 0) {
    return seeds // No filter
  }
  
  return seeds.filter(seed => {
    // Get seed's tag IDs
    const seedTagIds = new Set(
      (seed.currentState?.tags || []).map(t => t.id)
    )
    
    // Check if any selected tag is in seed's tags (OR logic)
    return Array.from(selectedTags).some(tagId => 
      seedTagIds.has(tagId)
    )
  })
}
```

### Filtering Logic

- **OR logic**: Seed matches if it has ANY of the selected tags
- **Set-based**: Uses Set for O(1) lookups
- **Multiple tags**: Can select multiple tags, seed matches if it has any

### Examples

**Selected Tags**: `["work", "important"]`

**Matches**:
- Seed with tags: `["work", "meeting"]` ✓ (has "work")
- Seed with tags: `["important", "urgent"]` ✓ (has "important")
- Seed with tags: `["personal"]` ✗ (has neither)
- Seed with tags: `["work", "important"]` ✓ (has both)

## Category Filtering

### Algorithm

**Location**: `frontend/src/components/views/SeedsView.tsx`

Category filtering checks if seed belongs to selected category:

```typescript
function filterByCategory(seeds: Seed[], selectedCategories: Set<string>): Seed[] {
  if (selectedCategories.size === 0) {
    return seeds // No filter
  }
  
  return seeds.filter(seed => {
    // Get seed's category IDs
    const seedCategoryIds = (seed.currentState?.categories || []).map(c => c.id)
    
    // Check if any selected category is in seed's categories (OR logic)
    return Array.from(selectedCategories).some(catId => 
      seedCategoryIds.includes(catId)
    )
  })
}
```

### Filtering Logic

- **OR logic**: Seed matches if it belongs to ANY of the selected categories
- **Single category**: Seeds can only have one category, but filter supports multiple selections
- **Array-based**: Uses array `includes()` for lookups

### Examples

**Selected Categories**: `["/work", "/personal"]`

**Matches**:
- Seed with category: `"/work"` ✓
- Seed with category: `"/personal"` ✓
- Seed with category: `"/work/projects"` ✗ (different category)
- Seed with no category: ✗

## Combined Filtering

### Algorithm

**Location**: `frontend/src/components/views/SeedsView.tsx`

Filters are applied sequentially (AND logic):

```typescript
function filterAndSortSeeds(
  seeds: Seed[],
  searchQuery: string,
  selectedTags: Set<string>,
  selectedCategories: Set<string>,
  sortBy: 'newest' | 'oldest' | 'alphabetical'
): Seed[] {
  let filtered = [...seeds]
  
  // Apply text search filter
  if (searchQuery.trim()) {
    filtered = searchSeeds(filtered, searchQuery)
  }
  
  // Apply tag filter
  if (selectedTags.size > 0) {
    filtered = filterByTags(filtered, selectedTags)
  }
  
  // Apply category filter
  if (selectedCategories.size > 0) {
    filtered = filterByCategory(filtered, selectedCategories)
  }
  
  // Sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'alphabetical':
        const contentA = (a.currentState?.seed || '').toLowerCase()
        const contentB = (b.currentState?.seed || '').toLowerCase()
        return contentA.localeCompare(contentB)
      default:
        return 0
    }
  })
  
  return filtered
}
```

### Filter Application Order

1. **Text search** - Reduces set first (usually most selective)
2. **Tag filter** - Further reduces set
3. **Category filter** - Final reduction
4. **Sort** - Orders results

### Logic

- **AND between filters**: Seed must match ALL active filters
- **OR within filters**: Seed matches tag filter if it has ANY selected tag
- **Sequential application**: Each filter operates on already-filtered set

### Examples

**Filters**: Search `"meeting"`, Tags `["work"]`, Category `"/work"`

**Matches**:
- Seed: Content `"Meeting notes"`, Tags `["work"]`, Category `"/work"` ✓ (matches all)
- Seed: Content `"Meeting notes"`, Tags `["personal"]`, Category `"/work"` ✗ (wrong tag)
- Seed: Content `"Meeting notes"`, Tags `["work"]`, Category `"/personal"` ✗ (wrong category)
- Seed: Content `"Notes"`, Tags `["work"]`, Category `"/work"` ✗ (no "meeting" in content)

## Sorting Algorithms

### Newest First

```typescript
filtered.sort((a, b) => {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
})
```

**Logic**: Descending order by `created_at` timestamp.

### Oldest First

```typescript
filtered.sort((a, b) => {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
})
```

**Logic**: Ascending order by `created_at` timestamp.

### Alphabetical

```typescript
filtered.sort((a, b) => {
  const contentA = (a.currentState?.seed || '').toLowerCase()
  const contentB = (b.currentState?.seed || '').toLowerCase()
  return contentA.localeCompare(contentB)
})
```

**Logic**: 
- Case-insensitive comparison
- Uses `localeCompare()` for proper Unicode sorting
- Sorts by seed content (first line)

## Backend Search Endpoint

### Implementation

**Location**: `backend/src/routes/search.ts`

Backend search endpoint applies filters server-side:

```typescript
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { q, category, tags } = req.query
  
  // Get all seeds for user
  let seeds = await SeedsService.getByUser(userId)
  
  // Apply text search filter
  if (q && typeof q === 'string' && q.trim()) {
    const query = q.toLowerCase().trim()
    seeds = seeds.filter(seed => {
      const content = (seed.currentState?.seed || '').toLowerCase()
      const tagNames = (seed.currentState?.tags || [])
        .map(t => t.name.toLowerCase())
        .join(' ')
      const categoryNames = (seed.currentState?.categories || [])
        .map(c => c.name.toLowerCase())
        .join(' ')
      return content.includes(query) || 
             tagNames.includes(query) || 
             categoryNames.includes(query)
    })
  }
  
  // Apply category filter
  if (category && typeof category === 'string') {
    seeds = seeds.filter(seed => {
      const seedCategoryIds = (seed.currentState?.categories || []).map(c => c.id)
      return seedCategoryIds.includes(category)
    })
  }
  
  // Apply tag filter
  if (tags && typeof tags === 'string') {
    const tagIds = tags.split(',').map(t => t.trim()).filter(Boolean)
    if (tagIds.length > 0) {
      seeds = seeds.filter(seed => {
        const seedTagIds = (seed.currentState?.tags || []).map(t => t.id)
        return tagIds.some(tagId => seedTagIds.includes(tagId))
      })
    }
  }
  
  res.json(seeds)
})
```

### Query Parameters

- `q` - Search query string
- `category` - Category ID to filter by
- `tags` - Comma-separated tag IDs

### Differences from Frontend

- **Server-side**: Filters applied on server, not client
- **User-scoped**: Only returns seeds for authenticated user
- **No sorting**: Backend doesn't sort (frontend handles)

## Frontend vs Backend Search

### Frontend Search

**Location**: `frontend/src/components/views/SeedsView.tsx`

**Characteristics**:
- Filters already-loaded seeds
- Instant results (no network request)
- Supports sorting
- Limited to seeds in memory

**Use Case**: Filtering seeds already displayed in list

### Backend Search

**Location**: `backend/src/routes/search.ts`

**Characteristics**:
- Searches all user's seeds
- Requires network request
- No sorting (frontend handles)
- Can search large datasets

**Use Case**: Initial search, searching across all seeds

## Performance Considerations

### Frontend Filtering

**Time Complexity**:
- Text search: O(n * m) where n = seeds, m = average content length
- Tag filter: O(n * t) where t = number of selected tags
- Category filter: O(n * c) where c = number of selected categories
- Sorting: O(n log n)

**Optimization**:
- Use `useMemo` to cache filtered results
- Only recompute when filters change
- Limit number of seeds loaded at once (pagination)

### Backend Search

**Time Complexity**:
- Load all seeds: O(n) database query
- Filter: O(n * m) where m = average content length
- No indexing on computed state (state is computed, not stored)

**Optimization Opportunities**:
- Full-text search index on content (if stored)
- Tag/category indexes (already exist)
- Pagination to limit results
- Caching computed states

## Search Limitations

### Current Implementation

1. **Substring matching only**: No fuzzy matching, no word boundaries
2. **Case-insensitive**: But no accent-insensitive
3. **No ranking**: Results not ranked by relevance
4. **No phrase matching**: Can't search for exact phrases
5. **No boolean operators**: Can't use AND/OR/NOT

### Future Enhancements

- Full-text search with PostgreSQL `tsvector`
- Fuzzy matching for typos
- Relevance ranking
- Phrase matching
- Boolean operators

## Related Documentation

- [Data Structures](Data-Structures) - Seed state structure
- [Frontend Patterns](Frontend-Patterns) - React filtering patterns
- [Backend Patterns](Backend-Patterns) - Route handler patterns

