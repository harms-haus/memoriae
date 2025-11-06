import { useState, useEffect, useMemo } from 'react'
import { Panel } from '@mother/components/Panel'
import { Badge } from '@mother/components/Badge'
import { api } from '../../services/api'
import type { Seed } from '../../types'
import './TagCloud.css'

export interface TagCloudProps {
  onTagSelect?: (tagName: string) => void
  selectedTags?: Set<string>
  className?: string
}

interface TagData {
  name: string
  count: number
  color?: string
}

/**
 * TagCloud component with frequency-based sizing and color coding
 * Tags are sized based on their usage frequency across all seeds
 */
export function TagCloud({ onTagSelect, selectedTags = new Set(), className = '' }: TagCloudProps) {
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSeeds()
  }, [])

  const loadSeeds = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<Seed[]>('/seeds')
      setSeeds(data)
    } catch (err) {
      console.error('Error loading seeds for tag cloud:', err)
      setError(err instanceof Error ? err.message : 'Failed to load seeds')
    } finally {
      setLoading(false)
    }
  }

  // Process seeds to extract tag frequency data
  const tagData = useMemo(() => {
    const tagMap = new Map<string, number>()
    
    // Count tag occurrences across all seeds
    for (const seed of seeds) {
      const seedTags = seed.currentState?.tags || []
      for (const tag of seedTags) {
        const count = tagMap.get(tag.name) || 0
        tagMap.set(tag.name, count + 1)
      }
    }

    // Convert to array and sort by frequency (descending)
    const tags: TagData[] = Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
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

  // Get color class for tag based on name hash (consistent colors)
  const getTagColorClass = (tagName: string): string => {
    const colors = ['tag-blue', 'tag-green', 'tag-purple', 'tag-pink']
    const hash = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length] || 'tag-blue' // Fallback to tag-blue
  }

  const handleTagClick = (tagName: string) => {
    onTagSelect?.(tagName)
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
          <button className="btn-secondary" onClick={loadSeeds}>
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
          {tagData.map((tag) => {
            const isSelected = selectedTags.has(tag.name)
            const sizeClass = getTagSizeClass(tag.count, maxCount)
            const colorClass = getTagColorClass(tag.name)
            
            return (
              <button
                key={tag.name}
                className={`
                  tag-cloud-item
                  ${sizeClass}
                  ${colorClass}
                  ${isSelected ? 'tag-cloud-item-selected' : ''}
                `}
                onClick={() => handleTagClick(tag.name)}
                title={`${tag.name} (${tag.count} seed${tag.count !== 1 ? 's' : ''})`}
              >
                {tag.name}
                <span className="tag-cloud-count">{tag.count}</span>
              </button>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}