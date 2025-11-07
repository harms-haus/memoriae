import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Maximize, Check } from 'lucide-react'
import { api } from '../../services/api'
import { SeedComposerToolbar } from './SeedComposerToolbar'
import './SeedComposer.css'

interface SeedComposerProps {
  onSeedCreated?: () => void
  onClose?: () => void
}

export function SeedComposer({ onSeedCreated, onClose }: SeedComposerProps) {
  const [markdown, setMarkdown] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null)
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isCreatingRef = useRef(false)
  const isEnteringZenRef = useRef(false)

  // Update height dynamically
  const updateHeight = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    // Get current height before changing anything
    const currentHeight = editor.offsetHeight
    
    // Temporarily set height to auto to measure scrollHeight
    const savedHeight = editor.style.height
    editor.style.height = 'auto'
    const scrollHeight = editor.scrollHeight
    editor.style.height = savedHeight // Restore immediately
    
    const newHeight = Math.max(
      scrollHeight,
      isFocused ? 300 : 0 // min 300px when focused
    )
    
    // Only update if height actually changed
    if (Math.abs(currentHeight - newHeight) > 1) {
      // Set current height first to enable transition FROM this value
      editor.style.height = `${currentHeight}px`
      
      // Use requestAnimationFrame to ensure browser has applied the current height
      // before transitioning to the new height
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.style.height = `${newHeight}px`
        }
      })
    }
  }, [isFocused])

  // Initialize height on mount
  useEffect(() => {
    const editor = editorRef.current
    if (editor && !editor.style.height) {
      // Set initial height to enable transitions
      editor.style.height = isFocused ? '300px' : '0px'
    }
    updateHeight()
  }, [updateHeight, isFocused])

  // Update height when content changes
  useEffect(() => {
    updateHeight()
  }, [markdown, updateHeight])

  // Handle window resize for zen mode detection
  useEffect(() => {
    const handleResize = () => {
      updateHeight()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateHeight])

  // Handle toolbar positioning and visibility
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        setToolbarVisible(false)
        setToolbarPosition(null)
        return
      }

      // Check if selection is within the editor
      const editor = editorRef.current
      if (!editor || !editor.contains(selection.anchorNode)) {
        setToolbarVisible(false)
        setToolbarPosition(null)
        return
      }

      const selectedText = selection.toString().trim()
      if (selectedText.length === 0) {
        setToolbarVisible(false)
        setToolbarPosition(null)
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      // Calculate toolbar dimensions
      const toolbarHeight = 36 // Approximate toolbar height with reduced padding
      const toolbarSpacing = 15 // Space between toolbar and text
      const totalOffset = toolbarHeight + toolbarSpacing
      
      // Check if there's enough space above the selection
      const spaceAbove = rect.top
      const spaceBelow = window.innerHeight - rect.bottom
      
      // Position toolbar above selection if there's enough space, otherwise below
      let topPosition: number
      if (spaceAbove >= totalOffset) {
        // Position above selection
        topPosition = rect.top - totalOffset
      } else if (spaceBelow >= totalOffset) {
        // Position below selection if not enough space above
        topPosition = rect.bottom + toolbarSpacing
      } else {
        // Default to above, but ensure it doesn't go off-screen
        topPosition = Math.max(8, rect.top - totalOffset)
      }
      
      setToolbarPosition({
        top: topPosition,
        left: rect.left + rect.width / 2, // Center above selection
      })
    }

    const handleMouseMove = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        setToolbarVisible(false)
        return
      }

      // Check if selection is within the editor
      const editor = editorRef.current
      if (!editor || !editor.contains(selection.anchorNode)) {
        setToolbarVisible(false)
        return
      }

      const hasSelection = selection.toString().trim().length > 0

      if (hasSelection) {
        setToolbarVisible(true)
        // Clear existing timeout
        if (mouseMoveTimeoutRef.current) {
          clearTimeout(mouseMoveTimeoutRef.current)
        }
        // Set timeout to fade out after mouse stops
        mouseMoveTimeoutRef.current = setTimeout(() => {
          setToolbarVisible(false)
        }, 2000) // 2 second delay
      } else {
        setToolbarVisible(false)
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      window.removeEventListener('mousemove', handleMouseMove)
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
    }
  }, [])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (isCreatingRef.current) return
    
    const content = editorRef.current?.textContent?.trim() || ''
    if (!content) return

    isCreatingRef.current = true
    try {
      await api.post('/seeds', { content })
      setMarkdown('')
      if (editorRef.current) {
        editorRef.current.textContent = ''
        updateHeight()
      }
      onSeedCreated?.()
      // Close composer after successful creation
      onClose?.()
    } catch (error) {
      console.error('Failed to create seed:', error)
    } finally {
      isCreatingRef.current = false
    }
  }, [onSeedCreated, onClose, updateHeight])

  // Handle ESC key for zen mode and closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zenMode) {
          setZenMode(false)
        } else {
          // Close composer if not in zen mode
          onClose?.()
        }
      }
      // Ctrl+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zenMode, handleSubmit, onClose])

  // Handle input changes
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || ''
    setMarkdown(content)
  }

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true)
  }

  // Handle blur - close if empty (but not if clicking header buttons)
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(false)
    // Check if focus is moving to a header button
    const relatedTarget = e.relatedTarget as HTMLElement
    const isClickingHeaderButton = relatedTarget?.closest('.seed-composer-header')
    
    // Don't close if zen mode is active or being activated
    if (zenMode || isEnteringZenRef.current) {
      return
    }
    
    // Close composer if empty when blurred, but not if clicking header buttons
    if (!markdown.trim() && !isClickingHeaderButton) {
      onClose?.()
    }
  }

  // Focus editor when component mounts
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }, [])

  // Refocus editor when entering zen mode
  useEffect(() => {
    if (zenMode && editorRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus()
        }
      }, 10)
    }
  }, [zenMode])

  // Add/remove class to body when zen mode is active to hide tabs
  useEffect(() => {
    if (zenMode) {
      document.body.classList.add('zen-mode-active')
    } else {
      document.body.classList.remove('zen-mode-active')
    }
    return () => {
      document.body.classList.remove('zen-mode-active')
    }
  }, [zenMode])

  // Handle paste (strip formatting)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  // Update markdown state
  const updateMarkdown = useCallback((content: string) => {
    setMarkdown(content)
  }, [])

  // Handle zen mode exit
  const handleExitZen = () => {
    setZenMode(false)
  }

  // Handle zen mode entry
  const handleEnterZen = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isEnteringZenRef.current = true
    setZenMode(true)
    // Refocus editor after zen mode is set to prevent blur from closing
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus()
      }
    }, 0)
  }

  // Format functions for toolbar
  const formatBold = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    if (!selectedText) return

    const boldText = `**${selectedText}**`
    range.deleteContents()
    range.insertNode(document.createTextNode(boldText))
    
    // Update markdown state
    const newContent = editorRef.current?.textContent || ''
    updateMarkdown(newContent)
    updateHeight()
  }

  const formatItalic = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    if (!selectedText) return

    const italicText = `*${selectedText}*`
    range.deleteContents()
    range.insertNode(document.createTextNode(italicText))
    
    const newContent = editorRef.current?.textContent || ''
    updateMarkdown(newContent)
    updateHeight()
  }

  const formatLink = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    if (!selectedText) return

    const url = prompt('Enter URL:')
    if (!url) return

    const linkText = `[${selectedText}](${url})`
    range.deleteContents()
    range.insertNode(document.createTextNode(linkText))
    
    const newContent = editorRef.current?.textContent || ''
    updateMarkdown(newContent)
    updateHeight()
  }

  const formatHeader = (level: number) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const editor = editorRef.current
    if (!editor) return

    // Find the start of the current line
    const textNode = range.startContainer
    let lineStart = 0
    
    if (textNode.nodeType === Node.TEXT_NODE && textNode.parentNode) {
      const text = textNode.textContent || ''
      const offset = range.startOffset
      const beforeText = text.substring(0, offset)
      lineStart = beforeText.lastIndexOf('\n') + 1
    }

    // Insert header markdown at line start
    const headerPrefix = '#'.repeat(level) + ' '
    
    // If we're at the start of a line, just insert prefix
    if (lineStart === 0 || (textNode.textContent?.[lineStart - 1] === '\n')) {
      range.setStart(textNode, lineStart)
      range.insertNode(document.createTextNode(headerPrefix))
    } else {
      // Insert on new line
      const newline = document.createTextNode('\n' + headerPrefix)
      range.insertNode(newline)
    }
    
    const newContent = editorRef.current?.textContent || ''
    updateMarkdown(newContent)
    updateHeight()
  }

  const formatList = (ordered: boolean) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const editor = editorRef.current
    if (!editor) return

    // Find the start of the current line
    const textNode = range.startContainer
    let lineStart = 0
    
    if (textNode.nodeType === Node.TEXT_NODE && textNode.parentNode) {
      const text = textNode.textContent || ''
      const offset = range.startOffset
      const beforeText = text.substring(0, offset)
      lineStart = beforeText.lastIndexOf('\n') + 1
    }

    // Insert list markdown at line start
    const listPrefix = ordered ? '1. ' : '- '
    
    // If we're at the start of a line, just insert prefix
    if (lineStart === 0 || (textNode.textContent?.[lineStart - 1] === '\n')) {
      range.setStart(textNode, lineStart)
      range.insertNode(document.createTextNode(listPrefix))
    } else {
      // Insert on new line
      const newline = document.createTextNode('\n' + listPrefix)
      range.insertNode(newline)
    }
    
    const newContent = editorRef.current?.textContent || ''
    updateMarkdown(newContent)
    updateHeight()
  }

  const formatCodeBlock = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    
    if (selectedText) {
      // Wrap selection in code block
      const codeText = `\`\`\`\n${selectedText}\n\`\`\``
      range.deleteContents()
      range.insertNode(document.createTextNode(codeText))
    } else {
      // Insert code block at cursor
      const codeText = `\`\`\`\n\n\`\`\``
      range.insertNode(document.createTextNode(codeText))
    }
    
    const newContent = editorRef.current?.textContent || ''
    updateMarkdown(newContent)
    updateHeight()
  }

  const editorContent = (
    <div className="seed-composer-container" ref={containerRef}>
      {/* Header with X and Maximize buttons */}
      <div className="seed-composer-header">
        {!zenMode && (
          <button
            className="seed-composer-zen-button grow-hover"
            onMouseDown={(e) => {
              e.preventDefault()
              handleEnterZen(e)
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            aria-label="Enter zen mode"
          >
            <Maximize size={20} />
          </button>
        )}
        <button
          className="seed-composer-close-button grow-hover"
          onClick={zenMode ? handleExitZen : onClose}
          aria-label={zenMode ? "Exit zen mode" : "Close composer"}
        >
          <X size={20} />
        </button>
      </div>
      
      <div
        ref={editorRef}
        className="seed-composer-editor"
        contentEditable
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        data-placeholder=""
      />
      
      {toolbarVisible && toolbarPosition && (
        <SeedComposerToolbar
          position={toolbarPosition}
          visible={toolbarVisible}
          onBold={formatBold}
          onItalic={formatItalic}
          onLink={formatLink}
          onHeader={formatHeader}
          onList={formatList}
          onCodeBlock={formatCodeBlock}
        />
      )}
      
      {(markdown.trim() || isFocused) && (
        <button
          className="seed-composer-submit grow-hover"
          onClick={handleSubmit}
          disabled={!markdown.trim() || isCreatingRef.current}
          aria-label="Submit seed"
        >
          <Check size={20} />
        </button>
      )}
    </div>
  )

  if (zenMode) {
    return (
      <div 
        className={`seed-composer-zen-overlay ${zenMode ? 'active' : ''}`}
        onClick={handleExitZen}
      >
        <div 
          className="seed-composer-zen-content"
          onClick={(e) => e.stopPropagation()}
        >
          {editorContent}
        </div>
      </div>
    )
  }

  return editorContent
}

