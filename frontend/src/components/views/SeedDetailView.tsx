import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Timeline, type TimelineItem } from '../Timeline'
import { Button } from '../../../../mother-theme/src/components/Button'
import { Panel } from '../../../../mother-theme/src/components/Panel'
import { Tag } from '../../../../mother-theme/src/components/Tag'
import { Badge } from '../../../../mother-theme/src/components/Badge'
import type { Event, Seed, SeedState } from '../../types'
import './Views.css'
import './SeedDetailView.css'

interface SeedStateResponse {
  seed_id: string
  base_state: SeedState
  current_state: SeedState
  events_applied: number
}

interface SeedDetailViewProps {
  seedId: string
  onBack: () => void
}

/**
 * SeedDetailView displays:
 * - Current seed state (computed from base + enabled events)
 * - Timeline of all events with toggle functionality
 * - Each timeline item is clickable to toggle event on/off
 */
export function SeedDetailView({ seedId, onBack }: SeedDetailViewProps) {
  const [seed, setSeed] = useState<Seed | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [currentState, setCurrentState] = useState<SeedState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!seedId) {
      setError('Seed ID is required')
      setLoading(false)
      return
    }

    loadSeedData()
  }, [seedId])

  const loadSeedData = async () => {
    if (!seedId) return

    try {
      setLoading(true)
      setError(null)

      // Load seed, timeline events, and current state in parallel
      const [seedData, eventsData, stateData] = await Promise.all([
        api.get<Seed>(`/seeds/${seedId}`),
        api.get<Event[]>(`/seeds/${seedId}/timeline`),
        api.get<SeedStateResponse>(`/seeds/${seedId}/state`),
      ])

      setSeed(seedData)
      setEvents(eventsData.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ))
      setCurrentState(stateData.current_state)
    } catch (err) {
      console.error('Error loading seed data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load seed')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEvent = async (eventId: string, currentEnabled: boolean) => {
    if (!seedId || toggling.has(eventId)) return

    try {
      setToggling((prev) => new Set(prev).add(eventId))

      // Optimistically update
      const updatedEvents = events.map((e) =>
        e.id === eventId ? { ...e, enabled: !currentEnabled } : e
      )
      setEvents(updatedEvents)

      // Call API to toggle
      await api.post(`/seeds/${seedId}/events/${eventId}/toggle`, {
        enabled: !currentEnabled,
      })

      // Reload state to reflect changes
      const stateData = await api.get<SeedStateResponse>(`/seeds/${seedId}/state`)
      setCurrentState(stateData.current_state)

      // Reload events to ensure consistency
      const eventsData = await api.get<Event[]>(`/seeds/${seedId}/timeline`)
      setEvents(eventsData.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ))
    } catch (err) {
      console.error('Error toggling event:', err)
      // Revert optimistic update
      await loadSeedData()
      setError(err instanceof Error ? err.message : 'Failed to toggle event')
    } finally {
      setToggling((prev) => {
        const next = new Set(prev)
        next.delete(eventId)
        return next
      })
    }
  }

  const formatEventDescription = (event: Event): string => {
    switch (event.event_type) {
      case 'ADD_TAG':
        const addTagOp = event.patch_json.find((op) => op.path.startsWith('/tags/'))
        return addTagOp?.value
          ? `Added tag: ${typeof addTagOp.value === 'object' && addTagOp.value && 'name' in addTagOp.value ? addTagOp.value.name : addTagOp.value}`
          : 'Added tag'
      case 'REMOVE_TAG':
        return 'Removed tag'
      case 'SET_CATEGORY':
        const categoryOp = event.patch_json.find((op) => op.path.startsWith('/categories/'))
        return categoryOp?.value
          ? `Set category: ${typeof categoryOp.value === 'object' && categoryOp.value && 'name' in categoryOp.value ? categoryOp.value.name : categoryOp.value}`
          : 'Set category'
      case 'UPDATE_CONTENT':
        return 'Updated content'
      default:
        return event.event_type
    }
  }

  const formatEventTime = (event: Event): string => {
    const date = new Date(event.created_at)
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

  if (loading) {
    return (
      <div className="view-container">
        <Panel>
          <p>Loading seed...</p>
        </Panel>
      </div>
    )
  }

  if (error && !seed) {
    return (
      <div className="view-container">
        <Panel>
          <p className="text-error">{error}</p>
          <Button variant="primary" onClick={onBack}>
            Back to Seeds
          </Button>
        </Panel>
      </div>
    )
  }

  if (!seed) {
    return (
      <div className="view-container">
        <Panel>
          <p>Seed not found</p>
          <Button variant="primary" onClick={onBack}>
            Back to Seeds
          </Button>
        </Panel>
      </div>
    )
  }

  const timelineItems: TimelineItem[] = events.map((event) => ({
    id: event.id,
    content: (
      <div className="event-item-content">
        <div className="event-item-header">
          <span className="event-type">{event.event_type}</span>
          {event.automation_id && (
            <Badge variant="primary">Auto</Badge>
          )}
        </div>
        <p className="event-description">{formatEventDescription(event)}</p>
      </div>
    ),
    time: formatEventTime(event),
    disabled: !event.enabled,
    onClick: () => handleToggleEvent(event.id, event.enabled),
  }))

  return (
    <div className="view-container seed-detail-container">
      <div className="seed-detail-header">
        <Button
          variant="secondary"
          onClick={onBack}
          aria-label="Back to seeds"
        >
          ← Back
        </Button>
        <h2 className="seed-detail-title">Seed Detail</h2>
      </div>

      {/* Current State Display */}
      <Panel variant="elevated" className="seed-detail-state">
        <h3 className="panel-header">Current State</h3>
        <div className="seed-content-display">
          <p className="seed-text">{currentState?.seed || seed.seed_content}</p>
        </div>
        {currentState?.tags && currentState.tags.length > 0 && (
          <div className="tag-list seed-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {currentState.tags.map((tag) => (
              <Tag key={tag.id}>
                {tag.name}
              </Tag>
            ))}
          </div>
        )}
        {currentState?.categories && currentState.categories.length > 0 && (
          <div className="seed-categories">
            <p className="label">Categories:</p>
            <ul>
              {currentState.categories.map((cat) => (
                <li key={cat.id}>{cat.name}</li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {/* Timeline of Events */}
      <Panel variant="elevated" className="seed-detail-timeline">
        <h3 className="panel-header">Timeline</h3>
        {events.length === 0 ? (
          <p className="text-secondary">No events yet.</p>
        ) : (
          <Timeline items={timelineItems} />
        )}
      </Panel>
    </div>
  )
}
