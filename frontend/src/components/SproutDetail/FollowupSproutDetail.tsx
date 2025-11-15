import { useState, useEffect } from 'react'
import { Edit, Clock, X } from 'lucide-react'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Badge } from '@mother/components/Badge'
import { Panel } from '@mother/components/Panel'
import { ExpandingPanel } from '@mother/components/ExpandingPanel'
import type { Sprout, FollowupSproutState } from '../../types'
import { useUserSettings } from '../../hooks/useUserSettings'
import { formatDateInTimezone, getBrowserTimezone } from '../../utils/timezone'
import log from 'loglevel'
import './SproutDetail.css'

interface FollowupSproutDetailProps {
  sprout: Sprout
  onUpdate: () => void
}

export function FollowupSproutDetail({ sprout, onUpdate }: FollowupSproutDetailProps) {
  const [state, setState] = useState<FollowupSproutState | null>(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const { settings } = useUserSettings()
  const logFollowupSprout = log.getLogger('FollowupSproutDetail')

  useEffect(() => {
    loadState()
  }, [sprout.id])

  const loadState = async () => {
    try {
      setLoading(true)
      // Get sprout state from API
      // The state is computed on the backend when we call edit/dismiss/snooze endpoints
      // For now, we'll compute initial state from sprout data
      const sproutData = sprout.sprout_data as { initial_time: string; initial_message: string }
      const initialState: FollowupSproutState = {
        due_time: sproutData.initial_time,
        message: sproutData.initial_message,
        dismissed: false,
        transactions: [],
      }
      setState(initialState)
      setLoading(false)
    } catch (err) {
      logFollowupSprout.error('Error loading followup sprout state', { sproutId: sprout.id, error: err })
      setLoading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const userTimezone = settings?.timezone || getBrowserTimezone()
    return formatDateInTimezone(dateString, userTimezone)
  }

  const handleDismiss = async () => {
    if (dismissing) return

    try {
      setDismissing(true)
      const newState = await api.dismissFollowupSprout(sprout.id, { type: 'followup' })
      setState(newState)
      onUpdate()
    } catch (err) {
      logFollowupSprout.error('Error dismissing followup sprout', { sproutId: sprout.id, error: err })
      alert(err instanceof Error ? err.message : 'Failed to dismiss followup sprout')
    } finally {
      setDismissing(false)
    }
  }

  const handleSnooze = async (durationMinutes: number) => {
    try {
      const newState = await api.snoozeFollowupSprout(sprout.id, { duration_minutes: durationMinutes })
      setState(newState)
      onUpdate()
      setSnoozeModalOpen(false)
    } catch (err) {
      logFollowupSprout.error('Error snoozing followup sprout', { sproutId: sprout.id, error: err })
      alert(err instanceof Error ? err.message : 'Failed to snooze followup sprout')
    }
  }

  // TODO: Implement edit modal with handleEdit function
  // const handleEdit = async (dueTime: string, message: string) => {
  //   try {
  //     const newState = await api.editFollowupSprout(sprout.id, {
  //       due_time: dueTime,
  //       message,
  //     })
  //     setState(newState)
  //     onUpdate()
  //     setEditModalOpen(false)
  //   } catch (err) {
  //     logFollowupSprout.error('Error editing followup sprout', { sproutId: sprout.id, error: err })
  //     alert(err instanceof Error ? err.message : 'Failed to edit followup sprout')
  //   }
  // }

  // For MVP, compute basic state from sprout data
  // In the future, we should fetch computed state from backend
  const sproutData = sprout.sprout_data as { initial_time: string; initial_message: string }
  const displayState: FollowupSproutState = state || {
    due_time: sproutData.initial_time,
    message: sproutData.initial_message,
    dismissed: false,
    transactions: [],
  }

  if (loading) {
    return (
      <Panel variant="elevated">
        <p className="text-secondary">Loading followup sprout...</p>
      </Panel>
    )
  }

  return (
    <Panel variant="elevated" className="sprout-detail-panel">
      <div className="sprout-detail-header">
        <div className="sprout-detail-info">
          <div className="sprout-detail-time">
            {formatDate(displayState.due_time)}
            {displayState.dismissed && (
              <Badge variant="warning" className="sprout-dismissed-badge">
                Dismissed
              </Badge>
            )}
          </div>
          <div className="sprout-detail-message">{displayState.message}</div>
        </div>
        {!displayState.dismissed && (
          <div className="sprout-detail-actions">
            <Button
              variant="ghost"
              icon={Edit}
              onClick={() => setEditModalOpen(true)}
              aria-label="Edit follow-up sprout"
              title="Edit follow-up sprout"
            />
            <Button
              variant="ghost"
              icon={Clock}
              onClick={() => setSnoozeModalOpen(true)}
              aria-label="Snooze follow-up sprout"
              title="Snooze follow-up sprout"
            />
            <Button
              variant="ghost"
              icon={X}
              onClick={handleDismiss}
              disabled={dismissing}
              aria-label="Dismiss follow-up sprout"
              title={dismissing ? "Dismissing..." : "Dismiss follow-up sprout"}
            />
          </div>
        )}
      </div>

      {displayState.transactions.length > 0 && (
        <ExpandingPanel
          variant="elevated"
          title="Transaction History"
          className="sprout-transactions-panel"
          defaultExpanded={false}
        >
          <div className="sprout-transactions">
            {displayState.transactions.map((transaction) => (
              <div key={transaction.id} className="sprout-transaction">
                <div className="sprout-transaction-type">{transaction.transaction_type}</div>
                <div className="sprout-transaction-time">{formatDate(transaction.created_at)}</div>
              </div>
            ))}
          </div>
        </ExpandingPanel>
      )}

      {/* Edit and Snooze modals would go here - simplified for MVP */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Follow-up</h3>
            <p className="text-secondary">Edit modal implementation needed</p>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {snoozeModalOpen && (
        <div className="modal-overlay" onClick={() => setSnoozeModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Snooze Follow-up</h3>
            <div className="snooze-options">
              <Button variant="primary" onClick={() => handleSnooze(60)}>
                1 hour
              </Button>
              <Button variant="primary" onClick={() => handleSnooze(1440)}>
                1 day
              </Button>
              <Button variant="primary" onClick={() => handleSnooze(10080)}>
                1 week
              </Button>
            </div>
            <Button variant="secondary" onClick={() => setSnoozeModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}

