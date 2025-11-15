// SproutDetailView component unit tests
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SproutDetailView } from './SproutDetailView'
import { api } from '../../services/api'
import type { Sprout } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    getSproutById: vi.fn(),
  },
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock sprout detail components
vi.mock('../SproutDetail/FollowupSproutDetail', () => ({
  FollowupSproutDetail: ({ sprout, onUpdate }: any) => (
    <div data-testid="followup-sprout-detail">
      <div data-testid="sprout-id">{sprout.id}</div>
      <div data-testid="sprout-type">{sprout.sprout_type}</div>
      <button data-testid="update-button" onClick={onUpdate}>Update</button>
    </div>
  ),
}))

vi.mock('../SproutDetail/MusingSproutDetail', () => ({
  MusingSproutDetail: ({ sprout, onUpdate }: any) => (
    <div data-testid="musing-sprout-detail">
      <div data-testid="sprout-id">{sprout.id}</div>
      <div data-testid="sprout-type">{sprout.sprout_type}</div>
      <button data-testid="update-button" onClick={onUpdate}>Update</button>
    </div>
  ),
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
  Button: ({ children, onClick, variant, disabled }: any) => (
    <button
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}))

const mockFollowupSprout: Sprout = {
  id: 'sprout-1',
  seed_id: 'seed-1',
  sprout_type: 'followup',
  sprout_data: {
    trigger: 'manual',
    initial_time: '2024-01-15T14:00:00.000Z',
    initial_message: 'Follow up on this',
  },
  created_at: '2024-01-15T12:00:00.000Z',
  automation_id: null,
}

const mockMusingSprout: Sprout = {
  id: 'sprout-2',
  seed_id: 'seed-1',
  sprout_type: 'musing',
  sprout_data: {
    template_type: 'numbered_ideas',
    content: {
      ideas: ['Idea 1', 'Idea 2'],
    },
    dismissed: false,
    dismissed_at: null,
    completed: false,
    completed_at: null,
  },
  created_at: '2024-01-15T12:00:00.000Z',
  automation_id: null,
}

describe('SproutDetailView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Loading State', () => {
    it('should render loading state initially', () => {
      vi.mocked(api.getSproutById).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      expect(screen.getByText('Loading sprout...')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should render error state on API error', async () => {
      const error = new Error('Failed to load sprout')
      vi.mocked(api.getSproutById).mockRejectedValue(error)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to load sprout')).toBeInTheDocument()
        expect(screen.getByText('Back')).toBeInTheDocument()
      })
    })

    it('should handle non-Error error objects', async () => {
      vi.mocked(api.getSproutById).mockRejectedValue('String error')

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to load sprout')).toBeInTheDocument()
      })
    })
  })

  describe('Sprout Not Found', () => {
    it('should render not found state when sprout is null', async () => {
      vi.mocked(api.getSproutById).mockResolvedValue(null as any)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sprout not found')).toBeInTheDocument()
        expect(screen.getByText('Back')).toBeInTheDocument()
      })
    })
  })

  describe('Followup Sprout Rendering', () => {
    it('should render followup sprout detail', async () => {
      vi.mocked(api.getSproutById).mockResolvedValue(mockFollowupSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('followup-sprout-detail')).toBeInTheDocument()
        expect(screen.getByTestId('sprout-id')).toHaveTextContent('sprout-1')
        expect(screen.getByTestId('sprout-type')).toHaveTextContent('followup')
      })
    })

    it('should reload sprout on update', async () => {
      const user = userEvent.setup()
      vi.mocked(api.getSproutById).mockResolvedValue(mockFollowupSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('followup-sprout-detail')).toBeInTheDocument()
      })

      const updateButton = screen.getByTestId('update-button')
      await user.click(updateButton)

      await waitFor(() => {
        // Should reload sprout (getSproutById called again)
        expect(api.getSproutById).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Musing Sprout Rendering', () => {
    it('should render musing sprout detail', async () => {
      vi.mocked(api.getSproutById).mockResolvedValue(mockMusingSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-2" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('musing-sprout-detail')).toBeInTheDocument()
        expect(screen.getByTestId('sprout-id')).toHaveTextContent('sprout-2')
        expect(screen.getByTestId('sprout-type')).toHaveTextContent('musing')
      })
    })

    it('should reload sprout on update', async () => {
      const user = userEvent.setup()
      vi.mocked(api.getSproutById).mockResolvedValue(mockMusingSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-2" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('musing-sprout-detail')).toBeInTheDocument()
      })

      const updateButton = screen.getByTestId('update-button')
      await user.click(updateButton)

      await waitFor(() => {
        // Should reload sprout (getSproutById called again)
        expect(api.getSproutById).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Placeholder Sprout Types', () => {
    it('should render placeholder for extra_context sprout', async () => {
      const extraContextSprout: Sprout = {
        id: 'sprout-3',
        seed_id: 'seed-1',
        sprout_type: 'extra_context',
        sprout_data: {},
        created_at: '2024-01-15T12:00:00.000Z',
        automation_id: null,
      }

      vi.mocked(api.getSproutById).mockResolvedValue(extraContextSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-3" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sprout Type: extra_context')).toBeInTheDocument()
        expect(screen.getByText('This sprout type is not yet implemented.')).toBeInTheDocument()
      })
    })

    it('should render placeholder for fact_check sprout', async () => {
      const factCheckSprout: Sprout = {
        id: 'sprout-4',
        seed_id: 'seed-1',
        sprout_type: 'fact_check',
        sprout_data: {},
        created_at: '2024-01-15T12:00:00.000Z',
        automation_id: null,
      }

      vi.mocked(api.getSproutById).mockResolvedValue(factCheckSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-4" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sprout Type: fact_check')).toBeInTheDocument()
        expect(screen.getByText('This sprout type is not yet implemented.')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should call onBack when provided', async () => {
      const user = userEvent.setup()
      const mockOnBack = vi.fn()
      vi.mocked(api.getSproutById).mockResolvedValue(mockFollowupSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" onBack={mockOnBack} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeInTheDocument()
      })

      const backButton = screen.getByText('← Back')
      await user.click(backButton)

      expect(mockOnBack).toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should navigate back when onBack not provided and history exists', async () => {
      const user = userEvent.setup()
      // Mock window.history.length > 1
      Object.defineProperty(window, 'history', {
        value: { length: 2 },
        writable: true,
      })

      vi.mocked(api.getSproutById).mockResolvedValue(mockFollowupSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeInTheDocument()
      })

      const backButton = screen.getByText('← Back')
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    it('should navigate to /seeds when onBack not provided and no history', async () => {
      const user = userEvent.setup()
      // Mock window.history.length === 1
      Object.defineProperty(window, 'history', {
        value: { length: 1 },
        writable: true,
      })

      vi.mocked(api.getSproutById).mockResolvedValue(mockFollowupSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeInTheDocument()
      })

      const backButton = screen.getByText('← Back')
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/seeds')
    })
  })

  describe('Sprout ID Changes', () => {
    it('should reload sprout when sproutId changes', async () => {
      const { rerender } = render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      vi.mocked(api.getSproutById).mockResolvedValue(mockFollowupSprout)

      await waitFor(() => {
        expect(api.getSproutById).toHaveBeenCalledWith('sprout-1')
      })

      // Change sproutId
      vi.mocked(api.getSproutById).mockResolvedValue(mockMusingSprout)
      rerender(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-2" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(api.getSproutById).toHaveBeenCalledWith('sprout-2')
      })
    })
  })

  describe('Header Rendering', () => {
    it('should render header with back button and title', async () => {
      vi.mocked(api.getSproutById).mockResolvedValue(mockFollowupSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeInTheDocument()
        expect(screen.getByText('Sprout Details')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle sprout with unknown type', async () => {
      const unknownSprout: Sprout = {
        id: 'sprout-5',
        seed_id: 'seed-1',
        sprout_type: 'unknown' as any,
        sprout_data: {},
        created_at: '2024-01-15T12:00:00.000Z',
        automation_id: null,
      }

      vi.mocked(api.getSproutById).mockResolvedValue(unknownSprout)

      render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-5" />
        </MemoryRouter>
      )

      // Should not crash, but may not render any detail component
      await waitFor(() => {
        expect(screen.getByText('Sprout Details')).toBeInTheDocument()
      })
    })

    it('should handle multiple rapid sproutId changes', async () => {
      const { rerender } = render(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-1" />
        </MemoryRouter>
      )

      vi.mocked(api.getSproutById).mockResolvedValue(mockFollowupSprout)

      // Rapidly change sproutId multiple times
      rerender(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-2" />
        </MemoryRouter>
      )
      rerender(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-3" />
        </MemoryRouter>
      )
      rerender(
        <MemoryRouter>
          <SproutDetailView sproutId="sprout-4" />
        </MemoryRouter>
      )

      // Should handle gracefully without errors
      await waitFor(() => {
        expect(api.getSproutById).toHaveBeenCalled()
      })
    })
  })
})

