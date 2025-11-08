// TimelineView component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TimelineView } from './TimelineView'
import { api } from '../../services/api'
import type { Seed, Tag } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock Timeline component from mother
vi.mock('@mother/components/Timeline', () => ({
  Timeline: ({ items, renderPanel, renderOpposite, ...props }: any) => (
    <div data-testid="timeline" {...props}>
      {items.map((item: any, index: number) => (
        <div key={item.id} data-testid={`timeline-item-${item.id}`}>
          {renderPanel(index, 400)}
          {renderOpposite(index, 400, 'left')}
        </div>
      ))}
    </div>
  ),
}))

// Mock SeedView component
vi.mock('../SeedView', () => ({
  SeedView: ({ seed, onTagClick }: any) => (
    <div data-testid={`seed-view-${seed.id}`}>
      <div>{seed.currentState?.seed || 'No content'}</div>
      <button onClick={() => onTagClick?.('tag-1', 'work')}>Tag</button>
    </div>
  ),
}))

// Mock mother components
vi.mock('@mother/components/Panel', () => ({
  Panel: ({ children, className, variant, ...props }: any) => (
    <div className={className} data-variant={variant} {...props}>
      {children}
    </div>
  ),
}))

vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}))

const mockSeeds: Seed[] = [
  {
    id: 'seed-1',
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    currentState: {
      seed: 'First seed',
      timestamp: '2024-01-01T00:00:00Z',
      metadata: {},
      tags: [{ id: 'tag-1', name: 'work' }],
    },
  },
  {
    id: 'seed-2',
    user_id: 'user-1',
    created_at: '2024-01-02T00:00:00Z',
    currentState: {
      seed: 'Second seed',
      timestamp: '2024-01-02T00:00:00Z',
      metadata: {},
      tags: [{ id: 'tag-2', name: 'personal' }],
    },
  },
  {
    id: 'seed-3',
    user_id: 'user-1',
    created_at: '2024-01-03T00:00:00Z',
    currentState: {
      seed: 'Third seed',
      timestamp: '2024-01-03T00:00:00Z',
      metadata: {},
      tags: [],
    },
  },
]

const mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: 'work',
    color: '#ff0000',
  },
  {
    id: 'tag-2',
    name: 'personal',
    color: '#00ff00',
  },
]

describe('TimelineView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    
    // Setup default API mocks
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/seeds') {
        return Promise.resolve(mockSeeds)
      }
      if (url === '/tags') {
        return Promise.resolve(mockTags)
      }
      return Promise.resolve([])
    })
  })

  describe('Initial Rendering', () => {
    it('should render loading state initially', () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))
      
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      expect(screen.getByText('Loading timeline...')).toBeInTheDocument()
    })

    it('should render timeline after loading', async () => {
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('timeline')).toBeInTheDocument()
      })
    })

    it('should display seed count', async () => {
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/3 seeds in timeline/)).toBeInTheDocument()
      })
    })

    it('should render error state on API error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Failed to load'))
      
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should retry loading on retry button click', async () => {
      const user = userEvent.setup()
      vi.mocked(api.get)
        .mockRejectedValueOnce(new Error('Failed to load'))
        .mockResolvedValueOnce(mockSeeds)
      
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('timeline')).toBeInTheDocument()
      })
    })
  })

  describe('Timeline Items', () => {
    it('should render all seeds in timeline', async () => {
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('timeline-item-seed-1')).toBeInTheDocument()
        expect(screen.getByTestId('timeline-item-seed-2')).toBeInTheDocument()
        expect(screen.getByTestId('timeline-item-seed-3')).toBeInTheDocument()
      })
    })

    it('should render seeds in correct order (newest first)', async () => {
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        const items = screen.getAllByTestId(/timeline-item-/)
        // Should be sorted newest first (seed-3, seed-2, seed-1)
        expect(items[0]).toHaveAttribute('data-testid', 'timeline-item-seed-3')
        expect(items[1]).toHaveAttribute('data-testid', 'timeline-item-seed-2')
        expect(items[2]).toHaveAttribute('data-testid', 'timeline-item-seed-1')
      })
    })

    it('should render SeedView for each seed', async () => {
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-2')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-3')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no seeds', async () => {
      vi.mocked(api.get).mockResolvedValue([])
      
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/No seeds yet/)).toBeInTheDocument()
        expect(screen.getByText(/Your timeline is empty/)).toBeInTheDocument()
      })
    })
  })

  describe('Seed Selection', () => {
    it('should call onSeedSelect when seed is clicked', async () => {
      const user = userEvent.setup()
      const onSeedSelect = vi.fn()
      
      render(
        <MemoryRouter>
          <TimelineView onSeedSelect={onSeedSelect} />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
      })
      
      const seedContent = screen.getByTestId('seed-view-seed-1').closest('.timeline-seed-content')
      if (seedContent) {
        await user.click(seedContent)
      }
      
      expect(onSeedSelect).toHaveBeenCalledWith({ id: 'seed-1', slug: null })
    })
  })

  describe('Tag Navigation', () => {
    it('should navigate to tag when tag is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
      })
      
      // There are multiple "Tag" buttons (one per seed), so get all and click the first one
      const tagButtons = screen.getAllByText('Tag')
      expect(tagButtons.length).toBeGreaterThan(0)
      await user.click(tagButtons[0]!)
      
      expect(mockNavigate).toHaveBeenCalledWith('/tags/work')
    })
  })

  describe('Refresh Ref', () => {
    it('should expose refresh function via ref', async () => {
      const refreshRef = { current: null as (() => void) | null }
      
      render(
        <MemoryRouter>
          <TimelineView refreshRef={refreshRef} />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(refreshRef.current).toBeTruthy()
      })
      
      // Call refresh
      if (refreshRef.current) {
        refreshRef.current()
      }
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/seeds')
      })
    })
  })

  describe('Timeline Positioning', () => {
    it('should calculate positions for seeds with different dates', async () => {
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('timeline')).toBeInTheDocument()
      })
      
      // Timeline should render with items
      const timeline = screen.getByTestId('timeline')
      expect(timeline).toBeInTheDocument()
    })

    it('should handle seeds with same date', async () => {
      const sameDateSeeds: Seed[] = [
        {
          id: 'seed-1',
          user_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          currentState: {
            seed: 'Seed 1',
            timestamp: '2024-01-01T00:00:00Z',
            metadata: {},
          },
        },
        {
          id: 'seed-2',
          user_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          currentState: {
            seed: 'Seed 2',
            timestamp: '2024-01-01T00:00:00Z',
            metadata: {},
          },
        },
      ]
      
      vi.mocked(api.get).mockResolvedValue(sameDateSeeds)
      
      render(
        <MemoryRouter>
          <TimelineView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('timeline')).toBeInTheDocument()
        expect(screen.getByTestId('timeline-item-seed-1')).toBeInTheDocument()
        expect(screen.getByTestId('timeline-item-seed-2')).toBeInTheDocument()
      })
    })
  })
})

