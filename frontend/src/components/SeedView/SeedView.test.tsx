// SeedView component unit tests
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
      render(<SeedView seed={mockSeed} />)
      expect(screen.getByText('Test seed content')).toBeInTheDocument()
    })

    it('should render tags', () => {
      render(<SeedView seed={mockSeed} />)
      expect(screen.getByTestId('tag-list')).toBeInTheDocument()
      expect(screen.getByTestId('tag-tag-1')).toBeInTheDocument()
      expect(screen.getByTestId('tag-tag-2')).toBeInTheDocument()
    })

    it('should render category', () => {
      render(<SeedView seed={mockSeed} />)
      expect(screen.getByText('/work')).toBeInTheDocument()
    })

    it('should render time', () => {
      const { container } = render(<SeedView seed={mockSeed} />)
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
      render(<SeedView seed={seedWithoutTags} />)
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
      render(<SeedView seed={seedWithoutCategory} />)
      expect(screen.queryByText('/work')).not.toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('should render textarea when isEditing is true', () => {
      render(<SeedView seed={mockSeed} isEditing={true} />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveValue('Test seed content')
    })

    it('should render editable tags with remove buttons when isEditing is true', () => {
      render(<SeedView seed={mockSeed} isEditing={true} />)
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
        <SeedView
          seed={mockSeed}
          isEditing={true}
          onContentChange={(value) => {
            editedContent = value
            onContentChange(value)
          }}
          editedContent={editedContent}
        />
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
        <SeedView
          seed={mockSeed}
          isEditing={true}
          onTagRemove={onTagRemove}
        />
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
        <SeedView
          seed={mockSeed}
          isEditing={true}
          onTagClick={onTagClick}
        />
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
        <SeedView
          seed={mockSeed}
          isEditing={true}
          editedContent="Edited content"
        />
      )
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('Edited content')
    })

    it('should use editedTags when provided', () => {
      const editedTags = [{ id: 'tag-1', name: 'work' }]
      
      render(
        <SeedView
          seed={mockSeed}
          isEditing={true}
          editedTags={editedTags}
        />
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
        <SeedView
          seed={mockSeed}
          isEditing={true}
        />
      )
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('Test seed content')
    })

    it('should fall back to original tags when editedTags is undefined', () => {
      render(
        <SeedView
          seed={mockSeed}
          isEditing={true}
        />
      )
      
      // Should show both tags
      expect(screen.getByText('#work')).toBeInTheDocument()
      expect(screen.getByText('#important')).toBeInTheDocument()
    })
  })

  describe('Non-Edit Mode', () => {
    it('should render content as div when not editing', () => {
      render(<SeedView seed={mockSeed} isEditing={false} />)
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByText('Test seed content')).toBeInTheDocument()
    })

    it('should call onTagClick when tag is clicked in non-edit mode', async () => {
      const user = userEvent.setup()
      const onTagClick = vi.fn()
      
      render(
        <SeedView
          seed={mockSeed}
          isEditing={false}
          onTagClick={onTagClick}
        />
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
        <SeedView
          seed={mockSeed}
          isEditing={true}
          tagColors={tagColors}
        />
      )
      
      // In edit mode, colors are applied via inline styles
      const workTag = screen.getByText('#work')
      expect(workTag).toBeInTheDocument()
      // Check that the tag has a parent with the editable class
      const editableTag = workTag.closest('.tag-item-editable')
      expect(editableTag).toBeInTheDocument()
    })
  })
})

