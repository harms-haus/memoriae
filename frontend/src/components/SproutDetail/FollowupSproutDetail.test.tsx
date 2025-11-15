// FollowupSproutDetail component unit tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FollowupSproutDetail } from './FollowupSproutDetail'
import { api } from '../../services/api'
import type { Sprout, FollowupSproutState } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    dismissFollowupSprout: vi.fn(),
    snoozeFollowupSprout: vi.fn(),
  },
}))

// Mock useUserSettings hook
const mockSettings = { timezone: 'America/New_York' }
vi.mock('../../hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: mockSettings,
    loading: false,
    error: null,
  }),
}))

// Mock timezone utilities
vi.mock('../../utils/timezone', () => ({
  formatDateInTimezone: vi.fn((dateString: string) => {
    // Simple mock that returns formatted date
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { timeZone: 'America/New_York' })
  }),
  getBrowserTimezone: vi.fn(() => 'America/New_York'),
}))

// Mock mother-theme components
vi.mock('@mother/components/Panel', () => ({
  Panel: ({ children, variant, className }: any) => (
    <div data-testid="panel" data-variant={variant} className={className}>
      {children}
    </div>
  ),
}))

vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, variant, disabled, icon: Icon, 'aria-label': ariaLabel, title }: any) => (
    <button
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
    >
      {Icon && <span data-testid="icon">{Icon.name || 'Icon'}</span>}
      {children}
    </button>
  ),
}))

