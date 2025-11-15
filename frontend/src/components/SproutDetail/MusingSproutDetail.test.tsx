// MusingSproutDetail component unit tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MusingSproutDetail } from './MusingSproutDetail'
import { api } from '../../services/api'
import type { Sprout } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    dismissMusingSprout: vi.fn(),
    completeMusingSprout: vi.fn(),
  },
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

// Mock musing content components
vi.mock('../MusingsView/NumberedIdeasMusing', () => ({
  NumberedIdeasMusing: ({ musing, onUpdate }: any) => (
    <div data-testid="numbered-ideas-musing">
      <div data-testid="musing-id">{musing.id}</div>
      <div data-testid="musing-template">{musing.template_type}</div>
      {onUpdate && <button data-testid="musing-update" onClick={onUpdate}>Update</button>}
    </div>
  ),
}))

vi.mock('../MusingsView/WikipediaLinksMusing', () => ({
  WikipediaLinksMusing: ({ musing }: any) => (
    <div data-testid="wikipedia-links-musing">
      <div data-testid="musing-id">{musing.id}</div>
      <div data-testid="musing-template">{musing.template_type}</div>
    </div>
  ),
}))

vi.mock('../MusingsView/MarkdownMusing', () => ({
  MarkdownMusing: ({ musing }: any) => (
    <div data-testid="markdown-musing">
      <div data-testid="musing-id">{musing.id}</div>
      <div data-testid="musing-template">{musing.template_type}</div>
    </div>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
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
  sprout_type: 'musing',
  sprout_data: {
    template_type: 'numbered_ideas',
    content: {
      ideas: ['Idea 1', 'Idea 2', 'Custom idea or prompt...'],
    },
    dismissed: false,
    dismissed_at: null,
    completed: false,
    completed_at: null,
  },
  created_at: '2024-01-15T12:00:00.000Z',
  automation_id: null,
}

describe('MusingSproutDetail Component', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnUpdate.mockClear()
  })

  describe('Initial Rendering', () => {
    it('should render musing sprout with numbered_ideas template', () => {
      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('Musing')).toBeInTheDocument()
      expect(screen.getByTestId('numbered-ideas-musing')).toBeInTheDocument()
      expect(screen.getByTestId('musing-id')).toHaveTextContent('sprout-1')
      expect(screen.getByTestId('musing-template')).toHaveTextContent('numbered_ideas')
    })

    it('should render musing sprout with wikipedia_links template', () => {
      const wikipediaSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          template_type: 'wikipedia_links',
          content: {
            links: [
              { title: 'Article 1', url: 'https://en.wikipedia.org/wiki/Article1' },
            ],
          },
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
      }

      render(<MusingSproutDetail sprout={wikipediaSprout} onUpdate={mockOnUpdate} />)

      expect(screen.getByTestId('wikipedia-links-musing')).toBeInTheDocument()
      expect(screen.getByTestId('musing-template')).toHaveTextContent('wikipedia_links')
    })

    it('should render musing sprout with markdown template', () => {
      const markdownSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          template_type: 'markdown',
          content: {
            markdown: '# Heading\n\nSome content',
          },
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
      }

      render(<MusingSproutDetail sprout={markdownSprout} onUpdate={mockOnUpdate} />)

      expect(screen.getByTestId('markdown-musing')).toBeInTheDocument()
      expect(screen.getByTestId('musing-template')).toHaveTextContent('markdown')
    })

    it('should render unknown template type', () => {
      const unknownSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          template_type: 'unknown' as any,
          content: {},
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
      }

      render(<MusingSproutDetail sprout={unknownSprout} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('Unknown template type')).toBeInTheDocument()
    })

    it('should show action buttons when not dismissed or completed', () => {
      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      expect(screen.getByLabelText('Complete musing sprout')).toBeInTheDocument()
      expect(screen.getByLabelText('Dismiss musing sprout')).toBeInTheDocument()
    })

    it('should show dismissed badge when dismissed', () => {
      const dismissedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          dismissed: true,
          dismissed_at: '2024-01-15T13:00:00.000Z',
        },
      }

      render(<MusingSproutDetail sprout={dismissedSprout} onUpdate={mockOnUpdate} />)

      const badges = screen.getAllByTestId('badge')
      const dismissedBadge = badges.find(b => b.textContent === 'Dismissed')
      expect(dismissedBadge).toBeInTheDocument()
    })

    it('should show completed badge when completed', () => {
      const completedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          completed: true,
          completed_at: '2024-01-15T13:00:00.000Z',
        },
      }

      render(<MusingSproutDetail sprout={completedSprout} onUpdate={mockOnUpdate} />)

      const badges = screen.getAllByTestId('badge')
      const completedBadge = badges.find(b => b.textContent === 'Completed')
      expect(completedBadge).toBeInTheDocument()
    })

    it('should not show action buttons when dismissed', () => {
      const dismissedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          dismissed: true,
          dismissed_at: '2024-01-15T13:00:00.000Z',
        },
      }

      render(<MusingSproutDetail sprout={dismissedSprout} onUpdate={mockOnUpdate} />)

      expect(screen.queryByLabelText('Complete musing sprout')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Dismiss musing sprout')).not.toBeInTheDocument()
    })

    it('should not show action buttons when completed', () => {
      const completedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          completed: true,
          completed_at: '2024-01-15T13:00:00.000Z',
        },
      }

      render(<MusingSproutDetail sprout={completedSprout} onUpdate={mockOnUpdate} />)

      expect(screen.queryByLabelText('Complete musing sprout')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Dismiss musing sprout')).not.toBeInTheDocument()
    })
  })

  describe('Dismiss Functionality', () => {
    it('should dismiss musing sprout on dismiss button click', async () => {
      const user = userEvent.setup()
      const dismissedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          dismissed: true,
          dismissed_at: '2024-01-15T13:00:00.000Z',
        },
      }

      vi.mocked(api.dismissMusingSprout).mockResolvedValue(dismissedSprout)

      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const dismissButton = screen.getByLabelText('Dismiss musing sprout')
      await user.click(dismissButton)

      await waitFor(() => {
        expect(api.dismissMusingSprout).toHaveBeenCalledWith('sprout-1')
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should disable dismiss button while dismissing', async () => {
      const user = userEvent.setup()
      const dismissedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          dismissed: true,
        },
      }

      let resolvePromise: (value: Sprout) => void
      const promise = new Promise<Sprout>((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(api.dismissMusingSprout).mockReturnValue(promise)

      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const dismissButton = screen.getByLabelText('Dismiss musing sprout')
      await user.click(dismissButton)

      // Button should be disabled while processing
      await waitFor(() => {
        expect(dismissButton).toBeDisabled()
      })

      // Resolve the promise
      resolvePromise!(dismissedSprout)
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should not dismiss if already dismissing', async () => {
      const user = userEvent.setup()
      const dismissedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          dismissed: true,
        },
      }

      let resolvePromise: (value: Sprout) => void
      const promise = new Promise<Sprout>((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(api.dismissMusingSprout).mockReturnValue(promise)

      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const dismissButton = screen.getByLabelText('Dismiss musing sprout')
      
      // Click multiple times rapidly
      await user.click(dismissButton)
      await user.click(dismissButton)
      await user.click(dismissButton)

      // Should only be called once
      await waitFor(() => {
        expect(api.dismissMusingSprout).toHaveBeenCalledTimes(1)
      })

      resolvePromise!(dismissedSprout)
    })

    it('should handle dismiss error', async () => {
      const user = userEvent.setup()
      const error = new Error('Failed to dismiss')
      vi.mocked(api.dismissMusingSprout).mockRejectedValue(error)

      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const dismissButton = screen.getByLabelText('Dismiss musing sprout')
      await user.click(dismissButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to dismiss')
      })
    })
  })

  describe('Complete Functionality', () => {
    it('should complete musing sprout on complete button click', async () => {
      const user = userEvent.setup()
      const completedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          completed: true,
          completed_at: '2024-01-15T13:00:00.000Z',
        },
      }

      vi.mocked(api.completeMusingSprout).mockResolvedValue(completedSprout)

      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const completeButton = screen.getByLabelText('Complete musing sprout')
      await user.click(completeButton)

      await waitFor(() => {
        expect(api.completeMusingSprout).toHaveBeenCalledWith('sprout-1')
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should disable complete button while completing', async () => {
      const user = userEvent.setup()
      const completedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          completed: true,
        },
      }

      let resolvePromise: (value: Sprout) => void
      const promise = new Promise<Sprout>((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(api.completeMusingSprout).mockReturnValue(promise)

      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const completeButton = screen.getByLabelText('Complete musing sprout')
      await user.click(completeButton)

      // Button should be disabled while processing
      await waitFor(() => {
        expect(completeButton).toBeDisabled()
      })

      // Resolve the promise
      resolvePromise!(completedSprout)
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should not complete if already completing', async () => {
      const user = userEvent.setup()
      const completedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          completed: true,
        },
      }

      let resolvePromise: (value: Sprout) => void
      const promise = new Promise<Sprout>((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(api.completeMusingSprout).mockReturnValue(promise)

      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const completeButton = screen.getByLabelText('Complete musing sprout')
      
      // Click multiple times rapidly
      await user.click(completeButton)
      await user.click(completeButton)
      await user.click(completeButton)

      // Should only be called once
      await waitFor(() => {
        expect(api.completeMusingSprout).toHaveBeenCalledTimes(1)
      })

      resolvePromise!(completedSprout)
    })

    it('should handle complete error', async () => {
      const user = userEvent.setup()
      const error = new Error('Failed to complete')
      vi.mocked(api.completeMusingSprout).mockRejectedValue(error)

      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const completeButton = screen.getByLabelText('Complete musing sprout')
      await user.click(completeButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to complete')
      })
    })
  })

  describe('Mock IdeaMusing Creation', () => {
    it('should create correct mock IdeaMusing object for numbered_ideas', () => {
      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      // The component should render the musing content component
      expect(screen.getByTestId('numbered-ideas-musing')).toBeInTheDocument()
      expect(screen.getByTestId('musing-id')).toHaveTextContent('sprout-1')
      expect(screen.getByTestId('musing-template')).toHaveTextContent('numbered_ideas')
    })

    it('should pass onUpdate callback to NumberedIdeasMusing', async () => {
      const user = userEvent.setup()
      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const updateButton = screen.getByTestId('musing-update')
      await user.click(updateButton)

      // onUpdate should be called
      expect(mockOnUpdate).toHaveBeenCalled()
    })

    it('should include dismissed_at when dismissed', () => {
      const dismissedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          dismissed: true,
          dismissed_at: '2024-01-15T13:00:00.000Z',
        },
      }

      render(<MusingSproutDetail sprout={dismissedSprout} onUpdate={mockOnUpdate} />)

      // Component should render correctly with dismissed state
      expect(screen.getByTestId('numbered-ideas-musing')).toBeInTheDocument()
    })

    it('should include completed_at when completed', () => {
      const completedSprout: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          completed: true,
          completed_at: '2024-01-15T13:00:00.000Z',
        },
      }

      render(<MusingSproutDetail sprout={completedSprout} onUpdate={mockOnUpdate} />)

      // Component should render correctly with completed state
      expect(screen.getByTestId('numbered-ideas-musing')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle API error with non-Error object', async () => {
      const user = userEvent.setup()
      vi.mocked(api.dismissMusingSprout).mockRejectedValue('String error')

      render(<MusingSproutDetail sprout={mockSprout} onUpdate={mockOnUpdate} />)

      const dismissButton = screen.getByLabelText('Dismiss musing sprout')
      await user.click(dismissButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to dismiss musing sprout')
      })
    })

    it('should handle null dismissed_at and completed_at', () => {
      const sproutWithNulls: Sprout = {
        ...mockSprout,
        sprout_data: {
          ...mockSprout.sprout_data,
          dismissed: false,
          dismissed_at: null,
          completed: false,
          completed_at: null,
        },
      }

      render(<MusingSproutDetail sprout={sproutWithNulls} onUpdate={mockOnUpdate} />)

      // Should render without errors
      expect(screen.getByTestId('numbered-ideas-musing')).toBeInTheDocument()
    })
  })
})

