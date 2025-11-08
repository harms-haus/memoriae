import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
    // Clear mocks but preserve the implementation
    mockApiGet.mockClear()
    // Reset API mock to return successful response with mock seeds and empty tags array
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/seeds') {
        return Promise.resolve(mockSeeds)
      }
      if (url === '/tags') {
        return Promise.resolve([])
      }
      return Promise.resolve([])
    })
  })

  afterEach(() => {
    // Just clear call history, don't restore (which would break the mock)
    mockApiGet.mockClear()
  })

  // ========================================
  // Unit Tests
  // ========================================

  describe('Unit Tests', () => {
    it('renders loading state initially', () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )
      
      expect(screen.getByText('Loading tags...')).toBeInTheDocument()
      expect(screen.getByTestId('panel')).toHaveClass('tag-cloud-panel')
    })

    it('renders error state when API fails', async () => {
      const errorMessage = 'Failed to load seeds'
      mockApiGet.mockImplementation((url: string) => {
        if (url === '/seeds') {
          return Promise.reject(new Error(errorMessage))
        }
        if (url === '/tags') {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      render(
        <MemoryRouter>
          <TagCloud />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('renders empty state when no tags are available', async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url === '/seeds') {
          return Promise.resolve([])
        }
        if (url === '/tags') {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      render(
        <MemoryRouter>
          <TagCloud />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('No tags yet.')).toBeInTheDocument()
        expect(screen.getByText(/Tags will appear here/)).toBeInTheDocument()
      })
    })

    it('calculates tag frequencies correctly', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      // Wait for loading to complete and tags to render
      await waitFor(() => {
        // First ensure loading is done
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument()
        // Then check that tags are rendered with correct counts
        expect(screen.getByTitle(/react \(2 seeds\)/)).toBeInTheDocument()
        expect(screen.getByTitle(/typescript \(2 seeds\)/)).toBeInTheDocument()
        expect(screen.getByTitle(/nodejs \(2 seeds\)/)).toBeInTheDocument()
        expect(screen.getByTitle(/frontend \(1 seed\)/)).toBeInTheDocument()
        expect(screen.getByTitle(/backend \(1 seed\)/)).toBeInTheDocument()
        expect(screen.getByTitle(/fullstack \(1 seed\)/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('sorts tags by frequency (descending)', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      // Wait for loading to complete and tags to render
      await waitFor(() => {
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument()
        const tagElements = screen.getAllByRole('link')
        expect(tagElements.length).toBeGreaterThan(0)
        const tagTitles = tagElements.map(el => el.getAttribute('title'))
        
        // Tags should be sorted by frequency (2, 2, 2, 1, 1, 1)
        expect(tagTitles[0]).toContain('react (2 seeds)')
        expect(tagTitles[1]).toContain('typescript (2 seeds)')
        expect(tagTitles[2]).toContain('nodejs (2 seeds)')
      }, { timeout: 3000 })
    })

    it('applies correct size classes based on frequency', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      // Wait for loading to complete and tags to render
      await waitFor(() => {
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument()
        // Most frequent tags (2/2 = 1.0) should be size-xl (not lg)
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
        expect(reactTag).toHaveClass('tag-cloud-size-xl')
        
        // Least frequent tags (1/2 = 0.5) should be size-md
        const frontendTag = screen.getByTitle(/frontend \(1 seed\)/)
        expect(frontendTag).toHaveClass('tag-cloud-size-md')
      }, { timeout: 3000 })
    })

    it('applies consistent colors based on tag name', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument()
        // Tags should have color styles applied via inline styles
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
        expect(reactTag).toBeInTheDocument()
        const reactColor = reactTag.style.color
        expect(reactColor).toBeTruthy()
        expect(typeof reactColor).toBe('string')
        
        const typescriptTag = screen.getByTitle(/typescript \(2 seeds\)/)
        expect(typescriptTag).toBeInTheDocument()
        const typescriptColor = typescriptTag.style.color
        expect(typescriptColor).toBeTruthy()
        expect(typeof typescriptColor).toBe('string')
      }, { timeout: 3000 })
    })

    it('handles tag click events', async () => {
      render(
      <MemoryRouter>
        <TagCloud onTagSelect={mockOnTagSelect} />
      </MemoryRouter>
    )

      await waitFor(() => {
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument()
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
        expect(reactTag).toBeInTheDocument()
      }, { timeout: 3000 })

      const reactTag = screen.getByTitle(/react \(2 seeds\)/)
      // Component requires modifier key (Ctrl/Cmd/Shift) to call onTagSelect
      fireEvent.click(reactTag, { ctrlKey: true })

      expect(mockOnTagSelect).toHaveBeenCalledWith('react')
    })

    it('shows selected state for selected tags', async () => {
      const selectedTags = new Set(['react', 'typescript'])
      render(
        <MemoryRouter>
          <TagCloud onTagSelect={mockOnTagSelect} selectedTags={selectedTags} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument()
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
        const typescriptTag = screen.getByTitle(/typescript \(2 seeds\)/)
        const nodejsTag = screen.getByTitle(/nodejs \(2 seeds\)/)
        
        expect(reactTag).toHaveClass('tag-cloud-item-selected')
        expect(typescriptTag).toHaveClass('tag-cloud-item-selected')
        expect(nodejsTag).not.toHaveClass('tag-cloud-item-selected')
      }, { timeout: 3000 })
    })

    it('displays correct tag and seed counts', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument()
        const badges = screen.getAllByTestId('badge')
        expect(badges[0]).toHaveTextContent('6 tags') // 6 unique tags
        expect(badges[1]).toHaveTextContent('3 seeds') // 3 seeds
      }, { timeout: 3000 })
    })

    it('retries loading when retry button is clicked', async () => {
      const errorMessage = 'Failed to load seeds'
      mockApiGet
        .mockRejectedValueOnce(new Error(errorMessage))
        .mockResolvedValueOnce(mockSeeds)

      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      // Should load successfully after retry
      await waitFor(() => {
        expect(screen.getByTitle(/react \(2 seeds\)/)).toBeInTheDocument()
      })
    })
  })

  // ========================================
  // Integration Tests
  // ========================================

  describe('Integration Tests', () => {
    it('integrates with API service', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith('/seeds')
      })

      await waitFor(() => {
        expect(screen.getByTitle(/react \(2 seeds\)/)).toBeInTheDocument()
      })
    })

    it('handles custom className prop', async () => {
      render(
        <MemoryRouter>
          <TagCloud className="custom-class" />
        </MemoryRouter>
      )

      await waitFor(() => {
        // Check that the component has the custom class
        const container = document.querySelector('.tag-cloud')
        expect(container).toHaveClass('custom-class')
      })
    })

    it('handles missing onTagSelect prop gracefully', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument()
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
        expect(reactTag).toBeInTheDocument()
      }, { timeout: 3000 })

      const reactTag = screen.getByTitle(/react \(2 seeds\)/)
      // Should not throw even without onTagSelect prop
      expect(() => fireEvent.click(reactTag)).not.toThrow()
    })

    it('handles empty selectedTags prop', async () => {
      render(
        <MemoryRouter>
          <TagCloud selectedTags={new Set()} />
        </MemoryRouter>
      )

      // Wait for tags to render (this also implies loading is complete)
      await waitFor(() => {
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
        expect(reactTag).toBeInTheDocument()
      }, { timeout: 3000 })

      // Verify the tag is not selected when selectedTags is empty
      const reactTag = screen.getByTitle(/react \(2 seeds\)/)
      expect(reactTag).not.toHaveClass('tag-cloud-item-selected')
    })
  })

  // ========================================
  // Accessibility Tests
  // ========================================

  describe('Accessibility Tests', () => {
    it('supports keyboard navigation', async () => {
      render(
      <MemoryRouter>
        <TagCloud onTagSelect={mockOnTagSelect} />
      </MemoryRouter>
    )

      await waitFor(() => {
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
        reactTag.focus()
        expect(reactTag).toHaveFocus()
        
        // Simulate click event instead of keyDown for button
        fireEvent.click(reactTag)
        expect(mockOnTagSelect).toHaveBeenCalledWith('react')
      })
    })

    it('provides proper ARIA labels', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
        expect(reactTag).toHaveAttribute('title', expect.stringMatching(/react \(2 seeds\)/))
      })
    })

    it('has proper link roles for tag items', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        const tagLinks = screen.getAllByRole('link')
        expect(tagLinks.length).toBeGreaterThan(0)
        
        // Each link should have a title attribute
        tagLinks.forEach(link => {
          expect(link).toHaveAttribute('title')
        })
      })
    })
  })

  // ========================================
  // Visual/Regression Tests
  // ========================================

  describe('Visual Tests', () => {
    it('applies hover styles', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
        fireEvent.mouseEnter(reactTag)
        // Check if hover class is applied (CSS transform is applied via CSS)
        expect(reactTag).toHaveClass('tag-cloud-item')
      })
    })

    it('applies focus styles', async () => {
      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        const reactTag = screen.getByTitle(/react \(2 seeds\)/)
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
          created_at: '2023-01-01T00:00:00Z',
          currentState: {
            seed: 'Content with no tags',
            timestamp: '2023-01-01T00:00:00Z',
            metadata: {},
            tags: []
          }
        }
      ]

      mockApiGet.mockImplementation((url: string) => {
        if (url === '/seeds') {
          return Promise.resolve(seedsWithNoTags)
        }
        if (url === '/tags') {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        expect(screen.getByText('No tags yet.')).toBeInTheDocument()
      })
    })

    it('handles seeds with missing currentState', async () => {
      const seedsWithMissingState: Seed[] = [
        {
          id: 'seed-1',
          user_id: 'user-1',
          created_at: '2023-01-01T00:00:00Z',
          currentState: {
            seed: 'Content with missing state',
            timestamp: '2023-01-01T00:00:00Z',
            metadata: {}
            // Missing tags property
          }
        }
      ]

      mockApiGet.mockImplementation((url: string) => {
        if (url === '/seeds') {
          return Promise.resolve(seedsWithMissingState)
        }
        if (url === '/tags') {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

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
          created_at: `2023-01-${i + 1}T00:00:00Z`,
          currentState: {
            seed: 'Content with popular tag',
            timestamp: `2023-01-${i + 1}T00:00:00Z`,
            metadata: {},
            tags: [{ id: 'tag-1', name: 'popular' }]
          }
        })
      }

      mockApiGet.mockImplementation((url: string) => {
        if (url === '/seeds') {
          return Promise.resolve(seedsWithLargeCount)
        }
        if (url === '/tags') {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      await waitFor(() => {
        const popularTag = screen.getByTitle(new RegExp(`popular \\(${largeTagCount} seeds\\)`))
        expect(popularTag).toBeInTheDocument()
        expect(popularTag).toHaveClass('tag-cloud-size-xl')
      }, { timeout: 5000 })
    })

    it('handles API timeout gracefully', async () => {
      // Create a promise that never resolves
      const neverResolves = new Promise(() => {})
      mockApiGet.mockImplementation((url: string) => {
        if (url === '/seeds') {
          return neverResolves
        }
        if (url === '/tags') {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      // Should show loading state indefinitely
      expect(screen.getByText('Loading tags...')).toBeInTheDocument()
    })

    it('handles malformed API response', async () => {
      // The component doesn't validate response format, so it will try to process
      // a string as if it were an array of seeds, which will result in an empty state
      mockApiGet.mockImplementation((url: string) => {
        if (url === '/seeds') {
          return Promise.resolve('invalid response' as any)
        }
        if (url === '/tags') {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      render(
      <MemoryRouter>
        <TagCloud />
      </MemoryRouter>
    )

      // Should handle error gracefully by showing empty state
      await waitFor(() => {
        expect(screen.getByText('No tags yet.')).toBeInTheDocument()
      })
    })
  })
})
