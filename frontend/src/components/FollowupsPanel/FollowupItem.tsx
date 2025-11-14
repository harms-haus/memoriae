import { useState } from 'react'
import { Edit, Clock, X } from 'lucide-react'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Badge } from '@mother/components/Badge'
import { ExpandingPanel } from '@mother/components/ExpandingPanel'
import type { Followup } from '../../types'
import { EditFollowupModal } from './EditFollowupModal'
import { SnoozeModal } from './SnoozeModal'
import { FollowupTransactions } from './FollowupTransactions'
import { useUserSettings } from '../../hooks/useUserSettings'
import { formatDateInTimezone, getBrowserTimezone } from '../../utils/timezone'
import log from 'loglevel'
import './FollowupItem.css'

interface FollowupItemProps {
  followup: Followup
  onUpdate: () => void
}

export function FollowupItem({ followup, onUpdate }: FollowupItemProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const { settings } = useUserSettings()
  const logFollowupItem = log.getLogger('FollowupItem')

  const formatDate = (dateString: string): string => {
    const userTimezone = settings?.timezone || getBrowserTimezone()
    return formatDateInTimezone(dateString, userTimezone)
  }

  const handleDismiss = async () => {
    if (dismissing) return

    try {
      setDismissing(true)
      await api.dismissFollowup(followup.id, 'followup')
      onUpdate()
    } catch (err) {
      logFollowupItem.error('Error dismissing followup', { followupId: followup.id, error: err })
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
              <Button 
                variant="ghost" 
                icon={Edit} 
                onClick={() => setEditModalOpen(true)}
                aria-label="Edit follow-up"
                title="Edit follow-up"
                className="followup-action-button"
              />
              <Button 
                variant="ghost" 
                icon={Clock} 
                onClick={() => setSnoozeModalOpen(true)}
                aria-label="Snooze follow-up"
                title="Snooze follow-up"
                className="followup-action-button"
              />
              <Button 
                variant="ghost" 
                icon={X} 
                onClick={handleDismiss} 
                disabled={dismissing}
                aria-label="Dismiss follow-up"
                title={dismissing ? "Dismissing..." : "Dismiss follow-up"}
                className="followup-action-button"
              />
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

