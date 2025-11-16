# Algorithms: Category Hierarchy

This page explains the path-based hierarchical category system used in Memoriae. Categories are organized in a tree structure using path strings for efficient querying and navigation.

## Path Format

### Structure

Categories use a **path-based hierarchy** where the full path from root to category is stored as a string:

**Format**: `/parent/child/grandchild`

**Examples**:
- `/work` - Top-level category
- `/work/projects` - Child of "work"
- `/work/projects/web` - Grandchild of "work", child of "projects"
- `/personal` - Another top-level category

### Path Rules

1. **Always starts with `/`** - Root indicator
2. **Segments separated by `/`** - Each segment is a category name
3. **No trailing slash** - Paths end with category name
4. **Case-sensitive** - Paths preserve case
5. **Normalized** - No duplicate slashes, no empty segments

## Tree Building Algorithm

### Two-Pass Algorithm

**Location**: `backend/src/services/categories.ts`

The `buildCategoryTree()` function constructs a tree from flat category array:

```typescript
function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  // Pass 1: Create all nodes
  const categoryMap = new Map<string, CategoryTreeNode>()
  const rootNodes: CategoryTreeNode[] = []

  for (const category of categories) {
    const node: CategoryTreeNode = {
      category,
      children: [],
    }
    categoryMap.set(category.id, node)
  }

  // Pass 2: Build tree structure
  for (const category of categories) {
    const node = categoryMap.get(category.id)!
    
    if (category.parent_id) {
      const parentNode = categoryMap.get(category.parent_id)
      if (parentNode) {
        parentNode.children.push(node)
      } else {
        // Parent not found, treat as root
        rootNodes.push(node)
      }
    } else {
      // No parent, it's a root node
      rootNodes.push(node)
    }
  }

  // Sort children by path
  const sortChildren = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.category.path.localeCompare(b.category.path))
    for (const node of nodes) {
      sortChildren(node.children)
    }
  }
  sortChildren(rootNodes)

  return rootNodes
}
```

### Algorithm Steps

1. **Pass 1 - Create Nodes**: Create a node for each category, store in map by ID
2. **Pass 2 - Build Relationships**: Link children to parents via `parent_id`
3. **Handle Orphans**: Categories with missing parents become root nodes
4. **Sort**: Sort children by path for consistent ordering

### Time Complexity

- **Pass 1**: O(n) - Create n nodes
- **Pass 2**: O(n) - Link n nodes
- **Sorting**: O(n log n) - Sort all nodes
- **Total**: O(n log n) where n = number of categories

## Path Normalization

### Normalization Function

When creating categories, paths are normalized:

```typescript
function normalizePath(path: string): string {
  // Ensure starts with /
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  
  // Remove trailing slash
  if (path.endsWith('/') && path.length > 1) {
    path = path.slice(0, -1)
  }
  
  // Remove duplicate slashes
  path = path.replace(/\/+/g, '/')
  
  // Remove empty segments
  const segments = path.split('/').filter(s => s.length > 0)
  return '/' + segments.join('/')
}
```

### Examples

- `work` → /work`
- `/work/` → /work`
- `//work//projects//` → /work/projects`
- `/work/projects/web/` → /work/projects/web`

## Hierarchical Queries

### Finding Children

To find all children of a category:

```sql
SELECT * FROM categories
WHERE path LIKE '/parent/%'
ORDER BY path
```

**Example**: Find all children of `/work`:
- `/work/projects` ✓
- `/work/projects/web` ✓
- `/work/tasks` ✓
- `/personal` ✗ (different root)

### Finding Parent

To find parent category:

```typescript
const parentPath = path.substring(0, path.lastIndexOf('/')) || '/'
const parent = await db('categories')
  .where({ path: parentPath })
  .first()
```

**Example**: Parent of `/work/projects/web`:
- Parent path: `/work/projects`
- Query: `WHERE path = '/work/projects'`

### Finding Siblings

To find siblings (same parent):

```typescript
const parentPath = getParentPath(category.path)
const siblings = await db('categories')
  .where({ parent_id: category.parent_id })
  .where('id', '!=', category.id)
```

### Finding Descendants

To find all descendants (children, grandchildren, etc.):

```sql
SELECT * FROM categories
WHERE path LIKE '/parent/%'
  AND path != '/parent'
ORDER BY path
```

