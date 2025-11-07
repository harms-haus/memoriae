import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { Timeline, type TimelineItem } from '@mother/components/Timeline'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { ExpandingPanel } from '@mother/components/ExpandingPanel'
import { Badge } from '@mother/components/Badge'
import { renderHashTags } from '../../utils/renderHashTags'
import { TagList } from '../TagList'
import { FollowupsPanel } from '../FollowupsPanel'
import type { Event, Seed, SeedState, Tag as TagType } from '../../types'
import './Views.css'
import './SeedDetailView.css'

interface Automation {
  id: string
  name: string
  description: string | null
  enabled: boolean
}

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
  const navigate = useNavigate()
  const [seed, setSeed] = useState<Seed | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [currentState, setCurrentState] = useState<SeedState | null>(null)
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loadingAutomations, setLoadingAutomations] = useState(false)
  const [runningAutomations, setRunningAutomations] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!seedId) {
      setError('Seed ID is required')
      setLoading(false)
      return
    }

    loadSeedData()
    loadAutomations()
  }, [seedId])

  const loadSeedData = async () => {
    if (!seedId) return

    try {
      setLoading(true)
      setError(null)

      // Load seed, timeline events, current state, and tags in parallel
      const [seedData, eventsData, stateData, tagsData] = await Promise.all([
        api.get<Seed>(`/seeds/${seedId}`),
        api.get<Event[]>(`/seeds/${seedId}/timeline`),
        api.get<SeedStateResponse>(`/seeds/${seedId}/state`),
        api.get<TagType[]>('/tags').catch(() => []), // Tags may not exist yet
      ])

      setSeed(seedData)
      setEvents(eventsData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
      setCurrentState(stateData.current_state)
      setTags(tagsData)
    } catch (err) {
      console.error('Error loading seed data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load seed')
    } finally {
      setLoading(false)
    }
  }

  const loadAutomations = async () => {
    if (!seedId) return

    try {
      setLoadingAutomations(true)
      const automationsData = await api.get<Automation[]>(`/seeds/${seedId}/automations`)
      setAutomations(automationsData)
    } catch (err) {
      console.error('Error loading automations:', err)
      // Don't set error state - automations are optional
    } finally {
      setLoadingAutomations(false)
    }
  }

  const handleRunAutomation = async (automationId: string) => {
    if (!seedId || runningAutomations.has(automationId)) return

    // Store initial event count to detect when new events are added
    const initialEventCount = events.length
    let lastEventCount = initialEventCount

    try {
      setRunningAutomations((prev) => new Set(prev).add(automationId))
      setError(null) // Clear any previous errors

      const response = await api.post<{ message: string; jobId: string; automation: { id: string; name: string } }>(
        `/seeds/${seedId}/automations/${automationId}/run`
      )

      console.log('Automation queued:', response)

      // Poll for completion - check every 2 seconds for up to 20 seconds
      let attempts = 0
      const maxAttempts = 10
      const pollInterval = 2000

      const pollForCompletion = async () => {
        attempts++
        
        try {
          // Reload seed data to check if new events were created
          const [seedData, eventsData, stateData] = await Promise.all([
            api.get<Seed>(`/seeds/${seedId}`),
            api.get<Event[]>(`/seeds/${seedId}/timeline`),
            api.get<SeedStateResponse>(`/seeds/${seedId}/state`),
          ])

          const sortedEvents = eventsData.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          const currentEventCount = sortedEvents.length

          // Update state
          setSeed(seedData)
          setEvents(sortedEvents)
          setCurrentState(stateData.current_state)
          
          // Check if new events were created (automation completed)
          if (currentEventCount > lastEventCount) {
            // New events detected - automation completed
            console.log('Automation completed - new events detected')
            setRunningAutomations((prev) => {
              const next = new Set(prev)
              next.delete(automationId)
              return next
            })
            return
          }
          
          lastEventCount = currentEventCount
          
          // Check if we should continue polling
          if (attempts < maxAttempts) {
            setTimeout(pollForCompletion, pollInterval)
          } else {
            // Stop polling after max attempts (automation may have completed without creating events, or failed silently)
            console.log('Polling stopped - max attempts reached')
            setRunningAutomations((prev) => {
              const next = new Set(prev)
              next.delete(automationId)
              return next
            })
          }
        } catch (err) {
          console.error('Error polling for automation completion:', err)
          setRunningAutomations((prev) => {
            const next = new Set(prev)
            next.delete(automationId)
            return next
          })
        }
      }

      // Start polling after a short delay to give the job time to start
      setTimeout(pollForCompletion, pollInterval)
    } catch (err) {
      console.error('Error running automation:', err)
      const errorMessage = err instanceof Error 
        ? err.message 
        : axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to run automation'
      setError(errorMessage)
      setRunningAutomations((prev) => {
        const next = new Set(prev)
        next.delete(automationId)
        return next
      })
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
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

  const extractTagName = (event: Event): string | null => {
    if (event.event_type !== 'ADD_TAG') return null
    const addTagOp = event.patch_json.find((op) => op.path.startsWith('/tags/'))
    if (!addTagOp?.value) return null
    if (typeof addTagOp.value === 'object' && addTagOp.value && 'name' in addTagOp.value) {
      return addTagOp.value.name as string
    }
    return String(addTagOp.value)
  }

  const formatEventDescription = (event: Event): string => {
    switch (event.event_type) {
      case 'ADD_TAG':
        const tagName = extractTagName(event)
        return tagName || 'Added tag'
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

  // Extract metadata from RUN_AUTOMATION events
  const extractAutomationMetadata = (event: Event): { automation_name: string; manual: boolean } | null => {
    if (event.event_type !== 'RUN_AUTOMATION') return null
    const metadataOp = event.patch_json.find((op) => op.path === '/metadata')
    if (!metadataOp?.value || typeof metadataOp.value !== 'object') return null
    const metadata = metadataOp.value as { automation_name?: string; manual?: boolean }
    return {
      automation_name: metadata.automation_name || 'Unknown',
      manual: metadata.manual === true,
    }
  }

  // Format automation name for display (e.g., "tag" -> "Tag Extraction")
  const formatAutomationName = (name: string): string => {
    // Capitalize first letter
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1)
    // Add "Extraction" or similar suffix based on automation type
    if (name === 'tag') return 'Tag Extraction'
    if (name === 'categorize') return 'Categorization'
    return capitalized
  }

  // Group consecutive events of the same type
  // RUN_AUTOMATION events are never grouped with other event types
  interface EventGroup {
    eventType: string
    events: Event[]
    hasAutomation: boolean
    position: number
  }

  const groupedEvents: EventGroup[] = useMemo(() => {
    if (events.length === 0) return []

    const groups: EventGroup[] = []
    let currentGroup: EventGroup | null = null

    // Get date range for position calculation
    const dates = events.map(event => new Date(event.created_at).getTime())
    const minDate = Math.min(...dates)
    const maxDate = Math.max(...dates)
    const dateRange = maxDate - minDate

    events.forEach((event) => {
      // RUN_AUTOMATION events are never grouped with other types
      // Other event types are grouped together if consecutive and same type
      const shouldStartNewGroup = !currentGroup || 
        currentGroup.eventType !== event.event_type ||
        event.event_type === 'RUN_AUTOMATION' ||
        currentGroup.eventType === 'RUN_AUTOMATION'

      if (shouldStartNewGroup) {
        if (currentGroup) {
          groups.push(currentGroup)
        }
        
        const eventDate = new Date(event.created_at).getTime()
        const position = dateRange === 0 
          ? 0 
          : ((maxDate - eventDate) / dateRange) * 100

        currentGroup = {
          eventType: event.event_type,
          events: [event],
          hasAutomation: !!event.automation_id,
          position: Math.max(0, Math.min(100, position)),
        }
      } else {
        // Add to current group
        if (currentGroup) {
          currentGroup.events.push(event)
          if (event.automation_id) {
            currentGroup.hasAutomation = true
          }
          // Update position to the newest event in the group
          const eventDate = new Date(event.created_at).getTime()
          const position = dateRange === 0 
            ? 0 
            : ((maxDate - eventDate) / dateRange) * 100
          currentGroup.position = Math.max(0, Math.min(100, position))
        }
      }
    })

    // Don't forget the last group
    if (currentGroup) {
      groups.push(currentGroup)
    }

    return groups
  }, [events])

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

  // Calculate timeline positions based on grouped events
  const timelineItems: TimelineItem[] = useMemo(() => {
    return groupedEvents.map((group, index) => ({
      id: `group-${index}-${group.eventType}`,
      position: group.position,
    }))
  }, [groupedEvents])

  const renderPanel = (index: number, width: number): React.ReactNode => {
    const group = groupedEvents[index]
    if (!group) return null

    // Handle RUN_AUTOMATION events - display as italicized text
    if (group.eventType === 'RUN_AUTOMATION') {
      const event = group.events[0] // RUN_AUTOMATION events are never grouped
      if (!event) return null
      const metadata = extractAutomationMetadata(event)
      if (!metadata) return null

      const automationDisplayName = formatAutomationName(metadata.automation_name)
      const triggerType = metadata.manual ? 'manual' : 'automatic'

      return (
        <div className="event-automation-run">
          <span className="event-automation-run-text">
            {automationDisplayName}: {triggerType}
          </span>
        </div>
      )
    }

    const allDisabled = group.events.every(e => !e.enabled)
    const someDisabled = group.events.some(e => !e.enabled) && !allDisabled

    // Extract tag names for ADD_TAG groups
    const tagNames = group.eventType === 'ADD_TAG' 
      ? group.events.map(e => extractTagName(e)).filter((name): name is string => name !== null)
      : []

    return (
      <div className="event-group-content">
        <div className="event-group-header">
          <span className="event-type">{group.eventType}</span>
          {group.hasAutomation && (
            <Badge variant="primary">Auto</Badge>
          )}
          {allDisabled && (
            <Badge variant="warning" className="event-disabled-badge">Disabled</Badge>
          )}
          {someDisabled && (
            <Badge variant="warning" className="event-disabled-badge">Some Disabled</Badge>
          )}
        </div>
        <div className="event-group-body">
          {group.eventType === 'ADD_TAG' && tagNames.length > 0 ? (
            <div className="event-group-tags">
              {tagNames.map((tagName, tagIndex) => {
                const event = group.events[tagIndex]
                if (!event) return null
                const isLast = tagIndex === tagNames.length - 1
                return (
                  <span key={`${event.id}-${tagIndex}`}>
                    <span
                      className={`event-group-tag ${!event.enabled ? 'event-group-tag-disabled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleEvent(event.id, event.enabled)
                      }}
                    >
                      {tagName}
                    </span>
                    {!isLast && <span className="event-group-tag-separator">, </span>}
                  </span>
                )
              })}
            </div>
          ) : (
            <div className="event-group-items">
              {group.events.map((event) => (
                <div
                  key={event.id}
                  className={`event-group-item ${!event.enabled ? 'event-group-item-disabled' : ''}`}
                  onClick={() => handleToggleEvent(event.id, event.enabled)}
                >
                  {formatEventDescription(event)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderOpposite = (index: number, width: number, panelSide: 'left' | 'right'): React.ReactNode => {
    const group = groupedEvents[index]
    if (!group) return null

    // Use the newest event's time for the group
    const newestEvent = group.events[0] // Events are sorted newest first
    if (!newestEvent) return null

    return (
      <div className="event-time-opposite">
        <span className="event-time">{formatEventTime(newestEvent)}</span>
      </div>
    )
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
          <p className="seed-text">
            {(() => {
              // Create tag color map: tag name (lowercase) -> color
              const tagColorMap = new Map<string, string>()
              tags.forEach(tag => {
                if (tag.color) {
                  tagColorMap.set(tag.name.toLowerCase(), tag.color)
                }
              })
              return renderHashTags(currentState?.seed || seed.seed_content, (tagName) => {
                navigate(`/seeds/tag/${encodeURIComponent(tagName)}`)
              }, tagColorMap)
            })()}
          </p>
        </div>
        {currentState?.tags && currentState.tags.length > 0 && (
          <TagList
            tags={currentState.tags.map((tag) => {
              // Find the full tag object to get color
              const fullTag = tags.find(t => t.id === tag.id)
              return {
                id: tag.id,
                name: tag.name,
                color: fullTag?.color ?? null,
              }
            })}
            className="seed-tags"
            onTagClick={(tag) => {
              navigate(`/seeds/tag/${encodeURIComponent(tag.name)}`)
            }}
            suppressTruncate={true}
          />
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

      {/* Follow-ups Panel */}
      <FollowupsPanel seedId={seedId} />

      {/* Automations Section */}
      <ExpandingPanel
        variant="elevated"
        title="Run Automations"
        className="seed-detail-automations"
        defaultExpanded={false}
      >
        {loadingAutomations ? (
          <p className="text-secondary">Loading automations...</p>
        ) : automations.length === 0 ? (
          <p className="text-secondary">No automations available.</p>
        ) : (
          <div className="automations-list">
            {automations.map((automation) => (
              <div key={automation.id} className="automation-item">
                <div className="automation-info">
                  <div className="automation-header">
                    <span className="automation-name">{automation.name}</span>
                    {!automation.enabled && (
                      <Badge variant="warning">Disabled</Badge>
                    )}
                  </div>
                  {automation.description && (
                    <p className="automation-description">{automation.description}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleRunAutomation(automation.id)}
                  disabled={!automation.enabled || runningAutomations.has(automation.id)}
                  aria-label={`Run ${automation.name} automation`}
                >
                  {runningAutomations.has(automation.id) ? 'Running...' : 'Run'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </ExpandingPanel>

      {/* Timeline of Events */}
      <Panel variant="elevated" className="seed-detail-timeline">
        <h3 className="panel-header">Timeline</h3>
        {events.length === 0 ? (
          <p className="text-secondary">No events yet.</p>
        ) : (
          <Timeline
            items={timelineItems}
            mode="left"
            renderPanel={renderPanel}
            renderOpposite={renderOpposite}
            maxPanelWidth={400}
            panelSpacing={16}
            panelClickable={true}
          />
        )}
      </Panel>
    </div>
  )
}
