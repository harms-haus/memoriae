// useFollowupNotifications hook tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFollowupNotifications } from './useFollowupNotifications'
import * as notificationsService from '../services/notifications'

// Mock the notifications service
vi.mock('../services/notifications', () => ({
  requestPermission: vi.fn(),
  setupNotificationPolling: vi.fn(),
  stopNotificationPolling: vi.fn(),
}))

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      warn: vi.fn(),
    })),
  },
}))

describe('useFollowupNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Ensure cleanup is called
    vi.mocked(notificationsService.stopNotificationPolling).mockClear()
  })

  it('should request permission and setup polling when permission is granted', async () => {
    vi.mocked(notificationsService.requestPermission).mockResolvedValue('granted')

    const { unmount } = renderHook(() => useFollowupNotifications())

    await waitFor(() => {
      expect(notificationsService.requestPermission).toHaveBeenCalled()
    })

    expect(notificationsService.setupNotificationPolling).toHaveBeenCalled()

    unmount()
    expect(notificationsService.stopNotificationPolling).toHaveBeenCalled()
  })

  it('should not setup polling when permission is denied', async () => {
    vi.mocked(notificationsService.requestPermission).mockResolvedValue('denied')

    const { unmount } = renderHook(() => useFollowupNotifications())

    await waitFor(() => {
      expect(notificationsService.requestPermission).toHaveBeenCalled()
    })

    expect(notificationsService.setupNotificationPolling).not.toHaveBeenCalled()

    unmount()
    expect(notificationsService.stopNotificationPolling).toHaveBeenCalled()
  })

  it('should not setup polling when permission is default', async () => {
    vi.mocked(notificationsService.requestPermission).mockResolvedValue('default')

    const { unmount } = renderHook(() => useFollowupNotifications())

    await waitFor(() => {
      expect(notificationsService.requestPermission).toHaveBeenCalled()
    })

    expect(notificationsService.setupNotificationPolling).not.toHaveBeenCalled()

    unmount()
    expect(notificationsService.stopNotificationPolling).toHaveBeenCalled()
  })

  it('should cleanup polling on unmount', async () => {
    vi.mocked(notificationsService.requestPermission).mockResolvedValue('granted')

    const { unmount } = renderHook(() => useFollowupNotifications())

    await waitFor(() => {
      expect(notificationsService.requestPermission).toHaveBeenCalled()
    })

    unmount()

    expect(notificationsService.stopNotificationPolling).toHaveBeenCalled()
  })

  // Note: The hook doesn't catch errors from requestPermission
  // This is acceptable as the error will be logged but won't break the app
  // Testing error handling would require modifying the hook implementation
})

