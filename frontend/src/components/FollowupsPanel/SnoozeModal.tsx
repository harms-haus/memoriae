import { useState } from 'react'
import { api } from '../../services/api'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@mother/components/Dialog'
import { Button } from '@mother/components/Button'
import type { Followup } from '../../types'
import { logger } from '../../utils/logger'

interface SnoozeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  followup: Followup
  onSnoozed: () => void
}

const DURATION_OPTIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: '1 day', minutes: 1440 },
]

export function SnoozeModal({
  open,
  onOpenChange,
  followup,
  onSnoozed,
}: SnoozeModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [customMinutes, setCustomMinutes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const log = logger.scope('SnoozeModal')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let durationMinutes: number

    if (selectedDuration !== null) {
      durationMinutes = selectedDuration
    } else if (customMinutes.trim()) {
      const parsed = parseInt(customMinutes, 10)
      if (isNaN(parsed) || parsed <= 0) {
        setError('Custom duration must be a positive number')
        return
      }
      durationMinutes = parsed
    } else {
      setError('Please select a duration or enter a custom duration')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await api.snoozeFollowup(followup.id, durationMinutes)
      onSnoozed()
      onOpenChange(false)
      
      // Reset form
      setSelectedDuration(null)
      setCustomMinutes('')
    } catch (err) {
      log.error('Error snoozing followup', { followupId: followup.id, error: err })
      setError(err instanceof Error ? err.message : 'Failed to snooze followup')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setSelectedDuration(null)
      setCustomMinutes('')
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} size="small">
      <DialogHeader title="Snooze Follow-up" onClose={handleClose} />
      <form onSubmit={handleSubmit}>
        <DialogBody>
          {error && <p className="text-error">{error}</p>}
          
          <div className="form-group">
            <label className="label">Duration</label>
            <div className="snooze-options">
              {DURATION_OPTIONS.map((option) => (
                <Button
                  key={option.minutes}
                  type="button"
                  variant={selectedDuration === option.minutes ? 'primary' : 'secondary'}
                  onClick={() => {
                    setSelectedDuration(option.minutes)
                    setCustomMinutes('')
                  }}
                  disabled={submitting}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="custom-duration" className="label">
              Or enter custom duration (minutes)
            </label>
            <input
              id="custom-duration"
              type="number"
              className="input"
              value={customMinutes}
              onChange={(e) => {
                setCustomMinutes(e.target.value)
                setSelectedDuration(null)
              }}
              placeholder="e.g., 90"
              min="1"
              disabled={submitting}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Snoozing...' : 'Snooze'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

