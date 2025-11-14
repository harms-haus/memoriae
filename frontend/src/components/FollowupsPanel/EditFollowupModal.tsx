import { useState, useEffect, useRef } from 'react'
import { api } from '../../services/api'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@mother/components/Dialog'
import { Button } from '@mother/components/Button'
import type { Followup, EditFollowupDto } from '../../types'
import { useUserSettings } from '../../hooks/useUserSettings'
import { dateTimeLocalToUTC, utcToDateTimeLocal, getBrowserTimezone } from '../../utils/timezone'
import { logger } from '../../utils/logger'

interface EditFollowupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  followup: Followup
  onUpdated: () => void
}

export function EditFollowupModal({
  open,
  onOpenChange,
  followup,
  onUpdated,
}: EditFollowupModalProps) {
  const [dueTime, setDueTime] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { settings } = useUserSettings()
  const timezone = settings?.timezone ?? undefined
  const log = logger.scope('EditFollowupModal')
  const prevOpenRef = useRef(false)
  const prevFollowupIdRef = useRef<string | undefined>(undefined)
  const prevFollowupDueTimeRef = useRef<string | undefined>(undefined)
  const prevFollowupMessageRef = useRef<string | undefined>(undefined)
  const prevTimezoneRef = useRef<string | undefined>(undefined)
  const dueTimeRef = useRef<HTMLInputElement | null>(null)
  const messageRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!open || !followup) {
      prevOpenRef.current = false
      return
    }

    const justOpened = !prevOpenRef.current
    const followupChanged = prevFollowupIdRef.current !== followup.id
    const followupDataChanged =
      prevFollowupDueTimeRef.current !== followup.due_time ||
      prevFollowupMessageRef.current !== followup.message
    const timezoneChanged = prevTimezoneRef.current !== timezone
    const shouldReset =
      justOpened || followupChanged || followupDataChanged || timezoneChanged

    if (!shouldReset) {
      return
    }

    const userTimezone = timezone || getBrowserTimezone()

    try {
      const localDateTime = utcToDateTimeLocal(followup.due_time, userTimezone)
      setDueTime(localDateTime)
    } catch (err) {
      log.warn('Error formatting followup date', { followupId: followup.id, error: err })
      setDueTime('')
    }

    setMessage(followup.message)
    setError(null)

    prevOpenRef.current = true
    prevFollowupIdRef.current = followup.id
    prevFollowupDueTimeRef.current = followup.due_time
    prevFollowupMessageRef.current = followup.message
    prevTimezoneRef.current = timezone
  }, [open, followup?.id, followup?.due_time, followup?.message, timezone])

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
      const dueTimeValue = dueTimeRef.current?.value ?? dueTime
      const messageValue = messageRef.current?.value ?? message
      let utcISO: string
      
      try {
        utcISO = dateTimeLocalToUTC(dueTimeValue, userTimezone)
      } catch (err) {
        setError('Invalid date format')
        return
      }

      const data: EditFollowupDto = {
        due_time: utcISO,
        message: messageValue.trim(),
      }

      await api.editFollowup(followup.id, data)
      onUpdated()
      onOpenChange(false)
    } catch (err) {
      log.error('Error editing followup', { followupId: followup.id, error: err })
      setError(err instanceof Error ? err.message : 'Failed to edit followup')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader title="Edit Follow-up" onClose={handleClose} />
      <form onSubmit={handleSubmit}>
        <DialogBody>
          {error && <p className="text-error">{error}</p>}
          
          <div className="form-group">
            <label htmlFor="edit-due-time" className="label">
              Due Time
            </label>
            <input
              id="edit-due-time"
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
            <label htmlFor="edit-message" className="label">
              Message
            </label>
            <textarea
              id="edit-message"
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
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