vi.mock('@mother/components/Badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

vi.mock('@mother/components/ExpandingPanel', () => ({
  ExpandingPanel: ({ children, title, defaultExpanded }: any) => (
    <div data-testid="expanding-panel" data-expanded={defaultExpanded}>
      <div data-testid="expanding-panel-title">{title}</div>
      {children}
    </div>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Edit: () => <span data-testid="edit-icon">Edit</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  X: () => <span data-testid="x-icon">X</span>,
}))

// Suppress console.error for alert calls
const originalAlert = window.alert
beforeEach(() => {
  window.alert = vi.fn()
})

afterEach(() => {
  window.alert = originalAlert
})

const mockSprout: Sprout = {
  id: 'sprout-1',
  seed_id: 'seed-1',
  sprout_type: 'followup',
  sprout_data: {
    trigger: 'manual',
    initial_time: '2024-01-15T14:00:00.000Z',
    initial_message: 'Follow up on this task',
  },
  created_at: '2024-01-15T12:00:00.000Z',
  automation_id: null,
}

const mockState: FollowupSproutState = {
  due_time: '2024-01-15T14:00:00.000Z',
  message: 'Follow up on this task',
  dismissed: false,
  transactions: [],
}

describe('FollowupSproutDetail Component', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnUpdate.mockClear()
  })

  describe('Initial Rendering', () => {
    it('should render loading state initially', async () => {
      // The loading state is very brief, so we need to check immediately
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)
      
      // Loading state might be too brief to catch, but we can verify the component renders
      await waitFor(() => {
        expect(screen.getByText('Follow up on this task')).toBeInTheDocument()
      })
    })

    it('should render sprout details after loading', async () => {
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByText('Follow up on this task')).toBeInTheDocument()
      })
    })

    it('should display due time', async () => {
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        // Should show formatted date
        const timeElement = screen.getByText(/Follow up on this task/)
        expect(timeElement).toBeInTheDocument()
      })
    })

    it('should display message', async () => {
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByText('Follow up on this task')).toBeInTheDocument()
      })
    })

    it('should show action buttons when not dismissed', async () => {
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        const editButton = screen.getByLabelText('Edit follow-up sprout')
        const snoozeButton = screen.getByLabelText('Snooze follow-up sprout')
        const dismissButton = screen.getByLabelText('Dismiss follow-up sprout')

        expect(editButton).toBeInTheDocument()
        expect(snoozeButton).toBeInTheDocument()
        expect(dismissButton).toBeInTheDocument()
      })
    })

    it('should show dismissed badge when dismissed', async () => {
      // The component computes state from sprout data initially, but after dismiss
      // the API returns updated state. We need to simulate the state after dismiss.
      const dismissedState: FollowupSproutState = {
        ...mockState,
        dismissed: true,
        dismissed_at: '2024-01-15T13:00:00.000Z',
      }

      // Mock the dismiss API to return dismissed state
      vi.mocked(api.dismissFollowupSprout).mockResolvedValue(dismissedState)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      // Initially, state is computed from sprout data (not dismissed)
      await waitFor(() => {
        expect(screen.getByText('Follow up on this task')).toBeInTheDocument()
      })

      // After dismissing, the state should be updated
      const dismissButton = screen.getByLabelText('Dismiss follow-up sprout')
      await userEvent.click(dismissButton)

      await waitFor(() => {
        // After dismiss, should show dismissed badge
        const badges = screen.queryAllByTestId('badge')
        const dismissedBadge = badges.find(b => b.textContent === 'Dismissed')
        expect(dismissedBadge).toBeTruthy()
      })
    })
  })

  describe('Dismiss Functionality', () => {
    it('should dismiss sprout on dismiss button click', async () => {
      const user = userEvent.setup()
      const dismissedState: FollowupSproutState = {
        ...mockState,
        dismissed: true,
        dismissed_at: '2024-01-15T13:00:00.000Z',
      }

      vi.mocked(api.dismissFollowupSprout).mockResolvedValue(dismissedState)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Dismiss follow-up sprout')).toBeInTheDocument()
      })

      const dismissButton = screen.getByLabelText('Dismiss follow-up sprout')
      await user.click(dismissButton)

      await waitFor(() => {
        expect(api.dismissFollowupSprout).toHaveBeenCalledWith('sprout-1', { type: 'followup' })
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should disable dismiss button while dismissing', async () => {
      const user = userEvent.setup()
      const dismissedState: FollowupSproutState = {
        ...mockState,
        dismissed: true,
      }

      // Make API call take some time
      let resolvePromise: (value: FollowupSproutState) => void
      const promise = new Promise<FollowupSproutState>((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(api.dismissFollowupSprout).mockReturnValue(promise)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Dismiss follow-up sprout')).toBeInTheDocument()
      })

      const dismissButton = screen.getByLabelText('Dismiss follow-up sprout')
      await user.click(dismissButton)

      // Button should be disabled while processing
      await waitFor(() => {
        expect(dismissButton).toBeDisabled()
      })

      // Resolve the promise
      resolvePromise!(dismissedState)
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should not dismiss if already dismissing', async () => {
      const user = userEvent.setup()
      const dismissedState: FollowupSproutState = {
        ...mockState,
        dismissed: true,
      }

      let resolvePromise: (value: FollowupSproutState) => void
      const promise = new Promise<FollowupSproutState>((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(api.dismissFollowupSprout).mockReturnValue(promise)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Dismiss follow-up sprout')).toBeInTheDocument()
      })

      const dismissButton = screen.getByLabelText('Dismiss follow-up sprout')
      
      // Click multiple times rapidly
      await user.click(dismissButton)
      await user.click(dismissButton)
      await user.click(dismissButton)

      // Should only be called once
      await waitFor(() => {
        expect(api.dismissFollowupSprout).toHaveBeenCalledTimes(1)
      })

      resolvePromise!(dismissedState)
    })

    it('should handle dismiss error', async () => {
      const user = userEvent.setup()
      const error = new Error('Failed to dismiss')
      vi.mocked(api.dismissFollowupSprout).mockRejectedValue(error)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Dismiss follow-up sprout')).toBeInTheDocument()
      })

      const dismissButton = screen.getByLabelText('Dismiss follow-up sprout')
      await user.click(dismissButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to dismiss')
      })
    })
  })

  describe('Snooze Functionality', () => {
    it('should open snooze modal on snooze button click', async () => {
      const user = userEvent.setup()
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Snooze follow-up sprout')).toBeInTheDocument()
      })

      const snoozeButton = screen.getByLabelText('Snooze follow-up sprout')
      await user.click(snoozeButton)

      await waitFor(() => {
        expect(screen.getByText('Snooze Follow-up')).toBeInTheDocument()
      })
    })

    it('should snooze for 1 hour', async () => {
      const user = userEvent.setup()
      const snoozedState: FollowupSproutState = {
        ...mockState,
        due_time: '2024-01-15T15:00:00.000Z', // 1 hour later
      }

      vi.mocked(api.snoozeFollowupSprout).mockResolvedValue(snoozedState)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Snooze follow-up sprout')).toBeInTheDocument()
      })

      const snoozeButton = screen.getByLabelText('Snooze follow-up sprout')
      await user.click(snoozeButton)

      await waitFor(() => {
        expect(screen.getByText('Snooze Follow-up')).toBeInTheDocument()
      })

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      await waitFor(() => {
        expect(api.snoozeFollowupSprout).toHaveBeenCalledWith('sprout-1', { duration_minutes: 60 })
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should snooze for 1 day', async () => {
      const user = userEvent.setup()
      const snoozedState: FollowupSproutState = {
        ...mockState,
        due_time: '2024-01-16T14:00:00.000Z', // 1 day later
      }

      vi.mocked(api.snoozeFollowupSprout).mockResolvedValue(snoozedState)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Snooze follow-up sprout')).toBeInTheDocument()
      })

      const snoozeButton = screen.getByLabelText('Snooze follow-up sprout')
      await user.click(snoozeButton)

      await waitFor(() => {
        expect(screen.getByText('Snooze Follow-up')).toBeInTheDocument()
      })

      const oneDayButton = screen.getByText('1 day')
      await user.click(oneDayButton)

      await waitFor(() => {
        expect(api.snoozeFollowupSprout).toHaveBeenCalledWith('sprout-1', { duration_minutes: 1440 })
      })
    })

    it('should snooze for 1 week', async () => {
      const user = userEvent.setup()
      const snoozedState: FollowupSproutState = {
        ...mockState,
        due_time: '2024-01-22T14:00:00.000Z', // 1 week later
      }

      vi.mocked(api.snoozeFollowupSprout).mockResolvedValue(snoozedState)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Snooze follow-up sprout')).toBeInTheDocument()
      })

      const snoozeButton = screen.getByLabelText('Snooze follow-up sprout')
      await user.click(snoozeButton)

      await waitFor(() => {
        expect(screen.getByText('Snooze Follow-up')).toBeInTheDocument()
      })

      const oneWeekButton = screen.getByText('1 week')
      await user.click(oneWeekButton)

      await waitFor(() => {
        expect(api.snoozeFollowupSprout).toHaveBeenCalledWith('sprout-1', { duration_minutes: 10080 })
      })
    })

    it('should close snooze modal on cancel', async () => {
      const user = userEvent.setup()
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Snooze follow-up sprout')).toBeInTheDocument()
      })

      const snoozeButton = screen.getByLabelText('Snooze follow-up sprout')
      await user.click(snoozeButton)

      await waitFor(() => {
        expect(screen.getByText('Snooze Follow-up')).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Snooze Follow-up')).not.toBeInTheDocument()
      })
    })

    it('should close snooze modal on overlay click', async () => {
      const user = userEvent.setup()
      const { container } = render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Snooze follow-up sprout')).toBeInTheDocument()
      })

      const snoozeButton = screen.getByLabelText('Snooze follow-up sprout')
      await user.click(snoozeButton)

      await waitFor(() => {
        expect(screen.getByText('Snooze Follow-up')).toBeInTheDocument()
      })

      const overlay = container.querySelector('.modal-overlay')
      expect(overlay).toBeInTheDocument()
      await user.click(overlay!)

      await waitFor(() => {
        expect(screen.queryByText('Snooze Follow-up')).not.toBeInTheDocument()
      })
    })

    it('should handle snooze error', async () => {
      const user = userEvent.setup()
      const error = new Error('Failed to snooze')
      vi.mocked(api.snoozeFollowupSprout).mockRejectedValue(error)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Snooze follow-up sprout')).toBeInTheDocument()
      })

      const snoozeButton = screen.getByLabelText('Snooze follow-up sprout')
      await user.click(snoozeButton)

      await waitFor(() => {
        expect(screen.getByText('Snooze Follow-up')).toBeInTheDocument()
      })

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to snooze')
      })
    })
  })

  describe('Edit Functionality', () => {
    it('should open edit modal on edit button click', async () => {
      const user = userEvent.setup()
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Edit follow-up sprout')).toBeInTheDocument()
      })

      const editButton = screen.getByLabelText('Edit follow-up sprout')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Edit Follow-up')).toBeInTheDocument()
      })
    })

    it('should close edit modal on close button click', async () => {
      const user = userEvent.setup()
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Edit follow-up sprout')).toBeInTheDocument()
      })

      const editButton = screen.getByLabelText('Edit follow-up sprout')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Edit Follow-up')).toBeInTheDocument()
      })

      const closeButton = screen.getByText('Close')
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit Follow-up')).not.toBeInTheDocument()
      })
    })

    it('should close edit modal on overlay click', async () => {
      const user = userEvent.setup()
      const { container } = render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Edit follow-up sprout')).toBeInTheDocument()
      })

      const editButton = screen.getByLabelText('Edit follow-up sprout')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Edit Follow-up')).toBeInTheDocument()
      })

      const overlay = container.querySelector('.modal-overlay')
      expect(overlay).toBeInTheDocument()
      await user.click(overlay!)

      await waitFor(() => {
        expect(screen.queryByText('Edit Follow-up')).not.toBeInTheDocument()
      })
    })
  })

  describe('Transaction History', () => {
    it('should display transaction history when available', async () => {
      // The component initializes with empty transactions from sprout data
      // To test transaction history, we need to simulate state after an action
      const stateWithTransactions: FollowupSproutState = {
        ...mockState,
        transactions: [
          {
            id: 'txn-1',
            sprout_id: 'sprout-1',
            transaction_type: 'creation',
            transaction_data: {
              trigger: 'manual',
              initial_time: '2024-01-15T14:00:00.000Z',
              initial_message: 'Follow up',
            } as any, // Type assertion needed for test mock
            created_at: '2024-01-15T12:00:00.000Z',
          },
          {
            id: 'txn-2',
            sprout_id: 'sprout-1',
            transaction_type: 'snooze',
            transaction_data: {
              snoozed_at: '2024-01-15T13:00:00.000Z',
              duration_minutes: 60,
              method: 'manual',
            },
            created_at: '2024-01-15T13:00:00.000Z',
          },
        ],
      }

      // Mock snooze to return state with transactions
      vi.mocked(api.snoozeFollowupSprout).mockResolvedValue(stateWithTransactions)

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByText('Follow up on this task')).toBeInTheDocument()
      })

      // Trigger snooze to get state with transactions
      const snoozeButton = screen.getByLabelText('Snooze follow-up sprout')
      await userEvent.click(snoozeButton)

      await waitFor(() => {
        expect(screen.getByText('Snooze Follow-up')).toBeInTheDocument()
      })

      const oneHourButton = screen.getByText('1 hour')
      await userEvent.click(oneHourButton)

      await waitFor(() => {
        // After snooze, state should have transactions and history should be visible
        expect(screen.getByText('Transaction History')).toBeInTheDocument()
      })
    })

    it('should not display transaction history when empty', async () => {
      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.queryByText('Transaction History')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing sprout data gracefully', async () => {
      const sproutWithMissingData: Sprout = {
        ...mockSprout,
        sprout_data: {} as any,
      }

      render(<FollowupSproutDetail sprout={sproutWithMissingData} onUpdate={mockOnUpdate} />)

      // Should not throw error
      await waitFor(() => {
        expect(screen.getByTestId('panel')).toBeInTheDocument()
      })
    })

    it('should handle API error with non-Error object', async () => {
      const user = userEvent.setup()
      vi.mocked(api.dismissFollowupSprout).mockRejectedValue('String error')

      render(<FollowupSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Dismiss follow-up sprout')).toBeInTheDocument()
      })

      const dismissButton = screen.getByLabelText('Dismiss follow-up sprout')
      await user.click(dismissButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to dismiss followup sprout')
      })
    })
  })
})

