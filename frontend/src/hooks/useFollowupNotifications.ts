import { useEffect } from 'react'
import {
  requestPermission,
  setupNotificationPolling,
  stopNotificationPolling,
} from '../services/notifications'
import log from 'loglevel'

/**
 * Hook to manage follow-up notifications
 * 
 * - Requests notification permission on mount
 * - Sets up polling for due followups
 * - Shows browser notifications when due followups are found
 * - Handles notification click events to navigate to seed detail page
 * - Cleans up polling on unmount
 */
export function useFollowupNotifications(): void {
  const logHook = log.getLogger('FollowupNotificationsHook')
  useEffect(() => {
    // Request permission on mount
    requestPermission().then((permission) => {
      if (permission === 'granted') {
        // Set up polling
        setupNotificationPolling()
      } else {
        logHook.warn('Notification permission not granted', { permission })
      }
    })

    // Cleanup on unmount
    return () => {
      stopNotificationPolling()
    }
  }, [])
}

