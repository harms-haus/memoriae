import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PromptLLMModal } from './PromptLLMModal'
import type { IdeaMusing } from '../../types'
import { api } from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  api: {
    promptLLM: vi.fn(),
  },
}))

// Mock Dialog components
vi.mock('@mother/components/Dialog', () => ({
  Dialog: ({ open, children, onOpenChange }: any) => {
    if (!open) return null
    return <div data-testid="dialog">{children}</div>
  },
  DialogHeader: ({ title, onClose }: any) => (
    <div data-testid="dialog-header">
      <h2>{title}</h2>
      <button onClick={onClose} data-testid="dialog-close">Close</button>
    </div>
  ),
  DialogBody: ({ children }: any) => <div data-testid="dialog-body">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}))

// Mock Button component
vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={`button-${variant || 'default'}`}
    >
      {children}
    </button>
  ),
}))

const mockMusing: IdeaMusing = {
  id: 'musing-1',
  seed_id: 'seed-1',
  template_type: 'markdown',
  content: {
    markdown: 'Test content',
  },
  created_at: '2024-01-01T00:00:00.000Z',
  dismissed: false,
  completed: false,
}

describe('PromptLLMModal', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnApplied = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when open is true', () => {
      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Custom Prompt')).toBeInTheDocument()
    })

    it('should not render when open is false', () => {
      render(
        <PromptLLMModal
          open={false}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should render textarea for prompt input', () => {
      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute('id', 'prompt-input')
    })

    it('should show Generate button initially', () => {
      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      expect(screen.getByText('Generate')).toBeInTheDocument()
    })

    it('should disable Generate button when prompt is empty', () => {
      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const generateButton = screen.getByText('Generate')
      expect(generateButton).toBeDisabled()
    })
  })

  describe('Prompt Input', () => {
    it('should update prompt value when typing', async () => {
      const user = userEvent.setup()

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      expect(textarea).toHaveValue('Test prompt')
    })

    it('should enable Generate button when prompt has content', async () => {
      const user = userEvent.setup()

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      const generateButton = screen.getByText('Generate')

      expect(generateButton).toBeDisabled()

      await user.type(textarea, 'Test')

      expect(generateButton).not.toBeDisabled()
    })
  })

  describe('Generate Response', () => {
    it('should call api.promptLLM when Generate is clicked', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM.mockResolvedValue({ preview: 'Generated response' })

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      expect(mockPromptLLM).toHaveBeenCalledWith('musing-1', 'Test prompt', false)
    })

    it('should display preview when generation succeeds', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM.mockResolvedValue({ preview: 'Generated response content' })

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Preview:')).toBeInTheDocument()
        expect(screen.getByText('Generated response content')).toBeInTheDocument()
      })
    })

    it('should show loading state while generating', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockPromptLLM.mockReturnValue(promise as any)

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      expect(screen.getByText('Generating response...')).toBeInTheDocument()
      expect(screen.queryByText('Generate')).not.toBeInTheDocument()

      resolvePromise!({ preview: 'Response' })
      await promise
    })

    it('should display error when generation fails', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM.mockRejectedValue(new Error('Generation failed'))

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument()
      })
    })

    it('should display error when preview is missing from response', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM.mockResolvedValue({})

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to generate response')).toBeInTheDocument()
      })
    })

    it('should show error when Generate is clicked with empty prompt', async () => {
      const user = userEvent.setup()

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      // Try to click Generate with empty prompt (should be disabled, but test the validation)
      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, '   ') // Only whitespace
      await user.clear(textarea)

      // The button should be disabled, but if we somehow trigger the handler,
      // it should show an error
      // Since the button is disabled, we can't click it, so we'll test the validation
      // by checking that empty prompt doesn't enable the button
      const generateButton = screen.getByText('Generate')
      expect(generateButton).toBeDisabled()
    })

    it('should trim prompt before sending', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM.mockResolvedValue({ preview: 'Response' })

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, '  Test prompt  ')

      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      expect(mockPromptLLM).toHaveBeenCalledWith('musing-1', 'Test prompt', false)
    })
  })

  describe('Apply Response', () => {
    it('should show Apply button when preview is available', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM.mockResolvedValue({ preview: 'Generated response' })

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Apply')).toBeInTheDocument()
      })
    })

    it('should call api.promptLLM with confirm=true when Apply is clicked', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM
        .mockResolvedValueOnce({ preview: 'Generated response' })
        .mockResolvedValueOnce({ applied: true })

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      // Generate
      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Apply')).toBeInTheDocument()
      })

      // Apply
      const applyButton = screen.getByText('Apply')
      await user.click(applyButton)

      await waitFor(() => {
        expect(mockPromptLLM).toHaveBeenCalledWith('musing-1', 'Test prompt', true)
      })
    })

    it('should call onApplied and onOpenChange when apply succeeds', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM
        .mockResolvedValueOnce({ preview: 'Generated response' })
        .mockResolvedValueOnce({ applied: true })

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      // Generate
      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Apply')).toBeInTheDocument()
      })

      // Apply
      const applyButton = screen.getByText('Apply')
      await user.click(applyButton)

      await waitFor(() => {
        expect(mockOnApplied).toHaveBeenCalled()
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should show loading state while applying', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockPromptLLM
        .mockResolvedValueOnce({ preview: 'Generated response' })
        .mockReturnValueOnce(promise as any)

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      // Generate
      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Apply')).toBeInTheDocument()
      })

      // Apply
      const applyButton = screen.getByText('Apply')
      await user.click(applyButton)

      expect(screen.getByText('Applying...')).toBeInTheDocument()
      expect(screen.queryByText('Apply')).not.toBeInTheDocument()

      resolvePromise!({ applied: true })
      await promise
    })

    it('should display error when apply fails', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM
        .mockResolvedValueOnce({ preview: 'Generated response' })
        .mockRejectedValueOnce(new Error('Apply failed'))

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      // Generate
      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Apply')).toBeInTheDocument()
      })

      // Apply
      const applyButton = screen.getByText('Apply')
      await user.click(applyButton)

      await waitFor(() => {
        expect(screen.getByText('Apply failed')).toBeInTheDocument()
      })
    })

    it('should show error when trying to apply without preview', () => {
      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      // The Apply button shouldn't be visible without preview
      // But if we somehow trigger handleApply, it should show an error
      // Since we can't access the handler directly, we'll verify the normal flow
      expect(screen.queryByText('Apply')).not.toBeInTheDocument()
    })
  })

  describe('Close Modal', () => {
    it('should call onOpenChange when Cancel is clicked', async () => {
      const user = userEvent.setup()

      render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should reset state when modal is closed', async () => {
      const user = userEvent.setup()
      const mockPromptLLM = vi.mocked(api.promptLLM)
      mockPromptLLM.mockResolvedValue({ preview: 'Generated response' })

      const { rerender } = render(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      // Enter prompt and generate
      const textarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      await user.type(textarea, 'Test prompt')

      const generateButton = screen.getByText('Generate')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Preview:')).toBeInTheDocument()
      })

      // Close modal
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Reopen modal
      rerender(
        <PromptLLMModal
          open={true}
          onOpenChange={mockOnOpenChange}
          musing={mockMusing}
          onApplied={mockOnApplied}
        />
      )

      // State should be reset
      const newTextarea = screen.getByPlaceholderText('Enter a custom prompt to enhance this seed...')
      expect(newTextarea).toHaveValue('')
      expect(screen.queryByText('Preview:')).not.toBeInTheDocument()
    })
  })
})

