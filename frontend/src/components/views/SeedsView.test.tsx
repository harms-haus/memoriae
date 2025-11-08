// SeedsView component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SeedsView } from './SeedsView'
import { api } from '../../services/api'
import type { Seed, Category, Tag } from '../../types'

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
    useParams: () => ({ tagName: undefined }),
  }
})

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
vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@mother/components/Panel', () => ({
  Panel: ({ children, className, variant, ...props }: any) => (
    <div className={className} data-variant={variant} {...props}>
      {children}
    </div>
  ),
}))

vi.mock('@mother/components/Input', () => ({
  Input: ({ value, onChange, placeholder, icon: Icon, ...props }: any) => (
    <div>
      {Icon && <Icon data-testid="search-icon" />}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
    </div>
  ),
}))

vi.mock('@mother/components/Badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  X: () => <div data-testid="x-icon">X</div>,
  ArrowUpDown: () => <div data-testid="arrow-up-down-icon">ArrowUpDown</div>,
  ArrowDown: () => <div data-testid="arrow-down-icon">ArrowDown</div>,
  ArrowUp: () => <div data-testid="arrow-up-icon">ArrowUp</div>,
}))

const mockSeeds: Seed[] = [
  {
    id: 'seed-1',
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    currentState: {
      seed: 'First seed content',
      timestamp: '2024-01-01T00:00:00Z',
      metadata: {},
      tags: [{ id: 'tag-1', name: 'work' }],
      categories: [{ id: 'cat-1', name: 'Work', path: '/work' }],
    },
  },
  {
    id: 'seed-2',
    user_id: 'user-1',
    created_at: '2024-01-02T00:00:00Z',
    currentState: {
      seed: 'Second seed content',
      timestamp: '2024-01-02T00:00:00Z',
      metadata: {},
      tags: [{ id: 'tag-2', name: 'personal' }],
      categories: [],
    },
  },
  {
    id: 'seed-3',
    user_id: 'user-1',
    created_at: '2024-01-03T00:00:00Z',
    currentState: {
      seed: 'Third seed with work tag',
      timestamp: '2024-01-03T00:00:00Z',
      metadata: {},
      tags: [{ id: 'tag-1', name: 'work' }, { id: 'tag-3', name: 'important' }],
      categories: [{ id: 'cat-1', name: 'Work', path: '/work' }],
    },
  },
]

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    parent_id: null,
    name: 'Work',
    path: '/work',
    created_at: '2024-01-01T00:00:00Z',
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
  {
    id: 'tag-3',
    name: 'important',
    color: '',
  },
]

