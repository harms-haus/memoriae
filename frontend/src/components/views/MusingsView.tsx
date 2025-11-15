import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Panel } from '@mother/components/Panel'
import { Button } from '@mother/components/Button'
import type { IdeaMusing, Tag, Sprout, MusingSproutData } from '../../types'
import { MusingItem } from '../MusingsView/MusingItem'
import log from 'loglevel'
import './MusingsView.css'

const logMusings = log.getLogger('MusingsView')

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
      
      // Get all seeds for the user to find musing sprouts
      const seeds = await api.get<import('../../types').Seed[]>('/seeds')
      const seedIds = seeds.map(s => s.id)
      
      if (seedIds.length === 0) {
        setMusings([])
        return
      }
      
      // Get all musing sprouts for user's seeds
      // Filter for today's musings (created today, not dismissed, not completed)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const allSprouts: Sprout[] = []
      for (const seedId of seedIds) {
        try {
          const sprouts = await api.getSproutsBySeedId(seedId)
          allSprouts.push(...sprouts.filter(s => s.sprout_type === 'musing'))
        } catch (err) {
          // Skip seeds that fail
          continue
        }
      }
      
      // Filter for today's musings that are not dismissed or completed
      const todayMusings = allSprouts.filter(sprout => {
        const created = new Date(sprout.created_at)
        if (created < today || created >= tomorrow) return false
        
        const sproutData = sprout.sprout_data as MusingSproutData
        if (sproutData.dismissed || sproutData.completed) return false
        
        return true
      })
      
      // Convert sprouts to IdeaMusing format for compatibility
      const musings: IdeaMusing[] = todayMusings.map(sprout => {
        const sproutData = sprout.sprout_data as MusingSproutData
        const seed = seeds.find(s => s.id === sprout.seed_id)
        
        const musing: IdeaMusing = {
          id: sprout.id,
          seed_id: sprout.seed_id,
          template_type: sproutData.template_type,
          content: sproutData.content,
          created_at: sprout.created_at,
          dismissed: sproutData.dismissed,
          completed: sproutData.completed,
          ...(sproutData.dismissed_at !== null && { dismissed_at: sproutData.dismissed_at }),
          ...(sproutData.completed_at !== null && { completed_at: sproutData.completed_at }),
          ...(seed !== undefined && { seed }),
        }
        return musing
      })
      
      // Sort by created_at descending (newest first)
      musings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setMusings(musings)
    } catch (err) {
      logMusings.warn('Error loading musings', { error: err })
      // Handle gracefully
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
      logMusings.error('Error generating musings', { error: err })
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
      logMusings.error('Error loading tags for musings view', { error: err })
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

