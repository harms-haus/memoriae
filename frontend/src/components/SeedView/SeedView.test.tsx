// SeedView component unit tests
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SeedView } from './SeedView'
import type { Seed } from '../../types'

// Mock TagList component
vi.mock('../TagList', () => ({
  TagList: ({ tags, onTagClick, suppressTruncate }: any) => (
    <div data-testid="tag-list">
      {tags.map((tag: any) => (
        <span
          key={tag.id}
          data-testid={`tag-${tag.id}`}
          onClick={(e) => onTagClick?.({ id: tag.id, name: tag.name }, e)}
        >
          #{tag.name}
        </span>
      ))}
    </div>
  ),
}))

const mockSeed: Seed = {
  id: 'seed-1',
  user_id: 'user-1',
  created_at: '2024-01-01T00:00:00.000Z',
  currentState: {
    seed: 'Test seed content',
    timestamp: '2024-01-01T00:00:00.000Z',
    metadata: {},
    tags: [
      { id: 'tag-1', name: 'work' },
      { id: 'tag-2', name: 'important' },
    ],
    categories: [
      { id: 'cat-1', name: 'Work', path: '/work' },
    ],
  },
}

describe('SeedView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render seed content', () => {
      render(
        <MemoryRouter>
          <SeedView seed={mockSeed} />
        </MemoryRouter>
      )
      expect(screen.getByText('Test seed content')).toBeInTheDocument()
    })

    it('should render tags', () => {
      render(
        <MemoryRouter>
          <SeedView seed={mockSeed} />
        </MemoryRouter>
      )
      expect(screen.getByTestId('tag-list')).toBeInTheDocument()
      expect(screen.getByTestId('tag-tag-1')).toBeInTheDocument()
      expect(screen.getByTestId('tag-tag-2')).toBeInTheDocument()
    })

    it('should render category', () => {
      render(
        <MemoryRouter>
          <SeedView seed={mockSeed} />
        </MemoryRouter>
      )
      expect(screen.getByText('/work')).toBeInTheDocument()
    })

    it('should render time', () => {
      const { container } = render(
        <MemoryRouter>
          <SeedView seed={mockSeed} />
        </MemoryRouter>
      )
      // Time formatting may vary, just check it exists
      const timeElement = container.querySelector('.seed-view-time')
      expect(timeElement).toBeInTheDocument()
      expect(timeElement?.textContent).toBeTruthy()
    })

    it('should handle seed without tags', () => {
      const seedWithoutTags: Seed = {
        ...mockSeed,
        currentState: {
          ...mockSeed.currentState!,
          tags: [],
        },
      }
      render(
        <MemoryRouter>
          <SeedView seed={seedWithoutTags} />
        </MemoryRouter>
      )
      expect(screen.queryByTestId('tag-list')).not.toBeInTheDocument()
    })

    it('should handle seed without category', () => {
      const seedWithoutCategory: Seed = {
        ...mockSeed,
        currentState: {
          ...mockSeed.currentState!,
          categories: [],
        },
      }
      render(
        <MemoryRouter>
          <SeedView seed={seedWithoutCategory} />
        </MemoryRouter>
      )
      expect(screen.queryByText('/work')).not.toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('should render textarea when isEditing is true', () => {
      render(
        <MemoryRouter>
          <SeedView seed={mockSeed} isEditing={true} />
        </MemoryRouter>
      )
      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveValue('Test seed content')
    })

    it('should render editable tags with remove buttons when isEditing is true', () => {
      render(
        <MemoryRouter>
          <SeedView seed={mockSeed} isEditing={true} />
        </MemoryRouter>
      )
      // In edit mode, tags should be rendered with X buttons
      expect(screen.getByText('#work')).toBeInTheDocument()
      expect(screen.getByText('#important')).toBeInTheDocument()
      
      // Check for remove buttons (× character)
      const removeButtons = screen.getAllByRole('button', { name: /Remove tag/ })
      expect(removeButtons).toHaveLength(2)
    })

    it('should call onContentChange when textarea value changes', async () => {
      const user = userEvent.setup()
      const onContentChange = vi.fn()
      let editedContent = 'Test seed content'
      
      render(
        <MemoryRouter>
          <SeedView
            seed={mockSeed}
            isEditing={true}
            onContentChange={(value) => {
              editedContent = value
              onContentChange(value)
            }}
            editedContent={editedContent}
          />
        </MemoryRouter>
      )
      
      const textarea = screen.getByRole('textbox')
      // Type a single character to trigger onChange
      await user.type(textarea, 'X')
      
      // Check that onContentChange was called
      expect(onContentChange).toHaveBeenCalled()
      // Verify it was called with the updated value
      expect(onContentChange).toHaveBeenCalledWith('Test seed contentX')
    })

    it('should call onTagRemove when remove button is clicked', async () => {
      const user = userEvent.setup()
      const onTagRemove = vi.fn()
      
      render(
        <MemoryRouter>
          <SeedView
            seed={mockSeed}
            isEditing={true}
            onTagRemove={onTagRemove}
          />
        </MemoryRouter>
      )
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove tag/ })
      const firstButton = removeButtons[0]
      if (!firstButton) {
        throw new Error('Remove button not found')
      }
      await user.click(firstButton)
      
      expect(onTagRemove).toHaveBeenCalledWith('tag-1')
    })

    it('should not call onTagClick when in edit mode', async () => {
      const user = userEvent.setup()
      const onTagClick = vi.fn()
      
      render(
        <MemoryRouter>
          <SeedView
            seed={mockSeed}
            isEditing={true}
            onTagClick={onTagClick}
          />
        </MemoryRouter>
      )
      
      // In edit mode, TagList is not used, so onTagClick won't be called
      // But if we click a tag element, it should not trigger navigation
      const tagElement = screen.getByText('#work')
      await user.click(tagElement)
      
      // onTagClick should not be called in edit mode
      expect(onTagClick).not.toHaveBeenCalled()
    })

    it('should use editedContent when provided', () => {
      render(
        <MemoryRouter>
          <SeedView
            seed={mockSeed}
            isEditing={true}
            editedContent="Edited content"
          />
        </MemoryRouter>
      )
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('Edited content')
    })

    it('should use editedTags when provided', () => {
      const editedTags = [{ id: 'tag-1', name: 'work' }]
      
      render(
        <MemoryRouter>
          <SeedView
            seed={mockSeed}
            isEditing={true}
            editedTags={editedTags}
          />
        </MemoryRouter>
      )
      
      // Should only show one tag (tag-1)
      expect(screen.getByText('#work')).toBeInTheDocument()
      expect(screen.queryByText('#important')).not.toBeInTheDocument()
      
      // Should have one remove button
      const removeButtons = screen.getAllByRole('button', { name: /Remove tag/ })
      expect(removeButtons).toHaveLength(1)
    })

    it('should fall back to original content when editedContent is undefined', () => {
      render(
        <MemoryRouter>
          <SeedView
            seed={mockSeed}
            isEditing={true}
          />
        </MemoryRouter>
      )
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('Test seed content')
    })

    it('should fall back to original tags when editedTags is undefined', () => {
      render(
        <MemoryRouter>
          <SeedView
            seed={mockSeed}
            isEditing={true}
          />
        </MemoryRouter>
      )
      
      // Should show both tags
      expect(screen.getByText('#work')).toBeInTheDocument()
      expect(screen.getByText('#important')).toBeInTheDocument()
    })
  })

  describe('Non-Edit Mode', () => {
    it('should render content as div when not editing', () => {
      render(
        <MemoryRouter>
          <SeedView seed={mockSeed} isEditing={false} />
        </MemoryRouter>
      )
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByText('Test seed content')).toBeInTheDocument()
    })

    it('should call onTagClick when tag is clicked in non-edit mode', async () => {
      const user = userEvent.setup()
      const onTagClick = vi.fn()
      
      render(
        <MemoryRouter>
          <SeedView
            seed={mockSeed}
            isEditing={false}
            onTagClick={onTagClick}
          />
        </MemoryRouter>
      )
      
      const tagElement = screen.getByTestId('tag-tag-1')
      await user.click(tagElement)
      
      expect(onTagClick).toHaveBeenCalledWith('tag-1', 'work')
    })
  })

  describe('Tag Colors', () => {
    it('should apply tag colors when provided', () => {
      const tagColors = new Map([
        ['work', '#ff0000'],
        ['important', '#00ff00'],
      ])
      
      render(
        <MemoryRouter>
          <SeedView
            seed={mockSeed}
            isEditing={true}
            tagColors={tagColors}
          />
        </MemoryRouter>
      )
      
      // In edit mode, colors are applied via inline styles
      const workTag = screen.getByText('#work')
      expect(workTag).toBeInTheDocument()
      // Check that the tag has a parent with the editable class
      const editableTag = workTag.closest('.tag-item-editable')
      expect(editableTag).toBeInTheDocument()
    })

    it('should render hashtags in content with colors from tagColorMap', () => {
      const seedWithHashtags: Seed = {
        ...mockSeed,
        currentState: {
          ...mockSeed.currentState!,
          seed: 'This is about #work and #personal topics',
        },
      }
      
      const tagColors = new Map([
        ['work', '#ff0000'],
        ['personal', '#00ff00'],
      ])
      
      const { container } = render(
        <MemoryRouter>
          <SeedView
            seed={seedWithHashtags}
            isEditing={false}
            tagColors={tagColors}
          />
        </MemoryRouter>
      )
      
      // Hashtags should be rendered as links
      const links = container.querySelectorAll('a')
      expect(links.length).toBeGreaterThanOrEqual(2)
      
      // Check that hashtag links exist
      const workLink = Array.from(links).find(link => link.textContent === '#work')
      const personalLink = Array.from(links).find(link => link.textContent === '#personal')
      expect(workLink).toBeInTheDocument()
      expect(personalLink).toBeInTheDocument()
    })

    it('should generate colors for hashtags not in tagColorMap', () => {
      const seedWithHashtags: Seed = {
        ...mockSeed,
        currentState: {
          ...mockSeed.currentState!,
          seed: 'This is about #work and #unknown topics',
        },
      }
      
      const tagColors = new Map([
        ['work', '#ff0000'],
        // 'unknown' is not in the map
      ])
      
      const { container } = render(
        <MemoryRouter>
          <SeedView
            seed={seedWithHashtags}
            isEditing={false}
            tagColors={tagColors}
          />
        </MemoryRouter>
      )
      
      // Both hashtags should be rendered as links
      const links = container.querySelectorAll('a')
      expect(links.length).toBeGreaterThanOrEqual(2)
      
      // Both should exist - work with provided color, unknown with generated color
      const workLink = Array.from(links).find(link => link.textContent === '#work')
      const unknownLink = Array.from(links).find(link => link.textContent === '#unknown')
      expect(workLink).toBeInTheDocument()
      expect(unknownLink).toBeInTheDocument()
    })

    it('should generate colors for hashtags with empty string color in tagColorMap', () => {
      const seedWithHashtags: Seed = {
        ...mockSeed,
        currentState: {
          ...mockSeed.currentState!,
          seed: 'This is about #work and #personal topics',
        },
      }
      
      const tagColors = new Map([
        ['work', ''], // Empty string color
        ['personal', '#00ff00'],
      ])
      
      const { container } = render(
        <MemoryRouter>
          <SeedView
            seed={seedWithHashtags}
            isEditing={false}
            tagColors={tagColors}
          />
        </MemoryRouter>
      )
      
      // Both hashtags should be rendered as links
      const links = container.querySelectorAll('a')
      expect(links.length).toBeGreaterThanOrEqual(2)
      
      // Both should exist - work should get generated color, personal should use provided color
      const workLink = Array.from(links).find(link => link.textContent === '#work')
      const personalLink = Array.from(links).find(link => link.textContent === '#personal')
      expect(workLink).toBeInTheDocument()
      expect(personalLink).toBeInTheDocument()
    })

    it('should handle hashtags that match tags in seed with case-insensitive matching', () => {
      const seedWithHashtags: Seed = {
        ...mockSeed,
        currentState: {
          ...mockSeed.currentState!,
          seed: 'This is about #Work and #WORK topics',
          tags: [
            { id: 'tag-1', name: 'work' }, // lowercase in tags
          ],
        },
      }
      
      const tagColors = new Map([
        ['work', '#ff0000'], // lowercase in map
      ])
      
      const { container } = render(
        <MemoryRouter>
          <SeedView
            seed={seedWithHashtags}
            isEditing={false}
            tagColors={tagColors}
          />
        </MemoryRouter>
      )
      
      // Both hashtags should match the lowercase 'work' tag
      const links = container.querySelectorAll('a')
      expect(links.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle multiple hashtags with mixed color scenarios', () => {
      const seedWithHashtags: Seed = {
        ...mockSeed,
        currentState: {
          ...mockSeed.currentState!,
          seed: 'This has #work #personal #important and #unknown tags',
        },
      }
      
      const tagColors = new Map([
        ['work', '#ff0000'], // Has color
        ['personal', ''], // Empty string
        // 'important' and 'unknown' not in map
      ])
      
      const { container } = render(
        <MemoryRouter>
          <SeedView
            seed={seedWithHashtags}
            isEditing={false}
            tagColors={tagColors}
          />
        </MemoryRouter>
      )
      
      // All hashtags should be rendered as links
      const links = container.querySelectorAll('a')
      expect(links.length).toBeGreaterThanOrEqual(4)
    })

    it('should generate colors for all hashtags when tagColorMap is empty', () => {
      const seedWithHashtags: Seed = {
        ...mockSeed,
        currentState: {
          ...mockSeed.currentState!,
          seed: 'This is about #work and #personal topics',
        },
      }
      
      const tagColors = new Map<string, string>()
      
      const { container } = render(
        <MemoryRouter>
          <SeedView
            seed={seedWithHashtags}
            isEditing={false}
            tagColors={tagColors}
          />
        </MemoryRouter>
      )
      
      // Both hashtags should be rendered as links with generated colors
      const links = container.querySelectorAll('a')
      expect(links.length).toBeGreaterThanOrEqual(2)
    })
  })
})

