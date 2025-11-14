import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberedIdeasMusing } from './NumberedIdeasMusing'
import type { IdeaMusing, NumberedIdeasContent } from '../../types'

// Mock child components
vi.mock('./ApplyIdeaModal', () => ({
  ApplyIdeaModal: ({ open, onOpenChange, musing, ideaIndex, onApplied }: any) => {
    if (!open) return null
    return (
      <div data-testid="apply-idea-modal">
        <button onClick={() => onApplied()}>Apply Complete</button>
        <button onClick={() => onOpenChange(false)}>Close Modal</button>
        <span>Idea Index: {ideaIndex}</span>
      </div>
    )
  },
}))

vi.mock('./PromptLLMModal', () => ({
  PromptLLMModal: ({ open, onOpenChange, onApplied }: any) => {
    if (!open) return null
    return (
      <div data-testid="prompt-llm-modal">
        <button onClick={() => onApplied()}>Prompt Complete</button>
        <button onClick={() => onOpenChange(false)}>Close Modal</button>
      </div>
    )
  },
}))

const mockMusing: IdeaMusing = {
  id: 'musing-1',
  seed_id: 'seed-1',
  template_type: 'numbered_ideas',
  content: {
    ideas: ['First idea', 'Second idea', 'Third idea', 'Custom prompt option'],
  } as NumberedIdeasContent,
  created_at: '2024-01-01T00:00:00.000Z',
  dismissed: false,
  completed: false,
}