**Example**: All descendants of `/work`:
- `/work/projects` ✓
- `/work/projects/web` ✓
- `/work/tasks` ✓
- `/work` ✗ (excluded, it's the parent itself)

## Category Creation with Hierarchy

### Ensuring Category Exists

**Location**: `backend/src/services/automation/categorize.ts`

When creating a category, all parent categories must exist:

```typescript
async ensureCategoryExists(
  categoryPath: string,
  existingCategories: CategoryRow[]
): Promise<CategoryRow> {
  // Normalize path
  const normalizedPath = categoryPath.startsWith('/') 
    ? categoryPath 
    : '/' + categoryPath
  const pathSegments = normalizedPath.split('/').filter(s => s.length > 0)

  // Check if category already exists
  const existingCategoriesByPath = new Map(
    existingCategories.map(c => [c.path, c])
  )
  const existing = existingCategoriesByPath.get(normalizedPath)
  if (existing) {
    return existing
  }

  // Build hierarchy from root to target
  // Example: "/work/projects/web" -> ["/work", "/work/projects", "/work/projects/web"]
  const pathsToCreate: string[] = []
  let currentPath = ''

  for (const segment of pathSegments) {
    currentPath += '/' + segment
    if (!existingCategoriesByPath.has(currentPath)) {
      pathsToCreate.push(currentPath)
    }
  }

  // Create categories in order (parents first)
  let parentId: string | null = null

  for (const path of pathsToCreate) {
    const name = path.split('/').pop()! // Last segment is name
    
    const [created] = await db('categories')
      .insert({
        id: uuidv4(),
        parent_id: parentId,
        name,
        path,
        created_at: new Date(),
      })
      .returning('*')

    parentId = created.id
  }

  // Return the target category
  return existingCategoriesByPath.get(normalizedPath) 
    || (await db('categories').where({ path: normalizedPath }).first())!
}
```

### Algorithm Steps

1. **Normalize path** - Ensure proper format
2. **Check existence** - Return if already exists
3. **Build path list** - Create list of all paths from root to target
4. **Filter missing** - Only create paths that don't exist
5. **Create in order** - Create parents before children
6. **Return target** - Return the final category

## Path Updates on Move/Rename

### Moving a Category

When a category is moved to a different parent:

1. **Update path** - Recalculate path based on new parent
2. **Update children paths** - All descendants need path updates
3. **Update parent_id** - Set new parent reference

**Example**: Moving `/work/projects/web` to `/personal`:
- New path: `/personal/web`
- Old children: `/work/projects/web/subcategory`
- New children: `/personal/web/subcategory`

### Renaming a Category

When a category is renamed:

1. **Update name** - Change category name
2. **Update path** - Recalculate path (name is last segment)
3. **Update children paths** - All descendants need path updates

**Example**: Renaming `/work/projects` to `/work/tasks`:
- New path: `/work/tasks`
- Old children: `/work/projects/web`
- New children: `/work/tasks/web`

### Path Update Algorithm

```typescript
async function updateCategoryPath(
  categoryId: string,
  newPath: string
): Promise<void> {
  const category = await db('categories').where({ id: categoryId }).first()
  const oldPath = category.path

  // Update this category's path
  await db('categories')
    .where({ id: categoryId })
    .update({ path: newPath })

  // Update all descendants' paths
  await db('categories')
    .where('path', 'like', `${oldPath}/%`)
    .update({
      path: db.raw(`REPLACE(path, '${oldPath}', '${newPath}')`)
    })
}
```

## Frontend Tree Building

### CategoryTree Component

**Location**: `frontend/src/components/CategoryTree/CategoryTree.tsx`

Frontend builds tree structure for display:

```typescript
const buildTreeData = (categories: Category[]): Record<string, CategoryItemData> => {
  const data: Record<string, CategoryItemData> = {}
  const childrenMap = new Map<string, string[]>()

  // First pass: create entries and build children map
  categories.forEach(category => {
    const children = categories
      .filter(c => c.parent_id === category.id)
      .map(c => c.id)

    data[category.id] = {
      id: category.id,
      name: category.name,
      path: category.path,
      parent_id: category.parent_id,
      isFolder: children.length > 0,
      childrenIds: children,
      seedCount: 0,
      level: 0,
    }

    if (category.parent_id) {
      if (!childrenMap.has(category.parent_id)) {
        childrenMap.set(category.parent_id, [])
      }
      childrenMap.get(category.parent_id)!.push(category.id)
    }
  })

  // Calculate levels (depth in tree)
  const calculateLevel = (categoryId: string, visited: Set<string> = new Set()): number => {
    if (visited.has(categoryId)) return 0
    visited.add(categoryId)
    
    const category = data[categoryId]
    if (!category || !category.parent_id) return 0

    const parentLevel = calculateLevel(category.parent_id, visited)
    category.level = parentLevel + 1
    return category.level
  }

  categories.forEach(category => {
    if (category.parent_id) {
      calculateLevel(category.id)
    }
  })

  return data
}
```

### Level Calculation

Level represents depth in tree:
- Level 0: Root categories (no parent)
- Level 1: Direct children of root
- Level 2: Grandchildren, etc.

Used for indentation in tree display.

## Indexing Strategy

### Database Indexes

**Path Index**:
```sql
CREATE INDEX idx_categories_path ON categories(path);
```

**Benefits**:
- Fast LIKE queries for children: `WHERE path LIKE '/parent/%'`
- Fast exact path lookups: `WHERE path = '/work/projects'`
- Supports path-based sorting

**Parent ID Index**:
```sql
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
```

**Benefits**:
- Fast parent-child lookups: `WHERE parent_id = ?`
- Fast sibling queries
- Supports tree traversal

## Performance Considerations

### Query Optimization

**Path-based queries** are efficient with proper indexing:
- `LIKE '/parent/%'` uses index for prefix matching
- Exact path lookups are O(log n) with index

**Parent ID queries** are fast:
- Direct index lookup: O(log n)
- No full table scan needed

### Tree Building

**Two-pass algorithm** is efficient:
- O(n) for node creation
- O(n) for relationship building
- O(n log n) for sorting
- Total: O(n log n) - acceptable for typical category counts

## Related Documentation

- [Data Structures](Data-Structures) - Category table structure
- [Algorithms: Pressure System](Algorithms-Pressure-System) - How category changes trigger pressure
- [Database Schema](Database-Schema) - Complete schema with indexes

