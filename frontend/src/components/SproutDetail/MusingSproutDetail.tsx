import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { Badge } from '@mother/components/Badge'
import type { Sprout, MusingSproutData, IdeaMusing } from '../../types'
import { NumberedIdeasMusing } from '../MusingsView/NumberedIdeasMusing'
import { WikipediaLinksMusing } from '../MusingsView/WikipediaLinksMusing'
import { MarkdownMusing } from '../MusingsView/MarkdownMusing'
import log from 'loglevel'
import './SproutDetail.css'

interface MusingSproutDetailProps {
  sprout: Sprout
  onUpdate: () => void
}

export function MusingSproutDetail({ sprout, onUpdate }: MusingSproutDetailProps) {
  const [dismissing, setDismissing] = useState(false)
  const [completing, setCompleting] = useState(false)
  const logMusingSprout = log.getLogger('MusingSproutDetail')

  const sproutData = sprout.sprout_data as MusingSproutData

  const handleDismiss = async () => {
    if (dismissing) return

    try {
      setDismissing(true)
      await api.dismissMusingSprout(sprout.id)
      onUpdate()
    } catch (err) {
      logMusingSprout.error('Error dismissing musing sprout', { sproutId: sprout.id, error: err })
      alert(err instanceof Error ? err.message : 'Failed to dismiss musing sprout')
    } finally {
      setDismissing(false)
    }
  }

  const handleComplete = async () => {
    if (completing) return

    try {
      setCompleting(true)
      await api.completeMusingSprout(sprout.id)
      onUpdate()
    } catch (err) {
      logMusingSprout.error('Error completing musing sprout', { sproutId: sprout.id, error: err })
      alert(err instanceof Error ? err.message : 'Failed to complete musing sprout')
    } finally {
      setCompleting(false)
    }
  }

  const renderMusingContent = () => {
    // Create a mock IdeaMusing object for the existing components
    const mockMusing: IdeaMusing = {
      id: sprout.id,
      seed_id: sprout.seed_id,
      template_type: sproutData.template_type,
      content: sproutData.content,
      created_at: sprout.created_at,
      dismissed: sproutData.dismissed,
      ...(sproutData.dismissed_at !== null && { dismissed_at: sproutData.dismissed_at }),
      completed: sproutData.completed,
      ...(sproutData.completed_at !== null && { completed_at: sproutData.completed_at }),
    }

    switch (sproutData.template_type) {
      case 'numbered_ideas':
        return <NumberedIdeasMusing musing={mockMusing} onUpdate={onUpdate} />
      case 'wikipedia_links':
        return <WikipediaLinksMusing musing={mockMusing} />
      case 'markdown':
        return <MarkdownMusing musing={mockMusing} />
      default:
        return <p className="text-secondary">Unknown template type</p>
    }
  }

  return (
    <Panel variant="elevated" className="sprout-detail-panel">
      <div className="sprout-detail-header">
        <div className="sprout-detail-info">
          <h3 className="panel-header">Musing</h3>
          {sproutData.dismissed && (
            <Badge variant="warning" className="sprout-dismissed-badge">
              Dismissed
            </Badge>
          )}
          {sproutData.completed && (
            <Badge variant="success" className="sprout-completed-badge">
              Completed
            </Badge>
          )}
        </div>
        {!sproutData.dismissed && !sproutData.completed && (
          <div className="sprout-detail-actions">
            <Button
              variant="ghost"
              icon={Check}
              onClick={handleComplete}
              disabled={completing}
              aria-label="Complete musing sprout"
              title="Complete musing sprout"
            />
            <Button
              variant="ghost"
              icon={X}
              onClick={handleDismiss}
              disabled={dismissing}
              aria-label="Dismiss musing sprout"
              title="Dismiss musing sprout"
            />
          </div>
        )}
      </div>
      <div className="sprout-detail-content">
        {renderMusingContent()}
      </div>
    </Panel>
  )
}

