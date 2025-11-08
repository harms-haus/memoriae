// Browser notification service for follow-ups
import { api } from './api'
import type { DueFollowup } from '../types'

let notificationPermission: NotificationPermission = 'default'
let pollingInterval: number | null = null
const POLLING_INTERVAL_MS = 30000 // 30 seconds
const shownNotificationIds = new Set<string>() // Track which followups we've already shown

/**
 * Request browser notification permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    notificationPermission = 'granted'
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    notificationPermission = 'denied'
    return 'denied'
  }

  // Request permission
  const permission = await Notification.requestPermission()
  notificationPermission = permission
  return permission
}

/**
 * Check for due followups from API
 */
export async function checkDueFollowups(): Promise<DueFollowup[]> {
  try {
    const dueFollowups = await api.getDueFollowups()
    return dueFollowups
  } catch (error) {
    console.error('Error checking due followups:', error)
    return []
  }
}

/**
 * Show browser notification for a followup
 */
export function showNotification(followup: DueFollowup): void {
  if (notificationPermission !== 'granted') {
    return
  }

  // Don't show duplicate notifications
  if (shownNotificationIds.has(followup.followup_id)) {
    return
  }

  const notification = new Notification('Follow-up Due', {
    body: followup.message,
    icon: '/favicon.svg', // Custom favicon
    tag: `followup-${followup.followup_id}`, // Prevent duplicate notifications
    requireInteraction: false,
  })

  // Mark as shown
  shownNotificationIds.add(followup.followup_id)

  // Handle click - navigate to seed detail page using slug if available
  notification.onclick = () => {
    window.focus()
    // Use slug if available, otherwise fall back to seed_id (backward compatibility)
    const identifier = followup.seed_slug || followup.seed_id
    window.location.href = `/seeds/${identifier}`
    notification.close()
  }

  // Clean up shown IDs after 5 minutes to allow re-notification if still due
  setTimeout(() => {
    shownNotificationIds.delete(followup.followup_id)
  }, 5 * 60 * 1000)
}

/**
 * Set up notification polling
 * Checks for due followups every 30 seconds and shows notifications
 */
export function setupNotificationPolling(): () => void {
  if (pollingInterval !== null) {
    // Already polling
    return () => {
      if (pollingInterval !== null) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
    }
  }

  // Check immediately
  checkDueFollowups().then((dueFollowups) => {
    for (const followup of dueFollowups) {
      showNotification(followup)
    }
  })

  // Set up interval
  pollingInterval = window.setInterval(async () => {
    const dueFollowups = await checkDueFollowups()
    for (const followup of dueFollowups) {
      showNotification(followup)
    }
  }, POLLING_INTERVAL_MS)

  // Return cleanup function
  return () => {
    if (pollingInterval !== null) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }
}

/**
 * Stop notification polling
 */
export function stopNotificationPolling(): void {
  if (pollingInterval !== null) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

