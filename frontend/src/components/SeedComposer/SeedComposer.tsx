import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { api } from '../../services/api'
import { SeedComposerToolbar } from './SeedComposerToolbar'
import './SeedComposer.css'

interface SeedComposerProps {
  onSeedCreated?: () => void
}

export function SeedComposer({ onSeedCreated }: SeedComposerProps) {
  const [markdown, setMarkdown] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null)
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isCreatingRef = useRef(false)

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

    // Check for zen mode threshold
    const viewportHeight = window.innerHeight
    if (newHeight >= viewportHeight * 0.5 && !zenMode) {
      setZenMode(true)
    } else if (zenMode && newHeight < viewportHeight * 0.5) {
      setZenMode(false)
    }
  }, [isFocused, zenMode])

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
    } catch (error) {
      console.error('Failed to create seed:', error)
    } finally {
      isCreatingRef.current = false
    }
  }, [onSeedCreated, updateHeight])

  // Handle ESC key for zen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false)
      }
      // Ctrl+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zenMode, handleSubmit])

  // Handle input changes
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || ''
    setMarkdown(content)
  }

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true)
  }

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false)
  }

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
      <div
        ref={editorRef}
        className="seed-composer-editor"
        contentEditable
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        data-placeholder="Start writing your seed..."
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
          <button
            className="seed-composer-zen-close"
            onClick={handleExitZen}
            aria-label="Exit zen mode"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    )
  }

  return editorContent
}

