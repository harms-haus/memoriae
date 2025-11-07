import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Panel } from '@mother/components/Panel'
import { Button } from '@mother/components/Button'
import type { Followup } from '../../types'
import { FollowupItem } from './FollowupItem'
import { CreateFollowupModal } from './CreateFollowupModal'
import './FollowupsPanel.css'

interface FollowupsPanelProps {
  seedId: string
}

export function FollowupsPanel({ seedId }: FollowupsPanelProps) {
  const [followups, setFollowups] = useState<Followup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    loadFollowups()
  }, [seedId])

  const loadFollowups = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getFollowups(seedId)
      setFollowups(data)
    } catch (err) {
      console.error('Error loading followups:', err)
      setError(err instanceof Error ? err.message : 'Failed to load followups')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    await loadFollowups()
    setCreateModalOpen(false)
  }

  if (loading) {
    return (
      <Panel variant="elevated" className="followups-panel">
        <h3 className="panel-header">Follow-ups</h3>
        <p className="text-secondary">Loading follow-ups...</p>
      </Panel>
    )
  }

  if (error) {
    return (
      <Panel variant="elevated" className="followups-panel">
        <h3 className="panel-header">Follow-ups</h3>
        <p className="text-error">{error}</p>
        <Button variant="secondary" onClick={loadFollowups}>
          Retry
        </Button>
      </Panel>
    )
  }

  return (
    <>
      <Panel variant="elevated" className="followups-panel">
        <div className="followups-panel-header">
          <h3 className="panel-header">Follow-ups</h3>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            Create Follow-up
          </Button>
        </div>

        {followups.length === 0 ? (
          <p className="text-secondary">No follow-ups yet.</p>
        ) : (
          <div className="followups-list">
            {followups.map((followup) => (
              <FollowupItem
                key={followup.id}
                followup={followup}
                onUpdate={loadFollowups}
              />
            ))}
          </div>
        )}
      </Panel>

      <CreateFollowupModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        seedId={seedId}
        onCreated={handleCreate}
      />
    </>
  )
}

