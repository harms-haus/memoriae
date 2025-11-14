// FollowupsPanel component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FollowupsPanel } from './FollowupsPanel'
import { api } from '../../services/api'
import type { Followup } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    getFollowups: vi.fn(),
  },
}))

// Mock Button component
vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

// Mock Panel component
vi.mock('@mother/components/Panel', () => ({
  Panel: ({ children, className, variant }: any) => (
    <div className={className} data-variant={variant}>
      {children}
    </div>
  ),
}))

// Mock CreateFollowupModal
vi.mock('./CreateFollowupModal', () => ({
  CreateFollowupModal: ({ open, onOpenChange, onCreated }: any) => (
    open ? (
      <div data-testid="create-followup-modal">
        <button onClick={() => onOpenChange(false)}>Close</button>
        <button onClick={onCreated}>Create</button>
      </div>
    ) : null
  ),
}))

// Mock FollowupItem
vi.mock('./FollowupItem', () => ({
  FollowupItem: ({ followup, onUpdate }: any) => (
    <div data-testid={`followup-item-${followup.id}`}>
      <span>{followup.message}</span>
      <button onClick={onUpdate}>Update</button>
    </div>
  ),
}))

const mockFollowups: Followup[] = [
  {
    id: 'followup-1',
    seed_id: 'seed-1',
    created_at: '2024-01-01T00:00:00.000Z',
    due_time: '2024-01-02T00:00:00.000Z',
    message: 'Test follow-up 1',
    dismissed: false,
    transactions: [],
  },
  {
    id: 'followup-2',
    seed_id: 'seed-1',
    created_at: '2024-01-01T00:00:00.000Z',
    due_time: '2024-01-03T00:00:00.000Z',
    message: 'Test follow-up 2',
    dismissed: false,
    transactions: [],
  },
]

describe('FollowupsPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading message initially', async () => {
      vi.mocked(api.getFollowups).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<FollowupsPanel seedId="seed-1" />)

      expect(screen.getByText('Follow-ups')).toBeInTheDocument()
      expect(screen.getByText('Loading follow-ups...')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message when loading fails', async () => {
      vi.mocked(api.getFollowups).mockRejectedValue(new Error('Failed to load'))

      render(<FollowupsPanel seedId="seed-1" />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument()
      })
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('should retry loading when retry button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(api.getFollowups)
        .mockRejectedValueOnce(new Error('Failed to load'))
        .mockResolvedValueOnce(mockFollowups)

      render(<FollowupsPanel seedId="seed-1" />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)

      await waitFor(() => {
        expect(api.getFollowups).toHaveBeenCalledTimes(2)
        expect(screen.getByText('Test follow-up 1')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty message when no follow-ups exist', async () => {
      vi.mocked(api.getFollowups).mockResolvedValue([])

      render(<FollowupsPanel seedId="seed-1" />)

      await waitFor(() => {
        expect(screen.getByText('No follow-ups yet.')).toBeInTheDocument()
      })
    })
  })

  describe('Follow-ups List', () => {
    it('should display list of follow-ups', async () => {
      vi.mocked(api.getFollowups).mockResolvedValue(mockFollowups)

      render(<FollowupsPanel seedId="seed-1" />)

      await waitFor(() => {
        expect(screen.getByText('Test follow-up 1')).toBeInTheDocument()
        expect(screen.getByText('Test follow-up 2')).toBeInTheDocument()
      })
    })

    it('should render FollowupItem for each follow-up', async () => {
      vi.mocked(api.getFollowups).mockResolvedValue(mockFollowups)

      render(<FollowupsPanel seedId="seed-1" />)

      await waitFor(() => {
        expect(screen.getByTestId('followup-item-followup-1')).toBeInTheDocument()
        expect(screen.getByTestId('followup-item-followup-2')).toBeInTheDocument()
      })
    })
  })

  describe('Create Follow-up', () => {
    it('should open create modal when button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(api.getFollowups).mockResolvedValue([])

      render(<FollowupsPanel seedId="seed-1" />)

      await waitFor(() => {
        expect(screen.getByText('Create Follow-up')).toBeInTheDocument()
      })

      const createButton = screen.getByText('Create Follow-up')
      await user.click(createButton)

      expect(screen.getByTestId('create-followup-modal')).toBeInTheDocument()
    })

    it('should close modal when onOpenChange is called', async () => {
      const user = userEvent.setup()
      vi.mocked(api.getFollowups).mockResolvedValue([])

      render(<FollowupsPanel seedId="seed-1" />)

      await waitFor(() => {
        expect(screen.getByText('Create Follow-up')).toBeInTheDocument()
      })

      const createButton = screen.getByText('Create Follow-up')
      await user.click(createButton)

      expect(screen.getByTestId('create-followup-modal')).toBeInTheDocument()

      const closeButton = screen.getByText('Close')
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId('create-followup-modal')).not.toBeInTheDocument()
      })
    })

    it('should reload follow-ups after creating', async () => {
      const user = userEvent.setup()
      vi.mocked(api.getFollowups)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockFollowups)

      render(<FollowupsPanel seedId="seed-1" />)

      await waitFor(() => {
        expect(screen.getByText('Create Follow-up')).toBeInTheDocument()
      })

      const createButton = screen.getByText('Create Follow-up')
      await user.click(createButton)

      const createButtonInModal = screen.getByText('Create')
      await user.click(createButtonInModal)

      await waitFor(() => {
        expect(api.getFollowups).toHaveBeenCalledTimes(2)
        expect(screen.queryByTestId('create-followup-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('Seed ID Changes', () => {
    it('should reload follow-ups when seedId changes', async () => {
      vi.mocked(api.getFollowups).mockResolvedValue([])

      const { rerender } = render(<FollowupsPanel seedId="seed-1" />)

      await waitFor(() => {
        expect(api.getFollowups).toHaveBeenCalledWith('seed-1')
      })

      rerender(<FollowupsPanel seedId="seed-2" />)

      await waitFor(() => {
        expect(api.getFollowups).toHaveBeenCalledWith('seed-2')
      })
    })
  })
})

