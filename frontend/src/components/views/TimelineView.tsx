import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timeline, type TimelineItem } from '@mother/components/Timeline'
import { Panel } from '@mother/components/Panel'
import { Button } from '@mother/components/Button'
import { api } from '../../services/api'
import { SeedView } from '../SeedView'
import type { Seed, Tag as TagType } from '../../types'
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
  const [allTags, setAllTags] = useState<TagType[]>([])
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

      // Load seeds and tags in parallel
      const [seedsData, tagsData] = await Promise.all([
        api.get<Seed[]>('/seeds'),
        api.get<TagType[]>('/tags').catch(() => []), // Tags may not exist yet
      ])
      
      // Sort by creation date (newest first for timeline)
      const sortedSeeds = [...seedsData].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setSeeds(sortedSeeds)
      setAllTags(tagsData)
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

  const handleSeedClick = (seedId: string) => {
    onSeedSelect?.(seedId)
  }

  const renderPanel = (index: number, width: number): React.ReactNode => {
    const seed = seeds[index]
    if (!seed) return null

    // Create tag color map: tag name (lowercase) -> color
    const tagColorMap = new Map<string, string>()
    allTags.forEach(tag => {
      if (tag.color) {
        tagColorMap.set(tag.name.toLowerCase(), tag.color)
      }
    })

    return (
      <div 
        className="timeline-seed-content"
        onClick={() => handleSeedClick(seed.id)}
      >
        <SeedView
          seed={seed}
          tagColors={tagColorMap}
          onTagClick={(tagId, tagName) => {
            navigate(`/seeds/tag/${encodeURIComponent(tagName)}`)
          }}
        />
      </div>
    )
  }

  const renderOpposite = (index: number, width: number, panelSide: 'left' | 'right'): React.ReactNode => {
    // Time is now displayed in SeedView, so we don't need to show it here
    return null
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

