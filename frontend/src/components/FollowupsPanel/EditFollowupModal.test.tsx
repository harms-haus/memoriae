// EditFollowupModal component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditFollowupModal } from './EditFollowupModal'
import { api } from '../../services/api'
import type { Followup } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    editFollowup: vi.fn(),
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
  utcToDateTimeLocal: (utcISO: string, timezone: string) => {
    // Simple mock: convert ISO to datetime-local format
    const date = new Date(utcISO)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  },
  dateTimeLocalToUTC: (localDateTime: string, timezone: string) => {
    return new Date(localDateTime).toISOString()
  },
  getBrowserTimezone: () => 'America/New_York',
}))

// Mock Dialog components
vi.mock('@mother/components/Dialog', () => ({
  Dialog: ({ open, children, onOpenChange }: any) => (
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange(false)}>
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
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ),
}))

const mockFollowup: Followup = {
  id: 'followup-1',
  seed_id: 'seed-1',
  created_at: '2024-01-01T00:00:00.000Z',
  due_time: '2024-01-02T12:00:00.000Z',
  message: 'Original message',
  dismissed: false,
  transactions: [],
}

describe('EditFollowupModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(
        <EditFollowupModal
          open={false}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      render(
        <EditFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Follow-up')).toBeInTheDocument()
    })

    it('should populate form with follow-up data', () => {
      render(
        <EditFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement

      expect(dueTimeInput.value).toBeTruthy()
      expect(messageInput.value).toBe('Original message')
    })

    it('should update form when follow-up changes', () => {
      const { rerender } = render(
        <EditFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      expect(messageInput.value).toBe('Original message')

      const updatedFollowup: Followup = {
        ...mockFollowup,
        message: 'Updated message',
      }

      rerender(
        <EditFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          followup={updatedFollowup}
          onUpdated={vi.fn()}
        />
      )

      expect(messageInput.value).toBe('Updated message')
    })
  })

  describe('Form Submission', () => {
    it('should update follow-up with valid data', async () => {
      const onUpdated = vi.fn()
      const onOpenChange = vi.fn()
      const updatedFollowup: Followup = {
        ...mockFollowup,
        message: 'Updated message',
      }
      vi.mocked(api.editFollowup).mockResolvedValue(updatedFollowup)

      render(
        <EditFollowupModal
          open={true}
          onOpenChange={onOpenChange}
          followup={mockFollowup}
          onUpdated={onUpdated}
        />
      )

      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      messageInput.value = 'Updated message'
      fireEvent.change(messageInput, { target: { value: 'Updated message' } })
      
      await waitFor(() => {
        expect(messageInput.value).toBe('Updated message')
      }, { timeout: 2000 })

      // Submit form directly
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(api.editFollowup).toHaveBeenCalledWith('followup-1', {
          due_time: expect.any(String),
          message: 'Updated message',
        })
        expect(onUpdated).toHaveBeenCalled()
        expect(onOpenChange).toHaveBeenCalledWith(false)
      }, { timeout: 3000 })
    })

    it('should show error when time is missing', async () => {
      const user = userEvent.setup()
      render(
        <EditFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      // Remove required attribute to bypass HTML5 validation
      dueTimeInput.removeAttribute('required')
      // Clear the input and trigger change event
      await user.clear(dueTimeInput)
      // Also trigger change event to ensure state updates
      fireEvent.change(dueTimeInput, { target: { value: '' } })
      
      // Wait a moment for state to update
      await waitFor(() => {
        expect(dueTimeInput.value).toBe('')
      }, { timeout: 1000 })

      const form = dueTimeInput.closest('form')
      // Use fireEvent.submit to bypass HTML5 validation
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('Both time and message are required')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should show error when message is empty', async () => {
      const user = userEvent.setup()
      render(
        <EditFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      // Remove required attribute to bypass HTML5 validation
      messageInput.removeAttribute('required')
      // Clear the input and trigger change event
      await user.clear(messageInput)
      // Also trigger change event to ensure state updates
      fireEvent.change(messageInput, { target: { value: '' } })
      
      // Wait a moment for state to update
      await waitFor(() => {
        expect(messageInput.value).toBe('')
      }, { timeout: 1000 })

      const form = messageInput.closest('form')
      // Use fireEvent.submit to bypass HTML5 validation
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('Both time and message are required')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should trim message whitespace', async () => {
      vi.mocked(api.editFollowup).mockResolvedValue(mockFollowup)

      render(
        <EditFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      // Set value directly
      messageInput.value = '  Updated message  '
      fireEvent.change(messageInput, { target: { value: '  Updated message  ' } })

      // Wait a bit for state to update
      await waitFor(() => {
        expect(messageInput.value).toBe('  Updated message  ')
      }, { timeout: 2000 })

      // Submit form directly
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(api.editFollowup).toHaveBeenCalledWith('followup-1', {
          due_time: expect.any(String),
          message: 'Updated message',
        })
      }, { timeout: 3000 })
    })

    it('should show error on API failure', async () => {
      vi.mocked(api.editFollowup).mockRejectedValue(new Error('API Error'))

      render(
        <EditFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      messageInput.value = 'Updated message'
      fireEvent.change(messageInput, { target: { value: 'Updated message' } })
      
      await waitFor(() => {
        expect(messageInput.value).toBe('Updated message')
      }, { timeout: 2000 })

      // Submit form directly
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should show submitting state during update', async () => {
      const user = userEvent.setup()
      let resolveEdit: (value: Followup) => void
      const editPromise = new Promise<Followup>((resolve) => {
        resolveEdit = resolve
      })
      vi.mocked(api.editFollowup).mockReturnValue(editPromise)

      render(
        <EditFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      const messageInput = screen.getByLabelText('Message')
      await user.clear(messageInput)
      await user.type(messageInput, 'Updated message')

      const submitButton = screen.getByText('Save')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
      })

      resolveEdit!(mockFollowup)
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Close Behavior', () => {
    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      render(
        <EditFollowupModal
          open={true}
          onOpenChange={onOpenChange}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should not close when submitting', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      let resolveEdit: (value: Followup) => void
      const editPromise = new Promise<Followup>((resolve) => {
        resolveEdit = resolve
      })
      vi.mocked(api.editFollowup).mockReturnValue(editPromise)

      render(
        <EditFollowupModal
          open={true}
          onOpenChange={onOpenChange}
          followup={mockFollowup}
          onUpdated={vi.fn()}
        />
      )

      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      messageInput.value = 'Updated message'
      fireEvent.change(messageInput, { target: { value: 'Updated message' } })
      
      await waitFor(() => {
        expect(messageInput.value).toBe('Updated message')
      }, { timeout: 2000 })

      // Submit form directly
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      // Wait for submitting state
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Try to close while submitting by clicking the close button
      const closeButton = screen.getByText('Close')
      await user.click(closeButton)

      // Should not have called onOpenChange because handleClose checks submitting
      expect(onOpenChange).not.toHaveBeenCalled()

      resolveEdit!(mockFollowup)
    })
  })
})

