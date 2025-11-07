import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Maximize2, Minimize2, Send } from 'lucide-react'
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@mother/components/Dialog'
import { Button } from '@mother/components/Button'
import { api } from '../../services/api'
import type { Seed } from '../../types'
import './SeedComposer.css'

export interface SeedComposerProps {
  onSeedCreated?: (seed: Seed) => void
  onClose: () => void
  isClosing?: boolean
}

type ViewMode = 'small' | 'medium' | 'zen'

export function SeedComposer({ onSeedCreated, onClose, isClosing = false }: SeedComposerProps) {
  const [content, setContent] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('medium')
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollPositionRef = useRef<number>(0)

  // Check if content has text (non-whitespace)
  const hasText = content.trim().length > 0

  // Focus textarea when switching to medium or zen mode
  useEffect(() => {
    if ((viewMode === 'medium' || viewMode === 'zen') && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [viewMode])

  // Add/remove zen mode body class
  useEffect(() => {
    if (viewMode === 'zen') {
      document.body.classList.add('zen-mode-active')
    } else {
      document.body.classList.remove('zen-mode-active')
    }
    return () => {
      document.body.classList.remove('zen-mode-active')
    }
  }, [viewMode])

  // Handle blur in medium view - use timeout to allow button clicks to register
  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Check if the new focus target is within the composer container
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (relatedTarget && containerRef.current?.contains(relatedTarget)) {
      // Focus is moving to a button within the composer, don't handle blur
      return
    }

    // Delay blur handling to allow button clicks to register
    blurTimeoutRef.current = setTimeout(() => {
      if (viewMode === 'medium') {
        if (hasText) {
          // Shrink to smallview
          setViewMode('small')
        } else {
          // Close composer
          onClose()
        }
      }
    }, 150)
  }, [viewMode, hasText, onClose])

  // Clear blur timeout on focus and handle smallview -> mediumview transition
  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    if (viewMode === 'small') {
      setViewMode('medium')
    }
  }, [viewMode])

  // Cleanup blur timeout
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  // Handle close button click
  const handleCloseClick = useCallback(() => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }

    if (viewMode === 'zen') {
      // In zen mode, check if we need confirmation
      if (hasText) {
        setShowConfirmDialog(true)
      } else {
        // Close immediately if no text
        onClose()
      }
    } else if (viewMode === 'medium') {
      // In medium view, check if we need confirmation
      if (hasText) {
        setShowConfirmDialog(true)
      } else {
        // Close immediately if no text
        onClose()
      }
    }
  }, [viewMode, hasText, onClose])

  // Handle maximize button (medium -> zen)
  const handleMaximize = useCallback(() => {
    // Clear blur timeout when clicking maximize
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setViewMode('zen')
  }, [])

  // Handle minimize button (zen -> medium)
  const handleMinimize = useCallback(() => {
    setViewMode('medium')
  }, [])

  // Handle confirmation dialog
  const handleConfirmClose = useCallback(() => {
    setShowConfirmDialog(false)
    onClose()
  }, [onClose])

  const handleCancelClose = useCallback(() => {
    setShowConfirmDialog(false)
    // Refocus textarea after canceling
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Handle content change
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }, [])

  // Create seed
  const handleCreateSeed = useCallback(async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      const seed = await api.post<Seed>('/seeds', { content: trimmedContent })
      onSeedCreated?.(seed)
      // Clear content and close
      setContent('')
      onClose()
    } catch (error) {
      console.error('Failed to create seed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [content, isSaving, onSeedCreated, onClose])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleCreateSeed()
    }
    // Escape to close (only in zen mode)
    if (e.key === 'Escape' && viewMode === 'zen') {
      handleCloseClick()
    }
  }, [viewMode, handleCreateSeed, handleCloseClick])

  // Auto-resize textarea and preserve scroll position during transitions
  useEffect(() => {
    if (textareaRef.current) {
      // Save scroll position before transition
      scrollPositionRef.current = textareaRef.current.scrollTop
      
      // Use requestAnimationFrame to ensure smooth transition
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          if (viewMode === 'small') {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.minHeight = '40px'
          } else if (viewMode === 'medium') {
            textareaRef.current.style.height = '300px'
          } else if (viewMode === 'zen') {
            textareaRef.current.style.height = '100%'
          }
          
          // Restore scroll position after transition starts
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.scrollTop = scrollPositionRef.current
            }
          })
        }
      })
    }
  }, [viewMode])

  // Prevent closing when clicking inside the composer
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Prevent blur when clicking buttons
  const handleButtonMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const isZenMode = viewMode === 'zen'
  const isMediumMode = viewMode === 'medium'
  const isSmallMode = viewMode === 'small'

  return (
    <>
      {/* Zen mode overlay */}
      {isZenMode && (
        <div className="seed-composer-zen-overlay active">
          <div className="seed-composer-zen-content">
            <div
              ref={containerRef}
              className="seed-composer-container"
              onClick={handleContainerClick}
            >
              {/* Header with minimize and close buttons */}
              <div className="seed-composer-header">
                <button
                  className="seed-composer-zen-button"
                  onClick={handleMinimize}
                  onMouseDown={handleButtonMouseDown}
                  aria-label="Minimize"
                  type="button"
                >
                  <Minimize2 size={20} />
                </button>
                <button
                  className="seed-composer-close-button"
                  onClick={handleCloseClick}
                  onMouseDown={handleButtonMouseDown}
                  aria-label="Close"
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Editor */}
              <textarea
                ref={textareaRef}
                className="seed-composer-editor"
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder="Write your seed..."
                style={{
                  height: '100%',
                  fontSize: 'var(--text-xl)',
                }}
              />

              {/* Submit button */}
              <button
                className="seed-composer-submit"
                onClick={handleCreateSeed}
                onMouseDown={handleButtonMouseDown}
                disabled={!hasText || isSaving}
                aria-label="Submit"
                type="button"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medium and Small view */}
      {!isZenMode && (
        <div
          ref={containerRef}
          className={`seed-composer-container ${isClosing ? 'seed-composer-closing' : ''} ${isSmallMode ? 'seed-composer-minimized' : ''}`}
          onClick={handleContainerClick}
        >
          {/* Header - only show in medium mode */}
          {isMediumMode && (
            <div className="seed-composer-header">
              <button
                className="seed-composer-zen-button"
                onClick={handleMaximize}
                onMouseDown={handleButtonMouseDown}
                aria-label="Maximize"
                type="button"
              >
                <Maximize2 size={20} />
              </button>
              <button
                className="seed-composer-close-button"
                onClick={handleCloseClick}
                onMouseDown={handleButtonMouseDown}
                aria-label="Close"
                type="button"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Editor - no inline styles, let CSS handle transitions */}
          <textarea
            ref={textareaRef}
            className="seed-composer-editor"
            value={content}
            onChange={handleContentChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={isSmallMode ? "Click to expand..." : "Write your seed..."}
          />

          {/* Submit button - only show in medium mode */}
          {isMediumMode && (
            <button
              className="seed-composer-submit"
              onClick={handleCreateSeed}
              onMouseDown={handleButtonMouseDown}
              disabled={!hasText || isSaving}
              aria-label="Submit"
              type="button"
            >
              <Send size={20} />
            </button>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog} size="small">
        <DialogHeader title="Discard changes?" onClose={handleCancelClose} />
        <DialogBody>
          <p>You have unsaved content. Are you sure you want to close and lose your changes?</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={handleCancelClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmClose}>
            Discard
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
