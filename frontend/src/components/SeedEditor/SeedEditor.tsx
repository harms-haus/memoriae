import { useState, useEffect, useCallback, useRef } from 'react'
import { Bold, Italic, Link, X, Maximize } from 'lucide-react'
import { api } from '../../services/api'
import { Button } from '../../../../mother-theme/src/components/Button'
import type { Seed } from '../../types'
import { logger } from '../../utils/logger'
import './SeedEditor.css'

type EditorStage = 'small' | 'medium' | 'large'

interface SeedEditorProps {
  onContentChange?: (content: string) => void
  onSeedCreated?: (seed: Seed) => void
}

/**
 * Dynamic 3-stage seed editor that transitions based on content length
 * 
 * Stages (CSS-based):
 * - Small: content < 100 chars (plain textarea)
 * - Medium: content < 1000 chars (markdown toolbar slides in)
 * - Large: content >= 1000 chars (full-screen modal)
 */
export function SeedEditor({ onContentChange, onSeedCreated }: SeedEditorProps) {
  const [content, setContent] = useState('')
  const [stage, setStage] = useState<EditorStage>('small')
  const [showLargeModal, setShowLargeModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uiVisible, setUiVisible] = useState(true) // For zen mode UI fade
  const [zenModeTriggered, setZenModeTriggered] = useState(false) // Deduplication flag for auto zen mode
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const zenContainerRef = useRef<HTMLDivElement>(null)
  const cursorPositionRef = useRef<number>(0)
  const uiTimeoutRef = useRef<number | null>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)
  const log = logger.scope('SeedEditor')

  /**
   * Determine editor stage based on content length (zen mode is manual, not automatic)
   */
  const getEditorStage = useCallback((contentLength: number): EditorStage => {
    if (contentLength >= 100) {
      return 'medium'
    }
    return 'small'
  }, [])

  /**
   * Update stage when content changes
   * Handle automatic zen mode with hysteresis (750+ enter, <500 exit)
   */
  useEffect(() => {
    const contentLength = content.length
    const newStage = getEditorStage(contentLength)
    
    // Hysteresis pattern for auto zen mode:
    // - Enter zen mode when content >= 750 chars (only if not already triggered)
    // - Exit zen mode when content < 500 chars (reset deduplication flag)
    
    if (contentLength >= 750 && !zenModeTriggered && !showLargeModal) {
      // Trigger zen mode automatically
      setShowLargeModal(true)
      setZenModeTriggered(true)
      // Stage remains medium when entering zen mode
      if (newStage === 'medium') {
        setStage('medium')
      }
    } else if (contentLength < 500 && showLargeModal && zenModeTriggered) {
      // Exit zen mode and reset deduplication flag
      setShowLargeModal(false)
      setZenModeTriggered(false)
      setStage(newStage)
    } else if (!showLargeModal) {
      // Normal stage transitions when not in zen mode
      setStage(newStage)
    }
    // If in zen mode and content is between 500-750, stay in zen mode (hysteresis)
  }, [content.length, getEditorStage, showLargeModal, zenModeTriggered])

  /**
   * Toggle zen mode manually (only available from medium stage)
   */
  const handleToggleZenMode = useCallback(() => {
    // Entering zen mode - always return to medium stage when exiting
      setShowLargeModal(true)
  }, [])

  /**
   * Auto-resize textarea to fit all content (small and medium stages - no scrollbars)
   * Medium stage expands upward to 300px min-height smoothly
   */
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || showLargeModal) return

    // Auto-resize for both small and medium stages
    if (stage === 'small' || stage === 'medium') {
      // Capture current explicit height if set, otherwise use offsetHeight
      const currentHeight = textarea.style.height 
        ? parseFloat(textarea.style.height) 
        : textarea.offsetHeight
      
      // Temporarily set explicit height to preserve it for smooth transition
      if (!textarea.style.height) {
        textarea.style.height = `${currentHeight}px`
      }
      
      // Now reset to auto to measure content height
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      
      if (stage === 'medium') {
        // Medium stage: smoothly expand to at least 300px
        const minHeight = 300
        const targetHeight = Math.max(scrollHeight, minHeight)
        
        // If we're transitioning from small (current < min), smoothly grow from current to target
        // CSS transition will handle the smooth animation
        if (currentHeight < minHeight) {
          // Set current height first to establish baseline for transition
          textarea.style.height = `${currentHeight}px`
          // Use double RAF to ensure transition works
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (textarea) {
                textarea.style.height = `${targetHeight}px`
              }
            })
          })
        } else {
          // Already at or above min, just update to fit content
          textarea.style.height = `${targetHeight}px`
        }
      } else {
        // Small stage: grow to fit content
        const minHeight = 60
        const targetHeight = Math.max(scrollHeight, minHeight)
        textarea.style.height = `${targetHeight}px`
      }
    }
  }, [content, showLargeModal, stage])

  // Scroll tracking removed - not needed for stage detection anymore

  /**
   * Track cursor position for seamless transitions
   */
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleInput = () => {
      cursorPositionRef.current = textarea.selectionStart
    }

    textarea.addEventListener('input', handleInput)
    return () => {
      textarea.removeEventListener('input', handleInput)
    }
  }, [stage])

  /**
   * Preserve focus and cursor position when transitioning to medium stage
   */
  useEffect(() => {
    if (stage === 'medium' && textareaRef.current) {
      const timeout = window.setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const cursorPos = cursorPositionRef.current || content.length
          textareaRef.current.setSelectionRange(cursorPos, cursorPos)
        }
      }, 100)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [stage, content.length])

  /**
   * Focus textarea when large modal opens
   */
  useEffect(() => {
    if (showLargeModal && textareaRef.current) {
      const timeout = window.setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, 100)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [showLargeModal])

  /**
   * Prevent body scroll when large modal is open
   */
  useEffect(() => {
    if (showLargeModal) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
    return undefined
  }, [showLargeModal])

  /**
   * Handle UI fade in zen mode - fade to 20% after 2 seconds of inactivity
   */
  useEffect(() => {
    if (!showLargeModal) {
      setUiVisible(true)
      return undefined
    }

    const showUi = () => {
      setUiVisible(true)
      if (uiTimeoutRef.current) {
        window.clearTimeout(uiTimeoutRef.current)
      }
      uiTimeoutRef.current = window.setTimeout(() => {
        setUiVisible(false)
      }, 2000)
    }

    // Initial show
    showUi()

    // Show UI on mouse move
    const handleMouseMove = () => showUi()
    const handleTouchStart = () => showUi()
    const handleScroll = () => showUi()

    const container = zenContainerRef.current || document
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('touchstart', handleTouchStart)
    container.addEventListener('scroll', handleScroll, true)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('scroll', handleScroll, true)
      if (uiTimeoutRef.current) {
        window.clearTimeout(uiTimeoutRef.current)
      }
    }
  }, [showLargeModal])

  const handleContentChange = useCallback((newContent: string) => {
    // Store cursor position before updating
    if (textareaRef.current) {
      cursorPositionRef.current = textareaRef.current.selectionStart
    }
    setContent(newContent)
    onContentChange?.(newContent)
  }, [onContentChange])

  /**
   * Create a seed when content is submitted
   */
  const handleCreateSeed = useCallback(async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      const seed = await api.post<Seed>('/seeds', { content: trimmedContent })
      onSeedCreated?.(seed)
      // Clear editor after successful save
      setContent('')
      setStage('small')
      setShowLargeModal(false)
      setZenModeTriggered(false) // Reset zen mode trigger on save
    } catch (error) {
      log.error('Failed to create seed', { error })
    } finally {
      setIsSaving(false)
    }
  }, [content, isSaving, onSeedCreated])

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleCreateSeed()
    }
    
    // Track cursor position
    const target = e.target as HTMLTextAreaElement
    cursorPositionRef.current = target.selectionStart
  }, [handleCreateSeed])

  const handleCloseLargeModal = useCallback(() => {
    // Exiting zen mode manually - return to appropriate stage
    setShowLargeModal(false)
    const currentStage = getEditorStage(content.length)
    setStage(currentStage)
    // Reset zen mode trigger if content is below threshold (allows re-triggering)
    if (content.length < 500) {
      setZenModeTriggered(false)
    }
  }, [content.length, getEditorStage])

  /**
   * Handle Escape key to close large modal
   */
  useEffect(() => {
    if (!showLargeModal) {
      return undefined
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseLargeModal()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showLargeModal, handleCloseLargeModal])

  /**
   * Insert markdown formatting
   */
  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Use stored selection if available (from button click), otherwise use current selection
    const storedSelection = selectionRef.current
    const start = storedSelection?.start ?? textarea.selectionStart
    const end = storedSelection?.end ?? textarea.selectionEnd
    
    // Clear stored selection after use
    selectionRef.current = null
    
    // Use textarea.value instead of content state to ensure we're working with the actual DOM value
    const textareaValue = textarea.value
    const selectedText = textareaValue.substring(start, end)
    const beforeText = textareaValue.substring(0, start)
    const afterText = textareaValue.substring(end)

    let newContent: string
    if (selectedText) {
      // Wrap selected text
      newContent = beforeText + before + selectedText + after + afterText
    } else {
      // Insert markdown at cursor
      newContent = beforeText + before + after + afterText
    }

    handleContentChange(newContent)

    // Restore cursor position
    window.setTimeout(() => {
      if (textarea) {
        const newPosition = start + before.length + (selectedText ? selectedText.length + after.length : after.length)
        textarea.setSelectionRange(newPosition, newPosition)
        textarea.focus()
      }
    }, 0)
  }, [handleContentChange])

  const handleBold = () => {
    insertMarkdown('**', '**')
  }
  
  const handleItalic = () => {
    insertMarkdown('*', '*')
  }
  
  const handleLink = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Use stored selection if available, otherwise use current selection
    const storedSelection = selectionRef.current
    const start = storedSelection?.start ?? textarea.selectionStart
    const end = storedSelection?.end ?? textarea.selectionEnd
    
    // Clear stored selection after use
    selectionRef.current = null
    
    // Use textarea.value instead of content state
    const textareaValue = textarea.value
    const selectedText = textareaValue.substring(start, end)

    if (selectedText) {
      const url = prompt('Enter URL:')
      if (url) {
        // Store selection again before calling insertMarkdown
        selectionRef.current = { start, end }
        insertMarkdown('[', `](${url})`)
      }
    } else {
      const linkText = prompt('Enter link text:')
      if (linkText) {
        const url = prompt('Enter URL:')
        if (url) {
          insertMarkdown(`[${linkText}](${url})`, '')
        }
      }
    }
  }
  
  /**
   * Capture textarea selection before button click
   * Works even if textarea isn't currently focused (for test environments)
   */
  const captureSelection = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Always capture selection, even if textarea isn't focused
      // This is important for test environments where focus behavior may differ
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      // Only store if there's a valid selection (start !== end) or if we want to preserve cursor position
      if (start !== end || start >= 0) {
        selectionRef.current = { start, end }
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleContentChange(e.target.value)
  }

  // Determine CSS classes based on stage
  const textareaClassName = `seed-editor-input seed-editor-stage-${stage}`

  // Render zen mode (large stage) - fullscreen expansion
  if (showLargeModal) {
    return (
      <div
        ref={zenContainerRef}
        className="seed-editor-zen-mode"
        role="dialog"
        aria-modal="true"
        aria-label="Zen mode editor"
      >
        {/* Toolbar and close button side-by-side, fades with UI */}
        <div className={`seed-editor-zen-ui-container ${uiVisible ? 'visible' : 'faded'}`}>
          {/* Markdown toolbar */}
          <div className="seed-editor-zen-toolbar">
            <button
              type="button"
              className="seed-editor-toolbar-button seed-editor-zen-toolbar-button"
              onClick={handleBold}
              title="Bold"
              aria-label="Bold"
            >
              <Bold size={20} />
            </button>
            <button
              type="button"
              className="seed-editor-toolbar-button seed-editor-zen-toolbar-button"
              onClick={handleItalic}
              title="Italic"
              aria-label="Italic"
            >
              <Italic size={20} />
            </button>
            <button
              type="button"
              className="seed-editor-toolbar-button seed-editor-zen-toolbar-button"
              onClick={handleLink}
              title="Link"
              aria-label="Link"
            >
              <Link size={20} />
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            className="seed-editor-zen-close-button"
            onClick={handleCloseLargeModal}
            aria-label="Close editor"
          >
            <X size={24} />
          </button>
        </div>

        {/* Textarea - fullscreen with big padding */}
        <textarea
          ref={textareaRef}
          className="seed-editor-zen-input"
          placeholder="Start writing your memory..."
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          rows={1}
        />
      </div>
    )
  }

  // Render small/medium stage (inline editor)
  return (
    <>
      <div className="seed-editor-wrapper">
        <div className={`seed-editor-container seed-editor-stage-${stage}`}>
          {/* Markdown toolbar - only visible in medium stage */}
          {stage === 'medium' && (
            <div className="seed-editor-toolbar">
              <button
                type="button"
                className="seed-editor-toolbar-button"
                onMouseDown={(e) => {
                  // Capture selection before button takes focus
                  captureSelection()
                  // Prevent button from taking focus, preserving textarea selection
                  e.preventDefault()
                  handleBold()
                }}
                title="Bold"
                aria-label="Bold"
              >
                <Bold size={16} />
              </button>
              <button
                type="button"
                className="seed-editor-toolbar-button"
                onMouseDown={(e) => {
                  // Capture selection before button takes focus
                  captureSelection()
                  // Prevent button from taking focus, preserving textarea selection
                  e.preventDefault()
                  handleItalic()
                }}
                title="Italic"
                aria-label="Italic"
              >
                <Italic size={16} />
              </button>
              <button
                type="button"
                className="seed-editor-toolbar-button"
                onMouseDown={(e) => {
                  // Capture selection before button takes focus
                  captureSelection()
                  // Prevent button from taking focus, preserving textarea selection
                  e.preventDefault()
                  handleLink()
                }}
                title="Link"
                aria-label="Link"
              >
                <Link size={16} />
              </button>
              <button
                type="button"
                className="seed-editor-toolbar-button seed-editor-zen-toggle-button"
                onClick={handleToggleZenMode}
                title="Enter zen mode"
                aria-label="Enter zen mode"
              >
                <Maximize size={16} />
              </button>
            </div>
          )}
          
          {/* Textarea - same element across all stages */}
          <textarea
            ref={textareaRef}
            className={textareaClassName}
            placeholder="Start writing your memory..."
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            rows={1}
          />
          
          {/* Save button */}
          {content.trim() && (
            <div className="seed-editor-actions">
              <Button
                variant="primary"
                className="seed-editor-save-button"
                onClick={handleCreateSeed}
                disabled={isSaving || !content.trim()}
                title="Save seed (Ctrl+Enter)"
                loading={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
