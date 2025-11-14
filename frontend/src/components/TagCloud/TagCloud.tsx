import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel } from '@mother/components/Panel'
import { Badge } from '@mother/components/Badge'
import { api } from '../../services/api'
import type { Seed, Tag as TagType } from '../../types'
import { logger } from '../../utils/logger'
import './TagCloud.css'

export interface TagCloudProps {
  onTagSelect?: (tagName: string) => void
  selectedTags?: Set<string>
  className?: string
}

interface TagData {
  id: string
  name: string
  count: number
  color?: string
}

/**
 * TagCloud component with frequency-based sizing and color coding
 * Tags are sized based on their usage frequency across all seeds
 */
const log = logger.scope('TagCloud')

export function TagCloud({ onTagSelect, selectedTags = new Set(), className = '' }: TagCloudProps) {
  const navigate = useNavigate()
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      // Load seeds and tags in parallel
      const [seedsData, tagsData] = await Promise.all([
        api.get<Seed[]>('/seeds'),
        api.get<TagType[]>('/tags').catch(() => []), // Tags may not exist yet
      ])
      setSeeds(seedsData)
      setTags(tagsData)
    } catch (err) {
      log.error('Error loading tag cloud data', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Process seeds to extract tag frequency data
  const tagData = useMemo(() => {
    const tagMap = new Map<string, { id: string; name: string; count: number }>()
    
    // Count tag occurrences across all seeds
    for (const seed of seeds) {
      const seedTags = seed.currentState?.tags || []
      for (const tag of seedTags) {
        // Skip tags without names or IDs
        if (!tag.name || !tag.id) continue
        const existing = tagMap.get(tag.name.toLowerCase())
        if (existing) {
          existing.count += 1
        } else {
          tagMap.set(tag.name.toLowerCase(), {
            id: tag.id,
            name: tag.name,
            count: 1,
          })
        }
      }
    }

    // Convert to array and sort by frequency (descending)
    const tags: TagData[] = Array.from(tagMap.values())
      .sort((a, b) => b.count - a.count)

    return tags
  }, [seeds])

  // Calculate size classes based on frequency
  const getTagSizeClass = (count: number, maxCount: number): string => {
    const ratio = count / maxCount
    if (ratio >= 0.8) return 'tag-cloud-size-xl'
    if (ratio >= 0.6) return 'tag-cloud-size-lg'
    if (ratio >= 0.4) return 'tag-cloud-size-md'
    if (ratio >= 0.2) return 'tag-cloud-size-sm'
    return 'tag-cloud-size-xs'
  }

  // Get color for tag from database, or fallback to default
  const getTagColor = (tagName: string | undefined): string => {
    if (!tagName) return 'var(--text-primary)'
    const tag = tags.find(t => t.name?.toLowerCase() === tagName.toLowerCase())
    return tag?.color || 'var(--text-primary)'
  }

  const handleTagClick = (tagId: string, tagName: string, e: React.MouseEvent) => {
    // If onTagSelect is provided and user is holding a modifier key, use it for filtering
    if (onTagSelect && (e.ctrlKey || e.metaKey || e.shiftKey)) {
      e.preventDefault()
      e.stopPropagation()
      onTagSelect(tagName)
      return
    }
    
    // Otherwise, navigate to tag detail view using tag name
    e.preventDefault()
    navigate(`/tags/${encodeURIComponent(tagName)}`)
  }

  const maxCount = Math.max(...tagData.map(t => t.count), 1)

  if (loading) {
    return (
      <Panel className="tag-cloud-panel">
        <div className="tag-cloud-loading">
          <p>Loading tags...</p>
        </div>
      </Panel>
    )
  }

  if (error) {
    return (
      <Panel className="tag-cloud-panel">
        <div className="tag-cloud-error">
          <p className="text-error">{error}</p>
          <button className="btn-secondary" onClick={loadData}>
            Retry
          </button>
        </div>
      </Panel>
    )
  }

  if (tagData.length === 0) {
    return (
      <Panel className="tag-cloud-panel">
        <div className="tag-cloud-empty">
          <p className="lead">No tags yet.</p>
          <p className="text-secondary">
            Tags will appear here as you create seeds and they get automatically tagged.
          </p>
        </div>
      </Panel>
    )
  }

  return (
    <div className={`tag-cloud ${className}`}>
      <Panel variant="elevated" className="tag-cloud-panel">
        <div className="tag-cloud-header">
          <h3>Tag Cloud</h3>
          <div className="tag-cloud-stats">
            <Badge variant="primary">{tagData.length} tags</Badge>
            <Badge variant="error">{seeds.length} seeds</Badge>
          </div>
        </div>
        
        <div className="tag-cloud-content">
          {tagData
            .filter(tag => tag.name) // Filter out tags without names
            .map((tag) => {
              const isSelected = selectedTags.has(tag.name)
              const sizeClass = getTagSizeClass(tag.count, maxCount)
              const tagColor = getTagColor(tag.name)
              
              return (
                <a
                  key={tag.id}
                  href={`/tags/${encodeURIComponent(tag.name)}`}
                  onClick={(e) => handleTagClick(tag.id, tag.name, e)}
                  className={`
                    tag-cloud-item
                    ${sizeClass}
                    ${isSelected ? 'tag-cloud-item-selected' : ''}
                  `}
                  style={{}}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.setProperty('color', tagColor, 'important')
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.setProperty('color', tagColor, 'important')
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.setProperty('color', tagColor, 'important')
                    }
                  }}
                  title={`${tag.name} (${tag.count} seed${tag.count !== 1 ? 's' : ''}) - Click to view details, Ctrl/Cmd+Click to filter`}
                >
                  #{tag.name}
                  <span className="tag-cloud-count">{tag.count}</span>
                </a>
              )
            })}
        </div>
      </Panel>
    </div>
  )
}