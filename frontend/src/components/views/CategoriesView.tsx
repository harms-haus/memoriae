import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CategoryTree } from '../CategoryTree'
import { SeedView } from '../SeedView'
import { api } from '../../services/api'
import { Panel } from '@mother/components/Panel'
import { Button } from '@mother/components/Button'
import { X } from 'lucide-react'
import type { Seed, Category, Tag as TagType } from '../../types'
import './Views.css'
import './CategoriesView.css'

interface CategoriesViewProps {
  refreshRef?: React.MutableRefObject<(() => void) | null>
}

export function CategoriesView({ refreshRef }: CategoriesViewProps = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await api.get<Category[]>('/categories')
        setCategories(categoriesData)
      } catch (err) {
        console.error('Error loading categories:', err)
      }
    }
    loadCategories()
  }, [])

  // Auto-select category from URL path
  useEffect(() => {
    if (location.pathname.startsWith('/category/')) {
      const categoryPath = '/' + location.pathname.replace('/category/', '').split('/').filter(Boolean).join('/')
      const category = categories.find(c => c.path === categoryPath)
      if (category && category.id !== selectedCategoryId) {
        setSelectedCategoryId(category.id)
      }
    } else if (location.pathname === '/categories' && selectedCategoryId !== null) {
      // Clear selection when navigating to /categories
      setSelectedCategoryId(null)
    }
  }, [location.pathname, categories, selectedCategoryId])

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
      navigate('/categories')
    } else {
      setSelectedCategoryId(categoryId)
      const category = categories.find(c => c.id === categoryId)
      if (category) {
        navigate(`/category${category.path}`)
      }
    }
  }

  const clearSelection = () => {
    setSelectedCategoryId(null)
    navigate('/categories')
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
                    // Create tag color map: tag name (lowercase) -> color
                    const tagColorMap = new Map<string, string>()
                    tags.forEach(tag => {
                      if (tag.color) {
                        tagColorMap.set(tag.name.toLowerCase(), tag.color)
                      }
                    })

                    return (
                      <div key={seed.id} className="categories-view-seed-item">
                        <Panel variant="elevated" className="categories-view-seed-panel">
                          <SeedView
                            seed={seed}
                            tagColors={tagColorMap}
                            onTagClick={(tagId, tagName) => {
                              navigate(`/tags/${tagId}`)
                            }}
                          />
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
