import { useState } from 'react'
import { api } from '../../services/api'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@mother/components/Dialog'
import { Button } from '@mother/components/Button'
import type { CreateFollowupDto } from '../../types'
import { useUserSettings } from '../../hooks/useUserSettings'
import { DateTime } from 'luxon'
import { dateTimeLocalToUTC, getBrowserTimezone } from '../../utils/timezone'
import { logger } from '../../utils/logger'

interface CreateFollowupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  seedId: string
  onCreated: () => void
}

export function CreateFollowupModal({
  open,
  onOpenChange,
  seedId,
  onCreated,
}: CreateFollowupModalProps) {
  const [dueTime, setDueTime] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { settings } = useUserSettings()
  const log = logger.scope('CreateFollowupModal')

  // Set default due time to 1 hour from now in user's timezone
  const getDefaultDueTime = (): string => {
    const userTimezone = settings?.timezone || getBrowserTimezone()
    const dt = DateTime.now().setZone(userTimezone).plus({ hours: 1 })
    return dt.toFormat('yyyy-MM-dd\'T\'HH:mm')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!dueTime || !message.trim()) {
      setError('Both time and message are required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Convert datetime-local format (in user's timezone) to UTC ISO string
      const userTimezone = settings?.timezone || getBrowserTimezone()
      let utcISO: string
      
      try {
        utcISO = dateTimeLocalToUTC(dueTime, userTimezone)
      } catch (err) {
        setError('Invalid date format')
        return
      }

      const data: CreateFollowupDto = {
        due_time: utcISO,
        message: message.trim(),
      }

      await api.createFollowup(seedId, data)
      onCreated()
      
      // Reset form
      setDueTime('')
      setMessage('')
    } catch (err) {
      log.error('Error creating followup', { seedId, error: err })
      setError(err instanceof Error ? err.message : 'Failed to create followup')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setDueTime('')
      setMessage('')
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader title="Create Follow-up" onClose={handleClose} />
      <form onSubmit={handleSubmit}>
        <DialogBody>
          {error && <p className="text-error">{error}</p>}
          
          <div className="form-group">
            <label htmlFor="due-time" className="label">
              Due Time
            </label>
            <input
              id="due-time"
              type="datetime-local"
              className="input"
              value={dueTime || getDefaultDueTime()}
              onChange={(e) => setDueTime(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="message" className="label">
              Message
            </label>
            <textarea
              id="message"
              className="textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why is this follow-up needed?"
              required
              disabled={submitting}
              rows={4}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