describe('NumberedIdeasMusing', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all ideas in a numbered list', () => {
      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('First idea')).toBeInTheDocument()
      expect(screen.getByText('Second idea')).toBeInTheDocument()
      expect(screen.getByText('Third idea')).toBeInTheDocument()
    })

    it('should render custom prompt option as last item', () => {
      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      const customPrompt = screen.getByPlaceholderText('Click to add a custom prompt...')
      expect(customPrompt).toBeInTheDocument()
      expect(customPrompt).toHaveValue('Custom prompt option')
    })

    it('should apply correct CSS classes', () => {
      const { container } = render(
        <NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />
      )

      const containerElement = container.querySelector('.numbered-ideas-musing')
      expect(containerElement).toBeInTheDocument()

      const listElement = container.querySelector('.numbered-ideas-list')
      expect(listElement).toBeInTheDocument()
    })

    it('should mark last item as custom prompt', () => {
      const { container } = render(
        <NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />
      )

      const listItems = container.querySelectorAll('.numbered-idea-item')
      const lastItem = listItems[listItems.length - 1]
      expect(lastItem).toHaveClass('numbered-idea-custom')
    })

    it('should handle empty ideas array', () => {
      const emptyMusing: IdeaMusing = {
        ...mockMusing,
        content: {
          ideas: [],
        } as NumberedIdeasContent,
      }

      render(<NumberedIdeasMusing musing={emptyMusing} onUpdate={mockOnUpdate} />)

      const ideas = screen.queryAllByText(/idea/i)
      expect(ideas).toHaveLength(0)
    })

    it('should handle missing ideas property', () => {
      const missingIdeasMusing: IdeaMusing = {
        ...mockMusing,
        content: {} as NumberedIdeasContent,
      }

      render(<NumberedIdeasMusing musing={missingIdeasMusing} onUpdate={mockOnUpdate} />)

      const ideas = screen.queryAllByText(/idea/i)
      expect(ideas).toHaveLength(0)
    })
  })

  describe('Idea Click Handling', () => {
    it('should open ApplyIdeaModal when regular idea is clicked', async () => {
      const user = userEvent.setup()

      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      const firstIdea = screen.getByText('First idea')
      await user.click(firstIdea)

      await waitFor(() => {
        expect(screen.getByTestId('apply-idea-modal')).toBeInTheDocument()
        expect(screen.getByText('Idea Index: 0')).toBeInTheDocument()
      })
    })

    it('should open ApplyIdeaModal with correct idea index', async () => {
      const user = userEvent.setup()

      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      const secondIdea = screen.getByText('Second idea')
      await user.click(secondIdea)

      await waitFor(() => {
        expect(screen.getByText('Idea Index: 1')).toBeInTheDocument()
      })
    })

    it('should open PromptLLMModal when last item (custom prompt) is clicked', async () => {
      const user = userEvent.setup()

      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      const customPrompt = screen.getByPlaceholderText('Click to add a custom prompt...')
      await user.click(customPrompt)

      await waitFor(() => {
        expect(screen.getByTestId('prompt-llm-modal')).toBeInTheDocument()
        expect(screen.queryByTestId('apply-idea-modal')).not.toBeInTheDocument()
      })
    })

    it('should handle clicking multiple ideas sequentially', async () => {
      const user = userEvent.setup()

      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      // Click first idea
      await user.click(screen.getByText('First idea'))
      await waitFor(() => {
        expect(screen.getByText('Idea Index: 0')).toBeInTheDocument()
      })

      // Close modal
      await user.click(screen.getByText('Close Modal'))

      // Click second idea
      await user.click(screen.getByText('Second idea'))
      await waitFor(() => {
        expect(screen.getByText('Idea Index: 1')).toBeInTheDocument()
      })
    })
  })

  describe('Modal Interactions', () => {
    it('should call onUpdate when ApplyIdeaModal completes', async () => {
      const user = userEvent.setup()

      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      await user.click(screen.getByText('First idea'))

      await waitFor(() => {
        expect(screen.getByTestId('apply-idea-modal')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Apply Complete'))

      expect(mockOnUpdate).toHaveBeenCalled()
    })

    it('should call onUpdate when PromptLLMModal completes', async () => {
      const user = userEvent.setup()

      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      const customPrompt = screen.getByPlaceholderText('Click to add a custom prompt...')
      await user.click(customPrompt)

      await waitFor(() => {
        expect(screen.getByTestId('prompt-llm-modal')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Prompt Complete'))

      expect(mockOnUpdate).toHaveBeenCalled()
    })

    it('should close ApplyIdeaModal when closed', async () => {
      const user = userEvent.setup()

      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      await user.click(screen.getByText('First idea'))

      await waitFor(() => {
        expect(screen.getByTestId('apply-idea-modal')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Close Modal'))

      await waitFor(() => {
        expect(screen.queryByTestId('apply-idea-modal')).not.toBeInTheDocument()
      })
    })

    it('should close PromptLLMModal when closed', async () => {
      const user = userEvent.setup()

      render(<NumberedIdeasMusing musing={mockMusing} onUpdate={mockOnUpdate} />)

      const customPrompt = screen.getByPlaceholderText('Click to add a custom prompt...')
      await user.click(customPrompt)

      await waitFor(() => {
        expect(screen.getByTestId('prompt-llm-modal')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Close Modal'))

      await waitFor(() => {
        expect(screen.queryByTestId('prompt-llm-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle single idea (which would be custom prompt)', () => {
      const singleIdeaMusing: IdeaMusing = {
        ...mockMusing,
        content: {
          ideas: ['Only idea'],
        } as NumberedIdeasContent,
      }

      render(<NumberedIdeasMusing musing={singleIdeaMusing} onUpdate={mockOnUpdate} />)

      const customPrompt = screen.getByPlaceholderText('Click to add a custom prompt...')
      expect(customPrompt).toBeInTheDocument()
      expect(customPrompt).toHaveValue('Only idea')
    })

    it('should handle ideas with special characters', () => {
      const specialCharsMusing: IdeaMusing = {
        ...mockMusing,
        content: {
          ideas: ['Idea with "quotes"', "Idea with 'apostrophes'", 'Idea with <tags>'],
        } as NumberedIdeasContent,
      }

      render(<NumberedIdeasMusing musing={specialCharsMusing} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('Idea with "quotes"')).toBeInTheDocument()
      expect(screen.getByText("Idea with 'apostrophes'")).toBeInTheDocument()
      expect(screen.getByText('Idea with <tags>')).toBeInTheDocument()
    })
  })
})

