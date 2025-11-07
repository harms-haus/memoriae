import React, { useState, useEffect, useRef } from 'react'
import './TagList.css'

export interface TagListItem {
  id: string
  name: string
  color?: string | null
}

export interface TagListProps {
  tags: TagListItem[]
  suppressHashes?: boolean
  suppressColors?: boolean
  suppressTruncate?: boolean
  onTruncatedButtonClick?: (count: number) => void
  onTagClick?: (tag: TagListItem, event: React.MouseEvent) => void
  className?: string
}

/**
 * Theme accent color CSS variable names
 * These reference the mother theme's accent colors
 */
const THEME_COLOR_VARS = [
  '--accent-yellow',
  '--accent-blue',
  '--accent-green',
  '--accent-purple',
  '--accent-pink',
  '--accent-orange',
] as const

/**
 * Gets a theme color by reading CSS custom properties from the mother theme
 * 
 * @param index - Index into the theme color array
 * @returns A color value from CSS custom properties
 */
function getThemeColor(index: number): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('getThemeColor can only be called in browser environment')
  }
  
  const root = document.documentElement
  const colorVar = THEME_COLOR_VARS[index]
  if (!colorVar) {
    throw new Error(`Invalid color index: ${index}`)
  }
  
  const computedColor = getComputedStyle(root).getPropertyValue(colorVar).trim()
  if (!computedColor) {
    throw new Error(`CSS variable ${colorVar} is not defined in the theme`)
  }
  
  return computedColor
}

/**
 * Generates a consistent color for a tag based on its name
 * If the tag already has a color, returns that color
 * Otherwise, generates a consistent color from the theme palette
 * 
 * @param tagName - The name of the tag
 * @param existingColor - Optional existing color for the tag
 * @returns A color value (hex code or CSS variable value)
 */
function getTagColor(tagName: string, existingColor?: string | null): string {
  // If tag already has a color (and it's not empty), use it
  if (existingColor && existingColor.trim() !== '') {
    return existingColor.trim()
  }

  // Generate a consistent color based on tag name
  // This ensures the same tag always gets the same color
  let hash = 0
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Use hash to select a color from the theme palette
  // colorIndex is always valid (0 to length-1) due to modulo, so access is safe
  const colorIndex = Math.abs(hash) % THEME_COLOR_VARS.length
  return getThemeColor(colorIndex)
}

/**
 * TagList component - Reusable tag list with truncation support
 * 
 * Features:
 * - Optional hash prefix (#) for each tag
 * - Optional color suppression (uses CSS color instead)
 * - Automatic color assignment based on tag name (consistent per tag)
 * - Truncation with "+X" button when items don't fit
 * - Click handlers for tags and truncated button
 * 
 * All styling and color logic is self-contained within this component.
 */
