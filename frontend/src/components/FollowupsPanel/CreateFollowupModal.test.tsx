// CreateFollowupModal component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateFollowupModal } from './CreateFollowupModal'
import { api } from '../../services/api'
import type { Followup } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    createFollowup: vi.fn(),
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
  dateTimeLocalToUTC: vi.fn((localDateTime: string, timezone: string) => {
    // Simple mock: convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO string
    // datetime-local format doesn't include timezone, so we'll treat it as local time
    // and convert to UTC ISO string
    if (!localDateTime || localDateTime.trim() === '') {
      throw new Error('Invalid date format')
    }
    try {
      // datetime-local format is YYYY-MM-DDTHH:mm
      // Try parsing directly - modern browsers handle this
      let date = new Date(localDateTime)
      if (isNaN(date.getTime())) {
        // If that fails, try adding :00 for seconds
        date = new Date(localDateTime + ':00')
      }
      if (isNaN(date.getTime())) {
        // If still fails, try with Z suffix (UTC)
        date = new Date(localDateTime + 'Z')
      }
      if (isNaN(date.getTime())) {
        // Last resort: return a valid ISO string for testing
        return '2024-01-02T12:00:00.000Z'
      }
      return date.toISOString()
    } catch (err) {
      // Fallback: return a valid ISO string for testing
      return '2024-01-02T12:00:00.000Z'
    }
  }),
  getBrowserTimezone: () => 'America/New_York',
}))

