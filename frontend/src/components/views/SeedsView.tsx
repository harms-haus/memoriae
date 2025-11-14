import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { Input } from '@mother/components/Input'
import { Badge } from '@mother/components/Badge'
import { Search, X, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react'
import { SeedView } from '../SeedView'
import type { Seed, Category, Tag as TagType } from '../../types'
import { logger } from '../../utils/logger'
import './Views.css'
import './SeedsView.css'

interface SeedsViewProps {
  onSeedSelect?: (seed: { id: string; slug?: string | null }) => void
  refreshRef?: React.MutableRefObject<(() => void) | null>
}

type SortOption = 'newest' | 'oldest' | 'alphabetical'

const log = logger.scope('SeedsView')

export function SeedsView({ onSeedSelect, refreshRef }: SeedsViewProps) {
  const navigate = useNavigate()
  const { tagName } = useParams<{ tagName?: string }>()
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

  // Initialize tag filter from URL parameter
  useEffect(() => {
    if (tagName) {
      // Find tag by name and add to selected tags
      const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
      if (tag) {
        setSelectedTags(new Set([tag.id]))
      }
    }
  }, [tagName, tags])

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
      log.error('Error loading seeds data', { error: err })
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
        const content = (seed.currentState?.seed || '').toLowerCase()
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
          const contentA = (a.currentState?.seed || '').toLowerCase()
          const contentB = (b.currentState?.seed || '').toLowerCase()
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
                  {tags.map((tag) => {
                    const tagColor = tag.color || 'var(--text-primary)'
                    return (
                      <a
                        key={tag.id}
                        href={`/seeds/tag/${encodeURIComponent(tag.name)}`}
                        onClick={(e) => {
                          e.preventDefault()
                          toggleTag(tag.id)
                        }}
                        style={{
                          textDecoration: selectedTags.has(tag.id) ? 'underline' : 'none',
                          fontWeight: selectedTags.has(tag.id) ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline'
                          e.currentTarget.style.setProperty('color', tagColor, 'important')
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = selectedTags.has(tag.id) ? 'underline' : 'none'
                          e.currentTarget.style.setProperty('color', tagColor, 'important')
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.setProperty('color', tagColor, 'important')
                          }
                        }}
                      >
                        #{tag.name}
                      </a>
                    )
                  })}
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
            // Create tag color map: tag name (lowercase) -> color
            const tagColorMap = new Map<string, string>()
            tags.forEach(tag => {
              if (tag.color) {
                tagColorMap.set(tag.name.toLowerCase(), tag.color)
              }
            })

            return (
              <div
                key={seed.id}
                className="seeds-view-item-wrapper"
                onClick={() => onSeedSelect?.({ id: seed.id, slug: seed.slug ?? null })}
              >
                <Panel
                  variant="elevated"
                  className="seeds-view-item"
                >
                  <SeedView
                    seed={seed}
                    tagColors={tagColorMap}
                    onTagClick={(tagId, tagName) => {
                      navigate(`/tags/${encodeURIComponent(tagName)}`)
                    }}
                  />
                </Panel>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
