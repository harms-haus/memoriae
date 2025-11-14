// TagLink component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagLink } from './TagLink'
import { getTagColor } from '../../utils/getTagColor'

// Mock getTagColor utility
vi.mock('../../utils/getTagColor', () => ({
  getTagColor: vi.fn((tagName: string, tagColor?: string | null) => {
    if (tagColor) {
      return tagColor
    }
    // Return a consistent color for testing
    return '#ffd43b' // yellow
  }),
}))

describe('TagLink Component', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render tag link with hash prefix', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      expect(screen.getByText('#work')).toBeInTheDocument()
    })

    it('should render as anchor element', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work')
      expect(link.tagName).toBe('A')
    })

    it('should have correct href attribute', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work')
      expect(link).toHaveAttribute('href', '/tags/work')
    })

    it('should apply tag-item class', () => {
      const { container } = render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      const link = container.querySelector('a.tag-item')
      expect(link).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
          className="custom-class"
        />
      )
      
      const link = container.querySelector('a.tag-item.custom-class')
      expect(link).toBeInTheDocument()
    })

    it('should handle empty className', () => {
      const { container } = render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
          className=""
        />
      )
      
      const link = container.querySelector('a.tag-item')
      expect(link).toBeInTheDocument()
      expect(link).not.toHaveClass('custom-class')
    })
  })

  describe('Color Handling', () => {
    it('should use provided tag color', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      expect(getTagColor).toHaveBeenCalledWith('work', '#ff0000')
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.color).toBe('rgb(255, 0, 0)') // #ff0000 in rgb
    })

    it('should generate color when tagColor is null', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor={null}
          href="/tags/work"
        />
      )
      
      expect(getTagColor).toHaveBeenCalledWith('work', null)
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.color).toBeTruthy()
    })

    it('should generate color when tagColor is undefined', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      expect(getTagColor).toHaveBeenCalledWith('work', undefined)
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.color).toBeTruthy()
    })

    it('should set color with important flag', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      // The color should be set via style attribute with important
      // We can't directly test the important flag, but we can verify color is set
      expect(link.style.color).toBeTruthy()
    })

    it('should update color when tagColor prop changes', () => {
      const { rerender } = render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      let link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.color).toBe('rgb(255, 0, 0)')
      
      rerender(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#00ff00"
          href="/tags/work"
        />
      )
      
      link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.color).toBe('rgb(0, 255, 0)') // #00ff00 in rgb
    })

    it('should update color when tagName prop changes', () => {
      const { rerender } = render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      rerender(
        <TagLink
          tagId="tag-2"
          tagName="personal"
          href="/tags/personal"
        />
      )
      
      expect(getTagColor).toHaveBeenCalledWith('personal', undefined)
    })
  })

  describe('Click Handling', () => {
    it('should call onClick when link is clicked', async () => {
      const user = userEvent.setup()
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
          onClick={mockOnClick}
        />
      )
      
      const link = screen.getByText('#work')
      await user.click(link)
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should pass event to onClick handler', async () => {
      const user = userEvent.setup()
      const onClickWithEvent = vi.fn((e: React.MouseEvent<HTMLAnchorElement>) => {
        // React's SyntheticEvent has nativeEvent property
        expect(e.nativeEvent).toBeInstanceOf(MouseEvent)
      })
      
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
          onClick={onClickWithEvent}
        />
      )
      
      const link = screen.getByText('#work')
      await user.click(link)
      
      expect(onClickWithEvent).toHaveBeenCalled()
    })

    it('should work without onClick handler', async () => {
      const user = userEvent.setup()
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work')
      // Should not throw error
      await user.click(link)
    })
  })

  describe('Hover Effects', () => {
    it('should add underline on hover', async () => {
      const user = userEvent.setup()
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.textDecoration).toBe('none')
      
      await user.hover(link)
      
      expect(link.style.textDecoration).toBe('underline')
    })

    it('should remove underline on mouse leave', async () => {
      const user = userEvent.setup()
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      await user.hover(link)
      expect(link.style.textDecoration).toBe('underline')
      
      await user.unhover(link)
      
      expect(link.style.textDecoration).toBe('none')
    })

    it('should maintain color on hover', async () => {
      const user = userEvent.setup()
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      
      await user.hover(link)
      
      // Color should still be set (with important flag)
      expect(link.style.color).toBeTruthy()
    })

    it('should maintain color on mouse leave', async () => {
      const user = userEvent.setup()
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      await user.hover(link)
      await user.unhover(link)
      
      // Color should still be set
      expect(link.style.color).toBeTruthy()
    })
  })

  describe('Text Content', () => {
    it('should display tag name with hash prefix', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      expect(screen.getByText('#work')).toBeInTheDocument()
    })

    it('should handle tag names with special characters', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work-project"
          href="/tags/work-project"
        />
      )
      
      expect(screen.getByText('#work-project')).toBeInTheDocument()
    })

    it('should handle tag names with spaces', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work project"
          href="/tags/work-project"
        />
      )
      
      expect(screen.getByText('#work project')).toBeInTheDocument()
    })

    it('should handle empty tag name', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName=""
          href="/tags/"
        />
      )
      
      expect(screen.getByText('#')).toBeInTheDocument()
    })

    it('should handle long tag names', () => {
      const longTagName = 'a'.repeat(100)
      render(
        <TagLink
          tagId="tag-1"
          tagName={longTagName}
          href={`/tags/${longTagName}`}
        />
      )
      
      expect(screen.getByText(`#${longTagName}`)).toBeInTheDocument()
    })
  })

  describe('Initial Style', () => {
    it('should have textDecoration none initially', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.textDecoration).toBe('none')
    })

    it('should have color set initially', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.color).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid hover/unhover', async () => {
      const user = userEvent.setup()
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      const link = screen.getByText('#work') as HTMLAnchorElement
      
      await user.hover(link)
      await user.unhover(link)
      await user.hover(link)
      await user.unhover(link)
      
      expect(link.style.textDecoration).toBe('none')
    })

    it('should handle multiple color changes', () => {
      const { rerender } = render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      let link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.color).toBe('rgb(255, 0, 0)')
      
      rerender(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#00ff00"
          href="/tags/work"
        />
      )
      
      link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.color).toBe('rgb(0, 255, 0)')
      
      rerender(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#0000ff"
          href="/tags/work"
        />
      )
      
      link = screen.getByText('#work') as HTMLAnchorElement
      expect(link.style.color).toBe('rgb(0, 0, 255)')
    })

    it('should handle className changes', () => {
      const { rerender } = render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
          className="class1"
        />
      )
      
      let link = screen.getByText('#work')
      expect(link).toHaveClass('class1')
      
      rerender(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
          className="class2"
        />
      )
      
      link = screen.getByText('#work')
      expect(link).toHaveClass('class2')
      expect(link).not.toHaveClass('class1')
    })

    it('should handle href changes', () => {
      const { rerender } = render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      let link = screen.getByText('#work')
      expect(link).toHaveAttribute('href', '/tags/work')
      
      rerender(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work-filtered"
        />
      )
      
      link = screen.getByText('#work')
      expect(link).toHaveAttribute('href', '/tags/work-filtered')
    })
  })

  describe('Integration with getTagColor', () => {
    it('should call getTagColor with correct parameters', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor="#ff0000"
          href="/tags/work"
        />
      )
      
      expect(getTagColor).toHaveBeenCalledWith('work', '#ff0000')
    })

    it('should call getTagColor when tagColor is null', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          tagColor={null}
          href="/tags/work"
        />
      )
      
      expect(getTagColor).toHaveBeenCalledWith('work', null)
    })

    it('should call getTagColor when tagColor is undefined', () => {
      render(
        <TagLink
          tagId="tag-1"
          tagName="work"
          href="/tags/work"
        />
      )
      
      expect(getTagColor).toHaveBeenCalledWith('work', undefined)
    })
  })
})

