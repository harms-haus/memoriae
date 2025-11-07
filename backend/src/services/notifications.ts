// Notification service for checking due followups
import { FollowupService } from './followups'
import type { DueFollowup } from '../types/followups'

export class NotificationService {
  /**
   * Check for followups that are currently due
   * Returns list of due followups with user info
   * Called by scheduler every minute
   */
  static async checkDueFollowups(userId: string): Promise<DueFollowup[]> {
    return await FollowupService.getDueFollowups(userId)
  }
}

