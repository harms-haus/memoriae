import { useState } from 'react'
import { api } from '../../services/api'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@mother/components/Dialog'
import { Button } from '@mother/components/Button'
import type { CreateFollowupDto } from '../../types'

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

  // Set default due time to 1 hour from now
  const getDefaultDueTime = (): string => {
    const date = new Date()
    date.setHours(date.getHours() + 1)
    return date.toISOString().slice(0, 16) // Format for datetime-local input
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

      // Convert datetime-local format to ISO string
      const dueDate = new Date(dueTime)
      if (isNaN(dueDate.getTime())) {
        setError('Invalid date format')
        return
      }

      const data: CreateFollowupDto = {
        due_time: dueDate.toISOString(),
        message: message.trim(),
      }

      await api.createFollowup(seedId, data)
      onCreated()
      
      // Reset form
      setDueTime('')
      setMessage('')
    } catch (err) {
      console.error('Error creating followup:', err)
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

