import React from 'react'

interface HashTagLinkProps {
  tagName: string
  onClick: (tagName: string) => void
}

function HashTagLink({ tagName, onClick }: HashTagLinkProps) {
  return (
    <a
      href={`/seeds/tag/${encodeURIComponent(tagName)}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick(tagName)
      }}
      style={{
        color: 'var(--accent-blue)',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = 'underline'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = 'none'
      }}
    >
      #{tagName}
    </a>
  )
}

/**
 * Renders text with hash tags as clickable links
 * Hash tags (e.g., #hashtag) are converted to links
 * @param text - The text to render
 * @param onHashTagClick - Callback when a hash tag is clicked (receives tag name without #)
 * @returns Array of React nodes (text and link elements)
 */
export function renderHashTags(
  text: string,
  onHashTagClick: (tagName: string) => void
): React.ReactNode[] {
  // Match hash tags: # followed by word characters, hyphens, or underscores
  // Exclude # at start of line (markdown headers) by requiring word boundary or space before
  const hashTagRegex = /(?:^|\s)(#[\w-]+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let matchIndex = 0

  const matches = Array.from(text.matchAll(hashTagRegex))
  
  if (matches.length === 0) {
    // No hash tags, return plain text
    return [text]
  }

  matches.forEach((match) => {
    const matchStart = match.index!
    const matchEnd = matchStart + match[0].length
    const hashTag = match[1] // The #hashtag part (without leading space)
    
    // Skip if hashTag is undefined (shouldn't happen with our regex, but TypeScript needs this)
    if (!hashTag) return
    
    const tagName = hashTag.substring(1) // Remove the #
    const fullMatch = match[0] // The full match including space if present
    const hasLeadingSpace = fullMatch.startsWith(' ')

    // Add text before the match
    if (matchStart > lastIndex) {
      parts.push(text.substring(lastIndex, matchStart))
    }

    // Add the space before hash tag if present
    if (hasLeadingSpace) {
      parts.push(' ')
    }

    // Add the hash tag as a link
    parts.push(
      <HashTagLink
        key={`hashtag-${matchIndex++}`}
        tagName={tagName}
        onClick={onHashTagClick}
      />
    )

    lastIndex = matchEnd
  })

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}


