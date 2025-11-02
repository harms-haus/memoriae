import React, { useState, useRef, useEffect } from 'react'
import './SeedEditor.css'

interface SeedEditorProps {
  onContentChange?: (content: string) => void
}

export function SeedEditor({ onContentChange }: SeedEditorProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Auto-resize textarea
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 200 // From CSS max-height
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [content])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    onContentChange?.(newContent)
  }

  return (
    <div className="seed-editor-wrapper">
      <textarea
        ref={textareaRef}
        className="seed-editor-input"
        placeholder="Start writing your memory..."
        value={content}
        onChange={handleChange}
        rows={1}
      />
    </div>
  )
}

