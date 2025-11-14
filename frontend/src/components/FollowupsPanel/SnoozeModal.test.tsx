// SnoozeModal component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SnoozeModal } from './SnoozeModal'
import { api } from '../../services/api'
import type { Followup } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    snoozeFollowup: vi.fn(),
  },
}))

// Mock Dialog components
vi.mock('@mother/components/Dialog', () => ({
  Dialog: ({ open, children, onOpenChange, size }: any) => (
    open ? (
      <div data-testid="dialog" data-size={size}>
        {children}
      </div>
    ) : null
  ),
  DialogHeader: ({ title, onClose }: any) => (
    <div data-testid="dialog-header">
      <h2>{title}</h2>
      <button onClick={onClose}>Close</button>
    </div>
  ),
  DialogBody: ({ children }: any) => <div data-testid="dialog-body">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}))

// Mock Button component
vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, type, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}))

const mockFollowup: Followup = {
  id: 'followup-1',
  seed_id: 'seed-1',
  created_at: '2024-01-01T00:00:00.000Z',
  due_time: '2024-01-02T12:00:00.000Z',
  message: 'Test follow-up message',
  dismissed: false,
  transactions: [],
}

describe('SnoozeModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(
        <SnoozeModal
          open={false}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Snooze Follow-up')).toBeInTheDocument()
    })

    it('should render with small size', () => {
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const dialog = screen.getByTestId('dialog')
      expect(dialog.getAttribute('data-size')).toBe('small')
    })

    it('should render duration options', () => {
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      expect(screen.getByText('15 minutes')).toBeInTheDocument()
      expect(screen.getByText('30 minutes')).toBeInTheDocument()
      expect(screen.getByText('1 hour')).toBeInTheDocument()
      expect(screen.getByText('2 hours')).toBeInTheDocument()
      expect(screen.getByText('4 hours')).toBeInTheDocument()
      expect(screen.getByText('1 day')).toBeInTheDocument()
    })

    it('should render custom duration input', () => {
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      expect(screen.getByLabelText('Or enter custom duration (minutes)')).toBeInTheDocument()
    })
  })

  describe('Duration Selection', () => {
    it('should select duration option when clicked', async () => {
      const user = userEvent.setup()
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      expect(oneHourButton.getAttribute('data-variant')).toBe('primary')
    })

    it('should clear custom minutes when option is selected', async () => {
      const user = userEvent.setup()
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const customInput = screen.getByLabelText('Or enter custom duration (minutes)') as HTMLInputElement
      await user.type(customInput, '90')

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      expect(customInput.value).toBe('')
    })

    it('should clear selected option when custom minutes is entered', async () => {
      const user = userEvent.setup()
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      const customInput = screen.getByLabelText('Or enter custom duration (minutes)') as HTMLInputElement
      await user.type(customInput, '90')

      expect(oneHourButton.getAttribute('data-variant')).toBe('secondary')
    })
  })

  describe('Form Submission', () => {
    it('should snooze with selected duration option', async () => {
      const user = userEvent.setup()
      const onSnoozed = vi.fn()
      const onOpenChange = vi.fn()
      vi.mocked(api.snoozeFollowup).mockResolvedValue(mockFollowup)

      render(
        <SnoozeModal
          open={true}
          onOpenChange={onOpenChange}
          followup={mockFollowup}
          onSnoozed={onSnoozed}
        />
      )

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      const submitButton = screen.getByText('Snooze')
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.snoozeFollowup).toHaveBeenCalledWith('followup-1', 60)
        expect(onSnoozed).toHaveBeenCalled()
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should snooze with custom duration', async () => {
      const user = userEvent.setup()
      const onSnoozed = vi.fn()
      const onOpenChange = vi.fn()
      vi.mocked(api.snoozeFollowup).mockResolvedValue(mockFollowup)

      render(
        <SnoozeModal
          open={true}
          onOpenChange={onOpenChange}
          followup={mockFollowup}
          onSnoozed={onSnoozed}
        />
      )

      const customInput = screen.getByLabelText('Or enter custom duration (minutes)')
      await user.type(customInput, '90')

      const submitButton = screen.getByText('Snooze')
      await user.click(submitButton)

      await waitFor(() => {
        expect(api.snoozeFollowup).toHaveBeenCalledWith('followup-1', 90)
        expect(onSnoozed).toHaveBeenCalled()
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should show error when no duration is selected', async () => {
      const user = userEvent.setup()
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const submitButton = screen.getByText('Snooze')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please select a duration or enter a custom duration')).toBeInTheDocument()
      })
    })

    it('should show error when custom duration is invalid', async () => {
      const user = userEvent.setup()
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const customInput = screen.getByLabelText('Or enter custom duration (minutes)') as HTMLInputElement
      // Remove min attribute to allow form submission
      customInput.removeAttribute('min')
      // Type "0" - this should trigger validation error
      await user.type(customInput, '0')
      
      // Wait for input value to be set
      await waitFor(() => {
        expect(customInput.value).toBe('0')
      })

      const form = customInput.closest('form')
      // Use fireEvent.submit to bypass HTML5 validation
      fireEvent.submit(form!)

      await waitFor(() => {
        const errorElement = screen.getByText('Custom duration must be a positive number')
        expect(errorElement).toBeInTheDocument()
        expect(errorElement).toHaveClass('text-error')
      }, { timeout: 2000 })
    })

    it('should show error when custom duration is not a number', async () => {
      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const customInput = screen.getByLabelText('Or enter custom duration (minutes)') as HTMLInputElement
      // Remove min attribute and type attribute to allow non-numeric input
      customInput.removeAttribute('min')
      customInput.type = 'text'
      // Set the value directly and trigger change event
      customInput.value = 'abc'
      fireEvent.change(customInput, { target: { value: 'abc' } })
      
      // Wait for input value to be set
      await waitFor(() => {
        expect(customInput.value).toBe('abc')
      })

      const form = customInput.closest('form')
      // Use fireEvent.submit to bypass HTML5 validation
      fireEvent.submit(form!)

      await waitFor(() => {
        const errorElement = screen.getByText('Custom duration must be a positive number')
        expect(errorElement).toBeInTheDocument()
        expect(errorElement).toHaveClass('text-error')
      }, { timeout: 2000 })
    })

    it('should show error on API failure', async () => {
      const user = userEvent.setup()
      vi.mocked(api.snoozeFollowup).mockRejectedValue(new Error('API Error'))

      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      const submitButton = screen.getByText('Snooze')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })
    })

    it('should show submitting state during snooze', async () => {
      const user = userEvent.setup()
      let resolveSnooze: (value: Followup) => void
      const snoozePromise = new Promise<Followup>((resolve) => {
        resolveSnooze = resolve
      })
      vi.mocked(api.snoozeFollowup).mockReturnValue(snoozePromise)

      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      const submitButton = screen.getByText('Snooze')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Snoozing...')).toBeInTheDocument()
        const updatedButton = screen.getByText('Snoozing...')
        expect(updatedButton).toBeDisabled()
      })

      resolveSnooze!(mockFollowup)
      await waitFor(() => {
        expect(screen.queryByText('Snoozing...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Reset', () => {
    it('should reset form after successful snooze', async () => {
      const user = userEvent.setup()
      vi.mocked(api.snoozeFollowup).mockResolvedValue(mockFollowup)

      render(
        <SnoozeModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      const submitButton = screen.getByText('Snooze')
      await user.click(submitButton)

      await waitFor(() => {
        expect(oneHourButton.getAttribute('data-variant')).toBe('secondary')
      })
    })

    it('should reset form when closed', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      render(
        <SnoozeModal
          open={true}
          onOpenChange={onOpenChange}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('Close Behavior', () => {
    it('should not close when submitting', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      let resolveSnooze: (value: Followup) => void
      const snoozePromise = new Promise<Followup>((resolve) => {
        resolveSnooze = resolve
      })
      vi.mocked(api.snoozeFollowup).mockReturnValue(snoozePromise)

      render(
        <SnoozeModal
          open={true}
          onOpenChange={onOpenChange}
          followup={mockFollowup}
          onSnoozed={vi.fn()}
        />
      )

      const oneHourButton = screen.getByText('1 hour')
      await user.click(oneHourButton)

      const submitButton = screen.getByText('Snooze')
      await user.click(submitButton)

      // Wait for submitting state
      await waitFor(() => {
        expect(screen.getByText('Snoozing...')).toBeInTheDocument()
      })

      // Try to close while submitting by clicking the close button
      const closeButton = screen.getByText('Close')
      await user.click(closeButton)

      // Should not have called onOpenChange because handleClose checks submitting
      expect(onOpenChange).not.toHaveBeenCalled()

      resolveSnooze!(mockFollowup)
    })
  })
})

