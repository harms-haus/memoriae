import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react'
import { api } from '../../services/api'
import { Panel } from '@mother/components/Panel'
import { Badge } from '@mother/components/Badge'
import type { Category } from '../../types'
import './CategoryTree.css'

interface CategoryTreeNode {
  category: Category
  children: CategoryTreeNode[]
}

export interface CategoryTreeProps {
  onCategorySelect?: (categoryId: string) => void
  selectedCategories?: Set<string>
  showSeedCounts?: boolean
}

/**
 * Build hierarchical tree structure from flat categories array
 */
function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
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

interface CategoryNodeProps {
  node: CategoryTreeNode
  level: number
  expanded: Set<string>
  onToggleExpand: (categoryId: string) => void
  onCategorySelect?: (categoryId: string) => void
  selectedCategories?: Set<string>
  showSeedCounts?: boolean
  seedCounts?: Map<string, number>
}

function CategoryNode({
  node,
  level,
  expanded,
  onToggleExpand,
  onCategorySelect,
  selectedCategories,
  showSeedCounts,
  seedCounts,
}: CategoryNodeProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.category.id)
  const isSelected = selectedCategories?.has(node.category.id) ?? false
  const seedCount = seedCounts?.get(node.category.id) ?? 0

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggleExpand(node.category.id)
    }
    onCategorySelect?.(node.category.id)
  }

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggleExpand(node.category.id)
    }
  }

  return (
    <div className="category-tree-node">
      <div
        className={`category-tree-item ${isSelected ? 'category-tree-item-selected' : ''}`}
        style={{ paddingLeft: `calc(var(--space-4) * ${level})` }}
        onClick={handleClick}
      >
        <div className="category-tree-item-content">
          {hasChildren ? (
            <button
              className="category-tree-expand"
              onClick={handleExpandToggle}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          ) : (
            <span className="category-tree-expand-spacer" />
          )}
          
          <div className="category-tree-item-icon">
            {hasChildren && isExpanded ? (
              <FolderOpen size={18} />
            ) : (
              <Folder size={18} />
            )}
          </div>

          <div className="category-tree-item-info">
            <span className="category-tree-item-name">{node.category.name}</span>
            <span className="category-tree-item-path">{node.category.path}</span>
          </div>

          {showSeedCounts && seedCount > 0 && (
            <Badge variant="primary" className="category-tree-seed-count">
              {seedCount}
            </Badge>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="category-tree-children">
          {node.children.map((child) => (
            <CategoryNode
              key={child.category.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              {...(onCategorySelect && { onCategorySelect })}
              {...(selectedCategories && { selectedCategories })}
              {...(showSeedCounts !== undefined && { showSeedCounts })}
              {...(seedCounts && { seedCounts })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoryTree({
  onCategorySelect,
  selectedCategories,
  showSeedCounts = false,
}: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [seedCounts, setSeedCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (showSeedCounts && categories.length > 0) {
      loadSeedCounts()
    }
  }, [showSeedCounts, categories])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<Category[]>('/categories')
      setCategories(data)
      
      // Auto-expand root level categories
      const rootCategories = data.filter(c => !c.parent_id)
      setExpanded(new Set(rootCategories.map(c => c.id)))
    } catch (err) {
      console.error('Error loading categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const loadSeedCounts = async () => {
    try {
      // Load all seeds to count by category
      const seeds = await api.get<Array<{ currentState?: { categories?: Array<{ id: string }> } }>>('/seeds')
      const counts = new Map<string, number>()
      
      for (const seed of seeds) {
        const seedCategories = seed.currentState?.categories || []
        for (const category of seedCategories) {
          counts.set(category.id, (counts.get(category.id) || 0) + 1)
        }
      }
      
      setSeedCounts(counts)
    } catch (err) {
      console.error('Error loading seed counts:', err)
    }
  }

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpanded(newExpanded)
  }

  const tree = useMemo(() => {
    return buildCategoryTree(categories)
  }, [categories])

  if (loading) {
    return (
      <Panel>
        <p>Loading categories...</p>
      </Panel>
    )
  }

  if (error) {
    return (
      <Panel>
        <p className="text-error">{error}</p>
        <button className="btn-secondary" onClick={loadCategories}>
          Retry
        </button>
      </Panel>
    )
  }

  if (categories.length === 0) {
    return (
      <Panel>
        <div className="category-tree-empty">
          <p className="lead">No categories yet.</p>
          <p className="text-secondary">
            Categories will appear here as you create seeds and they get automatically categorized.
          </p>
        </div>
      </Panel>
    )
  }

  return (
    <div className="category-tree">
      <Panel variant="elevated" className="category-tree-panel">
        <div className="category-tree-header">
          <h3>Category Tree</h3>
          <p className="text-secondary">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </p>
        </div>
        <div className="category-tree-content">
          {tree.map((node) => (
            <CategoryNode
              key={node.category.id}
              node={node}
              level={0}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              {...(onCategorySelect && { onCategorySelect })}
              {...(selectedCategories && { selectedCategories })}
              showSeedCounts={showSeedCounts}
              seedCounts={seedCounts}
            />
          ))}
        </div>
      </Panel>
    </div>
  )
}

