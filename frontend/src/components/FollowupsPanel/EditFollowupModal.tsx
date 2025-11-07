import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@mother/components/Dialog'
import { Button } from '@mother/components/Button'
import type { Followup, EditFollowupDto } from '../../types'

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

  // Convert ISO string to datetime-local format
  const formatDateTimeLocal = (isoString: string): string => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  useEffect(() => {
    if (open && followup) {
      setDueTime(formatDateTimeLocal(followup.due_time))
      setMessage(followup.message)
      setError(null)
    }
  }, [open, followup])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!dueTime || !message.trim()) {
      setError('Both time and message are required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Convert datetime-local format to ISO string
      const dueDate = new Date(dueTime)
      if (isNaN(dueDate.getTime())) {
        setError('Invalid date format')
        return
      }

      const data: EditFollowupDto = {
        due_time: dueDate.toISOString(),
        message: message.trim(),
      }

      await api.editFollowup(followup.id, data)
      onUpdated()
      onOpenChange(false)
    } catch (err) {
      console.error('Error editing followup:', err)
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

