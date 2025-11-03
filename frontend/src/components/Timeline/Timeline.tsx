import { useEffect, useRef, type ReactNode } from 'react'
import { Timeline as RSuiteTimeline } from 'rsuite'
import 'rsuite/dist/rsuite.min.css'
import { useTimelineConfig } from '../../hooks/useTimelineConfig'
import './Timeline.css'

export interface TimelineItem {
  id: string
  content: ReactNode
  time?: ReactNode
  dot?: ReactNode
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
 * - Custom styling with caret/triangle
 * - Scrollable timeline container
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

  return (
    <div
      ref={timelineRef}
      className={`memoriae-timeline ${isMobile ? 'timeline-mobile' : 'timeline-desktop'} ${className}`}
      tabIndex={0}
    >
      <RSuiteTimeline align={align}>
        {items.map((item) => (
          <RSuiteTimeline.Item
            key={item.id}
            time={item.time}
            dot={item.dot}
            className={item.disabled ? 'timeline-item-disabled' : ''}
          >
            {item.onClick ? (
              <div
                className="timeline-item-clickable"
                onClick={item.onClick}
              >
                {item.content}
              </div>
            ) : (
              item.content
            )}
          </RSuiteTimeline.Item>
        ))}
      </RSuiteTimeline>
    </div>
  )
}
