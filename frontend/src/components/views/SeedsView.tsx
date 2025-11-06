import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { Input } from '@mother/components/Input'
import { Tag } from '@mother/components/Tag'
import { Badge } from '@mother/components/Badge'
import { Search, X, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react'
import type { Seed, Category, Tag as TagType } from '../../types'
import './Views.css'
import './SeedsView.css'

interface SeedsViewProps {
  onSeedSelect?: (seedId: string) => void
  refreshRef?: React.MutableRefObject<(() => void) | null>
}

type SortOption = 'newest' | 'oldest' | 'alphabetical'

export function SeedsView({ onSeedSelect, refreshRef }: SeedsViewProps) {
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load seeds, categories, and tags in parallel
      const [seedsData, categoriesData, tagsData] = await Promise.all([
        api.get<Seed[]>('/seeds'),
        api.get<Category[]>('/categories').catch(() => []), // Categories may not exist yet
        api.get<TagType[]>('/tags').catch(() => []), // Tags may not exist yet
      ])

      setSeeds(seedsData)
      setCategories(categoriesData)
      setTags(tagsData)
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load seeds')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Expose refresh function via ref
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = loadData
    }
    return () => {
      if (refreshRef) {
        refreshRef.current = null
      }
    }
  }, [refreshRef, loadData])

  // Filter and sort seeds
  const filteredAndSortedSeeds = useMemo(() => {
    let filtered = [...seeds]

    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(seed => {
        const content = (seed.currentState?.seed || seed.seed_content).toLowerCase()
        const tagNames = (seed.currentState?.tags || []).map(t => t.name.toLowerCase()).join(' ')
        const categoryNames = (seed.currentState?.categories || []).map(c => c.name.toLowerCase()).join(' ')
        return content.includes(query) || tagNames.includes(query) || categoryNames.includes(query)
      })
    }

    // Tag filter
    if (selectedTags.size > 0) {
      filtered = filtered.filter(seed => {
        const seedTagIds = new Set((seed.currentState?.tags || []).map(t => t.id))
        return Array.from(selectedTags).some(tagId => seedTagIds.has(tagId))
      })
    }

    // Category filter
    if (selectedCategories.size > 0) {
      filtered = filtered.filter(seed => {
        const seedCategoryIds = new Set((seed.currentState?.categories || []).map(c => c.id))
        return Array.from(selectedCategories).some(catId => seedCategoryIds.has(catId))
      })
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'alphabetical':
          const contentA = (a.currentState?.seed || a.seed_content).toLowerCase()
          const contentB = (b.currentState?.seed || b.seed_content).toLowerCase()
          return contentA.localeCompare(contentB)
        default:
          return 0
      }
    })

    return filtered
  }, [seeds, searchQuery, selectedTags, selectedCategories, sortBy])

  const toggleTag = (tagId: string) => {
    const newSelected = new Set(selectedTags)
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId)
    } else {
      newSelected.add(tagId)
    }
    setSelectedTags(newSelected)
  }

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategories(newSelected)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTags(new Set())
    setSelectedCategories(new Set())
    setSortBy('newest')
  }

  const hasActiveFilters = searchQuery.trim() !== '' || selectedTags.size > 0 || selectedCategories.size > 0

  const formatSeedTime = (seed: Seed): string => {
    const date = new Date(seed.created_at)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const truncateContent = (content: string, maxLength: number = 200): string => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  if (loading) {
    return (
      <div className="view-container">
        <Panel>
          <p>Loading seeds...</p>
        </Panel>
      </div>
    )
  }

  if (error) {
    return (
      <div className="view-container">
        <Panel>
          <p className="text-error">{error}</p>
          <Button variant="secondary" onClick={loadData}>
            Retry
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="seeds-view-header">
        <h2>Seeds</h2>
        <p className="lead">
          {filteredAndSortedSeeds.length === seeds.length
            ? `${seeds.length} ${seeds.length === 1 ? 'seed' : 'seeds'}`
            : `${filteredAndSortedSeeds.length} of ${seeds.length} ${seeds.length === 1 ? 'seed' : 'seeds'}`}
        </p>
      </div>

      {/* Search and Sort Controls */}
      <Panel variant="elevated" className="seeds-view-filters">
        <div className="seeds-view-search-row">
          <Input
            icon={Search}
            placeholder="Search seeds..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="seeds-view-search-input"
          />
          <div className="seeds-view-controls">
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className="seeds-view-toggle-filters"
            >
              <ArrowUpDown size={16} />
              Filters
            </Button>
            <div className="seeds-view-sort">
              <Button
                variant="ghost"
                onClick={() => {
                  const options: SortOption[] = ['newest', 'oldest', 'alphabetical']
                  const currentIndex = options.indexOf(sortBy)
                  const nextIndex = (currentIndex + 1) % options.length
                  const nextOption = options[nextIndex]
                  if (nextOption) {
                    setSortBy(nextOption)
                  }
                }}
                className="seeds-view-sort-button"
              >
                {sortBy === 'newest' && <ArrowDown size={16} />}
                {sortBy === 'oldest' && <ArrowUp size={16} />}
                {sortBy === 'alphabetical' && <ArrowUpDown size={16} />}
                <span className="seeds-view-sort-label">
                  {sortBy === 'newest' && 'Newest'}
                  {sortBy === 'oldest' && 'Oldest'}
                  {sortBy === 'alphabetical' && 'A-Z'}
                </span>
              </Button>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="seeds-view-clear-filters">
                <X size={16} />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="seeds-view-filter-expanded">
            {/* Tags Filter */}
            {tags.length > 0 && (
              <div className="seeds-view-filter-group">
                <label className="label" style={{ marginBottom: 'var(--space-2)' }}>
                  Filter by Tags
                </label>
                <div className="tag-list">
                  {tags.map((tag) => (
                    <Tag
                      key={tag.id}
                      variant={tag.color as 'default' | 'blue' | 'green' | 'purple' | 'pink'}
                      active={selectedTags.has(tag.id)}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Filter */}
            {categories.length > 0 && (
              <div className="seeds-view-filter-group">
                <label className="label" style={{ marginBottom: 'var(--space-2)' }}>
                  Filter by Categories
                </label>
                <div className="seeds-view-categories-list">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`seeds-view-category-badge ${selectedCategories.has(category.id) ? 'seeds-view-category-selected' : ''}`}
                    >
                      <Badge
                        variant={selectedCategories.has(category.id) ? 'primary' : 'primary'}
                        className={selectedCategories.has(category.id) ? '' : 'seeds-view-badge-unselected'}
                      >
                        {category.path}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tags.length === 0 && categories.length === 0 && (
              <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                No tags or categories available yet. They will appear here as you create seeds.
              </p>
            )}
          </div>
        )}
      </Panel>

      {/* Seeds List */}
      {filteredAndSortedSeeds.length === 0 ? (
        <Panel variant="elevated">
          <div className="seeds-view-empty">
            <p className="lead">
              {hasActiveFilters
                ? 'No seeds match your filters. Try adjusting your search or filters.'
                : 'No seeds yet. Create your first seed to get started!'}
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </Panel>
      ) : (
        <div className="seeds-view-list">
          {filteredAndSortedSeeds.map((seed) => {
            const content = seed.currentState?.seed || seed.seed_content
            const seedTags = seed.currentState?.tags || []
            const seedCategories = seed.currentState?.categories || []

            return (
              <div
                key={seed.id}
                className="seeds-view-item-wrapper"
                onClick={() => onSeedSelect?.(seed.id)}
              >
                <Panel
                  variant="elevated"
                  className="seeds-view-item"
                >
                  <div className="seeds-view-item-header">
                    <p className="seeds-view-item-content">
                      {truncateContent(content)}
                    </p>
                    <span className="seeds-view-item-time">
                      {formatSeedTime(seed)}
                    </span>
                  </div>

                  {(seedTags.length > 0 || seedCategories.length > 0) && (
                    <div className="seeds-view-item-meta">
                      {seedTags.length > 0 && (
                        <div className="tag-list seeds-view-item-tags">
                          {seedTags.slice(0, 5).map((tag) => {
                            // Find the full tag object to get color
                            const fullTag = tags.find(t => t.id === tag.id)
                            const variant = fullTag?.color 
                              ? (fullTag.color as 'default' | 'blue' | 'green' | 'purple' | 'pink')
                              : 'default'
                            
                            return (
                              <Tag
                                key={tag.id}
                                variant={variant}
                                className="tag-item-small"
                                onClick={() => {
                                  toggleTag(tag.id)
                                }}
                              >
                                {tag.name}
                              </Tag>
                            )
                          })}
                          {seedTags.length > 5 && (
                            <Tag className="tag-item-small">
                              +{seedTags.length - 5}
                            </Tag>
                          )}
                        </div>
                      )}
                      {seedCategories.length > 0 && (
                        <div className="seeds-view-item-categories">
                          {seedCategories.slice(0, 3).map((category) => (
                            <div
                              key={category.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCategory(category.id)
                              }}
                              className="seeds-view-category-clickable"
                            >
                              <Badge variant="primary" className="badge-small">
                                {category.path}
                              </Badge>
                            </div>
                          ))}
                          {seedCategories.length > 3 && (
                            <Badge variant="primary" className="badge-small">
                              +{seedCategories.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Panel>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
