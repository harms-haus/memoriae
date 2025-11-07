import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timeline, type TimelineItem } from '@mother/components/Timeline'
import { Panel } from '@mother/components/Panel'
import { Tag } from '@mother/components/Tag'
import { Badge } from '@mother/components/Badge'
import { Button } from '@mother/components/Button'
import { api } from '../../services/api'
import { renderHashTags } from '../../utils/renderHashTags'
import type { Seed } from '../../types'
import './Views.css'
import './TimelineView.css'

interface TimelineViewProps {
  onSeedSelect?: (seedId: string) => void
  refreshRef?: React.MutableRefObject<(() => void) | null>
}

/**
 * TimelineView displays all seeds in a chronological timeline.
 * Uses the mother Timeline component with PointerPanel for each seed.
 * Seeds are positioned along the timeline based on their creation date.
 */
export function TimelineView({ onSeedSelect, refreshRef }: TimelineViewProps) {
  const navigate = useNavigate()
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSeeds()
  }, [])

  // Expose refresh function via ref
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = loadSeeds
    }
    return () => {
      if (refreshRef) {
        refreshRef.current = null
      }
    }
  }, [refreshRef])

  const loadSeeds = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const seedsData = await api.get<Seed[]>('/seeds')
      
      // Sort by creation date (newest first for timeline)
      const sortedSeeds = [...seedsData].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setSeeds(sortedSeeds)
    } catch (err) {
      console.error('Error loading seeds:', err)
      setError(err instanceof Error ? err.message : 'Failed to load seeds')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSeeds()
  }, [loadSeeds])

  // Expose refresh function via ref
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = loadSeeds
    }
    return () => {
      if (refreshRef) {
        refreshRef.current = null
      }
    }
  }, [refreshRef, loadSeeds])

  // Calculate timeline positions based on date range
  const timelineItems: TimelineItem[] = useMemo(() => {
    if (seeds.length === 0) return []

    // Get date range
    const dates = seeds.map(seed => new Date(seed.created_at).getTime())
    const minDate = Math.min(...dates)
    const maxDate = Math.max(...dates)
    const dateRange = maxDate - minDate

    // If all seeds are from the same time, distribute evenly (newest at top = 0%)
    if (dateRange === 0) {
      return seeds.map((seed, index) => ({
        id: seed.id,
        position: (index / (seeds.length - 1 || 1)) * 100,
      }))
    }

    // Calculate position based on date (newest at top = 0%, oldest at bottom = 100%)
    return seeds.map((seed) => {
      const seedDate = new Date(seed.created_at).getTime()
      // Reverse: newest (maxDate) should be at 0%, oldest (minDate) at 100%
      const position = ((maxDate - seedDate) / dateRange) * 100
      return {
        id: seed.id,
        position: Math.max(0, Math.min(100, position)), // Clamp to 0-100
      }
    })
  }, [seeds])

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
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const truncateContent = (content: string, maxLength: number = 200): string => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  const handleSeedClick = (seedId: string) => {
    onSeedSelect?.(seedId)
  }

  const renderPanel = (index: number, width: number): React.ReactNode => {
    const seed = seeds[index]
    if (!seed) return null

    const content = seed.currentState?.seed || seed.seed_content
    const tags = seed.currentState?.tags || []
    const categories = seed.currentState?.categories || []

    return (
      <div 
        className="timeline-seed-content"
        onClick={() => handleSeedClick(seed.id)}
      >
        <div className="timeline-seed-text-wrapper">
          <p className="timeline-seed-text">
            {renderHashTags(truncateContent(content), (tagName) => {
              navigate(`/seeds/tag/${encodeURIComponent(tagName)}`)
            })}
          </p>
        </div>

        {tags.length > 0 && (
          <div className="timeline-seed-tags">
            {tags.slice(0, 5).map((tag) => (
              <Tag 
                key={tag.id} 
                variant="default"
                className="timeline-seed-tag"
              >
                {tag.name}
              </Tag>
            ))}
            {tags.length > 5 && (
              <Tag variant="default" className="timeline-seed-tag">
                +{tags.length - 5}
              </Tag>
            )}
          </div>
        )}

        {categories.length > 0 && (
          <div className="timeline-seed-categories">
            {categories.map((cat) => (
              <Badge key={cat.id} variant="primary" className="timeline-seed-category">
                {cat.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderOpposite = (index: number, width: number, panelSide: 'left' | 'right'): React.ReactNode => {
    const seed = seeds[index]
    if (!seed) return null

    return (
      <div className="timeline-seed-time-opposite">
        <span className="timeline-seed-time">{formatSeedTime(seed)}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="view-container">
        <Panel>
          <p>Loading timeline...</p>
        </Panel>
      </div>
    )
  }

  if (error) {
    return (
      <div className="view-container">
        <Panel>
          <p className="text-error">{error}</p>
          <Button variant="secondary" onClick={loadSeeds}>
            Retry
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="view-container timeline-view-container">
      <div className="timeline-view-header">
        <h2>Timeline</h2>
        <p className="lead text-secondary">
          {seeds.length === 0 
            ? 'No seeds yet. Create your first memory!'
            : `${seeds.length} ${seeds.length === 1 ? 'seed' : 'seeds'} in timeline`}
        </p>
      </div>

      {seeds.length === 0 ? (
        <div className="timeline-view-empty">
          <p className="text-center">Your timeline is empty. Start creating seeds to see them here!</p>
        </div>
      ) : (
        <div className="timeline-view-panel">
          <Timeline
            items={timelineItems}
            mode="center"
            renderPanel={renderPanel}
            renderOpposite={renderOpposite}
            maxPanelWidth={400}
            panelSpacing={16}
            panelClickable={!!onSeedSelect}
          />
        </div>
      )}
    </div>
  )
}

