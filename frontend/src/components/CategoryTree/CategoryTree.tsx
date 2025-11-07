import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTree } from '@headless-tree/react'
import { syncDataLoaderFeature, hotkeysCoreFeature } from '@headless-tree/core'
import type { ItemInstance, TreeInstance } from '@headless-tree/core'
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Minus } from 'lucide-react'
import { api } from '../../services/api'
import { Panel } from '@mother/components/Panel'
import { Badge } from '@mother/components/Badge'
import { Button } from '@mother/components/Button'
import type { Category } from '../../types'
import './CategoryTree.css'

interface CategoryItemData {
  id: string
  name: string
  path: string
  parent_id: string | null
  isFolder: boolean
  childrenIds: string[]
  seedCount: number
  level: number
}

interface CategoryTreeProps {
  onCategorySelect?: (categoryId: string) => void
  selectedCategories?: Set<string>
  showSeedCounts?: boolean
  maxHeight?: string
}

export function CategoryTree({
  onCategorySelect,
  selectedCategories,
  showSeedCounts = false,
  maxHeight,
}: CategoryTreeProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [seedCounts, setSeedCounts] = useState<Map<string, number>>(new Map())
  const [treeData, setTreeData] = useState<Record<string, CategoryItemData>>({})
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Build tree data structure from flat categories
  const buildTreeData = useCallback((categories: Category[]): Record<string, CategoryItemData> => {
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

    // Calculate levels
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

    // Add root item
    const rootChildren = categories.filter(c => !c.parent_id).map(c => c.id)
    data['root'] = {
      id: 'root',
      name: 'Categories',
      path: '/',
      parent_id: null,
      isFolder: rootChildren.length > 0,
      childrenIds: rootChildren,
      seedCount: 0,
      level: -1,
    }

    return data
  }, [])

  // Load categories and seed counts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load categories
        const categoriesData = await api.get<Category[]>('/categories')
        setCategories(categoriesData)

        // Build tree data
        const builtData = buildTreeData(categoriesData)
        setTreeData(builtData)

        // Initialize expanded items with root level categories
        const rootCategoryIds = categoriesData.filter(c => !c.parent_id).map(c => c.id)
        setExpandedItems(rootCategoryIds)

        // Load seed counts if needed
        if (showSeedCounts) {
          const seeds = await api.get<Array<{ currentState?: { categories?: Array<{ id: string }> } }>>('/seeds')
          const counts = new Map<string, number>()
          
          seeds.forEach(seed => {
            const seedCategories = seed.currentState?.categories || []
            seedCategories.forEach(category => {
              counts.set(category.id, (counts.get(category.id) || 0) + 1)
            })
          })

          setSeedCounts(counts)

          // Update tree data with seed counts
          const updatedData = { ...builtData }
          counts.forEach((count, categoryId) => {
            if (updatedData[categoryId]) {
              updatedData[categoryId].seedCount = count
            }
          })
          setTreeData(updatedData)
        }

      } catch (err) {
        console.error('Error loading categories:', err)
        setError(err instanceof Error ? err.message : 'Failed to load categories')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [buildTreeData, showSeedCounts])

  // Memoize state object to prevent re-initialization
  const treeState = useMemo(() => ({
    expandedItems: expandedItems.length > 0 ? expandedItems : (categories.filter(c => !c.parent_id).map(c => c.id)),
  }), [expandedItems, categories])

  // Memoize dataLoader functions to prevent re-renders
  // Only create if treeData has content (has 'root' key)
  const dataLoader = useMemo(() => {
    if (!treeData.root) {
      // Return a safe loader that won't be used until data is ready
      return {
        getItem: () => ({ id: 'root', name: '', path: '', parent_id: null, isFolder: false, childrenIds: [], seedCount: 0, level: -1 }),
        getChildren: () => [],
      }
    }
    return {
      getItem: (itemId: string) => {
        const item = treeData[itemId]
        if (!item) {
          throw new Error(`Item ${itemId} not found`)
        }
        return item
      },
      getChildren: (itemId: string) => treeData[itemId]?.childrenIds || [],
    }
  }, [treeData])

  // Memoize getItemName and isItemFolder callbacks
  const getItemName = useCallback((item: ItemInstance<CategoryItemData>) => item.getItemData().name, [])
  const isItemFolder = useCallback((item: ItemInstance<CategoryItemData>) => item.getItemData().isFolder, [])

  // Memoize features array to prevent re-initialization
  const features = useMemo(() => [syncDataLoaderFeature, hotkeysCoreFeature], [])

  // Initialize Headless Tree - only recreate when dependencies change
  // Only initialize if we have tree data
  const tree = useTree<CategoryItemData>({
    rootItemId: 'root',
    getItemName,
    isItemFolder,
    dataLoader,
    features,
    state: treeState,
    setExpandedItems,
  })

  // Expand all categories
  const handleExpandAll = useCallback(() => {
    const allFolderIds = Object.values(treeData)
      .filter(item => item.isFolder && item.id !== 'root')
      .map(item => item.id)
    setExpandedItems(allFolderIds)
  }, [treeData, setExpandedItems])

  // Collapse all categories
  const handleCollapseAll = useCallback(() => {
    setExpandedItems([])
  }, [setExpandedItems])

  if (loading) {
    return (
      <div className="category-tree-wrapper">
        <Panel variant="elevated" className="category-tree">
          <div className="category-tree-loading">
            <p className="text-secondary">Loading categories...</p>
          </div>
        </Panel>
      </div>
    )
  }

  if (error) {
    return (
      <div className="category-tree-wrapper">
        <Panel variant="elevated" className="category-tree">
          <div className="category-tree-error">
            <p className="text-error">{error}</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Panel>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="category-tree-wrapper">
        <Panel variant="elevated" className="category-tree">
          <div className="category-tree-empty">
            <p className="lead">No categories yet.</p>
            <p className="text-secondary">
              Categories will appear here as you create seeds and they get automatically categorized.
            </p>
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div className="category-tree-wrapper">
      <div className="category-tree-header">
        <span className="category-tree-count">
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </span>
        <div className="category-tree-actions">
          <Button variant="ghost" onClick={handleExpandAll} className="category-tree-action-btn">
            <Plus size={16} />
          </Button>
          <Button variant="ghost" onClick={handleCollapseAll} className="category-tree-action-btn">
            <Minus size={16} />
          </Button>
        </div>
      </div>

      <Panel variant="elevated" className="category-tree">
        <div 
          className="category-tree-content" 
          style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
          {...tree.getContainerProps()}
        >
          {tree.getItems().map((item) => {
            // Skip root item in rendering
            if (item.getId() === 'root') {
              return null
            }
            
            return (
              <CategoryTreeItem
                key={item.getId()}
                item={item}
                tree={tree}
                {...(onCategorySelect && { onCategorySelect })}
                {...(selectedCategories && { selectedCategories })}
                showSeedCounts={showSeedCounts}
                seedCount={seedCounts.get(item.getId()) || 0}
              />
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

interface CategoryTreeItemProps {
  item: ItemInstance<CategoryItemData>
  tree: TreeInstance<CategoryItemData>
  onCategorySelect?: (categoryId: string) => void
  selectedCategories?: Set<string>
  showSeedCounts?: boolean
  seedCount: number
}

function CategoryTreeItem({
  item,
  tree,
  onCategorySelect,
  selectedCategories,
  showSeedCounts,
  seedCount,
}: CategoryTreeItemProps) {
  const isSelected = selectedCategories?.has(item.getId()) ?? false
  const isFocused = item.isFocused()
  const hasChildren = item.isFolder()
  const isExpanded = item.isExpanded()
  const itemData = item.getItemData()
  const level = itemData.level

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      if (isExpanded) {
        item.collapse()
      } else {
        item.expand()
      }
    }
    onCategorySelect?.(item.getId())
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      if (isExpanded) {
        item.collapse()
      } else {
        item.expand()
      }
    }
  }

  return (
    <div className="category-tree-item-wrapper">
      <button
        {...item.getProps()}
        className={`category-tree-item ${isSelected ? 'category-tree-item-selected' : ''} ${isFocused ? 'category-tree-item-focused' : ''}`}
        style={{ paddingLeft: `calc(var(--space-3) + ${level * 1}rem)` }}
        onClick={handleClick}
        type="button"
      >
        {/* Expand/collapse button */}
        <div className="category-tree-expand">
          {hasChildren ? (
            <button
              className="category-tree-expand-btn"
              onClick={handleExpandClick}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              type="button"
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          ) : (
            <div className="category-tree-expand-spacer" />
          )}
        </div>

        {/* Folder icon */}
        <div className="category-tree-icon">
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen size={16} />
            ) : (
              <Folder size={16} />
            )
          ) : (
            <Folder size={16} />
          )}
        </div>

        {/* Content */}
        <div className="category-tree-content-info">
          <div className="category-tree-name">{item.getItemName()}</div>
        </div>

        {/* Seed count badge */}
        {showSeedCounts && seedCount > 0 && (
          <Badge variant="primary" className="category-tree-seed-count">
            {seedCount}
          </Badge>
        )}
      </button>
    </div>
  )
}
