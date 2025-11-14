import { useState } from 'react'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@mother/components/Dialog'
import type { IdeaMusing } from '../../types'
import log from 'loglevel'
import './PromptLLMModal.css'

interface PromptLLMModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  musing: IdeaMusing
  onApplied: () => void
}

export function PromptLLMModal({
  open,
  onOpenChange,
  musing,
  onApplied,
}: PromptLLMModalProps) {
  const [prompt, setPrompt] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logPromptLLM = log.getLogger('PromptLLMModal')

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    try {
      setGenerating(true)
      setError(null)
      const result = await api.promptLLM(musing.id, prompt.trim(), false)
      if (result.preview) {
        setPreview(result.preview)
      } else {
        setError('Failed to generate response')
      }
    } catch (err) {
      logPromptLLM.error('Error generating response', { musingId: musing.id, error: err })
      setError(err instanceof Error ? err.message : 'Failed to generate response')
    } finally {
      setGenerating(false)
    }
  }

  const handleApply = async () => {
    if (!prompt.trim()) {
      setError('Please generate a preview first')
      return
    }

    if (!preview) {
      return
    }

    try {
      setApplying(true)
      setError(null)
      await api.promptLLM(musing.id, prompt.trim(), true)
      onApplied()
      onOpenChange(false)
    } catch (err) {
      logPromptLLM.error('Error applying response', { musingId: musing.id, error: err })
      setError(err instanceof Error ? err.message : 'Failed to apply response')
    } finally {
      setApplying(false)
    }
  }

  const handleClose = () => {
    setPrompt('')
    setPreview(null)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader title="Custom Prompt" onClose={handleClose} />
      <DialogBody>
        <div className="prompt-llm-modal">
          <div className="prompt-section">
            <label htmlFor="prompt-input" className="label">Enter your prompt:</label>
            <textarea
              id="prompt-input"
              className="textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a custom prompt to enhance this seed..."
              rows={4}
            />
          </div>

          {!preview && !generating && (
            <div className="generate-section">
              <Button variant="primary" onClick={handleGenerate} disabled={!prompt.trim()}>
                Generate
              </Button>
            </div>
          )}

          {generating && (
            <div className="generate-section">
              <p className="text-secondary">Generating response...</p>
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

