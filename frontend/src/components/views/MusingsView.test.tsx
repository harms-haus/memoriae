// MusingsView component unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MusingsView } from './MusingsView'
import { api } from '../../services/api'
import type { IdeaMusing, Tag } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    getDailyMusings: vi.fn(),
    generateMusings: vi.fn(),
    get: vi.fn(),
  },
}))

// Mock MusingItem component
vi.mock('../MusingsView/MusingItem', () => ({
  MusingItem: ({ musing, onDismiss, onRegenerate }: any) => (
    <div data-testid={`musing-item-${musing.id}`}>
      <span data-testid="musing-template">{musing.template_type}</span>
      <button
        data-testid={`dismiss-${musing.id}`}
        onClick={() => onDismiss?.(musing.id)}
      >
        Dismiss
      </button>
      <button
        data-testid={`regenerate-${musing.id}`}
        onClick={() => onRegenerate?.(musing.id)}
      >
        Regenerate
      </button>
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
  Button: ({ children, onClick, variant, disabled, className }: any) => (
    <button
      data-testid="button"
      data-variant={variant}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}))

const mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: 'work',
    color: '#ffd43b',
  },
  {
    id: 'tag-2',
    name: 'personal',
    color: '#4fc3f7',
  },
]

const mockMusings: IdeaMusing[] = [
  {
    id: 'musing-1',
    seed_id: 'seed-1',
    template_type: 'numbered_ideas',
    content: {
      ideas: ['Idea 1', 'Idea 2', 'Custom idea or prompt...'],
    },
    created_at: new Date().toISOString(),
    dismissed: false,
  },
  {
    id: 'musing-2',
    seed_id: 'seed-2',
    template_type: 'wikipedia_links',
    content: {
      links: [
        { title: 'Article 1', url: 'https://en.wikipedia.org/wiki/Article1' },
      ],
    },
    created_at: new Date().toISOString(),
    dismissed: false,
  },
]

describe('MusingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state initially', async () => {
    vi.mocked(api.getDailyMusings).mockImplementation(() => new Promise(() => {})) // Never resolves
    vi.mocked(api.get).mockResolvedValue(mockTags)

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    expect(screen.getByText('Loading musings...')).toBeInTheDocument()
  })

  it('should render musings list when loaded', async () => {
    vi.mocked(api.getDailyMusings).mockResolvedValue(mockMusings)
    vi.mocked(api.get).mockResolvedValue(mockTags)

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('musing-item-musing-1')).toBeInTheDocument()
      expect(screen.getByTestId('musing-item-musing-2')).toBeInTheDocument()
    })
  })

  it('should render empty state with generate button', async () => {
    vi.mocked(api.getDailyMusings).mockResolvedValue([])
    vi.mocked(api.get).mockResolvedValue(mockTags)

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/No musings available today/)).toBeInTheDocument()
      expect(screen.getByText('Generate Musings Now')).toBeInTheDocument()
    })
  })

  it('should handle error state gracefully', async () => {
    vi.mocked(api.getDailyMusings).mockRejectedValue(new Error('Network error'))
    vi.mocked(api.get).mockResolvedValue(mockTags)

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      // Should show empty state, not error (graceful handling)
      expect(screen.getByText(/No musings available today/)).toBeInTheDocument()
    })
  })

  it('should call generate API on button click', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getDailyMusings).mockResolvedValue([])
    vi.mocked(api.get).mockResolvedValue(mockTags)
    vi.mocked(api.generateMusings).mockResolvedValue({
      message: 'Generated 2 musings',
      musingsCreated: 2,
    })

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Generate Musings Now')).toBeInTheDocument()
    })

    const generateButton = screen.getByText('Generate Musings Now')
    await user.click(generateButton)

    expect(api.generateMusings).toHaveBeenCalled()
  })

  it('should show loading state during generation', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getDailyMusings).mockResolvedValue([])
    vi.mocked(api.get).mockResolvedValue(mockTags)
    vi.mocked(api.generateMusings).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ message: 'Generated', musingsCreated: 1 }), 100))
    )

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Generate Musings Now')).toBeInTheDocument()
    })

    const generateButton = screen.getByText('Generate Musings Now')
    await user.click(generateButton)

    // Button should show "Generating..." and be disabled
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })
  })

  it('should reload musings after successful generation', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getDailyMusings)
      .mockResolvedValueOnce([]) // Initial load
      .mockResolvedValueOnce(mockMusings) // After generation
    vi.mocked(api.get).mockResolvedValue(mockTags)
    vi.mocked(api.generateMusings).mockResolvedValue({
      message: 'Generated 2 musings',
      musingsCreated: 2,
    })

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Generate Musings Now')).toBeInTheDocument()
    })

    const generateButton = screen.getByText('Generate Musings Now')
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByTestId('musing-item-musing-1')).toBeInTheDocument()
    })

    expect(api.getDailyMusings).toHaveBeenCalledTimes(2)
  })

  it('should display error message on generation failure', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getDailyMusings).mockResolvedValue([])
    vi.mocked(api.get).mockResolvedValue(mockTags)
    vi.mocked(api.generateMusings).mockRejectedValue(new Error('Generation failed'))

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Generate Musings Now')).toBeInTheDocument()
    })

    const generateButton = screen.getByText('Generate Musings Now')
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Generation failed')).toBeInTheDocument()
    })
  })

  it('should display message when no musings were generated', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getDailyMusings).mockResolvedValue([])
    vi.mocked(api.get).mockResolvedValue(mockTags)
    vi.mocked(api.generateMusings).mockResolvedValue({
      message: 'No idea seeds found',
      musingsCreated: 0,
    })

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Generate Musings Now')).toBeInTheDocument()
    })

    const generateButton = screen.getByText('Generate Musings Now')
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('No idea seeds found')).toBeInTheDocument()
    })
  })

  it('should load tags on mount', async () => {
    vi.mocked(api.getDailyMusings).mockResolvedValue([])
    vi.mocked(api.get).mockResolvedValue(mockTags)

    render(
      <MemoryRouter>
        <MusingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/tags')
    })
  })
})

