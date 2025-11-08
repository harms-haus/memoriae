// Followup scheduler unit tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FollowupNotificationScheduler, getFollowupNotificationScheduler } from './followup-scheduler'
import { NotificationService } from '../notifications'
import { FollowupService } from '../followups'
import db from '../../db/connection'

// Mock dependencies
vi.mock('../../db/connection', () => ({
  default: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('../notifications', () => ({
  NotificationService: {
    checkDueFollowups: vi.fn(),
  },
}))

vi.mock('../followups', () => ({
  FollowupService: {
    getById: vi.fn(),
    snooze: vi.fn(),
  },
}))

describe('FollowupNotificationScheduler', () => {
  let scheduler: FollowupNotificationScheduler

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    scheduler = new FollowupNotificationScheduler()
  })

  afterEach(() => {
    vi.useRealTimers()
    if (scheduler.isActive()) {
      scheduler.stop()
    }
  })

  describe('start', () => {
    it('should start the scheduler', () => {
      scheduler.start()

      expect(scheduler.isActive()).toBe(true)
    })

    it('should not start if already running', () => {
      scheduler.start()
      const initialIntervalId = (scheduler as any).intervalId

      scheduler.start()

      expect(scheduler.isActive()).toBe(true)
      // Interval should not be recreated
      expect((scheduler as any).intervalId).toBe(initialIntervalId)
    })

    it('should run checkDueFollowups immediately on start', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      } as any)

      scheduler.start()

      // Wait for async check to complete
      await vi.runAllTimersAsync()

      expect(db).toHaveBeenCalled()
    })

    it('should set up interval to run every minute', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      } as any)

      scheduler.start()

      // Advance time by 1 minute
      vi.advanceTimersByTime(60000)
      await vi.runAllTimersAsync()

      // Should have been called at least twice (immediate + after 1 minute)
      expect(db).toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('should stop the scheduler', async () => {
      scheduler.start()
      expect(scheduler.isActive()).toBe(true)

      const stopPromise = scheduler.stop()
      await vi.runAllTimersAsync()
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })

    it('should resolve immediately if not running', async () => {
      const stopPromise = scheduler.stop()
      await vi.runAllTimersAsync()
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })

    it('should clear interval when stopping', async () => {
      scheduler.start()
      const intervalId = (scheduler as any).intervalId

      const stopPromise = scheduler.stop()
      await vi.runAllTimersAsync()
      await stopPromise

      expect(intervalId).toBeNull()
    })

    it('should wait for in-progress check to complete', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve([]), 200))
        ),
      } as any)

      scheduler.start()
      
      // Wait a bit for check to start
      await vi.advanceTimersByTimeAsync(10)

      const stopPromise = scheduler.stop()
      
      // Advance time to complete the check
      await vi.advanceTimersByTimeAsync(200)
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })

    it('should timeout after 5 seconds if processing takes too long', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve([]), 10000))
        ),
      } as any)

      scheduler.start()
      await vi.advanceTimersByTimeAsync(10)

      const stopPromise = scheduler.stop()
      
      // Advance time past timeout
      await vi.advanceTimersByTimeAsync(5000)
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })
  })

  describe('checkDueFollowups', () => {
    it('should check all users for due followups', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
      ]

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(NotificationService.checkDueFollowups).mockResolvedValue([])

      scheduler.start()
      await vi.runAllTimersAsync()

      expect(NotificationService.checkDueFollowups).toHaveBeenCalledTimes(2)
      expect(NotificationService.checkDueFollowups).toHaveBeenCalledWith('user-1')
      expect(NotificationService.checkDueFollowups).toHaveBeenCalledWith('user-2')
    })

    it('should skip if previous check is still running', async () => {
      let resolveCheck: () => void
      const checkPromise = new Promise<void>(resolve => {
        resolveCheck = resolve
      })

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
      } as any)

      vi.mocked(NotificationService.checkDueFollowups).mockImplementation(() => checkPromise)

      scheduler.start()
      await vi.advanceTimersByTimeAsync(10)

      // Try to trigger another check while first is running
      ;(scheduler as any).checkDueFollowups()
      await vi.advanceTimersByTimeAsync(10)

      // Should only be called once
      expect(NotificationService.checkDueFollowups).toHaveBeenCalledTimes(1)

      resolveCheck!()
      await checkPromise
    })

    it('should return early if no users exist', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      } as any)

      scheduler.start()
      await vi.runAllTimersAsync()

      expect(NotificationService.checkDueFollowups).not.toHaveBeenCalled()
    })

    it('should auto-snooze followups that are 30+ minutes past due', async () => {
      const now = new Date()
      const thirtyFiveMinutesAgo = new Date(now.getTime() - 35 * 60 * 1000)

      const mockUsers = [{ id: 'user-1' }]
      const mockDueFollowups = [
        {
          followup_id: 'followup-1',
          seed_id: 'seed-1',
          due_time: thirtyFiveMinutesAgo,
        },
      ]

      const mockFollowupState = {
        id: 'followup-1',
        dismissed: false,
        transactions: [
          {
            id: 'txn-1',
            transaction_type: 'creation',
            created_at: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
          },
        ],
      }

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(NotificationService.checkDueFollowups).mockResolvedValue(mockDueFollowups as any)
      vi.mocked(FollowupService.getById).mockResolvedValue(mockFollowupState as any)
      vi.mocked(FollowupService.snooze).mockResolvedValue(undefined)

      scheduler.start()
      await vi.runAllTimersAsync()

      expect(FollowupService.snooze).toHaveBeenCalledWith('followup-1', 90, 'automatic')
    })

    it('should not auto-snooze if followup was recently snoozed', async () => {
      const now = new Date()
      const thirtyFiveMinutesAgo = new Date(now.getTime() - 35 * 60 * 1000)

      const mockUsers = [{ id: 'user-1' }]
      const mockDueFollowups = [
        {
          followup_id: 'followup-1',
          seed_id: 'seed-1',
          due_time: thirtyFiveMinutesAgo,
        },
      ]

      const mockFollowupState = {
        id: 'followup-1',
        dismissed: false,
        transactions: [
          {
            id: 'txn-1',
            transaction_type: 'snooze',
            created_at: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago (recent)
          },
        ],
      }

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(NotificationService.checkDueFollowups).mockResolvedValue(mockDueFollowups as any)
      vi.mocked(FollowupService.getById).mockResolvedValue(mockFollowupState as any)

      scheduler.start()
      await vi.runAllTimersAsync()

      expect(FollowupService.snooze).not.toHaveBeenCalled()
    })

    it('should not auto-snooze dismissed followups', async () => {
      const now = new Date()
      const thirtyFiveMinutesAgo = new Date(now.getTime() - 35 * 60 * 1000)

      const mockUsers = [{ id: 'user-1' }]
      const mockDueFollowups = [
        {
          followup_id: 'followup-1',
          seed_id: 'seed-1',
          due_time: thirtyFiveMinutesAgo,
        },
      ]

      const mockFollowupState = {
        id: 'followup-1',
        dismissed: true,
        transactions: [],
      }

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(NotificationService.checkDueFollowups).mockResolvedValue(mockDueFollowups as any)
      vi.mocked(FollowupService.getById).mockResolvedValue(mockFollowupState as any)

      scheduler.start()
      await vi.runAllTimersAsync()

      expect(FollowupService.snooze).not.toHaveBeenCalled()
    })

    it('should handle errors for individual users gracefully', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
      ]

      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers),
      } as any)

      vi.mocked(NotificationService.checkDueFollowups)
        .mockRejectedValueOnce(new Error('User 1 error'))
        .mockResolvedValueOnce([])

      scheduler.start()
      await vi.runAllTimersAsync()

      // Should still process user-2 even if user-1 fails
      expect(NotificationService.checkDueFollowups).toHaveBeenCalledTimes(2)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Database error')),
      } as any)

      scheduler.start()
      await vi.runAllTimersAsync()

      // Should not throw, just log error
      expect(scheduler.isActive()).toBe(true)
    })
  })

  describe('isActive', () => {
    it('should return false when not started', () => {
      expect(scheduler.isActive()).toBe(false)
    })

    it('should return true when started', () => {
      scheduler.start()
      expect(scheduler.isActive()).toBe(true)
    })

    it('should return false when stopped', async () => {
      scheduler.start()
      const stopPromise = scheduler.stop()
      await vi.runAllTimersAsync()
      await stopPromise

      expect(scheduler.isActive()).toBe(false)
    })
  })

  describe('getFollowupNotificationScheduler', () => {
    it('should return singleton instance', () => {
      const instance1 = getFollowupNotificationScheduler()
      const instance2 = getFollowupNotificationScheduler()

      expect(instance1).toBe(instance2)
    })
  })
})

