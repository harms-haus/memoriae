import { useState, useEffect, useRef } from 'react'
import { api } from '../../services/api'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@mother/components/Dialog'
import { Button } from '@mother/components/Button'
import type { CreateFollowupDto } from '../../types'
import { useUserSettings } from '../../hooks/useUserSettings'
import { DateTime } from 'luxon'
import { dateTimeLocalToUTC, getBrowserTimezone } from '../../utils/timezone'
import log from 'loglevel'

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
  const { settings } = useUserSettings()
  const logCreateFollowup = log.getLogger('CreateFollowupModal')
  const timezone = settings?.timezone ?? undefined
  const prevOpenRef = useRef(false)
  const prevTimezoneRef = useRef<string | undefined>(undefined)

  // Set default due time to 1 hour from now in user's timezone
  const getDefaultDueTime = (tz?: string): string => {
    const userTimezone = tz || getBrowserTimezone()
    const dt = DateTime.now().setZone(userTimezone).plus({ hours: 1 })
    return dt.toFormat('yyyy-MM-dd\'T\'HH:mm')
  }

  const [dueTime, setDueTime] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dueTimeRef = useRef<HTMLInputElement | null>(null)
  const messageRef = useRef<HTMLTextAreaElement | null>(null)

  // Initialize dueTime with default when modal opens
  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false
      return
    }

    const justOpened = !prevOpenRef.current
    const timezoneChanged = prevTimezoneRef.current !== timezone

    if (!justOpened && !timezoneChanged) {
      return
    }

    const defaultTime = getDefaultDueTime(timezone)
    setDueTime(defaultTime)
    setMessage('')
    setError(null)

    prevOpenRef.current = true
    prevTimezoneRef.current = timezone
  }, [open, timezone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const dueTimeValue = dueTimeRef.current?.value ?? dueTime
    const messageValue = messageRef.current?.value ?? message

    if (!dueTimeValue || !messageValue.trim()) {
      setError('Both time and message are required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Convert datetime-local format (in user's timezone) to UTC ISO string
      const userTimezone = timezone || getBrowserTimezone()
      let utcISO: string
      
      try {
        utcISO = dateTimeLocalToUTC(dueTimeValue, userTimezone)
      } catch (err) {
        setError('Invalid date format')
        return
      }

      const data: CreateFollowupDto = {
        due_time: utcISO,
        message: messageValue.trim(),
      }

      await api.createFollowup(seedId, data)
      onCreated()
      
      // Reset form to default values
      const defaultTime = getDefaultDueTime(timezone)
      setDueTime(defaultTime)
      setMessage('')
    } catch (err) {
      logCreateFollowup.error('Error creating followup', { seedId, error: err })
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
              ref={dueTimeRef}
              value={dueTime}
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
              ref={messageRef}
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