describe('SeedsView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    
    // Setup default API mocks
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/seeds') {
        return Promise.resolve(mockSeeds)
      }
      if (url === '/categories') {
        return Promise.resolve(mockCategories)
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
          <SeedsView />
        </MemoryRouter>
      )
      
      expect(screen.getByText('Loading seeds...')).toBeInTheDocument()
    })

    it('should render seeds after loading', async () => {
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-2')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-3')).toBeInTheDocument()
      })
    })

    it('should display seed count', async () => {
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/3 seeds/)).toBeInTheDocument()
      })
    })

    it('should render error state on API error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Failed to load'))
      
      render(
        <MemoryRouter>
          <SeedsView />
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
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
      })
    })
  })

  describe('Search Functionality', () => {
    it('should filter seeds by content', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search seeds...')
      await user.type(searchInput, 'First')
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
        expect(screen.queryByTestId('seed-view-seed-2')).not.toBeInTheDocument()
        expect(screen.queryByTestId('seed-view-seed-3')).not.toBeInTheDocument()
      })
    })

    it('should filter seeds by tag name', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search seeds...')
      await user.type(searchInput, 'work')
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-3')).toBeInTheDocument()
        expect(screen.queryByTestId('seed-view-seed-2')).not.toBeInTheDocument()
      })
    })

    it('should filter seeds by category name', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search seeds...')
      await user.type(searchInput, 'Work')
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-3')).toBeInTheDocument()
        expect(screen.queryByTestId('seed-view-seed-2')).not.toBeInTheDocument()
      })
    })

    it('should show filtered count', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/3 seeds/)).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search seeds...')
      await user.type(searchInput, 'First')
      
      await waitFor(() => {
        expect(screen.getByText(/1 of 3 seeds/)).toBeInTheDocument()
      })
    })
  })

  describe('Tag Filtering', () => {
    it('should toggle filters panel', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument()
      })
      
      const filtersButton = screen.getByText('Filters')
      await user.click(filtersButton)
      
      await waitFor(() => {
        expect(screen.getByText('Filter by Tags')).toBeInTheDocument()
      })
    })

    it('should filter seeds by selected tag', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument()
      })
      
      // Open filters
      const filtersButton = screen.getByText('Filters')
      await user.click(filtersButton)
      
      await waitFor(() => {
        expect(screen.getByText('#work')).toBeInTheDocument()
      })
      
      // Click on work tag
      const workTag = screen.getByText('#work')
      await user.click(workTag)
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-3')).toBeInTheDocument()
        expect(screen.queryByTestId('seed-view-seed-2')).not.toBeInTheDocument()
      })
    })

    it('should clear tag filter when clicked again', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument()
      })
      
      const filtersButton = screen.getByText('Filters')
      await user.click(filtersButton)
      
      await waitFor(() => {
        expect(screen.getByText('#work')).toBeInTheDocument()
      })
      
      const workTag = screen.getByText('#work')
      await user.click(workTag)
      
      await waitFor(() => {
        expect(screen.queryByTestId('seed-view-seed-2')).not.toBeInTheDocument()
      })
      
      // Click again to deselect
      await user.click(workTag)
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-2')).toBeInTheDocument()
      })
    })
  })

  describe('Category Filtering', () => {
    it('should filter seeds by selected category', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument()
      })
      
      const filtersButton = screen.getByText('Filters')
      await user.click(filtersButton)
      
      await waitFor(() => {
        expect(screen.getByText('Filter by Categories')).toBeInTheDocument()
      })
      
      // Click on Work category
      const workCategory = screen.getByText('/work')
      await user.click(workCategory)
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-3')).toBeInTheDocument()
        expect(screen.queryByTestId('seed-view-seed-2')).not.toBeInTheDocument()
      })
    })
  })

  describe('Sorting', () => {
    it('should sort by newest by default', async () => {
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        const seedViews = screen.getAllByTestId(/seed-view-/)
        // Should be sorted newest first (seed-3, seed-2, seed-1)
        expect(seedViews[0]).toHaveAttribute('data-testid', 'seed-view-seed-3')
      })
    })

    it('should cycle through sort options', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Newest')).toBeInTheDocument()
      })
      
      const sortButton = screen.getByText('Newest').closest('button')
      if (sortButton) {
        await user.click(sortButton)
      }
      
      await waitFor(() => {
        expect(screen.getByText('Oldest')).toBeInTheDocument()
      })
      
      if (sortButton) {
        await user.click(sortButton)
      }
      
      await waitFor(() => {
        expect(screen.getByText('A-Z')).toBeInTheDocument()
      })
    })

    it('should sort alphabetically when A-Z is selected', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        const sortButton = screen.getByText('Newest').closest('button')
        if (sortButton) {
          // Click twice to get to A-Z
          user.click(sortButton)
          user.click(sortButton)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText('A-Z')).toBeInTheDocument()
        const seedViews = screen.getAllByTestId(/seed-view-/)
        // Should be sorted alphabetically by content
        expect(seedViews[0]).toHaveAttribute('data-testid', 'seed-view-seed-1')
      })
    })
  })

  describe('Clear Filters', () => {
    it('should show clear button when filters are active', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search seeds...')
      await user.type(searchInput, 'test')
      
      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument()
      })
    })

    it('should clear all filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search seeds...')
      await user.type(searchInput, 'First')
      
      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument()
      })
      
      const clearButton = screen.getByText('Clear')
      await user.click(clearButton)
      
      await waitFor(() => {
        expect(searchInput).toHaveValue('')
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-2')).toBeInTheDocument()
        expect(screen.getByTestId('seed-view-seed-3')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no seeds', async () => {
      vi.mocked(api.get).mockResolvedValue([])
      
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/No seeds yet/)).toBeInTheDocument()
      })
    })

    it('should show empty state when filters match no seeds', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <SeedsView />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search seeds...')
      await user.type(searchInput, 'nonexistent')
      
      await waitFor(() => {
        expect(screen.getByText(/No seeds match your filters/)).toBeInTheDocument()
      })
    })
  })

  describe('Seed Selection', () => {
    it('should call onSeedSelect when seed is clicked', async () => {
      const user = userEvent.setup()
      const onSeedSelect = vi.fn()
      
      render(
        <MemoryRouter>
          <SeedsView onSeedSelect={onSeedSelect} />
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('seed-view-seed-1')).toBeInTheDocument()
      })
      
      const seedWrapper = screen.getByTestId('seed-view-seed-1').closest('.seeds-view-item-wrapper')
      if (seedWrapper) {
        await user.click(seedWrapper)
      }
      
      expect(onSeedSelect).toHaveBeenCalledWith({ id: 'seed-1', slug: null })
    })
  })

  describe('Refresh Ref', () => {
    it('should expose refresh function via ref', async () => {
      const refreshRef = { current: null as (() => void) | null }
      
      render(
        <MemoryRouter>
          <SeedsView refreshRef={refreshRef} />
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
})

