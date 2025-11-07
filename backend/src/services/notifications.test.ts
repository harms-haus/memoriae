// NotificationService tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService } from './notifications'
import { FollowupService } from './followups'
import type { DueFollowup } from '../types/followups'

// Mock FollowupService
vi.mock('./followups', () => ({
  FollowupService: {
    getDueFollowups: vi.fn(),
  },
}))

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkDueFollowups', () => {
    it('should delegate to FollowupService.getDueFollowups', async () => {
      const userId = 'user-123'
      const mockDueFollowups: DueFollowup[] = [
        {
          followup_id: 'followup-1',
          seed_id: 'seed-1',
          user_id: userId,
          due_time: new Date('2024-01-01T10:00:00Z'),
          message: 'Test followup',
        },
      ]

      vi.mocked(FollowupService.getDueFollowups).mockResolvedValue(mockDueFollowups)

      const result = await NotificationService.checkDueFollowups(userId)

      expect(FollowupService.getDueFollowups).toHaveBeenCalledWith(userId)
      expect(result).toEqual(mockDueFollowups)
    })

    it('should return empty array when no due followups', async () => {
      const userId = 'user-123'
      vi.mocked(FollowupService.getDueFollowups).mockResolvedValue([])

      const result = await NotificationService.checkDueFollowups(userId)

      expect(result).toEqual([])
    })
  })
})

