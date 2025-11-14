import { useState } from 'react'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@mother/components/Dialog'
import type { IdeaMusing } from '../../types'
import log from 'loglevel'
import './ApplyIdeaModal.css'

interface ApplyIdeaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  musing: IdeaMusing
  ideaIndex: number
  onApplied: () => void
}

export function ApplyIdeaModal({
  open,
  onOpenChange,
  musing,
  ideaIndex,
  onApplied,
}: ApplyIdeaModalProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logApplyIdea = log.getLogger('ApplyIdeaModal')

  const handleGeneratePreview = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.applyIdea(musing.id, ideaIndex, false)
      if (result.preview) {
        setPreview(result.preview)
      } else {
        setError('Failed to generate preview')
      }
    } catch (err) {
      logApplyIdea.error('Error generating preview', { musingId: musing.id, ideaIndex, error: err })
      setError(err instanceof Error ? err.message : 'Failed to generate preview')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!preview) {
      // Generate preview first if not already generated
      await handleGeneratePreview()
      return
    }

    try {
      setApplying(true)
      setError(null)
      await api.applyIdea(musing.id, ideaIndex, true)
      onApplied()
      onOpenChange(false)
    } catch (err) {
      logApplyIdea.error('Error applying idea', { musingId: musing.id, ideaIndex, error: err })
      setError(err instanceof Error ? err.message : 'Failed to apply idea')
    } finally {
      setApplying(false)
    }
  }

  const handleClose = () => {
    setPreview(null)
    setError(null)
    onOpenChange(false)
  }

  const content = musing.content as { ideas: string[] }
  const idea = content.ideas[ideaIndex]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader title="Apply Idea" onClose={handleClose} />
      <DialogBody>
        <div className="apply-idea-modal">
          <div className="idea-preview-section">
            <h3>Idea:</h3>
            <p className="idea-text">{idea}</p>
          </div>

          {!preview && !loading && (
            <div className="preview-section">
              <Button variant="primary" onClick={handleGeneratePreview}>
                Generate Preview
              </Button>
            </div>
          )}

          {loading && (
            <div className="preview-section">
              <p className="text-secondary">Generating preview...</p>
            </div>
          )}

          {preview && (
            <div className="preview-section">
              <h3>Preview:</h3>
              <div className="preview-content">
                <pre className="preview-text">{preview}</pre>
              </div>
            </div>
          )}

          {error && (
            <div className="error-section">
              <p className="text-error">{error}</p>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        {preview && (
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? 'Applying...' : 'Apply'}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  )
}

