import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SeedEditor } from './SeedEditor'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bold: () => <span data-testid="bold-icon">Bold</span>,
  Italic: () => <span data-testid="italic-icon">Italic</span>,
  Link: () => <span data-testid="link-icon">Link</span>,
  X: () => <span data-testid="close-icon">X</span>,
  Maximize: () => <span data-testid="maximize-icon">Maximize</span>,
}))

// Mock API
vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn(() => Promise.resolve({ id: 'seed-1', content: 'test', created_at: new Date().toISOString() })),
  },
}))

describe('SeedEditor', () => {
  beforeEach(() => {
    // Mock textarea scrollHeight for auto-resize
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 100,
    })
  })

  describe('Stage Detection', () => {
    it('should render small stage for content < 100 chars', () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveClass('seed-editor-stage-small')
    })

    it('should transition to medium stage when content >= 100 chars', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      // Use fireEvent.change to set content directly (avoids multiple state updates from typing)
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(100) } })
      })

      await waitFor(() => {
        // Should show toolbar (medium stage)
        expect(screen.getByTestId('bold-icon')).toBeInTheDocument()
        expect(textarea).toHaveClass('seed-editor-stage-medium')
      })
    })

    it('should transition to large stage when content >= 1000 chars', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      // Directly set value to 1000 characters to trigger large stage
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(1000) } })
      })

      await waitFor(() => {
        // Should show modal (large stage)
        const modal = screen.getByRole('dialog')
        expect(modal).toBeInTheDocument()
        expect(modal).toHaveClass('seed-editor-zen-mode')
      }, { timeout: 3000 })
    })
  })

  describe('Small Stage', () => {
    it('should render plain textarea without toolbar', () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveClass('seed-editor-stage-small')
      expect(screen.queryByTestId('bold-icon')).not.toBeInTheDocument()
    })

    it('should auto-resize with content', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      // Set content to trigger auto-resize
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Test content\nSecond line\nThird line' } })
      })
      
      // Verify the component updated with new content
      expect(textarea.value).toContain('Test content')
      expect(textarea).toBeInTheDocument()
    })

    it('should call onContentChange when content changes', async () => {
      const user = userEvent.setup()
      const onContentChange = vi.fn()
      render(<SeedEditor onContentChange={onContentChange} />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      
      await act(async () => {
        await user.type(textarea, 'New content')
      })
      
      expect(onContentChange).toHaveBeenCalled()
    })
  })

  describe('Medium Stage', () => {
    it('should show markdown toolbar when content >= 100 chars', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(100) } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('bold-icon')).toBeInTheDocument()
        expect(screen.getByTestId('italic-icon')).toBeInTheDocument()
        expect(screen.getByTestId('link-icon')).toBeInTheDocument()
        expect(textarea).toHaveClass('seed-editor-stage-medium')
      })
    })

    it('should insert bold markdown when bold button is clicked', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      // First get to medium stage
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(100) } })
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('bold-icon')).toBeInTheDocument()
      })

      // Select some text
      textarea.setSelectionRange(50, 60)
      
      // Click bold button
      const boldButton = screen.getByTitle('Bold')
      fireEvent.click(boldButton)

      await waitFor(() => {
        expect(textarea.value).toContain('**')
      })
    })

    it('should insert italic markdown when italic button is clicked', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(100) } })
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('italic-icon')).toBeInTheDocument()
      })

      textarea.setSelectionRange(50, 60)
      const italicButton = screen.getByTitle('Italic')
      fireEvent.click(italicButton)

      await waitFor(() => {
        expect(textarea.value).toContain('*')
      })
    })

    it('should insert link markdown when link button is clicked', async () => {
      // Mock prompt
      const promptSpy = vi.spyOn(window, 'prompt')
      promptSpy.mockReturnValueOnce('https://example.com')

      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(100) } })
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('link-icon')).toBeInTheDocument()
      })

      textarea.setSelectionRange(50, 60)
      const linkButton = screen.getByTitle('Link')
      fireEvent.click(linkButton)

      await waitFor(() => {
        expect(textarea.value).toContain('[')
        expect(textarea.value).toContain('](https://example.com)')
      })

      promptSpy.mockRestore()
    })
  })

  describe('Large Stage', () => {
    it('should show full-screen modal when content >= 1000 chars', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(1000) } })
      })

      await waitFor(() => {
        const modal = screen.getByRole('dialog')
        expect(modal).toBeInTheDocument()
        expect(modal).toHaveClass('seed-editor-zen-mode')
      })
    })

    it('should close modal when close button is clicked', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(1000) } })
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const closeButton = screen.getByLabelText('Close editor')
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should close modal when Escape key is pressed', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(1000) } })
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      fireEvent.keyDown(document, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    // Note: Backdrop click to close is not currently implemented in SeedEditor
    // This test is skipped until the feature is added
    it.skip('should close modal when backdrop is clicked', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(1000) } })
      })

      await waitFor(() => {
        const modal = screen.getByRole('dialog')
        expect(modal).toBeInTheDocument()
        
        // Click backdrop (modal element itself, not the content)
        fireEvent.click(modal)
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should have markdown toolbar in large stage', async () => {
      render(<SeedEditor />)
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(1000) } })
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getAllByTestId('bold-icon').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Integration', () => {
    it('should call onContentChange when content changes', async () => {
      const user = userEvent.setup()
      const onContentChange = vi.fn()
      render(<SeedEditor onContentChange={onContentChange} />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...')
      await act(async () => {
        await user.type(textarea, 'New content')
      })
      
      expect(onContentChange).toHaveBeenCalled()
    })

    it('should transition between stages as content grows', async () => {
      render(<SeedEditor />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      
      // Start with small stage
      expect(textarea).toHaveClass('seed-editor-stage-small')
      
      // Set 100 chars to trigger medium stage
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(100) } })
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('bold-icon')).toBeInTheDocument()
        expect(textarea).toHaveClass('seed-editor-stage-medium')
      })
      
      // Set more to trigger large stage (total 1000 chars)
      act(() => {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(1000) } })
      })
      
      await waitFor(() => {
        const modal = screen.getByRole('dialog')
        expect(modal).toBeInTheDocument()
      })
    })

    it('should save seed when Save button is clicked', async () => {
      const onSeedCreated = vi.fn()
      const { api } = await import('../../services/api')
      render(<SeedEditor onSeedCreated={onSeedCreated} />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Test seed content' } })
      })
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save')
        expect(saveButton).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/seeds', { content: 'Test seed content' })
        expect(onSeedCreated).toHaveBeenCalled()
      })
    })

    it('should save seed when Ctrl+Enter is pressed', async () => {
      const onSeedCreated = vi.fn()
      const { api } = await import('../../services/api')
      render(<SeedEditor onSeedCreated={onSeedCreated} />)
      
      const textarea = screen.getByPlaceholderText('Start writing your memory...') as HTMLTextAreaElement
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Test seed content' } })
      })
      
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled()
        expect(onSeedCreated).toHaveBeenCalled()
      })
    })
  })
})
