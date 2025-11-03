import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Timeline, type TimelineItem } from '../Timeline'
import type { Seed } from '../../types'
import './Views.css'
import './TimelineView.css'

interface TimelineViewProps {
  onSeedSelect?: (seedId: string) => void
}

/**
 * TimelineView displays all seeds in a chronological timeline.
 * Each seed is a timeline item that can be clicked to view details.
 */
export function TimelineView({ onSeedSelect }: TimelineViewProps) {
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
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const truncateContent = (content: string, maxLength: number = 150): string => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  if (loading) {
    return (
      <div className="view-container">
        <div className="panel">
          <p>Loading timeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="view-container">
        <div className="panel">
          <p className="text-error">{error}</p>
          <button className="btn-secondary" onClick={loadSeeds}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const timelineItems: TimelineItem[] = seeds.map((seed) => {
    const item: TimelineItem = {
      id: seed.id,
      content: (
        <div className="seed-timeline-item">
          <div className="seed-timeline-content">
            <p className="seed-timeline-text">
              {truncateContent(seed.currentState?.seed || seed.seed_content)}
            </p>
          </div>
          {(seed.currentState?.tags && seed.currentState.tags.length > 0) && (
            <div className="tag-list seed-timeline-tags">
              {seed.currentState.tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="tag-item tag-item-small">
                  {tag.name}
                </span>
              ))}
              {seed.currentState.tags.length > 3 && (
                <span className="tag-item tag-item-small">+{seed.currentState.tags.length - 3}</span>
              )}
            </div>
          )}
          {(seed.currentState?.categories && seed.currentState.categories.length > 0) && (
            <div className="seed-timeline-categories">
              {seed.currentState.categories.map((cat) => (
                <span key={cat.id} className="badge badge-primary badge-small">
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
      time: formatSeedTime(seed),
    }
    
    if (onSeedSelect) {
      item.onClick = () => onSeedSelect(seed.id)
    }
    
    return item
  })

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
        <div className="panel panel-elevated">
          <p className="text-center">Your timeline is empty. Start creating seeds to see them here!</p>
        </div>
      ) : (
        <div className="panel panel-elevated timeline-view-panel">
          <Timeline items={timelineItems} />
        </div>
      )}
    </div>
  )
}