import { useState } from 'react'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Badge } from '@mother/components/Badge'
import { ExpandingPanel } from '@mother/components/ExpandingPanel'
import type { Followup } from '../../types'
import { EditFollowupModal } from './EditFollowupModal'
import { SnoozeModal } from './SnoozeModal'
import { FollowupTransactions } from './FollowupTransactions'
import './FollowupItem.css'

interface FollowupItemProps {
  followup: Followup
  onUpdate: () => void
}

export function FollowupItem({ followup, onUpdate }: FollowupItemProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 0) {
      return `Overdue by ${Math.abs(diffMins)}m`
    }
    if (diffMins < 60) {
      return `In ${diffMins}m`
    }
    if (diffHours < 24) {
      return `In ${diffHours}h`
    }
    if (diffDays < 7) {
      return `In ${diffDays}d`
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const handleDismiss = async () => {
    if (dismissing) return

    try {
      setDismissing(true)
      await api.dismissFollowup(followup.id, 'followup')
      onUpdate()
    } catch (err) {
      console.error('Error dismissing followup:', err)
      alert(err instanceof Error ? err.message : 'Failed to dismiss followup')
    } finally {
      setDismissing(false)
    }
  }

  const handleSnooze = async () => {
    await onUpdate()
    setSnoozeModalOpen(false)
  }

  const handleEdit = async () => {
    await onUpdate()
    setEditModalOpen(false)
  }

  return (
    <>
      <div className={`followup-item ${followup.dismissed ? 'followup-item-dismissed' : ''}`}>
        <div className="followup-item-header">
          <div className="followup-item-info">
            <div className="followup-item-time">
              {formatDate(followup.due_time)}
              {followup.dismissed && (
                <Badge variant="warning" className="followup-dismissed-badge">
                  Dismissed
                </Badge>
              )}
            </div>
            <div className="followup-item-message">{followup.message}</div>
          </div>
          {!followup.dismissed && (
            <div className="followup-item-actions">
              <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
                Edit
              </Button>
              <Button variant="secondary" onClick={() => setSnoozeModalOpen(true)}>
                Snooze
              </Button>
              <Button variant="secondary" onClick={handleDismiss} disabled={dismissing}>
                {dismissing ? 'Dismissing...' : 'Dismiss'}
              </Button>
            </div>
          )}
        </div>

        <ExpandingPanel
          variant="elevated"
          title="Transaction History"
          className="followup-transactions-panel"
          defaultExpanded={false}
        >
          <FollowupTransactions transactions={followup.transactions} />
        </ExpandingPanel>
      </div>

      <EditFollowupModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        followup={followup}
        onUpdated={handleEdit}
      />

      <SnoozeModal
        open={snoozeModalOpen}
        onOpenChange={setSnoozeModalOpen}
        followup={followup}
        onSnoozed={handleSnooze}
      />
    </>
  )
}

