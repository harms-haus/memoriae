import React, { useEffect, useRef, useMemo } from 'react'
import { Timeline as MotherTimeline, type TimelineItem as MotherTimelineItem } from '../../../../mother-theme/src/components/Timeline'
import { useTimelineConfig } from '../../hooks/useTimelineConfig'
import './Timeline.css'

export interface TimelineItem {
  id: string
  content: React.ReactNode
  time?: React.ReactNode
  dot?: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

/**
 * Custom Timeline wrapper that handles:
 * - Responsive alignment (left on mobile, alternate on desktop)
 * - Keyboard navigation (arrow up/down)
 * - Click handling
 * - Uses mother-theme Timeline component
 */
export function Timeline({ items, className = '' }: TimelineProps) {
  const { align, isMobile } = useTimelineConfig()
  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!timelineRef.current) return

      // Only handle arrow keys when timeline is focused or contains focused element
      const isTimelineFocused = timelineRef.current.contains(document.activeElement) ||
                                  document.activeElement === timelineRef.current

      if (!isTimelineFocused) return

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        // Scroll the timeline container itself
        if (timelineRef.current) {
          timelineRef.current.scrollBy({ top: -100, behavior: 'smooth' })
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        // Scroll the timeline container itself
        if (timelineRef.current) {
          timelineRef.current.scrollBy({ top: 100, behavior: 'smooth' })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Convert memoriae TimelineItem to mother-theme TimelineItem
  // Position items evenly along timeline (0% to 100%)
  const motherItems: MotherTimelineItem[] = useMemo(() => {
    if (items.length === 0) return []
    
    return items.map((item, index) => {
      const position = items.length === 1 
        ? 50 // Single item at center
        : (index / (items.length - 1)) * 100 // Evenly distributed
        
      return {
        id: item.id,
        position: position,
        dot: item.dot,
      }
    })
  }, [items])

  // Map align to mode: 'left' -> 'left', 'alternate' -> 'center'
  const mode = align === 'alternate' ? 'center' : 'left'

  // Render panel content with click handling
  const renderPanel = (index: number, width: number): React.ReactNode => {
    const item = items[index]
    if (!item) return null

    const handleClick = () => {
      if (!item.disabled && item.onClick) {
        item.onClick()
      }
    }

    return (
      <div 
        onClick={item.disabled ? undefined : handleClick}
        style={{
          cursor: item.disabled || !item.onClick ? 'default' : 'pointer',
          opacity: item.disabled ? 0.6 : 1,
        }}
      >
        {item.content}
        {item.time && (
          <div style={{ marginTop: '0.5rem', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {item.time}
          </div>
        )}
      </div>
    )
  }

  // Render custom dot if provided
  const renderDot = (index: number, position: number, isTop: boolean, isBottom: boolean): React.ReactNode => {
    const item = items[index]
    if (!item || !item.dot) return null
    
    return item.dot
  }

  const hasCustomDots = items.some(item => item.dot)

  return (
    <div
      ref={timelineRef}
      className={`memoriae-timeline ${isMobile ? 'timeline-mobile' : 'timeline-desktop'} ${className}`}
      tabIndex={0}
    >
      <MotherTimeline
        items={motherItems}
        mode={mode}
        renderPanel={renderPanel}
        {...(hasCustomDots && { renderDot })}
        maxPanelWidth={400}
        panelSpacing={16}
        panelClickable={items.some(item => !!item.onClick && !item.disabled)}
      />
    </div>
  )
}
