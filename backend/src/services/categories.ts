// Categories service - business logic for category operations
import db from '../db/connection'

export interface CategoryRow {
  id: string
  parent_id: string | null
  name: string
  path: string
  created_at: Date
}

export interface Category extends Omit<CategoryRow, 'created_at'> {
  created_at: string
}

/**
 * Get all categories, ordered by path for hierarchical display
 */
export async function getAllCategories(): Promise<Category[]> {
  const categories = await db<CategoryRow>('categories')
    .select('*')
    .orderBy('path', 'asc')

  // Convert Date to ISO string for JSON serialization
  return categories.map(cat => ({
    ...cat,
    created_at: cat.created_at.toISOString(),
  }))
}

/**
 * Build a hierarchical tree structure from flat categories array
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  // Create a map of categories by ID for quick lookup
  const categoryMap = new Map<string, CategoryTreeNode>()
  const rootNodes: CategoryTreeNode[] = []

  // First pass: create all nodes
  for (const category of categories) {
    const node: CategoryTreeNode = {
      category,
      children: [],
    }
    categoryMap.set(category.id, node)
  }

  // Second pass: build tree structure
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

export interface CategoryTreeNode {
  category: Category
  children: CategoryTreeNode[]
}

