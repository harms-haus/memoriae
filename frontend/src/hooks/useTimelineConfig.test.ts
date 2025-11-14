// useTimelineConfig hook tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTimelineConfig } from './useTimelineConfig'

describe('useTimelineConfig', () => {
  const originalInnerWidth = window.innerWidth
  const originalAddEventListener = window.addEventListener
  const originalRemoveEventListener = window.removeEventListener

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })
  })

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
  })

  it('should return left align and mobile false for desktop width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    })

    const { result } = renderHook(() => useTimelineConfig())

    expect(result.current.align).toBe('alternate')
    expect(result.current.isMobile).toBe(false)
  })

  it('should return left align and mobile true for mobile width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    const { result } = renderHook(() => useTimelineConfig())

    expect(result.current.align).toBe('left')
    expect(result.current.isMobile).toBe(true)
  })

  it('should return left align for exactly 750px width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 750,
    })

    const { result } = renderHook(() => useTimelineConfig())

    expect(result.current.align).toBe('alternate')
    expect(result.current.isMobile).toBe(false)
  })

  it('should return left align for 749px width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 749,
    })

    const { result } = renderHook(() => useTimelineConfig())

    expect(result.current.align).toBe('left')
    expect(result.current.isMobile).toBe(true)
  })

  it('should update config on window resize', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    })

    const { result } = renderHook(() => useTimelineConfig())

    expect(result.current.align).toBe('alternate')
    expect(result.current.isMobile).toBe(false)

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    // Trigger resize event
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(result.current.align).toBe('left')
      expect(result.current.isMobile).toBe(true)
    }, { timeout: 1000 })
  })

  it('should cleanup resize listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useTimelineConfig())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('should handle multiple resize events', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    })

    const { result } = renderHook(() => useTimelineConfig())

    // Resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(result.current.isMobile).toBe(true)
    }, { timeout: 1000 })

    // Resize back to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    })
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(result.current.isMobile).toBe(false)
    }, { timeout: 1000 })
  })
})

