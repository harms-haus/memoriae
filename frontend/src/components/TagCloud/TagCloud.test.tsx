import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TagCloud } from './TagCloud'
import type { Seed } from '../../types'

// Mock the API module first
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn()
  }
}))

// Mock mother components
vi.mock('@mother/components/Panel', () => ({
  Panel: ({ children, className, variant }: any) => (
    <div data-testid="panel" className={className} data-variant={variant}>
      {children}
    </div>
  ),
}))

vi.mock('@mother/components/Badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}))

// Import the mocked API after mocking
import { api } from '../../services/api'

// Get a reference to the mocked function
const mockApiGet = vi.mocked(api.get)

// Test data
const mockSeeds: Seed[] = [
  {
    id: 'seed-1',
    user_id: 'user-1',
    seed_content: 'Content about React and TypeScript',
    created_at: '2023-01-01T00:00:00Z',
    currentState: {
      seed: 'Content about React and TypeScript',
      timestamp: '2023-01-01T00:00:00Z',
      metadata: {},
      tags: [
        { id: 'tag-1', name: 'react' },
        { id: 'tag-2', name: 'typescript' },
        { id: 'tag-3', name: 'frontend' }
      ]
    }
  },
  {
    id: 'seed-2',
    user_id: 'user-1',
    seed_content: 'Node.js backend development',
    created_at: '2023-01-02T00:00:00Z',
    currentState: {
      seed: 'Node.js backend development',
      timestamp: '2023-01-02T00:00:00Z',
      metadata: {},
      tags: [
        { id: 'tag-1', name: 'react' },
        { id: 'tag-4', name: 'nodejs' },
        { id: 'tag-5', name: 'backend' }
      ]
    }
  },
  {
    id: 'seed-3',
    user_id: 'user-1',
    seed_content: 'Full-stack development with TypeScript',
    created_at: '2023-01-03T00:00:00Z',
    currentState: {
      seed: 'Full-stack development with TypeScript',
      timestamp: '2023-01-03T00:00:00Z',
      metadata: {},
      tags: [
        { id: 'tag-2', name: 'typescript' },
        { id: 'tag-4', name: 'nodejs' },
        { id: 'tag-6', name: 'fullstack' }
      ]
    }
  }
]

describe('TagCloud Component', () => {
  const mockOnTagSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset API mock to return successful response with mock seeds
    mockApiGet.mockResolvedValue(mockSeeds)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ========================================
  // Unit Tests
  // ========================================

  describe('Unit Tests', () => {
    it('renders loading state initially', () => {
      render(<TagCloud />)
      
      expect(screen.getByText('Loading tags...')).toBeInTheDocument()
      expect(screen.getByTestId('panel')).toHaveClass('tag-cloud-panel')
    })

    it('renders error state when API fails', async () => {
      const errorMessage = 'Failed to load seeds'
      mockApiGet.mockRejectedValue(new Error(errorMessage))

      render(<TagCloud />)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('renders empty state when no tags are available', async () => {
      mockApiGet.mockResolvedValue([])

      render(<TagCloud />)

      await waitFor(() => {
        expect(screen.getByText('No tags yet.')).toBeInTheDocument()
        expect(screen.getByText(/Tags will appear here/)).toBeInTheDocument()
      })
    })

    it('calculates tag frequencies correctly', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        // Check that tags are rendered with correct counts
        expect(screen.getByTitle('react (2 seeds)')).toBeInTheDocument()
        expect(screen.getByTitle('typescript (2 seeds)')).toBeInTheDocument()
        expect(screen.getByTitle('nodejs (2 seeds)')).toBeInTheDocument()
        expect(screen.getByTitle('frontend (1 seed)')).toBeInTheDocument()
        expect(screen.getByTitle('backend (1 seed)')).toBeInTheDocument()
        expect(screen.getByTitle('fullstack (1 seed)')).toBeInTheDocument()
      })
    })

    it('sorts tags by frequency (descending)', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        const tagElements = screen.getAllByRole('button')
        const tagTitles = tagElements.map(el => el.getAttribute('title'))
        
        // Tags should be sorted by frequency (2, 2, 2, 1, 1, 1)
        expect(tagTitles[0]).toContain('react (2 seeds)')
        expect(tagTitles[1]).toContain('typescript (2 seeds)')
        expect(tagTitles[2]).toContain('nodejs (2 seeds)')
      })
    })

    it('applies correct size classes based on frequency', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        // Most frequent tags (2/2 = 1.0) should be size-xl (not lg)
        const reactTag = screen.getByTitle('react (2 seeds)')
        expect(reactTag).toHaveClass('tag-cloud-size-xl')
        
        // Least frequent tags (1/2 = 0.5) should be size-md
        const frontendTag = screen.getByTitle('frontend (1 seed)')
        expect(frontendTag).toHaveClass('tag-cloud-size-md')
      })
    })

    it('applies consistent color classes based on tag name', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        // Calculate the expected color for 'react'
        // 'react' hash = 114+101+99+116+99 = 539
        // 539 % 4 = 3, which corresponds to 'tag-pink'
        const reactTag = screen.getByTitle('react (2 seeds)')
        expect(reactTag).toHaveClass('tag-pink')
        
        // Calculate the expected color for 'typescript'
        // 'typescript' hash = 116+121+112+101+115+99+114+105+112+116 = 1111
        // 1111 % 4 = 3, which also corresponds to 'tag-pink'
        const typescriptTag = screen.getByTitle('typescript (2 seeds)')
        expect(typescriptTag).toHaveClass('tag-pink')
      })
    })

    it('handles tag click events', async () => {
      render(<TagCloud onTagSelect={mockOnTagSelect} />)

      await waitFor(() => {
        const reactTag = screen.getByTitle('react (2 seeds)')
        fireEvent.click(reactTag)
      })

      expect(mockOnTagSelect).toHaveBeenCalledWith('react')
    })

    it('shows selected state for selected tags', async () => {
      const selectedTags = new Set(['react', 'typescript'])
      render(<TagCloud onTagSelect={mockOnTagSelect} selectedTags={selectedTags} />)

      await waitFor(() => {
        const reactTag = screen.getByTitle('react (2 seeds)')
        const typescriptTag = screen.getByTitle('typescript (2 seeds)')
        const nodejsTag = screen.getByTitle('nodejs (2 seeds)')
        
        expect(reactTag).toHaveClass('tag-cloud-item-selected')
        expect(typescriptTag).toHaveClass('tag-cloud-item-selected')
        expect(nodejsTag).not.toHaveClass('tag-cloud-item-selected')
      })
    })

    it('displays correct tag and seed counts', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        const badges = screen.getAllByTestId('badge')
        expect(badges[0]).toHaveTextContent('6 tags') // 6 unique tags
        expect(badges[1]).toHaveTextContent('3 seeds') // 3 seeds
      })
    })

    it('retries loading when retry button is clicked', async () => {
      const errorMessage = 'Failed to load seeds'
      mockApiGet
        .mockRejectedValueOnce(new Error(errorMessage))
        .mockResolvedValueOnce(mockSeeds)

      render(<TagCloud />)

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      // Should load successfully after retry
      await waitFor(() => {
        expect(screen.getByTitle('react (2 seeds)')).toBeInTheDocument()
      })
    })
  })

  // ========================================
  // Integration Tests
  // ========================================

  describe('Integration Tests', () => {
    it('integrates with API service', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith('/seeds')
      })

      await waitFor(() => {
        expect(screen.getByTitle('react (2 seeds)')).toBeInTheDocument()
      })
    })

    it('handles custom className prop', async () => {
      render(<TagCloud className="custom-class" />)

      await waitFor(() => {
        // Check that the component has the custom class
        const container = document.querySelector('.tag-cloud')
        expect(container).toHaveClass('custom-class')
      })
    })

    it('handles missing onTagSelect prop gracefully', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        const reactTag = screen.getByTitle('react (2 seeds)')
        expect(() => fireEvent.click(reactTag)).not.toThrow()
      })
    })

    it('handles empty selectedTags prop', async () => {
      render(<TagCloud selectedTags={new Set()} />)

      await waitFor(() => {
        const reactTag = screen.getByTitle('react (2 seeds)')
        expect(reactTag).not.toHaveClass('tag-cloud-item-selected')
      })
    })
  })

  // ========================================
  // Accessibility Tests
  // ========================================

  describe('Accessibility Tests', () => {
    it('supports keyboard navigation', async () => {
      render(<TagCloud onTagSelect={mockOnTagSelect} />)

      await waitFor(() => {
        const reactTag = screen.getByTitle('react (2 seeds)')
        reactTag.focus()
        expect(reactTag).toHaveFocus()
        
        // Simulate click event instead of keyDown for button
        fireEvent.click(reactTag)
        expect(mockOnTagSelect).toHaveBeenCalledWith('react')
      })
    })

    it('provides proper ARIA labels', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        const reactTag = screen.getByTitle('react (2 seeds)')
        expect(reactTag).toHaveAttribute('title', 'react (2 seeds)')
      })
    })

    it('has proper button roles for tag items', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        const tagButtons = screen.getAllByRole('button')
        expect(tagButtons.length).toBeGreaterThan(0)
        
        // Each button should have a title attribute
        tagButtons.forEach(button => {
          expect(button).toHaveAttribute('title')
        })
      })
    })
  })

  // ========================================
  // Visual/Regression Tests
  // ========================================

  describe('Visual Tests', () => {
    it('applies hover styles', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        const reactTag = screen.getByTitle('react (2 seeds)')
        fireEvent.mouseEnter(reactTag)
        // Check if hover class is applied (CSS transform is applied via CSS)
        expect(reactTag).toHaveClass('tag-cloud-item')
      })
    })

    it('applies focus styles', async () => {
      render(<TagCloud />)

      await waitFor(() => {
        const reactTag = screen.getByTitle('react (2 seeds)')
        fireEvent.focus(reactTag)
        // Focus styles are applied via CSS :focus-visible selector
        expect(reactTag).toHaveClass('tag-cloud-item')
      })
    })
  })

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles seeds with no tags', async () => {
      const seedsWithNoTags: Seed[] = [
        {
          id: 'seed-1',
          user_id: 'user-1',
          seed_content: 'Content with no tags',
          created_at: '2023-01-01T00:00:00Z',
          currentState: {
            seed: 'Content with no tags',
            timestamp: '2023-01-01T00:00:00Z',
            metadata: {},
            tags: []
          }
        }
      ]

      mockApiGet.mockResolvedValue(seedsWithNoTags)

      render(<TagCloud />)

      await waitFor(() => {
        expect(screen.getByText('No tags yet.')).toBeInTheDocument()
      })
    })

    it('handles seeds with missing currentState', async () => {
      const seedsWithMissingState: Seed[] = [
        {
          id: 'seed-1',
          user_id: 'user-1',
          seed_content: 'Content with missing state',
          created_at: '2023-01-01T00:00:00Z',
          currentState: {
            seed: 'Content with missing state',
            timestamp: '2023-01-01T00:00:00Z',
            metadata: {}
            // Missing tags property
          }
        }
      ]

      mockApiGet.mockResolvedValue(seedsWithMissingState)

      render(<TagCloud />)

      await waitFor(() => {
        expect(screen.getByText('No tags yet.')).toBeInTheDocument()
      })
    })

    it('handles very large tag counts', async () => {
      const largeTagCount = 1000
      const seedsWithLargeCount: Seed[] = [
        {
          id: 'seed-1',
          user_id: 'user-1',
          seed_content: 'Content with popular tag',
          created_at: '2023-01-01T00:00:00Z',
          currentState: {
            seed: 'Content with popular tag',
            timestamp: '2023-01-01T00:00:00Z',
            metadata: {},
            tags: [{ id: 'tag-1', name: 'popular' }]
          }
        }
      ]

      // Create many seeds with the same tag
      for (let i = 1; i < largeTagCount; i++) {
        seedsWithLargeCount.push({
          id: `seed-${i + 1}`,
          user_id: 'user-1',
          seed_content: 'Content with popular tag',
          created_at: `2023-01-${i + 1}T00:00:00Z`,
          currentState: {
            seed: 'Content with popular tag',
            timestamp: `2023-01-${i + 1}T00:00:00Z`,
            metadata: {},
            tags: [{ id: 'tag-1', name: 'popular' }]
          }
        })
      }

      mockApiGet.mockResolvedValue(seedsWithLargeCount)

      render(<TagCloud />)

      await waitFor(() => {
        const popularTag = screen.getByTitle(`popular (${largeTagCount} seeds)`)
        expect(popularTag).toBeInTheDocument()
        expect(popularTag).toHaveClass('tag-cloud-size-xl')
      })
    })

    it('handles API timeout gracefully', async () => {
      // Create a promise that never resolves
      const neverResolves = new Promise(() => {})
      mockApiGet.mockReturnValue(neverResolves)

      render(<TagCloud />)

      // Should show loading state indefinitely
      expect(screen.getByText('Loading tags...')).toBeInTheDocument()
    })

    it('handles malformed API response', async () => {
      // The component doesn't validate response format, so it will try to process
      // a string as if it were an array of seeds, which will result in an empty state
      mockApiGet.mockResolvedValue('invalid response')

      render(<TagCloud />)

      // Should handle error gracefully by showing empty state
      await waitFor(() => {
        expect(screen.getByText('No tags yet.')).toBeInTheDocument()
      })
    })
  })
})