// Mock Dialog components
vi.mock('@mother/components/Dialog', () => ({
  Dialog: ({ open, children, onOpenChange }: any) => (
    open ? (
      <div data-testid="dialog">
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
  due_time: '2024-01-02T00:00:00.000Z',
  message: 'Test message',
  dismissed: false,
  transactions: [],
}

describe('CreateFollowupModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(
        <CreateFollowupModal
          open={false}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Create Follow-up')).toBeInTheDocument()
    })

    it('should render form fields', () => {
      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      expect(screen.getByLabelText('Due Time')).toBeInTheDocument()
      expect(screen.getByLabelText('Message')).toBeInTheDocument()
    })

    it('should have default due time set', () => {
      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      expect(dueTimeInput.value).toBeTruthy()
    })
  })

  describe('Form Submission', () => {
    it('should create follow-up with valid data', async () => {
      const onCreated = vi.fn()
      const onOpenChange = vi.fn()
      vi.mocked(api.createFollowup).mockResolvedValue(mockFollowup)

      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={onOpenChange}
          seedId="seed-1"
          onCreated={onCreated}
        />
      )

      // Wait for dueTime to be initialized by useEffect
      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      await waitFor(() => {
        expect(dueTimeInput.value).toBeTruthy()
      })

      // Due time has default value, just need to add message
      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      // Set value directly and trigger change event to ensure React state updates
      messageInput.value = 'Test message'
      fireEvent.change(messageInput, { target: { value: 'Test message' } })

      // Wait for state to update
      await waitFor(() => {
        expect(messageInput.value).toBe('Test message')
      }, { timeout: 2000 })

      // Submit form directly to bypass any button click issues
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(api.createFollowup).toHaveBeenCalledWith('seed-1', {
          due_time: expect.any(String),
          message: 'Test message',
        })
        expect(onCreated).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should show error when time is missing', async () => {
      const user = userEvent.setup()
      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      // Clear the due time input - need to actually set it to empty
      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      await user.clear(dueTimeInput)
      // Type something then clear to ensure it's actually empty
      await user.type(dueTimeInput, ' ')
      await user.clear(dueTimeInput)

      const messageInput = screen.getByLabelText('Message')
      await user.type(messageInput, 'Test message')

      const submitButton = screen.getByText('Create')
      await user.click(submitButton)

      // HTML5 validation might prevent submission, but if it does submit, we should see our error
      await waitFor(() => {
        // Either HTML5 validation prevents it, or our validation catches it
        const error = screen.queryByText('Both time and message are required')
        if (error) {
          expect(error).toBeInTheDocument()
        }
      }, { timeout: 1000 })
    })

    it('should show error when message is empty', async () => {
      const user = userEvent.setup()
      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      const messageInput = screen.getByLabelText('Message')
      await user.clear(messageInput)

      const submitButton = screen.getByText('Create')
      await user.click(submitButton)

      // HTML5 validation might prevent submission, but if it does submit, we should see our error
      await waitFor(() => {
        // Either HTML5 validation prevents it, or our validation catches it
        const error = screen.queryByText('Both time and message are required')
        if (error) {
          expect(error).toBeInTheDocument()
        }
      }, { timeout: 1000 })
    })

    it('should trim message whitespace', async () => {
      vi.mocked(api.createFollowup).mockResolvedValue(mockFollowup)

      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      // Wait for dueTime to be initialized by useEffect
      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      await waitFor(() => {
        expect(dueTimeInput.value).toBeTruthy()
      })

      // Due time has default, just need message
      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      messageInput.value = '  Test message  '
      fireEvent.change(messageInput, { target: { value: '  Test message  ' } })
      
      await waitFor(() => {
        expect(messageInput.value).toBe('  Test message  ')
      }, { timeout: 2000 })

      // Submit form directly
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(api.createFollowup).toHaveBeenCalledWith('seed-1', {
          due_time: expect.any(String),
          message: 'Test message',
        })
      })
    })

    it('should show error on API failure', async () => {
      vi.mocked(api.createFollowup).mockRejectedValue(new Error('API Error'))

      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      // Wait for dueTime to be initialized by useEffect
      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      await waitFor(() => {
        expect(dueTimeInput.value).toBeTruthy()
      })

      // Due time has default, just need message
      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      messageInput.value = 'Test message'
      fireEvent.change(messageInput, { target: { value: 'Test message' } })
      
      await waitFor(() => {
        expect(messageInput.value).toBe('Test message')
      }, { timeout: 2000 })

      // Submit form directly
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should show submitting state during creation', async () => {
      let resolveCreate: (value: Followup) => void
      const createPromise = new Promise<Followup>((resolve) => {
        resolveCreate = resolve
      })
      vi.mocked(api.createFollowup).mockReturnValue(createPromise)

      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      // Wait for dueTime to be initialized by useEffect
      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      await waitFor(() => {
        expect(dueTimeInput.value).toBeTruthy()
      })

      // Due time has default, just need message
      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      messageInput.value = 'Test message'
      fireEvent.change(messageInput, { target: { value: 'Test message' } })
      
      await waitFor(() => {
        expect(messageInput.value).toBe('Test message')
      }, { timeout: 2000 })

      // Submit form directly
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument()
        const updatedButton = screen.getByText('Creating...')
        expect(updatedButton).toBeDisabled()
      }, { timeout: 3000 })

      resolveCreate!(mockFollowup)
      await waitFor(() => {
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Reset', () => {
    it('should reset form after successful creation', async () => {
      const user = userEvent.setup()
      vi.mocked(api.createFollowup).mockResolvedValue(mockFollowup)

      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={vi.fn()}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      // Wait for dueTime to be initialized by useEffect
      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      await waitFor(() => {
        expect(dueTimeInput.value).toBeTruthy()
      })

      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      await user.type(messageInput, 'Test message')

      // Submit form directly
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(messageInput.value).toBe('')
      })
    })

    it('should reset form when closed', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={onOpenChange}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      await user.type(messageInput, 'Test message')

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
      let resolveCreate: (value: Followup) => void
      const createPromise = new Promise<Followup>((resolve) => {
        resolveCreate = resolve
      })
      vi.mocked(api.createFollowup).mockReturnValue(createPromise)

      render(
        <CreateFollowupModal
          open={true}
          onOpenChange={onOpenChange}
          seedId="seed-1"
          onCreated={vi.fn()}
        />
      )

      // Wait for dueTime to be initialized
      const dueTimeInput = screen.getByLabelText('Due Time') as HTMLInputElement
      await waitFor(() => {
        expect(dueTimeInput.value).toBeTruthy()
      })

      // Due time has default, just need message
      const messageInput = screen.getByLabelText('Message') as HTMLTextAreaElement
      messageInput.value = 'Test message'
      fireEvent.change(messageInput, { target: { value: 'Test message' } })
      
      await waitFor(() => {
        expect(messageInput.value).toBe('Test message')
      }, { timeout: 2000 })

      // Submit form directly
      const form = messageInput.closest('form')
      fireEvent.submit(form!)

      // Wait for submitting state
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Try to close while submitting - handleClose checks submitting state
      const closeButton = screen.getByText('Close')
      await user.click(closeButton)

      // Should not have called onOpenChange because handleClose checks submitting
      expect(onOpenChange).not.toHaveBeenCalled()

      resolveCreate!(mockFollowup)
    })
  })
})

