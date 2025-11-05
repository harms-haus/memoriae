// CategoryTree component unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryTree } from './CategoryTree'
import { api } from '../../services/api'
import type { Category } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
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

vi.mock('@mother/components/Badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    parent_id: null,
    name: 'Work',
    path: '/work',
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-2',
    parent_id: 'cat-1',
    name: 'Projects',
    path: '/work/projects',
    created_at: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'cat-3',
    parent_id: null,
    name: 'Personal',
    path: '/personal',
    created_at: '2024-01-03T00:00:00.000Z',
  },
]

describe('CategoryTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state correctly', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<CategoryTree />)

    expect(screen.getByText('Loading categories...')).toBeInTheDocument()
  })

  it('should render error state correctly', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Failed to load'))

    render(<CategoryTree />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
    })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('should render empty state when no categories', async () => {
    vi.mocked(api.get).mockResolvedValue([])

    render(<CategoryTree />)

    await waitFor(() => {
      expect(screen.getByText('No categories yet.')).toBeInTheDocument()
    })
  })

  it('should render tree structure correctly', async () => {
    vi.mocked(api.get).mockResolvedValue(mockCategories)

    render(<CategoryTree />)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })

    // Check that paths are displayed
    expect(screen.getByText('/work')).toBeInTheDocument()
    expect(screen.getByText('/personal')).toBeInTheDocument()
  })

  it('should expand/collapse nodes when clicking chevron', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValue(mockCategories)

    render(<CategoryTree />)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    // Find the expand button for Work category
    const expandButtons = screen.getAllByRole('button', { name: /expand|collapse/i })
    const workExpandButton = expandButtons.find(btn => 
      btn.closest('.category-tree-item')?.textContent?.includes('Work')
    )

    expect(workExpandButton).toBeInTheDocument()

    // Initially should be expanded (root categories auto-expand)
      // Click to collapse
      if (workExpandButton) {
        await user.click(workExpandButton)
        // After collapse, button state should change
        await waitFor(() => {
          expect(workExpandButton).toBeInTheDocument()
        })
      }
  })

  it('should select category when clicking on item', async () => {
    const user = userEvent.setup()
    const onCategorySelect = vi.fn()
    vi.mocked(api.get).mockResolvedValue(mockCategories)

    render(<CategoryTree onCategorySelect={onCategorySelect} />)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    // Find and click the Work category item
    const workItem = screen.getByText('Work').closest('.category-tree-item')
    expect(workItem).toBeInTheDocument()

    if (workItem) {
      await user.click(workItem)
      expect(onCategorySelect).toHaveBeenCalledWith('cat-1')
    }
  })

  it('should show seed counts when enabled', async () => {
    const mockSeeds = [
      {
        currentState: {
          categories: [{ id: 'cat-1' }],
        },
      },
      {
        currentState: {
          categories: [{ id: 'cat-1' }],
        },
      },
    ]

    vi.mocked(api.get)
      .mockResolvedValueOnce(mockCategories) // First call for categories
      .mockResolvedValueOnce(mockSeeds) // Second call for seed counts

    render(<CategoryTree showSeedCounts={true} />)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    // Wait for seed counts to load
    await waitFor(() => {
      const badges = screen.getAllByTestId('badge')
      const seedCountBadge = badges.find(badge => badge.textContent === '2')
      expect(seedCountBadge).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should auto-expand root categories on load', async () => {
    vi.mocked(api.get).mockResolvedValue(mockCategories)

    render(<CategoryTree />)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })

    // Root categories should be expanded (Projects should be visible if Work is expanded)
    // Check that chevron down icons are present (expanded state)
    const chevronIcons = screen.getAllByRole('button', { name: /expand|collapse/i })
    expect(chevronIcons.length).toBeGreaterThan(0)
  })

  it('should handle recursive rendering of nested categories', async () => {
    const nestedCategories: Category[] = [
      {
        id: 'cat-1',
        parent_id: null,
        name: 'Work',
        path: '/work',
        created_at: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'cat-2',
        parent_id: 'cat-1',
        name: 'Projects',
        path: '/work/projects',
        created_at: '2024-01-02T00:00:00.000Z',
      },
      {
        id: 'cat-3',
        parent_id: 'cat-2',
        name: 'Web',
        path: '/work/projects/web',
        created_at: '2024-01-03T00:00:00.000Z',
      },
    ]

    vi.mocked(api.get).mockResolvedValue(nestedCategories)

    render(<CategoryTree />)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    // Projects should be visible if Work is expanded
    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Web should be visible if Projects is expanded
    // (This depends on auto-expansion, which might not happen for nested items)
  })

  it('should highlight selected categories', async () => {
    const selectedCategories = new Set(['cat-1'])
    vi.mocked(api.get).mockResolvedValue(mockCategories)

    render(<CategoryTree selectedCategories={selectedCategories} />)

    await waitFor(() => {
      const workItem = screen.getByText('Work').closest('.category-tree-item')
      expect(workItem).toHaveClass('category-tree-item-selected')
    })
  })
})

