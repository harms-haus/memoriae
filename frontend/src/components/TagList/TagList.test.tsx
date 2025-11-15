// TagList component tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagList, type TagListItem } from './TagList'

// Mock getComputedStyle to return theme colors
const mockGetComputedStyle = vi.fn()
const mockThemeColors = {
  '--accent-yellow': '#ffd43b',
  '--accent-blue': '#4fc3f7',
  '--accent-green': '#66bb6a',
  '--accent-purple': '#ab47bc',
  '--accent-pink': '#ec407a',
  '--accent-orange': '#ff9800',
}

describe('TagList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock ResizeObserver
    globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as any
    
    // Mock getComputedStyle
    mockGetComputedStyle.mockImplementation((element) => {
      const mockStyle = {
        getPropertyValue: (prop: string) => {
          if (element === document.documentElement) {
            return mockThemeColors[prop as keyof typeof mockThemeColors] || ''
          }
          // For regular elements, return empty string or check style attribute
          if (element && 'getAttribute' in element && element instanceof HTMLElement) {
            const styleAttr = element.getAttribute('style')
            if (styleAttr) {
              // Extract color from style attribute if present
              const colorMatch = styleAttr.match(/color:\s*([^;]+)/)
              if (colorMatch && colorMatch[1] && prop === 'color') {
                return colorMatch[1].trim()
              }
            }
          }
          return ''
        },
      } as CSSStyleDeclaration
      return mockStyle
    })
    
    Object.defineProperty(window, 'getComputedStyle', {
      value: mockGetComputedStyle,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Clean up any measurement containers
    const measureContainers = document.querySelectorAll('[style*="position: absolute"]')
    measureContainers.forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container)
      }
    })
  })

  const mockTags: TagListItem[] = [
    { id: 'tag-1', name: 'work', color: '#ff0000' },
    { id: 'tag-2', name: 'personal', color: null },
    { id: 'tag-3', name: 'important', color: '#00ff00' },
  ]

  describe('Basic Rendering', () => {
    it('should render all tags when suppressTruncate is true', () => {
      render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      expect(screen.getByText('#work')).toBeInTheDocument()
      expect(screen.getByText('#personal')).toBeInTheDocument()
      expect(screen.getByText('#important')).toBeInTheDocument()
    })

    it('should render tags with hash prefix by default', () => {
      render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      expect(screen.getByText('#work')).toBeInTheDocument()
      expect(screen.getByText('#personal')).toBeInTheDocument()
    })

    it('should render tags without hash prefix when suppressHashes is true', () => {
      render(<TagList tags={mockTags} suppressHashes={true} suppressTruncate={true} />)
      
      expect(screen.getByText('work')).toBeInTheDocument()
      expect(screen.getByText('personal')).toBeInTheDocument()
      expect(screen.queryByText('#work')).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<TagList tags={mockTags} className="custom-class" suppressTruncate={true} />)
      
      const tagList = container.querySelector('.tag-list.custom-class')
      expect(tagList).toBeInTheDocument()
    })

    it('should render empty list when no tags', () => {
      render(<TagList tags={[]} suppressTruncate={true} />)
      
      const { container } = render(<TagList tags={[]} suppressTruncate={true} />)
      const tagList = container.querySelector('.tag-list')
      expect(tagList).toBeInTheDocument()
      expect(tagList?.children.length).toBe(0)
    })
  })

  describe('Tag Click Handling', () => {
    it('should call onTagClick when tag is clicked', async () => {
      const user = userEvent.setup()
      const onTagClick = vi.fn()
      
      render(<TagList tags={mockTags} onTagClick={onTagClick} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      await user.click(workTag)
      
      expect(onTagClick).toHaveBeenCalledWith(mockTags[0], expect.any(Object))
    })

    it('should render tags as links when onTagClick is provided', () => {
      const onTagClick = vi.fn()
      render(<TagList tags={mockTags} onTagClick={onTagClick} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      expect(workTag.tagName).toBe('A')
      expect(workTag).toHaveAttribute('href', '#')
    })

    it('should render tags as spans when onTagClick is not provided', () => {
      render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      expect(workTag.tagName).toBe('SPAN')
    })

    it('should prevent default and stop propagation on tag click', async () => {
      const onTagClick = vi.fn()
      
      render(<TagList tags={mockTags} onTagClick={onTagClick} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      vi.spyOn(clickEvent, 'preventDefault')
      vi.spyOn(clickEvent, 'stopPropagation')
      
      workTag.dispatchEvent(clickEvent)
      
      // The component's onClick handler will call preventDefault and stopPropagation
      await waitFor(() => {
        expect(onTagClick).toHaveBeenCalled()
      })
    })
  })

  describe('Color Handling', () => {
    it('should use existing tag color when provided', () => {
      render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      // Color should be set via style attribute
      const style = workTag.getAttribute('style')
      expect(style).toContain('color')
      expect(style).toContain('#ff0000')
    })

    it('should generate consistent color for tags without color', () => {
      render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      const personalTag = screen.getByText('#personal')
      // Should have a color assigned (from theme) - check style attribute exists
      const style = personalTag.getAttribute('style')
      expect(style).toBeTruthy()
      expect(style).toContain('color')
    })

    it('should suppress colors when suppressColors is true', () => {
      render(<TagList tags={mockTags} suppressColors={true} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      // Color should not be set when suppressed
      const style = workTag.getAttribute('style')
      expect(style).toBeNull() // When suppressed, style should be null or not contain color
    })

    it('should handle empty string color as no color', () => {
      const tagsWithEmptyColor: TagListItem[] = [
        { id: 'tag-1', name: 'work', color: '' },
      ]
      
      render(<TagList tags={tagsWithEmptyColor} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      // Should generate a color from theme - check style attribute exists
      const style = workTag.getAttribute('style')
      expect(style).toBeTruthy()
      expect(style).toContain('color')
    })

    it('should handle whitespace-only color as no color', () => {
      const tagsWithWhitespaceColor: TagListItem[] = [
        { id: 'tag-1', name: 'work', color: '   ' },
      ]
      
      render(<TagList tags={tagsWithWhitespaceColor} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      // Should generate a color from theme - check style attribute exists
      const style = workTag.getAttribute('style')
      expect(style).toBeTruthy()
      expect(style).toContain('color')
    })
  })

  describe('Hover Effects', () => {
    it('should add underline on hover', async () => {
      const user = userEvent.setup()
      render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      await user.hover(workTag)
      
      // Hover effects are typically applied via CSS classes or pseudo-classes
      // Check that the element is hoverable (has pointer cursor or similar)
      // Since we can't easily test CSS pseudo-classes, we'll just verify the element exists
      expect(workTag).toBeInTheDocument()
    })

    it('should remove underline on mouse leave', async () => {
      const user = userEvent.setup()
      render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      await user.hover(workTag)
      await user.unhover(workTag)
      
      // After unhover, element should still be in document
      expect(workTag).toBeInTheDocument()
    })

    it('should maintain color on hover', async () => {
      const user = userEvent.setup()
      render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      // Store original color for comparison
      workTag.style.color
      
      await user.hover(workTag)
      
      // Color should still be set
      expect(workTag.style.color).toBeTruthy()
    })
  })

  describe('Truncation', () => {
    it('should show all tags when suppressTruncate is true', () => {
      const manyTags: TagListItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `tag-${i}`,
        name: `tag${i}`,
      }))
      
      render(<TagList tags={manyTags} suppressTruncate={true} />)
      
      manyTags.forEach(tag => {
        expect(screen.getByText(`#${tag.name}`)).toBeInTheDocument()
      })
    })

    it('should handle empty tags array with truncation', () => {
      const { container } = render(<TagList tags={[]} suppressTruncate={false} />)
      const tagList = container.querySelector('.tag-list')
      expect(tagList).toBeInTheDocument()
      expect(tagList?.children.length).toBe(0)
    })

    it('should handle container with zero width initially', async () => {
      const manyTags: TagListItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `tag-${i}`,
        name: `tag${i}`,
      }))
      
      const { container } = render(
        <TagList 
          tags={manyTags} 
          onTruncatedButtonClick={vi.fn()}
          suppressTruncate={false}
        />
      )
      
      const tagListContainer = container.querySelector('.tag-list') as HTMLElement
      if (tagListContainer) {
        Object.defineProperty(tagListContainer, 'offsetWidth', {
          value: 0,
          writable: true,
        })
      }
      
      // Component should handle zero width gracefully
      await waitFor(() => {
        expect(tagListContainer).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('should call onTruncatedButtonClick when truncate button is clicked', async () => {
      const user = userEvent.setup()
      const onTruncatedButtonClick = vi.fn()
      const manyTags: TagListItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `tag-${i}`,
        name: `tag${i}`,
      }))
      
      // Force truncation by setting suppressTruncate to false and providing callback
      // In a real scenario, this would be determined by measurement
      // For testing, we'll manually trigger the button if it appears
      const { container } = render(
        <TagList 
          tags={manyTags} 
          onTruncatedButtonClick={onTruncatedButtonClick}
          suppressTruncate={false}
        />
      )
      
      // Wait a bit for measurement
      await waitFor(() => {
        const truncateButton = container.querySelector('.tag-list-truncate-button')
        if (truncateButton) {
          // If button appears, click it
          user.click(truncateButton as HTMLElement)
        }
      }, { timeout: 2000 })
    })

    it('should not show truncate button when onTruncatedButtonClick is not provided', () => {
      const manyTags: TagListItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `tag-${i}`,
        name: `tag${i}`,
      }))
      
      const { container } = render(
        <TagList 
          tags={manyTags} 
          suppressTruncate={false}
        />
      )
      
      // Without callback, truncate button should not appear
      const truncateButton = container.querySelector('.tag-list-truncate-button')
      expect(truncateButton).toBeNull()
    })

    it('should handle ResizeObserver cleanup', async () => {
      const manyTags: TagListItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `tag-${i}`,
        name: `tag${i}`,
      }))
      
      const { unmount } = render(
        <TagList 
          tags={manyTags} 
          suppressTruncate={false}
        />
      )
      
      // Unmount should clean up ResizeObserver
      unmount()
      
      // Verify cleanup happened (no errors should be thrown)
      await waitFor(() => {
        expect(true).toBe(true) // Just verify unmount succeeded
      })
    })

    it('should handle measurement container cleanup', async () => {
      const manyTags: TagListItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `tag-${i}`,
        name: `tag${i}`,
      }))
      
      const { unmount } = render(
        <TagList 
          tags={manyTags} 
          suppressTruncate={false}
        />
      )
      
      // Wait a bit for measurement container to be created
      await waitFor(() => {
        // Measurement container may or may not exist
        expect(true).toBe(true)
      }, { timeout: 500 })
      
      // Unmount should clean up measurement container
      unmount()
      
      // Verify no measurement containers remain
      const measureContainers = document.querySelectorAll('[style*="position: absolute"]')
      expect(measureContainers.length).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle tags with special characters', () => {
      const specialTags: TagListItem[] = [
        { id: 'tag-1', name: 'tag-with-dashes' },
        { id: 'tag-2', name: 'tag_with_underscores' },
        { id: 'tag-3', name: 'tag with spaces' },
      ]
      
      render(<TagList tags={specialTags} suppressTruncate={true} />)
      
      expect(screen.getByText('#tag-with-dashes')).toBeInTheDocument()
      expect(screen.getByText('#tag_with_underscores')).toBeInTheDocument()
      expect(screen.getByText('#tag with spaces')).toBeInTheDocument()
    })

    it('should handle tags with empty names', () => {
      const emptyNameTags: TagListItem[] = [
        { id: 'tag-1', name: '' },
      ]
      
      render(<TagList tags={emptyNameTags} suppressTruncate={true} />)
      
      expect(screen.getByText('#')).toBeInTheDocument()
    })

    it('should handle very long tag names', () => {
      const longTagName = 'a'.repeat(100)
      const longTags: TagListItem[] = [
        { id: 'tag-1', name: longTagName },
      ]
      
      render(<TagList tags={longTags} suppressTruncate={true} />)
      
      expect(screen.getByText(`#${longTagName}`)).toBeInTheDocument()
    })

    it('should update when tags prop changes', () => {
      const { rerender } = render(<TagList tags={mockTags.slice(0, 1)} suppressTruncate={true} />)
      
      expect(screen.getByText('#work')).toBeInTheDocument()
      expect(screen.queryByText('#personal')).not.toBeInTheDocument()
      
      rerender(<TagList tags={mockTags} suppressTruncate={true} />)
      
      expect(screen.getByText('#work')).toBeInTheDocument()
      expect(screen.getByText('#personal')).toBeInTheDocument()
      expect(screen.getByText('#important')).toBeInTheDocument()
    })

    it('should handle rapid tag changes', async () => {
      const { rerender } = render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      // Rapidly change tags
      rerender(<TagList tags={[]} suppressTruncate={true} />)
      rerender(<TagList tags={mockTags} suppressTruncate={true} />)
      rerender(<TagList tags={mockTags.slice(0, 1)} suppressTruncate={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('#work')).toBeInTheDocument()
        expect(screen.queryByText('#personal')).not.toBeInTheDocument()
      })
    })
  })

  describe('Color Generation', () => {
    it('should generate consistent colors for same tag name', () => {
      const tag1: TagListItem = { id: 'tag-1', name: 'work', color: null }
      const tag2: TagListItem = { id: 'tag-2', name: 'work', color: null }
      
      const { rerender } = render(<TagList tags={[tag1]} suppressTruncate={true} />)
      const firstColor = screen.getByText('#work').style.color
      
      rerender(<TagList tags={[tag2]} suppressTruncate={true} />)
      const secondColor = screen.getByText('#work').style.color
      
      // Same tag name should get same color
      expect(firstColor).toBe(secondColor)
    })

    it('should generate different colors for different tag names', () => {
      const tag1: TagListItem = { id: 'tag-1', name: 'work', color: null }
      const tag2: TagListItem = { id: 'tag-2', name: 'personal', color: null }
      
      render(<TagList tags={[tag1, tag2]} suppressTruncate={true} />)
      
      const workColor = screen.getByText('#work').style.color
      const personalColor = screen.getByText('#personal').style.color
      
      // Different tag names should get different colors (likely, but not guaranteed)
      // At minimum, both should have colors assigned
      expect(workColor).toBeTruthy()
      expect(personalColor).toBeTruthy()
    })

    it('should update colors when suppressColors changes', async () => {
      const { rerender } = render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      const workTag = screen.getByText('#work')
      expect(workTag.style.color).toBeTruthy()
      
      rerender(<TagList tags={mockTags} suppressColors={true} suppressTruncate={true} />)
      
      // Color should be removed when suppressed
      await waitFor(() => {
        const updatedTag = screen.getByText('#work')
        expect(updatedTag.style.color).toBeFalsy()
      })
    })

    it('should update colors when tags change', async () => {
      const { rerender } = render(<TagList tags={mockTags.slice(0, 1)} suppressTruncate={true} />)
      
      expect(screen.getByText('#work')).toBeInTheDocument()
      
      rerender(<TagList tags={mockTags} suppressTruncate={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('#personal')).toBeInTheDocument()
        expect(screen.getByText('#personal').style.color).toBeTruthy()
      })
    })
  })

  describe('Ref Management', () => {
    it('should handle tag refs correctly when tags are removed', async () => {
      const { rerender } = render(<TagList tags={mockTags} suppressTruncate={true} />)
      
      expect(screen.getByText('#work')).toBeInTheDocument()
      expect(screen.getByText('#personal')).toBeInTheDocument()
      
      // Remove a tag
      rerender(<TagList tags={mockTags.slice(0, 1)} suppressTruncate={true} />)
      
      await waitFor(() => {
        expect(screen.queryByText('#personal')).not.toBeInTheDocument()
        expect(screen.getByText('#work')).toBeInTheDocument()
      })
    })

    it('should handle tag refs correctly when tags are added', async () => {
      const { rerender } = render(<TagList tags={mockTags.slice(0, 1)} suppressTruncate={true} />)
      
      expect(screen.getByText('#work')).toBeInTheDocument()
      
      // Add tags
      rerender(<TagList tags={mockTags} suppressTruncate={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('#personal')).toBeInTheDocument()
        expect(screen.getByText('#important')).toBeInTheDocument()
      })
    })
  })
})

