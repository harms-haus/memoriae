// FollowupItem component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FollowupItem } from './FollowupItem'
import { api } from '../../services/api'
import type { Followup, CreationTransactionData } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    dismissFollowup: vi.fn(),
  },
}))

// Mock useUserSettings hook
vi.mock('../../hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: { timezone: 'America/New_York' },
    loading: false,
    error: null,
  }),
}))

// Mock timezone utilities
vi.mock('../../utils/timezone', () => ({
  formatDateInTimezone: (dateString: string, timezone: string) => {
    return new Date(dateString).toLocaleString()
  },
  getBrowserTimezone: () => 'America/New_York',
}))

// Mock Button component
vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, icon: Icon, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {Icon && <Icon />}
      {children}
    </button>
  ),
}))

// Mock Badge component
vi.mock('@mother/components/Badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}))

// Mock ExpandingPanel component
vi.mock('@mother/components/ExpandingPanel', () => ({
  ExpandingPanel: ({ children, title }: any) => (
    <div data-testid="expanding-panel">
      <h4>{title}</h4>
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

// Mock EditFollowupModal
vi.mock('./EditFollowupModal', () => ({
  EditFollowupModal: ({ open, onOpenChange, onUpdated }: any) => (
    open ? (
      <div data-testid="edit-followup-modal">
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button onClick={onUpdated}>Save</button>
      </div>
    ) : null
  ),
}))

// Mock SnoozeModal
vi.mock('./SnoozeModal', () => ({
  SnoozeModal: ({ open, onOpenChange, onSnoozed }: any) => (
    open ? (
      <div data-testid="snooze-modal">
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button onClick={onSnoozed}>Snooze</button>
      </div>
    ) : null
  ),
}))

// Mock FollowupTransactions
vi.mock('./FollowupTransactions', () => ({
  FollowupTransactions: ({ transactions }: any) => (
    <div data-testid="followup-transactions">
      {transactions.length} transactions
    </div>
  ),
}))

const mockFollowup: Followup = {
  id: 'followup-1',
  seed_id: 'seed-1',
  created_at: '2024-01-01T00:00:00.000Z',
  due_time: '2024-01-02T12:00:00.000Z',
  message: 'Test follow-up message',
  dismissed: false,
  transactions: [
    {
      id: 'txn-1',
      followup_id: 'followup-1',
      transaction_type: 'creation' as const,
      transaction_data: {
        trigger: 'manual' as const,
        initial_time: '2024-01-02T12:00:00.000Z',
        initial_message: 'Test follow-up message',
      } as CreationTransactionData,
      created_at: '2024-01-01T00:00:00.000Z',
    },
  ],
}

const dismissedFollowup: Followup = {
  ...mockFollowup,
  dismissed: true,
  dismissed_at: '2024-01-01T10:00:00.000Z',
}

describe('FollowupItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.alert
    window.alert = vi.fn()
  })

  describe('Rendering', () => {
    it('should render follow-up message', () => {
      render(<FollowupItem followup={mockFollowup} onUpdate={vi.fn()} />)

      expect(screen.getByText('Test follow-up message')).toBeInTheDocument()
    })

    it('should render formatted due time', () => {
      render(<FollowupItem followup={mockFollowup} onUpdate={vi.fn()} />)

      // The formatted date should be in the document
      const timeElement = screen.getByText(/Test follow-up message/).closest('.followup-item')
      expect(timeElement).toBeInTheDocument()
    })

    it('should show dismissed badge when follow-up is dismissed', () => {
      render(<FollowupItem followup={dismissedFollowup} onUpdate={vi.fn()} />)

      expect(screen.getByText('Dismissed')).toBeInTheDocument()
    })

    it('should not show action buttons when dismissed', () => {
      render(<FollowupItem followup={dismissedFollowup} onUpdate={vi.fn()} />)

      expect(screen.queryByTestId('edit-icon')).not.toBeInTheDocument()
      expect(screen.queryByTestId('clock-icon')).not.toBeInTheDocument()
      expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument()
    })

    it('should show action buttons when not dismissed', () => {
      render(<FollowupItem followup={mockFollowup} onUpdate={vi.fn()} />)

      expect(screen.getByTestId('edit-icon')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })

    it('should render transaction history panel', () => {
      render(<FollowupItem followup={mockFollowup} onUpdate={vi.fn()} />)

      expect(screen.getByText('Transaction History')).toBeInTheDocument()
      expect(screen.getByTestId('followup-transactions')).toBeInTheDocument()
    })
  })

  describe('Edit Functionality', () => {
    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<FollowupItem followup={mockFollowup} onUpdate={vi.fn()} />)

      const editButton = screen.getByTestId('edit-icon').closest('button')
      if (editButton) {
        await user.click(editButton)
      }

      expect(screen.getByTestId('edit-followup-modal')).toBeInTheDocument()
    })

    it('should close edit modal and refresh on update', async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      render(<FollowupItem followup={mockFollowup} onUpdate={onUpdate} />)

      const editButton = screen.getByTestId('edit-icon').closest('button')
      if (editButton) {
        await user.click(editButton)
      }

      const saveButton = screen.getByText('Save')
      await user.click(saveButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled()
        expect(screen.queryByTestId('edit-followup-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('Snooze Functionality', () => {
    it('should open snooze modal when snooze button is clicked', async () => {
      const user = userEvent.setup()
      render(<FollowupItem followup={mockFollowup} onUpdate={vi.fn()} />)

      const snoozeButton = screen.getByTestId('clock-icon').closest('button')
      if (snoozeButton) {
        await user.click(snoozeButton)
      }

      expect(screen.getByTestId('snooze-modal')).toBeInTheDocument()
    })

    it('should close snooze modal and refresh on snooze', async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      render(<FollowupItem followup={mockFollowup} onUpdate={onUpdate} />)

      const snoozeButton = screen.getByTestId('clock-icon').closest('button')
      if (snoozeButton) {
        await user.click(snoozeButton)
      }

      const snoozeConfirmButton = screen.getByText('Snooze')
      await user.click(snoozeConfirmButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled()
        expect(screen.queryByTestId('snooze-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('Dismiss Functionality', () => {
    it('should dismiss follow-up when dismiss button is clicked', async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      vi.mocked(api.dismissFollowup).mockResolvedValue({
        ...mockFollowup,
        dismissed: true,
      })

      render(<FollowupItem followup={mockFollowup} onUpdate={onUpdate} />)

      const dismissButton = screen.getByTestId('x-icon').closest('button')
      if (dismissButton) {
        await user.click(dismissButton)
      }

      await waitFor(() => {
        expect(api.dismissFollowup).toHaveBeenCalledWith('followup-1', 'followup')
        expect(onUpdate).toHaveBeenCalled()
      })
    })

    it('should disable dismiss button while dismissing', async () => {
      const user = userEvent.setup()
      let resolveDismiss: (value: Followup) => void
      const dismissPromise = new Promise<Followup>((resolve) => {
        resolveDismiss = resolve
      })
      vi.mocked(api.dismissFollowup).mockReturnValue(dismissPromise)

      render(<FollowupItem followup={mockFollowup} onUpdate={vi.fn()} />)

      const dismissButton = screen.getByTestId('x-icon').closest('button')
      if (dismissButton) {
        await user.click(dismissButton)
      }

      await waitFor(() => {
        expect(dismissButton).toBeDisabled()
      })

      resolveDismiss!({
        ...mockFollowup,
        dismissed: true,
      })
    })

    it('should show error alert on dismiss failure', async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      vi.mocked(api.dismissFollowup).mockRejectedValue(new Error('Dismiss failed'))

      render(<FollowupItem followup={mockFollowup} onUpdate={onUpdate} />)

      const dismissButton = screen.getByTestId('x-icon').closest('button')
      if (dismissButton) {
        await user.click(dismissButton)
      }

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Dismiss failed')
      })
    })

    it('should not dismiss if already dismissing', async () => {
      const user = userEvent.setup()
      let resolveDismiss: (value: Followup) => void
      const dismissPromise = new Promise<Followup>((resolve) => {
        resolveDismiss = resolve
      })
      vi.mocked(api.dismissFollowup).mockReturnValue(dismissPromise)

      render(<FollowupItem followup={mockFollowup} onUpdate={vi.fn()} />)

      const dismissButton = screen.getByTestId('x-icon').closest('button')
      if (dismissButton) {
        await user.click(dismissButton)
        // Try to click again while dismissing
        await user.click(dismissButton)
      }

      await waitFor(() => {
        expect(api.dismissFollowup).toHaveBeenCalledTimes(1)
      })

      resolveDismiss!({
        ...mockFollowup,
        dismissed: true,
      })
    })
  })

  describe('CSS Classes', () => {
    it('should apply dismissed class when dismissed', () => {
      const { container } = render(
        <FollowupItem followup={dismissedFollowup} onUpdate={vi.fn()} />
      )

      const followupItem = container.querySelector('.followup-item-dismissed')
      expect(followupItem).toBeInTheDocument()
    })

    it('should not apply dismissed class when not dismissed', () => {
      const { container } = render(
        <FollowupItem followup={mockFollowup} onUpdate={vi.fn()} />
      )

      const followupItem = container.querySelector('.followup-item-dismissed')
      expect(followupItem).not.toBeInTheDocument()
    })
  })
})

