import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import type { Sprout } from '../../types'
import { FollowupSproutDetail } from '../SproutDetail/FollowupSproutDetail'
import { MusingSproutDetail } from '../SproutDetail/MusingSproutDetail'
import log from 'loglevel'
import './Views.css'
import './SproutDetailView.css'

const logSproutDetail = log.getLogger('SproutDetailView')

interface SproutDetailViewProps {
  sproutId: string
  onBack?: () => void
}

export function SproutDetailView({ sproutId, onBack }: SproutDetailViewProps) {
  const navigate = useNavigate()
  const [sprout, setSprout] = useState<Sprout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSprout()
  }, [sproutId])

  const loadSprout = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getSproutById(sproutId)
      setSprout(data)
    } catch (err) {
      logSproutDetail.error('Error loading sprout', { sproutId, error: err })
      setError(err instanceof Error ? err.message : 'Failed to load sprout')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      // Check if we can go back in history
      if (window.history.length > 1) {
        navigate(-1)
      } else {
        // Fallback if no history
        navigate('/seeds')
      }
    }
  }

  if (loading) {
    return (
      <div className="view-container">
        <Panel>
          <p>Loading sprout...</p>
        </Panel>
      </div>
    )
  }

  if (error) {
    return (
      <div className="view-container">
        <Panel>
          <p className="text-error">{error}</p>
          <Button variant="secondary" onClick={handleBack}>
            Back
          </Button>
        </Panel>
      </div>
    )
  }

  if (!sprout) {
    return (
      <div className="view-container">
        <Panel>
          <p className="text-error">Sprout not found</p>
          <Button variant="secondary" onClick={handleBack}>
            Back
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="view-container sprout-detail-view">
      <div className="sprout-detail-header">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <h2>Sprout Details</h2>
      </div>

      <div className="sprout-detail-content">
        {sprout.sprout_type === 'followup' && (
          <FollowupSproutDetail sprout={sprout} onUpdate={loadSprout} />
        )}
        {sprout.sprout_type === 'musing' && (
          <MusingSproutDetail sprout={sprout} onUpdate={loadSprout} />
        )}
        {(sprout.sprout_type === 'extra_context' || sprout.sprout_type === 'fact_check') && (
          <Panel variant="elevated">
            <h3 className="panel-header">Sprout Type: {sprout.sprout_type}</h3>
            <p className="text-secondary">This sprout type is not yet implemented.</p>
          </Panel>
        )}
      </div>
    </div>
  )
}

