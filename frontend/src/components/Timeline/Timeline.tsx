import { useEffect, useRef } from 'react'
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
 * - Uses mother-theme Timeline component with RSuite compatibility
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
  const motherItems: MotherTimelineItem[] = items.map(item => {
    const result: MotherTimelineItem = {
      id: item.id,
      content: item.content,
    }
    if (item.time !== undefined) result.time = item.time
    if (item.dot !== undefined) result.dot = item.dot
    if (item.disabled !== undefined) result.disabled = item.disabled
    if (item.onClick !== undefined) result.onClick = item.onClick
    return result
  })

  return (
    <div
      ref={timelineRef}
      className={`memoriae-timeline ${isMobile ? 'timeline-mobile' : 'timeline-desktop'} ${className}`}
      tabIndex={0}
    >
      <MotherTimeline
        items={motherItems}
        align={align}
        compatibilityMode={true}
      />
    </div>
  )
}
