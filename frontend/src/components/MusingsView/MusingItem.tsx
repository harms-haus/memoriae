import { useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { SeedView } from '../SeedView'
import type { IdeaMusing } from '../../types'
import { NumberedIdeasMusing } from './NumberedIdeasMusing'
import { WikipediaLinksMusing } from './WikipediaLinksMusing'
import { MarkdownMusing } from './MarkdownMusing'
import log from 'loglevel'
import './MusingItem.css'

interface MusingItemProps {
  musing: IdeaMusing
  onUpdate: () => void
  tagColors?: Map<string, string>
}

export function MusingItem({ musing, onUpdate, tagColors }: MusingItemProps) {
  const [dismissing, setDismissing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const logMusingItem = log.getLogger('MusingItem')

  const handleDismiss = async () => {
    if (dismissing) return

    try {
      setDismissing(true)
      await api.dismissMusing(musing.id)
      onUpdate()
    } catch (err) {
      logMusingItem.error('Error dismissing musing', { musingId: musing.id, error: err })
      alert(err instanceof Error ? err.message : 'Failed to dismiss musing')
    } finally {
      setDismissing(false)
    }
  }

  const handleRegenerate = async () => {
    if (regenerating) return

    try {
      setRegenerating(true)
      await api.regenerateMusing(musing.id)
      onUpdate()
    } catch (err) {
      logMusingItem.error('Error regenerating musing', { musingId: musing.id, error: err })
      alert(err instanceof Error ? err.message : 'Failed to regenerate musing')
    } finally {
      setRegenerating(false)
    }
  }

  const renderMusingContent = () => {
    switch (musing.template_type) {
      case 'numbered_ideas':
        return <NumberedIdeasMusing musing={musing} onUpdate={onUpdate} />
      case 'wikipedia_links':
        return <WikipediaLinksMusing musing={musing} />
      case 'markdown':
        return <MarkdownMusing musing={musing} />
      default:
        return <p className="text-secondary">Unknown template type</p>
    }
  }

  if (!musing.seed) {
    return null
  }

  return (
    <Panel variant="elevated" className="musing-item">
      <div className="musing-item-header">
        <div className="musing-item-seed">
          <SeedView
            seed={musing.seed}
            tagColors={tagColors ?? new Map()}
          />
        </div>
        <div className="musing-item-actions">
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={handleRegenerate}
            disabled={regenerating}
            aria-label="Regenerate musing"
            title="Regenerate musing"
          />
          <Button
            variant="ghost"
            icon={X}
            onClick={handleDismiss}
            disabled={dismissing}
            aria-label="Dismiss musing"
            title="Dismiss musing"
          />
        </div>
      </div>
      <div className="musing-item-content">
        {renderMusingContent()}
      </div>
    </Panel>
  )
}

