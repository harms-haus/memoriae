import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Panel } from '@mother/components/Panel'
import { Button } from '@mother/components/Button'
import type { IdeaMusing, Tag } from '../../types'
import { MusingItem } from '../MusingsView/MusingItem'
import { logger } from '../../utils/logger'
import './MusingsView.css'

const log = logger.scope('MusingsView')

export function MusingsView() {
  const [musings, setMusings] = useState<IdeaMusing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadMusings()
    loadTags()
  }, [])

  const loadMusings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getDailyMusings()
      setMusings(data)
    } catch (err) {
      log.warn('Error loading musings', { error: err })
      // Handle gracefully - if it's a table doesn't exist error, just show empty
      setError(null)
      setMusings([])
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setError(null)
      const result = await api.generateMusings()
      if (result.musingsCreated > 0) {
        // Reload musings after generation
        await loadMusings()
      } else {
        setError(result.message || 'No musings were generated. Try creating more creative/exploratory seeds.')
      }
    } catch (err) {
      log.error('Error generating musings', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to generate musings')
    } finally {
      setGenerating(false)
    }
  }

  const loadTags = async () => {
    try {
      const data = await api.get<Tag[]>('/tags')
      setTags(data)
    } catch (err) {
      log.error('Error loading tags for musings view', { error: err })
      // Don't fail if tags can't be loaded
    }
  }

  // Create tag color map
  const tagColorMap = new Map<string, string>()
  tags.forEach(tag => {
    if (tag.color) {
      tagColorMap.set(tag.name.toLowerCase(), tag.color)
    }
  })

  if (loading) {
    return (
      <div className="musings-view">
        <Panel variant="elevated">
          <h2 className="panel-header">Daily Musings</h2>
          <p className="text-secondary">Loading musings...</p>
        </Panel>
      </div>
    )
  }

  if (error) {
    return (
      <div className="musings-view">
        <Panel variant="elevated">
          <h2 className="panel-header">Daily Musings</h2>
          <p className="text-error">{error}</p>
          <Button variant="secondary" onClick={loadMusings}>
            Retry
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="musings-view">
      <Panel variant="elevated" className="musings-view-header">
        <h2 className="panel-header">Daily Musings</h2>
        <p className="text-secondary">
          {musings.length === 0
            ? "No musings for today. Check back tomorrow!"
            : `${musings.length} musing${musings.length === 1 ? '' : 's'} for today`}
        </p>
      </Panel>

      {musings.length === 0 ? (
        <Panel variant="elevated" className="musings-view-empty">
          <p className="lead">
            No musings available today. The automation runs daily to identify creative ideas and generate musings.
          </p>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ marginTop: 'var(--space-4)' }}
          >
            {generating ? 'Generating...' : 'Generate Musings Now'}
          </Button>
          {error && (
            <p className="text-error" style={{ marginTop: 'var(--space-2)' }}>
              {error}
            </p>
          )}
        </Panel>
      ) : (
        <div className="musings-list">
          {musings.map((musing) => (
            <MusingItem
              key={musing.id}
              musing={musing}
              onUpdate={loadMusings}
              tagColors={tagColorMap}
            />
          ))}
        </div>
      )}
    </div>
  )
}