export function TagList({
  tags,
  suppressHashes = false,
  suppressColors = false,
  suppressTruncate = false,
  onTruncatedButtonClick,
  onTagClick,
  className = '',
}: TagListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState<number>(suppressTruncate ? tags.length : tags.length)
  const measuringRef = useRef(false)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const measureContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (suppressTruncate || tags.length === 0) {
      setVisibleCount(tags.length)
      return
    }

    // Measure which tags fit in the container
    const measureTags = () => {
      if (!containerRef.current || measuringRef.current) return

      const container = containerRef.current
      const containerWidth = container.offsetWidth
      if (containerWidth === 0) {
        // Container not yet rendered, try again
        requestAnimationFrame(measureTags)
        return
      }

      // Create a hidden measurement container if it doesn't exist
      if (!measureContainerRef.current) {
        const measureContainer = document.createElement('div')
        measureContainer.style.position = 'absolute'
        measureContainer.style.visibility = 'hidden'
        measureContainer.style.top = '-9999px'
        measureContainer.style.left = '-9999px'
        measureContainer.style.display = 'flex'
        measureContainer.style.flexWrap = 'wrap'
        measureContainer.style.gap = 'var(--space-2)'
        measureContainer.style.width = `${containerWidth}px`
        measureContainer.className = 'tag-list'
        document.body.appendChild(measureContainer)
        measureContainerRef.current = measureContainer
      }

      const measureContainer = measureContainerRef.current
      
      // Update width to match container
      measureContainer.style.width = `${containerWidth}px`

      // Clear previous measurements
      measureContainer.innerHTML = ''

      // Create temporary tag elements to measure
      const tempElements: HTMLElement[] = []
      tags.forEach((tag) => {
        const tempTag = document.createElement('span')
        tempTag.className = 'tag-item'
        tempTag.textContent = suppressHashes ? tag.name : `#${tag.name}`
        measureContainer.appendChild(tempTag)
        tempElements.push(tempTag)
      })

      // Create temporary button to measure
      const tempButton = document.createElement('button')
      tempButton.className = 'tag-list-truncate-button'
      tempButton.textContent = `+${tags.length}`
      measureContainer.appendChild(tempButton)

      // Force layout calculation
      void measureContainer.offsetWidth

      // Calculate how many tags fit by measuring actual rendered widths
      // We need to account for wrapping, so we'll measure line by line
      let totalWidth = 0
      let count = 0
      const gap = 8 // var(--space-2) = 0.5rem = 8px
      const buttonWidth = tempButton.offsetWidth

      for (let i = 0; i < tempElements.length; i++) {
        const tagElement = tempElements[i]
        if (!tagElement) continue
        
        const tagWidth = tagElement.offsetWidth
        const widthWithGap = totalWidth + (count > 0 ? gap : 0) + tagWidth
        
        // Check if this tag + button would fit on current line
        const wouldFit = widthWithGap + gap + buttonWidth <= containerWidth
        
        if (wouldFit || i === 0) {
          totalWidth = widthWithGap
          count++
        } else {
          break
        }
      }

      // If all tags fit, show all. Otherwise, show count - 1 to make room for button
      const newVisibleCount = count >= tags.length ? tags.length : Math.max(0, count - 1)
      
      // Update visible count (React will handle deduplication)
      setVisibleCount(newVisibleCount)
    }

    // Debounced resize handler
    let resizeTimeout: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        measuringRef.current = false
        requestAnimationFrame(measureTags)
      }, 100)
    }

    // Use ResizeObserver to handle container size changes
    if (containerRef.current) {
      resizeObserverRef.current = new ResizeObserver(handleResize)
      resizeObserverRef.current.observe(containerRef.current)
    }

    // Initial measurement with delay to ensure container is rendered
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(measureTags)
    }, 0)

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      clearTimeout(timeoutId)
      clearTimeout(resizeTimeout)
      if (measureContainerRef.current) {
        document.body.removeChild(measureContainerRef.current)
        measureContainerRef.current = null
      }
    }
  }, [tags, suppressTruncate, suppressHashes])

  const visibleTags = tags.slice(0, visibleCount)
  const hiddenCount = tags.length - visibleCount
  const showTruncateButton = !suppressTruncate && hiddenCount > 0 && onTruncatedButtonClick

  const handleTagClick = (tag: TagListItem, event: React.MouseEvent) => {
    if (onTagClick) {
      event.preventDefault()
      event.stopPropagation()
      onTagClick(tag, event)
    }
  }

  const handleTruncatedClick = (event: React.MouseEvent) => {
    if (onTruncatedButtonClick) {
      event.preventDefault()
      event.stopPropagation()
      onTruncatedButtonClick(hiddenCount)
    }
  }

  const classes = ['tag-list', className].filter(Boolean).join(' ')
  // Store refs for tag elements to update colors when they change
  const tagRefs = useRef<Map<string, HTMLAnchorElement | HTMLSpanElement>>(new Map())

  // Update colors whenever tags or suppressColors changes
  // Use useEffect to ensure refs are set before we try to update colors
  // Compute visibleTags inside effect to avoid dependency issues
  useEffect(() => {
    const currentVisibleTags = tags.slice(0, visibleCount)
    currentVisibleTags.forEach((tag) => {
      const element = tagRefs.current.get(tag.id)
      if (!element) return

      if (suppressColors) {
        element.style.removeProperty('color')
        element.style.removeProperty('--tag-custom-color')
      } else {
        const tagColor = getTagColor(tag.name, tag.color)
        // Set both CSS custom property and inline color with !important
        // This ensures the color is applied even if CSS rules try to override
        if (tagColor && tagColor.trim() !== '') {
          element.style.setProperty('--tag-custom-color', tagColor)
          element.style.setProperty('color', tagColor, 'important')
        } else {
          element.style.removeProperty('--tag-custom-color')
          element.style.removeProperty('color')
        }
      }
    })
  }, [tags, visibleCount, suppressColors])

  return (
    <div ref={containerRef} className={classes} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {visibleTags.map((tag, index) => {
        const tagColor = suppressColors ? undefined : getTagColor(tag.name, tag.color)

        const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement | HTMLSpanElement>) => {
          e.currentTarget.style.textDecoration = 'underline'
          // Maintain the tag color on hover
          if (!suppressColors && tagColor && tagColor.trim() !== '') {
            e.currentTarget.style.setProperty('color', tagColor, 'important')
          }
        }

        const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement | HTMLSpanElement>) => {
          e.currentTarget.style.textDecoration = 'none'
          // Maintain the tag color after hover
          if (!suppressColors && tagColor && tagColor.trim() !== '') {
            e.currentTarget.style.setProperty('color', tagColor, 'important')
          }
        }

        const tagContent = suppressHashes ? tag.name : `#${tag.name}`
        const tagClasses = ['tag-item'].filter(Boolean).join(' ')

        // Set color using ref callback - store element and set color with !important
        const setTagRef = (el: HTMLAnchorElement | HTMLSpanElement | null) => {
          if (el) {
            tagRefs.current.set(tag.id, el)
            if (!suppressColors && tagColor && tagColor.trim() !== '') {
              // Set both CSS custom property and inline color with !important
              el.style.setProperty('--tag-custom-color', tagColor)
              el.style.setProperty('color', tagColor, 'important')
            } else if (suppressColors) {
              // Clear custom color if colors are suppressed
              el.style.removeProperty('--tag-custom-color')
              el.style.removeProperty('color')
            } else {
              // Clear if no valid color
              el.style.removeProperty('--tag-custom-color')
              el.style.removeProperty('color')
            }
          } else {
            tagRefs.current.delete(tag.id)
          }
        }

        // If onTagClick is provided, make it clickable (button-like)
        // Otherwise, render as plain span
        if (onTagClick) {
          return (
            <a
              key={tag.id}
              ref={setTagRef}
              href="#"
              onClick={(e) => handleTagClick(tag, e)}
              className={tagClasses}
              style={{
                textDecoration: 'none',
                cursor: 'pointer',
                // Don't set color in inline style - let ref callback handle it with !important
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {tagContent}
            </a>
          )
        } else {
          return (
            <span
              key={tag.id}
              ref={setTagRef}
              className={tagClasses}
              // Don't set color in inline style - let ref callback handle it with !important
            >
              {tagContent}
            </span>
          )
        }
      })}
      
      {showTruncateButton && (
        <button
          type="button"
          className="tag-list-truncate-button"
          onClick={handleTruncatedClick}
          aria-label={`Show ${hiddenCount} more tags`}
        >
          +{hiddenCount}
        </button>
      )}
    </div>
  )
}

