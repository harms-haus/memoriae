// WikipediaSproutDetail component unit tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WikipediaSproutDetail } from './WikipediaSproutDetail'
import { api } from '../../services/api'
import type { Sprout, WikipediaSproutState, Seed } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    editWikipediaSprout: vi.fn(),
    get: vi.fn(),
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
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { timeZone: 'America/New_York' })
  }),
  getBrowserTimezone: vi.fn(() => 'America/New_York'),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children, className }: any) => (
    <div data-testid="react-markdown" className={className}>
      {children}
    </div>
  ),
}))

vi.mock('remark-gfm', () => ({
  default: vi.fn(),
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
}))

// Suppress console.error for alert calls
const originalAlert = window.alert
beforeEach(() => {
  window.alert = vi.fn()
  vi.clearAllMocks()
})

afterEach(() => {
  window.alert = originalAlert
})

const mockSprout: Sprout = {
  id: 'sprout-1',
  seed_id: 'seed-1',
  sprout_type: 'wikipedia_reference',
  sprout_data: {
    reference: 'Human chimerism',
    article_url: 'https://en.wikipedia.org/wiki/Human_chimerism',
    article_title: 'Human chimerism',
    summary: 'This is a summary about human chimerism.\n\nIt has multiple paragraphs.\n\nAnd more content.',
  },
  created_at: '2024-01-01T10:00:00.000Z',
  automation_id: null,
}

const mockSeed: Seed = {
  id: 'seed-1',
  user_id: 'user-1',
  created_at: '2024-01-01T00:00:00.000Z',
  currentState: {
    seed: 'This is a seed about human chimerism and its implications.',
    timestamp: '2024-01-01T00:00:00.000Z',
    metadata: {},
  },
}

describe('WikipediaSproutDetail', () => {
  describe('Rendering', () => {
    it('should render article title and URL', async () => {
      vi.mocked(api.get).mockResolvedValue(mockSeed)

      render(<WikipediaSproutDetail sprout={mockSprout} onUpdate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Human chimerism')).toBeInTheDocument()
        expect(screen.getByText('[https://en.wikipedia.org/wiki/Human_chimerism]')).toBeInTheDocument()
      })
    })

    it('should render summary as markdown', async () => {
      vi.mocked(api.get).mockResolvedValue(mockSeed)

      render(<WikipediaSproutDetail sprout={mockSprout} onUpdate={vi.fn()} />)

      await waitFor(() => {
        const markdown = screen.getByTestId('react-markdown')
        expect(markdown).toBeInTheDocument()
        expect(markdown.textContent).toContain('This is a summary about human chimerism')
      })
    })

    it('should render attached seed info', async () => {
      vi.mocked(api.get).mockResolvedValue(mockSeed)

      render(<WikipediaSproutDetail sprout={mockSprout} onUpdate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Attached Seed')).toBeInTheDocument()
        expect(screen.getByText(/This is a seed about human chimerism/)).toBeInTheDocument()
      })
    })

    it('should render edit button', async () => {
      vi.mocked(api.get).mockResolvedValue(mockSeed)

      render(<WikipediaSproutDetail sprout={mockSprout} onUpdate={vi.fn()} />)

      await waitFor(() => {
        const editButton = screen.getByText('Edit Summary')
        expect(editButton).toBeInTheDocument()
      })
    })
  })

  describe('Edit functionality', () => {
    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(api.get).mockResolvedValue(mockSeed)

      render(<WikipediaSproutDetail sprout={mockSprout} onUpdate={vi.fn()} />)

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.queryByText('Loading Wikipedia sprout...')).not.toBeInTheDocument()
      })

      // Wait for edit button to be available
      await waitFor(() => {
        expect(screen.getByLabelText('Edit summary')).toBeInTheDocument()
      })

      const editButton = screen.getByLabelText('Edit summary')
      await user.click(editButton)

      // Wait for modal to open - look for the textbox which is unique to the modal
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
      
      // Verify modal title is present (use getAllByText since button also has this text)
      const editSummaryTexts = screen.getAllByText('Edit Summary')
      expect(editSummaryTexts.length).toBeGreaterThan(1) // Button + modal title
    })

    it('should save edited summary', async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      const newSummary = 'This is an updated summary.'
      const updatedState: WikipediaSproutState = {
        reference: 'Human chimerism',
        article_url: 'https://en.wikipedia.org/wiki/Human_chimerism',
        article_title: 'Human chimerism',
        summary: newSummary,
        transactions: [],
      }

      vi.mocked(api.get).mockResolvedValue(mockSeed)
      vi.mocked(api.editWikipediaSprout).mockResolvedValue(updatedState)

      render(<WikipediaSproutDetail sprout={mockSprout} onUpdate={onUpdate} />)

      await waitFor(() => {
        expect(screen.getByText('Edit Summary')).toBeInTheDocument()
      })

      const editButton = screen.getByText('Edit Summary')
      await user.click(editButton)

      await waitFor(() => {
        const textarea = screen.getByRole('textbox')
        expect(textarea).toBeInTheDocument()
      })

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, newSummary)

      const saveButton = screen.getByText('Save')
      await user.click(saveButton)

      await waitFor(() => {
        expect(api.editWikipediaSprout).toHaveBeenCalledWith('sprout-1', newSummary)
        expect(onUpdate).toHaveBeenCalled()
      })
    })

    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(api.get).mockResolvedValue(mockSeed)

      render(<WikipediaSproutDetail sprout={mockSprout} onUpdate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Edit Summary')).toBeInTheDocument()
      })

      const editButton = screen.getByText('Edit Summary')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading and error states', () => {
    it('should show loading state initially', () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<WikipediaSproutDetail sprout={mockSprout} onUpdate={vi.fn()} />)

      expect(screen.getByText('Loading Wikipedia sprout...')).toBeInTheDocument()
    })

    it('should handle seed load error gracefully', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Failed to load seed'))

      render(<WikipediaSproutDetail sprout={mockSprout} onUpdate={vi.fn()} />)

      await waitFor(() => {
        // Should still render sprout content even if seed fails to load
        expect(screen.getByText('Human chimerism')).toBeInTheDocument()
      })
    })
  })
})

