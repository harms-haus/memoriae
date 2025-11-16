// SeedEditor component tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import { SeedEditor } from './SeedEditor'
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
  Bold: () => <div data-testid="bold-icon">Bold</div>,
  Italic: () => <div data-testid="italic-icon">Italic</div>,
  Link: () => <div data-testid="link-icon">Link</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Maximize: () => <div data-testid="maximize-icon">Maximize</div>,
}))

// Mock Button component
vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, loading, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || loading} {...props}>
      {loading ? 'Saving...' : children}
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

describe('SeedEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset body overflow
    document.body.style.overflow = ''
    // Mock window.prompt
    window.prompt = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = ''
  })

  describe('Initial Rendering', () => {
    it('should render in small stage initially', () => {
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveClass('seed-editor-stage-small')
    })

    it('should not show toolbar in small stage', () => {
      render(<SeedEditor />)
      
      expect(screen.queryByTestId('bold-icon')).not.toBeInTheDocument()
    })

    it('should not show save button when content is empty', () => {
      render(<SeedEditor />)
      
      expect(screen.queryByText('Save')).not.toBeInTheDocument()
    })
  })

  describe('Stage Transitions', () => {
    it('should transition to medium stage when content >= 100 chars', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      const longContent = 'a'.repeat(100)
      
      await user.type(textarea, longContent)
      
      await waitFor(() => {
        expect(textarea).toHaveClass('seed-editor-stage-medium')
      })
    })

    it('should show toolbar in medium stage', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      const longContent = 'a'.repeat(100)
      
      await user.type(textarea, longContent)
      
      await waitFor(() => {
        expect(screen.getByTestId('bold-icon')).toBeInTheDocument()
        expect(screen.getByTestId('italic-icon')).toBeInTheDocument()
        expect(screen.getByTestId('link-icon')).toBeInTheDocument()
        expect(screen.getByTestId('maximize-icon')).toBeInTheDocument()
      })
    })

    it('should show save button when content is not empty', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      
      await user.type(textarea, 'Test content')
      
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument()
      })
    })
  })

  describe('Zen Mode (Large Stage)', () => {
    it('should automatically enter zen mode when content >= 750 chars', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      const longContent = 'a'.repeat(750)
      
      await user.type(textarea, longContent)
      
      await waitFor(() => {
        const zenContainer = document.querySelector('.seed-editor-zen-mode')
        expect(zenContainer).toBeInTheDocument()
      })
    })

    it('should exit zen mode when content < 500 chars', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      const longContent = 'a'.repeat(750)
      const shortContent = 'a'.repeat(100)
      
      // Enter zen mode
      await user.type(textarea, longContent)
      await waitFor(() => {
        expect(document.querySelector('.seed-editor-zen-mode')).toBeInTheDocument()
      })
      
      // Get the zen mode textarea
      const zenTextarea = document.querySelector('.seed-editor-zen-input') as HTMLTextAreaElement
      expect(zenTextarea).toBeInTheDocument()
      
      // Exit zen mode by clearing content and typing short content
      await user.clear(zenTextarea)
      await user.type(zenTextarea, shortContent)
      
      await waitFor(() => {
        expect(document.querySelector('.seed-editor-zen-mode')).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should manually enter zen mode from medium stage', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'a'.repeat(100))
      
      await waitFor(() => {
        expect(screen.getByTestId('maximize-icon')).toBeInTheDocument()
      })
      
      const zenButton = screen.getByTestId('maximize-icon').closest('button')
      if (zenButton) {
        await user.click(zenButton)
      }
      
      await waitFor(() => {
        expect(document.querySelector('.seed-editor-zen-mode')).toBeInTheDocument()
      })
    })

    it('should close zen mode with close button', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'a'.repeat(750))
      
      await waitFor(() => {
        expect(document.querySelector('.seed-editor-zen-mode')).toBeInTheDocument()
      })
      
      const closeButton = screen.getByTestId('x-icon').closest('button')
      if (closeButton) {
        await user.click(closeButton)
      }
      
      await waitFor(() => {
        expect(document.querySelector('.seed-editor-zen-mode')).not.toBeInTheDocument()
      })
    })

    it('should close zen mode with Escape key', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'a'.repeat(750))
      
      await waitFor(() => {
        expect(document.querySelector('.seed-editor-zen-mode')).toBeInTheDocument()
      })
      
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(document.querySelector('.seed-editor-zen-mode')).not.toBeInTheDocument()
      })
    })

    it('should prevent body scroll when zen mode is open', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'a'.repeat(750))
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden')
      })
    })
  })

  describe('Content Input', () => {
    it('should update content when typing', async () => {
      const user = userEvent.setup()
      const onContentChange = vi.fn()
      render(<SeedEditor onContentChange={onContentChange} />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'Test content')
      
      expect(textarea).toHaveValue('Test content')
      expect(onContentChange).toHaveBeenCalledWith('Test content')
    })

    it('should call onContentChange callback', async () => {
      const user = userEvent.setup()
      const onContentChange = vi.fn()
      render(<SeedEditor onContentChange={onContentChange} />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'New content')
      
      expect(onContentChange).toHaveBeenCalled()
    })
  })

  describe('Save Functionality', () => {
    it('should save seed when Save button is clicked', async () => {
      const user = userEvent.setup()
      const onSeedCreated = vi.fn()
      vi.mocked(api.post).mockResolvedValue(mockSeed)
      
      render(<SeedEditor onSeedCreated={onSeedCreated} />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'Test seed content')
      
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument()
      })
      
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/seeds', { content: 'Test seed content' })
        expect(onSeedCreated).toHaveBeenCalledWith(mockSeed)
      })
    })

    it('should clear editor after successful save', async () => {
      const user = userEvent.setup()
      vi.mocked(api.post).mockResolvedValue(mockSeed)
      
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'Test seed content')
      
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(textarea).toHaveValue('')
      })
    })

    it('should show saving state during save', async () => {
      const user = userEvent.setup()
      let resolveSave: (value: Seed) => void
      const savePromise = new Promise<Seed>((resolve) => {
        resolveSave = resolve
      })
      vi.mocked(api.post).mockReturnValue(savePromise)
      
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'Test seed content')
      
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
        expect(textarea).toBeDisabled()
      })
      
      resolveSave!(mockSeed)
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      })
    })

    it('should not save empty content', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, '   ')
      
      expect(screen.queryByText('Save')).not.toBeInTheDocument()
    })

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      vi.mocked(api.post).mockRejectedValue(new Error('Save failed'))
      
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'Test seed content')
      
      const saveButton = screen.getByText('Save')
      await user.click(saveButton)
      
      // Verify error is handled - component should still be functional
      // (We don't test logging since we use native Loglevel)
      await waitFor(() => {
        expect(textarea).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should save with Ctrl+Enter', async () => {
      const user = userEvent.setup()
      vi.mocked(api.post).mockResolvedValue(mockSeed)
      
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'Test seed content')
      
      await user.keyboard('{Control>}{Enter}{/Control}')
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/seeds', { content: 'Test seed content' })
      })
    })

    it('should save with Cmd+Enter on Mac', async () => {
      const user = userEvent.setup()
      vi.mocked(api.post).mockResolvedValue(mockSeed)
      
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'Test seed content')
      
      await user.keyboard('{Meta>}{Enter}{/Meta}')
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/seeds', { content: 'Test seed content' })
      })
    })
  })

  describe('Markdown Toolbar', () => {
    it('should insert bold markdown', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      // Type enough to trigger medium stage (>= 100 chars)
      await user.type(textarea, 'a'.repeat(96) + 'test') // 96 + 4 = 100 chars
      
      await waitFor(() => {
        expect(screen.getByTestId('bold-icon')).toBeInTheDocument()
      })
      
      // Select just "test" (characters 96-100)
      textarea.setSelectionRange(96, 100)
      
      const boldButton = screen.getByTestId('bold-icon').closest('button')
      if (boldButton) {
        await user.click(boldButton)
      }
      
      await waitFor(() => {
        expect(textarea.value).toContain('**test**')
      })
    })

    it('should insert italic markdown', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      // Type enough to trigger medium stage (>= 100 chars)
      await user.type(textarea, 'a'.repeat(96) + 'test') // 96 + 4 = 100 chars
      
      await waitFor(() => {
        expect(screen.getByTestId('italic-icon')).toBeInTheDocument()
      })
      
      // Focus textarea and select just "test" (characters 96-100)
      textarea.focus()
      textarea.setSelectionRange(96, 100)
      
      // Wait a tick to ensure selection is set
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Verify selection is set
      expect(textarea.selectionStart).toBe(96)
      expect(textarea.selectionEnd).toBe(100)
      
      const italicButton = screen.getByTestId('italic-icon').closest('button')
      if (italicButton) {
        // Use fireEvent.mouseDown to trigger onMouseDown directly, preserving selection
        fireEvent.mouseDown(italicButton)
      }
      
      await waitFor(() => {
        expect(textarea.value).toContain('*test*')
      })
    })

    it('should insert link markdown with selected text', async () => {
      const user = userEvent.setup()
      vi.mocked(window.prompt).mockReturnValueOnce('https://example.com')
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      // Type enough to trigger medium stage (>= 100 chars)
      await user.type(textarea, 'a'.repeat(91) + 'link text') // 91 + 9 = 100 chars
      
      // Wait for medium stage to activate
      await waitFor(() => {
        expect(screen.getByTestId('link-icon')).toBeInTheDocument()
      })
      
      // Select just "link text" (characters 91-100)
      textarea.setSelectionRange(91, 100)
      
      const linkButton = screen.getByTestId('link-icon').closest('button')
      if (linkButton) {
        await user.click(linkButton)
      }
      
      await waitFor(() => {
        expect(textarea.value).toContain('[link text](https://example.com)')
      })
    })

    it('should insert link markdown without selected text', async () => {
      const user = userEvent.setup()
      vi.mocked(window.prompt)
        .mockReturnValueOnce('Link Text')
        .mockReturnValueOnce('https://example.com')
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await user.type(textarea, 'a'.repeat(100))
      
      await waitFor(() => {
        expect(screen.getByTestId('link-icon')).toBeInTheDocument()
      })
      
      const linkButton = screen.getByTestId('link-icon').closest('button')
      if (linkButton) {
        await user.click(linkButton)
      }
      
      await waitFor(() => {
        expect((textarea as HTMLTextAreaElement).value).toContain('[Link Text](https://example.com)')
      })
    })
  })

  describe('Auto-resize Textarea', () => {
    it('should auto-resize textarea in small stage', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      await user.type(textarea, 'Line 1\nLine 2\nLine 3')
      
      // Textarea should have explicit height set
      await waitFor(() => {
        expect(textarea.style.height).toBeTruthy()
      })
    })

    it('should auto-resize textarea in medium stage', async () => {
      const user = userEvent.setup()
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      await user.type(textarea, 'a'.repeat(100))
      
      await waitFor(() => {
        expect(textarea).toHaveClass('seed-editor-stage-medium')
      })
      
      const height = textarea.style.height
      expect(height).toBeTruthy()
    })
  })
})

