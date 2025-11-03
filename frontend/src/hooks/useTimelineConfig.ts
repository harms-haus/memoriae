import { useState, useEffect } from 'react'

/**
 * Hook to manage responsive timeline configuration
 * - < 750px: left-aligned, items on right
 * - >= 750px: centered, items alternate left/right
 */
export function useTimelineConfig() {
  const [align, setAlign] = useState<'left' | 'alternate'>('left')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth
      const mobile = width < 750
      setIsMobile(mobile)
      setAlign(mobile ? 'left' : 'alternate')
    }

    updateConfig()
    window.addEventListener('resize', updateConfig)
    return () => window.removeEventListener('resize', updateConfig)
  }, [])

  return { align, isMobile }
}
