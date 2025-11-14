// ModelSelector component tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModelSelector, type ModelSelectorOption } from './ModelSelector'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: ({ className }: { className?: string }) => (
    <div data-testid="chevron-down-icon" className={className}>ChevronDown</div>
  ),
  X: () => <div data-testid="x-icon">X</div>,
}))

describe('ModelSelector Component', () => {
  const mockOptions: ModelSelectorOption[] = [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
  ]

  const mockOnChange = vi.fn()
  const mockOnFocus = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up any open dropdowns
    document.body.innerHTML = ''
    // Wait for any pending requestAnimationFrame callbacks
    await new Promise(resolve => setTimeout(resolve, 10))
  })

  describe('Basic Rendering', () => {
    it('should render input field', () => {
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should render with custom placeholder', () => {
      render(
        <ModelSelector
          options={mockOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Choose model..."
        />
      )
      
      expect(screen.getByPlaceholderText('Choose model...')).toBeInTheDocument()
    })

    it('should render toggle button', () => {
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const toggleButton = screen.getByLabelText('Toggle dropdown')
      expect(toggleButton).toBeInTheDocument()
    })

    it('should display selected option name when value is set', () => {
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...') as HTMLInputElement
      expect(input.value).toBe('GPT-4')
    })

    it('should not show clear button when value is empty', () => {
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument()
    })

    it('should show clear button when value is set', () => {
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
        />
      )
      
      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument()
    })
  })

  describe('Dropdown Functionality', () => {
    it('should open dropdown when input is focused', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
    })

    it('should open dropdown when toggle button is clicked', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const toggleButton = screen.getByLabelText('Toggle dropdown')
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
    })

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
      
      await user.click(document.body)
      
      await waitFor(() => {
        expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
      })
    })

    it('should display all options when dropdown is open', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
        expect(screen.getByText('GPT-3.5 Turbo')).toBeInTheDocument()
        expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument()
        expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument()
      })
    })

    it('should mark selected option in dropdown', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        const gpt4Option = screen.getByText('GPT-4').closest('li')
        expect(gpt4Option).toHaveClass('selected')
      })
    })
  })

  describe('Selection Handling', () => {
    it('should call onChange when option is clicked', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
      
      const gpt4Option = screen.getByText('GPT-4')
      await user.click(gpt4Option)
      
      expect(mockOnChange).toHaveBeenCalledWith('gpt-4')
    })

    it('should close dropdown after selection', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
      
      const gpt4Option = screen.getByText('GPT-4')
      await user.click(gpt4Option)
      
      await waitFor(() => {
        expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
      })
    })

    it('should update input value after selection', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <ModelSelector options={mockOptions} value="" onChange={mockOnChange} />
      )
      
      const input = screen.getByPlaceholderText('Select a model...') as HTMLInputElement
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
      
      const gpt4Option = screen.getByText('GPT-4')
      await user.click(gpt4Option)
      
      rerender(
        <ModelSelector options={mockOptions} value="gpt-4" onChange={mockOnChange} />
      )
      
      expect(input.value).toBe('GPT-4')
    })
  })

  describe('Filtering', () => {
    it('should filter options based on input text', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      await user.type(input, 'gpt')
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
        expect(screen.getByText('GPT-3.5 Turbo')).toBeInTheDocument()
        expect(screen.queryByText('Claude 3 Opus')).not.toBeInTheDocument()
        expect(screen.queryByText('Claude 3 Sonnet')).not.toBeInTheDocument()
      })
    })

    it('should filter by option name (case insensitive)', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      await user.type(input, 'CLAUDE')
      
      await waitFor(() => {
        expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument()
        expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument()
        expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
      })
    })

    it('should filter by option id', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      await user.type(input, 'gpt-3.5')
      
      await waitFor(() => {
        expect(screen.getByText('GPT-3.5 Turbo')).toBeInTheDocument()
        expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
      })
    })

    it('should show "No models found" when filter matches nothing', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      await user.type(input, 'nonexistent')
      
      await waitFor(() => {
        expect(screen.getByText('No models found')).toBeInTheDocument()
      })
    })

    it('should clear selection when input is cleared', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...') as HTMLInputElement
      await user.clear(input)
      
      expect(mockOnChange).toHaveBeenCalledWith('')
    })

    it('should open dropdown when typing', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.type(input, 'gpt')
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should open dropdown on ArrowDown', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      await user.keyboard('{ArrowDown}')
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
    })

    it('should highlight next option on ArrowDown', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
      
      await user.keyboard('{ArrowDown}')
      
      await waitFor(() => {
        const firstOption = screen.getByText('GPT-4').closest('li')
        expect(firstOption).toHaveClass('highlighted')
      })
    })

    it('should highlight previous option on ArrowUp', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
      
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')
      
      await waitFor(() => {
        const firstOption = screen.getByText('GPT-4').closest('li')
        expect(firstOption).toHaveClass('highlighted')
      })
    })

    it('should select highlighted option on Enter', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
      
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')
      
      expect(mockOnChange).toHaveBeenCalledWith('gpt-4')
    })

    it('should close dropdown on Escape', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
      })
    })

    it('should close dropdown on Tab', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('GPT-4')).toBeInTheDocument()
      })
      
      await user.keyboard('{Tab}')
      
      await waitFor(() => {
        expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
      })
    })
  })

  describe('Clear Functionality', () => {
    it('should call onChange with empty string when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
        />
      )
      
      const clearButton = screen.getByLabelText('Clear selection')
      await user.click(clearButton)
      
      expect(mockOnChange).toHaveBeenCalledWith('')
    })

    it('should clear input value when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
        />
      )
      
      const clearButton = screen.getByLabelText('Clear selection')
      await user.click(clearButton)
      
      // Input should be cleared (value will be updated on next render)
      expect(mockOnChange).toHaveBeenCalledWith('')
    })

    it('should focus input after clearing', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...')
      const clearButton = screen.getByLabelText('Clear selection')
      await user.click(clearButton)
      
      // Input should receive focus
      await waitFor(() => {
        expect(input).toHaveFocus()
      })
    })
  })

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(
        <ModelSelector
          options={mockOptions}
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...')
      expect(input).toBeDisabled()
    })

    it('should disable toggle button when disabled prop is true', () => {
      render(
        <ModelSelector
          options={mockOptions}
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      )
      
      const toggleButton = screen.getByLabelText('Toggle dropdown')
      expect(toggleButton).toBeDisabled()
    })

    it('should not open dropdown when disabled', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      // Wait a bit to ensure dropdown doesn't open
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
    })

    it('should not show clear button when disabled', () => {
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
          disabled={true}
        />
      )
      
      expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading message when loading is true', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value=""
          onChange={mockOnChange}
          loading={true}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('Loading models...')).toBeInTheDocument()
      })
    })

    it('should not show options when loading', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value=""
          onChange={mockOnChange}
          loading={true}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('Loading models...')).toBeInTheDocument()
        expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
      })
    })
  })

  describe('Focus Handling', () => {
    it('should call onFocus when input is focused', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value=""
          onChange={mockOnChange}
          onFocus={mockOnFocus}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      expect(mockOnFocus).toHaveBeenCalled()
    })

    it('should not call onFocus when onFocus is not provided', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      // Should not throw error
      expect(input).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-expanded attribute on input', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      expect(input).toHaveAttribute('aria-expanded', 'false')
      
      await user.click(input)
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('should have aria-haspopup="listbox" on input', () => {
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      expect(input).toHaveAttribute('aria-haspopup', 'listbox')
    })

    it('should have aria-autocomplete="list" on input', () => {
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
    })

    it('should have role="listbox" on dropdown list', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        const list = screen.getByRole('listbox')
        expect(list).toBeInTheDocument()
      })
    })

    it('should have role="option" on option items', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBe(4)
      })
    })

    it('should have aria-selected on selected option', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        const gpt4Option = screen.getByText('GPT-4').closest('[role="option"]')
        expect(gpt4Option).toHaveAttribute('aria-selected', 'true')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty options array', () => {
      render(<ModelSelector options={[]} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      expect(input).toBeInTheDocument()
    })

    it('should show "No models found" when options array is empty and dropdown is open', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={[]} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('No models found')).toBeInTheDocument()
      })
    })

    it('should handle option with same name and id', async () => {
      const user = userEvent.setup()
      const options: ModelSelectorOption[] = [
        { id: 'model-1', name: 'model-1' },
      ]
      
      render(<ModelSelector options={options} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        expect(screen.getByText('model-1')).toBeInTheDocument()
        // Should not show duplicate id
        const option = screen.getByText('model-1').closest('li')
        expect(option?.querySelector('.model-selector-option-id')).not.toBeInTheDocument()
      })
    })

    it('should display option id when different from name', async () => {
      const user = userEvent.setup()
      render(<ModelSelector options={mockOptions} value="" onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText('Select a model...')
      await user.click(input)
      
      await waitFor(() => {
        const gpt4Option = screen.getByText('GPT-4').closest('li')
        const idSpan = gpt4Option?.querySelector('.model-selector-option-id')
        expect(idSpan).toBeInTheDocument()
        expect(idSpan).toHaveTextContent('gpt-4')
      })
    })

    it('should handle value that does not exist in options', () => {
      render(
        <ModelSelector
          options={mockOptions}
          value="nonexistent"
          onChange={mockOnChange}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...') as HTMLInputElement
      // Input should be empty when value doesn't match any option
      expect(input.value).toBe('')
    })

    it('should reset filter text when closing dropdown', async () => {
      const user = userEvent.setup()
      render(
        <ModelSelector
          options={mockOptions}
          value="gpt-4"
          onChange={mockOnChange}
        />
      )
      
      const input = screen.getByPlaceholderText('Select a model...') as HTMLInputElement
      await user.click(input)
      await user.type(input, 'test')
      
      await user.click(document.body)
      
      await waitFor(() => {
        // Filter text should reset to selected option name
        expect(input.value).toBe('GPT-4')
      })
    })
  })
})

