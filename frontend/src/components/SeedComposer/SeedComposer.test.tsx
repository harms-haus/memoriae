// SeedComposer component tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SeedComposer } from './SeedComposer'
import { api } from '../../services/api'
import type { Seed } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  Maximize2: () => <div data-testid="maximize-icon">Maximize</div>,
  Minimize2: () => <div data-testid="minimize-icon">Minimize</div>,
  Send: () => <div data-testid="send-icon">Send</div>,
}))

// Mock Dialog components
vi.mock('@mother/components/Dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogHeader: ({ title, onClose }: any) => (
    <div data-testid="dialog-header">
      <h2>{title}</h2>
      <button onClick={onClose}>Close</button>
    </div>
  ),
  DialogBody: ({ children }: any) => (
    <div data-testid="dialog-body">{children}</div>
  ),
  DialogFooter: ({ children }: any) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}))

// Mock Button component
vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}))

const mockSeed: Seed = {
  id: 'seed-1',
  user_id: 'user-1',
  created_at: new Date().toISOString(),
  currentState: {
    seed: 'Test seed content',
    timestamp: new Date().toISOString(),
    metadata: {},
  },
}

describe('SeedComposer Component', () => {
  const mockOnClose = vi.fn()
  const mockOnSeedCreated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.classList.remove('zen-mode-active')
  })

  afterEach(() => {
    document.body.classList.remove('zen-mode-active')
  })

  describe('Initial Rendering', () => {
    it('should render in medium mode initially', () => {
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      expect(textarea).toBeInTheDocument()
    })

    it('should show maximize and close buttons in medium mode', () => {
      render(<SeedComposer onClose={mockOnClose} />)
      
      expect(screen.getByTestId('maximize-icon')).toBeInTheDocument()
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })

    it('should show submit button in medium mode', () => {
      render(<SeedComposer onClose={mockOnClose} />)
      
      expect(screen.getByTestId('send-icon')).toBeInTheDocument()
    })
  })

  describe('View Mode Transitions', () => {
    it('should transition from small to medium on focus', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      // Start in medium, blur to go to small
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test content')
      // Blur by clicking outside (on body)
      await user.click(document.body)
      
      // Wait for blur timeout (150ms) and view mode change
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Click to expand...')).toBeInTheDocument()
      }, { timeout: 500 })
      
      // Focus again to go back to medium
      await user.click(screen.getByPlaceholderText('Click to expand...'))
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write your seed...')).toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('should transition from medium to zen on maximize click', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const maximizeButton = screen.getByTestId('maximize-icon').closest('button')
      if (maximizeButton) {
        await user.click(maximizeButton)
      }
      
      await waitFor(() => {
        expect(document.body.classList.contains('zen-mode-active')).toBe(true)
        expect(screen.getByTestId('minimize-icon')).toBeInTheDocument()
      })
    })

    it('should transition from zen to medium on minimize click', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      // Enter zen mode
      const maximizeButton = screen.getByTestId('maximize-icon').closest('button')
      if (maximizeButton) {
        await user.click(maximizeButton)
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('minimize-icon')).toBeInTheDocument()
      })
      
      // Exit zen mode
      const minimizeButton = screen.getByTestId('minimize-icon').closest('button')
      if (minimizeButton) {
        await user.click(minimizeButton)
      }
      
      await waitFor(() => {
        expect(document.body.classList.contains('zen-mode-active')).toBe(false)
        expect(screen.getByTestId('maximize-icon')).toBeInTheDocument()
      })
    })

    it('should add zen-mode-active class to body in zen mode', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const maximizeButton = screen.getByTestId('maximize-icon').closest('button')
      if (maximizeButton) {
        await user.click(maximizeButton)
      }
      
      await waitFor(() => {
        expect(document.body.classList.contains('zen-mode-active')).toBe(true)
      })
    })

    it('should remove zen-mode-active class when exiting zen mode', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      // Enter zen mode
      const maximizeButton = screen.getByTestId('maximize-icon').closest('button')
      if (maximizeButton) {
        await user.click(maximizeButton)
      }
      
      await waitFor(() => {
        expect(document.body.classList.contains('zen-mode-active')).toBe(true)
      })
      
      // Exit zen mode
      const minimizeButton = screen.getByTestId('minimize-icon').closest('button')
      if (minimizeButton) {
        await user.click(minimizeButton)
      }
      
      await waitFor(() => {
        expect(document.body.classList.contains('zen-mode-active')).toBe(false)
      })
    })
  })

  describe('Content Input', () => {
    it('should update content when typing', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test content')
      
      expect(textarea).toHaveValue('Test content')
    })

    it('should disable submit button when content is empty', () => {
      render(<SeedComposer onClose={mockOnClose} />)
      
      const submitButton = screen.getByTestId('send-icon').closest('button')
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when content has text', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test content')
      
      const submitButton = screen.getByTestId('send-icon').closest('button')
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Save Functionality', () => {
    it('should save seed when submit button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(api.post).mockResolvedValue(mockSeed)
      
      render(<SeedComposer onClose={mockOnClose} onSeedCreated={mockOnSeedCreated} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test seed content')
      
      const submitButton = screen.getByTestId('send-icon').closest('button')
      if (submitButton) {
        await user.click(submitButton)
      }
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/seeds', { content: 'Test seed content' })
        expect(mockOnSeedCreated).toHaveBeenCalledWith(mockSeed)
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should clear content and close after successful save', async () => {
      const user = userEvent.setup()
      vi.mocked(api.post).mockResolvedValue(mockSeed)
      
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test seed content')
      
      const submitButton = screen.getByTestId('send-icon').closest('button')
      if (submitButton) {
        await user.click(submitButton)
      }
      
      await waitFor(() => {
        expect(textarea).toHaveValue('')
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(api.post).mockRejectedValue(new Error('Save failed'))
      
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test seed content')
      
      const submitButton = screen.getByTestId('send-icon').closest('button')
      if (submitButton) {
        await user.click(submitButton)
      }
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[ERROR] [SeedComposer]',
          'Failed to create seed',
          expect.objectContaining({ error: expect.any(Error) })
        )
      })
      
      consoleError.mockRestore()
    })

    it('should not save empty content', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, '   ')
      
      const submitButton = screen.getByTestId('send-icon').closest('button')
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should save with Ctrl+Enter', async () => {
      const user = userEvent.setup()
      vi.mocked(api.post).mockResolvedValue(mockSeed)
      
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test seed content')
      
      await user.keyboard('{Control>}{Enter}{/Control}')
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/seeds', { content: 'Test seed content' })
      })
    })

    it('should save with Cmd+Enter on Mac', async () => {
      const user = userEvent.setup()
      vi.mocked(api.post).mockResolvedValue(mockSeed)
      
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test seed content')
      
      await user.keyboard('{Meta>}{Enter}{/Meta}')
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/seeds', { content: 'Test seed content' })
      })
    })

    it('should close with Escape in zen mode', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      // Enter zen mode
      const maximizeButton = screen.getByTestId('maximize-icon').closest('button')
      if (maximizeButton) {
        await user.click(maximizeButton)
      }
      
      await waitFor(() => {
        expect(document.body.classList.contains('zen-mode-active')).toBe(true)
      })
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test content')
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Close Behavior', () => {
    it('should close immediately when no content in medium mode', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const closeButton = screen.getByTestId('x-icon').closest('button')
      if (closeButton) {
        await user.click(closeButton)
      }
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should show confirmation dialog when closing with content in medium mode', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test content')
      
      const closeButton = screen.getByTestId('x-icon').closest('button')
      if (closeButton) {
        await user.click(closeButton)
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
        expect(screen.getByText('Discard changes?')).toBeInTheDocument()
      })
    })

    it('should show confirmation dialog when closing with content in zen mode', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      // Enter zen mode
      const maximizeButton = screen.getByTestId('maximize-icon').closest('button')
      if (maximizeButton) {
        await user.click(maximizeButton)
      }
      
      await waitFor(() => {
        expect(document.body.classList.contains('zen-mode-active')).toBe(true)
      })
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test content')
      
      const closeButton = screen.getByTestId('x-icon').closest('button')
      if (closeButton) {
        await user.click(closeButton)
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
    })

    it('should close when confirming discard', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test content')
      
      const closeButton = screen.getByTestId('x-icon').closest('button')
      if (closeButton) {
        await user.click(closeButton)
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
      
      const discardButton = screen.getByText('Discard')
      await user.click(discardButton)
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should cancel close when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test content')
      
      const closeButton = screen.getByTestId('x-icon').closest('button')
      if (closeButton) {
        await user.click(closeButton)
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
        expect(mockOnClose).not.toHaveBeenCalled()
      })
    })

    it('should shrink to small mode on blur when content exists', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.type(textarea, 'Test content')
      
      // Blur by clicking outside (on body)
      await user.click(document.body)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Click to expand...')).toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('should close on blur when no content', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...')
      await user.click(textarea)
      await user.tab() // Blur
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      }, { timeout: 200 })
    })
  })

  describe('Auto-resize', () => {
    it('should set appropriate height for small mode', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...') as HTMLTextAreaElement
      await user.type(textarea, 'Test')
      // Blur by clicking outside (on body)
      await user.click(document.body)
      
      // Wait for view mode to change to small
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Click to expand...')).toBeInTheDocument()
      }, { timeout: 500 })
      
      // Check that container has minimized class
      const container = textarea.closest('.seed-composer-container')
      expect(container).toHaveClass('seed-composer-minimized')
    })

    it('should set appropriate height for medium mode', () => {
      render(<SeedComposer onClose={mockOnClose} />)
      
      const textarea = screen.getByPlaceholderText('Write your seed...') as HTMLTextAreaElement
      // In medium mode, the textarea should be present and not minimized
      const container = textarea.closest('.seed-composer-container')
      expect(container).not.toHaveClass('seed-composer-minimized')
    })

    it('should set appropriate height for zen mode', async () => {
      const user = userEvent.setup()
      render(<SeedComposer onClose={mockOnClose} />)
      
      const maximizeButton = screen.getByTestId('maximize-icon').closest('button')
      if (maximizeButton) {
        await user.click(maximizeButton)
      }
      
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Write your seed...') as HTMLTextAreaElement
        expect(textarea.style.height).toBe('100%')
      })
    })
  })

  describe('Closing State', () => {
    it('should apply closing class when isClosing is true', () => {
      render(<SeedComposer onClose={mockOnClose} isClosing={true} />)
      
      const container = document.querySelector('.seed-composer-closing')
      expect(container).toBeInTheDocument()
    })
  })
})

