import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryTree } from '../CategoryTree'
import { api } from '../../services/api'
import { Panel } from '@mother/components/Panel'
import { Button } from '@mother/components/Button'
import { Badge } from '@mother/components/Badge'
import { X } from 'lucide-react'
import type { Seed, Category, Tag as TagType } from '../../types'
import './Views.css'
import './CategoriesView.css'

interface CategoriesViewProps {
  refreshRef?: React.MutableRefObject<(() => void) | null>
}

export function CategoriesView({ refreshRef }: CategoriesViewProps = {}) {
  const navigate = useNavigate()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  useEffect(() => {
    if (selectedCategoryId) {
      loadFilteredSeeds()
      loadCategoryDetails()
    } else {
      setSeeds([])
      setSelectedCategory(null)
    }
  }, [selectedCategoryId])

  const loadFilteredSeeds = async () => {
    if (!selectedCategoryId) return

    try {
      setLoading(true)
      setError(null)
      
      // Load all seeds, tags, and filter by category client-side
      // (Could be optimized with a backend filter endpoint)
      const [allSeeds, tagsData] = await Promise.all([
        api.get<Seed[]>('/seeds'),
        api.get<TagType[]>('/tags').catch(() => []), // Tags may not exist yet
      ])
      
      const filtered = allSeeds.filter(seed => {
        const seedCategories = seed.currentState?.categories || []
        return seedCategories.some(cat => cat.id === selectedCategoryId)
      })
      
      setSeeds(filtered)
      setTags(tagsData)
    } catch (err) {
      console.error('Error loading filtered seeds:', err)
      setError(err instanceof Error ? err.message : 'Failed to load seeds')
    } finally {
      setLoading(false)
    }
  }

  const loadCategoryDetails = async () => {
    if (!selectedCategoryId) return

    try {
      const categories = await api.get<Category[]>('/categories')
      const category = categories.find(c => c.id === selectedCategoryId)
      setSelectedCategory(category || null)
    } catch (err) {
      console.error('Error loading category details:', err)
    }
  }

  const handleCategorySelect = (categoryId: string) => {
    // Toggle selection - if same category clicked, deselect
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null)
    } else {
      setSelectedCategoryId(categoryId)
    }
  }

  const clearSelection = () => {
    setSelectedCategoryId(null)
  }

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

  // Expose refresh function via ref
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = () => {
        if (selectedCategoryId) {
          loadFilteredSeeds()
        }
      }
    }
    return () => {
      if (refreshRef) {
        refreshRef.current = null
      }
    }
  }, [refreshRef, selectedCategoryId])

  return (
    <div className="view-container categories-view-container">
      <div className="categories-view-header">
        <h2>Categories</h2>
        <p className="lead">
          Browse your hierarchical categories and filter seeds by category.
        </p>
      </div>

      <div className="categories-view-content">
        {/* Category Tree */}
        <div className="categories-view-tree">
          <CategoryTree
            onCategorySelect={handleCategorySelect}
            selectedCategories={selectedCategoryId ? new Set([selectedCategoryId]) : new Set()}
            showSeedCounts={true}
          />
        </div>

        {/* Filtered Seeds */}
        {selectedCategoryId && (
          <div className="categories-view-seeds">
            <Panel variant="elevated" className="categories-view-seeds-panel">
              <div className="categories-view-seeds-header">
                <div>
                  <h3>
                    Seeds in "{selectedCategory?.name || 'Category'}"
                  </h3>
                  <p className="text-secondary">
                    {loading ? 'Loading...' : `${seeds.length} ${seeds.length === 1 ? 'seed' : 'seeds'}`}
                  </p>
                </div>
                <Button variant="ghost" onClick={clearSelection} className="categories-view-clear">
                  <X size={16} />
                  Clear
                </Button>
              </div>

              {error && (
                <div className="categories-view-error">
                  <p className="text-error">{error}</p>
                  <Button variant="secondary" onClick={loadFilteredSeeds}>
                    Retry
                  </Button>
                </div>
              )}

              {!error && loading && (
                <div className="categories-view-loading">
                  <p>Loading seeds...</p>
                </div>
              )}

              {!error && !loading && seeds.length === 0 && (
                <div className="categories-view-empty">
                  <p className="lead">No seeds in this category yet.</p>
                </div>
              )}

              {!error && !loading && seeds.length > 0 && (
                <div className="categories-view-seeds-list">
                  {seeds.map((seed) => {
                    const content = seed.currentState?.seed || ''
                    const seedTags = seed.currentState?.tags || []
                    const seedCategories = seed.currentState?.categories || []

                    return (
                      <div key={seed.id} className="categories-view-seed-item">
                        <Panel variant="elevated" className="categories-view-seed-panel">
                          <div className="categories-view-seed-header">
                            <p className="categories-view-seed-content">
                              {truncateContent(content)}
                            </p>
                            <span className="categories-view-seed-time">
                              {formatSeedTime(seed)}
                            </span>
                          </div>

                          {(seedTags.length > 0 || seedCategories.length > 0) && (
                            <div className="categories-view-seed-meta">
                              {seedTags.length > 0 && (
                                <div className="tag-list categories-view-seed-tags">
                                  {seedTags.slice(0, 5).map((tag) => {
                                    // Find the full tag object to get color
                                    const fullTag = tags.find(t => t.id === tag.id)
                                    const tagColor = fullTag?.color || 'var(--text-primary)'
                                    return (
                                      <a
                                        key={tag.id}
                                        href={`/seeds/tag/${encodeURIComponent(tag.name)}`}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          navigate(`/seeds/tag/${encodeURIComponent(tag.name)}`)
                                        }}
                                        style={{
                                          textDecoration: 'none',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.textDecoration = 'underline'
                                          e.currentTarget.style.setProperty('color', tagColor, 'important')
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.textDecoration = 'none'
                                          e.currentTarget.style.setProperty('color', tagColor, 'important')
                                        }}
                                        ref={(el) => {
                                          if (el) {
                                            el.style.setProperty('color', tagColor, 'important')
                                          }
                                        }}
                                        className="tag-item-small"
                                      >
                                        #{tag.name}
                                      </a>
                                    )
                                  })}
                                  {seedTags.length > 5 && (
                                    <span className="tag-item-small" style={{ color: 'var(--text-secondary)' }}>
                                      +{seedTags.length - 5}
                                    </span>
                                  )}
                                </div>
                              )}
                              {seedCategories.length > 0 && (
                                <div className="categories-view-seed-categories">
                                  {seedCategories.map((category) => (
                                    <Badge
                                      key={category.id}
                                      variant={category.id === selectedCategoryId ? 'primary' : 'primary'}
                                      className={category.id === selectedCategoryId ? '' : 'categories-view-badge-unselected'}
                                    >
                                      {category.path}
                                    </Badge>
                                  ))}
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
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}
