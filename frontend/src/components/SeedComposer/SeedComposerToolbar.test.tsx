// SeedComposerToolbar component tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SeedComposerToolbar } from './SeedComposerToolbar'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bold: () => <div data-testid="bold-icon">Bold</div>,
  Italic: () => <div data-testid="italic-icon">Italic</div>,
  Link: () => <div data-testid="link-icon">Link</div>,
  Heading: () => <div data-testid="heading-icon">Heading</div>,
  List: () => <div data-testid="list-icon">List</div>,
  Code: () => <div data-testid="code-icon">Code</div>,
}))

// Mock Button component
vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, variant, className, 'aria-label': ariaLabel, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  ),
}))

describe('SeedComposerToolbar Component', () => {
  const mockOnBold = vi.fn()
  const mockOnItalic = vi.fn()
  const mockOnLink = vi.fn()
  const mockOnHeader = vi.fn()
  const mockOnList = vi.fn()
  const mockOnCodeBlock = vi.fn()

  const defaultProps = {
    position: { top: 100, left: 200 },
    visible: true,
    onBold: mockOnBold,
    onItalic: mockOnItalic,
    onLink: mockOnLink,
    onHeader: mockOnHeader,
    onList: mockOnList,
    onCodeBlock: mockOnCodeBlock,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render toolbar when visible is true', () => {
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const toolbar = document.querySelector('.seed-composer-toolbar')
      expect(toolbar).toBeInTheDocument()
      expect(toolbar).toHaveClass('visible')
    })

    it('should not render toolbar when visible is false', () => {
      render(<SeedComposerToolbar {...defaultProps} visible={false} />)
      
      const toolbar = document.querySelector('.seed-composer-toolbar')
      expect(toolbar).not.toHaveClass('visible')
    })

    it('should render all toolbar buttons', () => {
      render(<SeedComposerToolbar {...defaultProps} />)
      
      expect(screen.getByTestId('bold-icon')).toBeInTheDocument()
      expect(screen.getByTestId('italic-icon')).toBeInTheDocument()
      expect(screen.getByTestId('link-icon')).toBeInTheDocument()
      expect(screen.getByTestId('heading-icon')).toBeInTheDocument()
      expect(screen.getByTestId('list-icon')).toBeInTheDocument()
      expect(screen.getByTestId('code-icon')).toBeInTheDocument()
    })

    it('should have correct aria-labels on buttons', () => {
      render(<SeedComposerToolbar {...defaultProps} />)
      
      expect(screen.getByLabelText('Bold')).toBeInTheDocument()
      expect(screen.getByLabelText('Italic')).toBeInTheDocument()
      expect(screen.getByLabelText('Link')).toBeInTheDocument()
      expect(screen.getByLabelText('Heading')).toBeInTheDocument()
      expect(screen.getByLabelText('List')).toBeInTheDocument()
      expect(screen.getByLabelText('Code Block')).toBeInTheDocument()
    })

    it('should render divider between link and heading buttons', () => {
      const { container } = render(<SeedComposerToolbar {...defaultProps} />)
      
      const divider = container.querySelector('.seed-composer-toolbar-divider')
      expect(divider).toBeInTheDocument()
    })
  })

  describe('Positioning', () => {
    it('should position toolbar at specified coordinates', () => {
      render(<SeedComposerToolbar {...defaultProps} position={{ top: 150, left: 300 }} />)
      
      const toolbar = document.querySelector('.seed-composer-toolbar') as HTMLElement
      expect(toolbar).toBeInTheDocument()
      expect(toolbar.style.position).toBe('fixed')
      expect(toolbar.style.top).toBe('150px')
      expect(toolbar.style.left).toBe('300px')
      expect(toolbar.style.transform).toBe('translateX(-50%)')
    })

    it('should center toolbar horizontally with transform', () => {
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const toolbar = document.querySelector('.seed-composer-toolbar') as HTMLElement
      expect(toolbar.style.transform).toBe('translateX(-50%)')
    })

    it('should have high z-index', () => {
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const toolbar = document.querySelector('.seed-composer-toolbar') as HTMLElement
      expect(toolbar.style.zIndex).toBe('1000')
    })
  })

  describe('Button Actions', () => {
    it('should call onBold when bold button is clicked', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const boldButton = screen.getByLabelText('Bold')
      await user.click(boldButton)
      
      expect(mockOnBold).toHaveBeenCalledTimes(1)
    })

    it('should call onItalic when italic button is clicked', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const italicButton = screen.getByLabelText('Italic')
      await user.click(italicButton)
      
      expect(mockOnItalic).toHaveBeenCalledTimes(1)
    })

    it('should call onLink when link button is clicked', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const linkButton = screen.getByLabelText('Link')
      await user.click(linkButton)
      
      expect(mockOnLink).toHaveBeenCalledTimes(1)
    })

    it('should call onCodeBlock when code block button is clicked', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const codeButton = screen.getByLabelText('Code Block')
      await user.click(codeButton)
      
      expect(mockOnCodeBlock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Header Menu', () => {
    it('should not show header menu initially', () => {
      render(<SeedComposerToolbar {...defaultProps} />)
      
      expect(screen.queryByText('H1')).not.toBeInTheDocument()
      expect(screen.queryByText('H2')).not.toBeInTheDocument()
    })

    it('should show header menu when heading button is clicked', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const headingButton = screen.getByLabelText('Heading')
      await user.click(headingButton)
      
      await waitFor(() => {
        expect(screen.getByText('H1')).toBeInTheDocument()
        expect(screen.getByText('H2')).toBeInTheDocument()
        expect(screen.getByText('H3')).toBeInTheDocument()
        expect(screen.getByText('H4')).toBeInTheDocument()
        expect(screen.getByText('H5')).toBeInTheDocument()
        expect(screen.getByText('H6')).toBeInTheDocument()
      })
    })

    it('should hide header menu when heading button is clicked again', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const headingButton = screen.getByLabelText('Heading')
      await user.click(headingButton)
      
      await waitFor(() => {
        expect(screen.getByText('H1')).toBeInTheDocument()
      })
      
      await user.click(headingButton)
      
      await waitFor(() => {
        expect(screen.queryByText('H1')).not.toBeInTheDocument()
      })
    })

    it('should call onHeader with correct level when header option is clicked', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const headingButton = screen.getByLabelText('Heading')
      await user.click(headingButton)
      
      await waitFor(() => {
        expect(screen.getByText('H1')).toBeInTheDocument()
      })
      
      const h1Option = screen.getByText('H1')
      await user.click(h1Option)
      
      expect(mockOnHeader).toHaveBeenCalledWith(1)
    })

    it('should call onHeader for all header levels', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const headingButton = screen.getByLabelText('Heading')
      
      for (let level = 1; level <= 6; level++) {
        await user.click(headingButton)
        
        await waitFor(() => {
          expect(screen.getByText(`H${level}`)).toBeInTheDocument()
        })
        
        const headerOption = screen.getByText(`H${level}`)
        await user.click(headerOption)
        
        expect(mockOnHeader).toHaveBeenCalledWith(level)
      }
    })

    it('should close header menu after selecting a header level', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const headingButton = screen.getByLabelText('Heading')
      await user.click(headingButton)
      
      await waitFor(() => {
        expect(screen.getByText('H1')).toBeInTheDocument()
      })
      
      const h1Option = screen.getByText('H1')
      await user.click(h1Option)
      
      await waitFor(() => {
        expect(screen.queryByText('H1')).not.toBeInTheDocument()
      })
    })
  })

  describe('List Menu', () => {
    it('should not show list menu initially', () => {
      render(<SeedComposerToolbar {...defaultProps} />)
      
      expect(screen.queryByText('Unordered List')).not.toBeInTheDocument()
      expect(screen.queryByText('Ordered List')).not.toBeInTheDocument()
    })

    it('should show list menu when list button is clicked', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const listButton = screen.getByLabelText('List')
      await user.click(listButton)
      
      await waitFor(() => {
        expect(screen.getByText('Unordered List')).toBeInTheDocument()
        expect(screen.getByText('Ordered List')).toBeInTheDocument()
      })
    })

    it('should hide list menu when list button is clicked again', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const listButton = screen.getByLabelText('List')
      await user.click(listButton)
      
      await waitFor(() => {
        expect(screen.getByText('Unordered List')).toBeInTheDocument()
      })
      
      await user.click(listButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Unordered List')).not.toBeInTheDocument()
      })
    })

    it('should call onList with false for unordered list', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const listButton = screen.getByLabelText('List')
      await user.click(listButton)
      
      await waitFor(() => {
        expect(screen.getByText('Unordered List')).toBeInTheDocument()
      })
      
      const unorderedOption = screen.getByText('Unordered List')
      await user.click(unorderedOption)
      
      expect(mockOnList).toHaveBeenCalledWith(false)
    })

    it('should call onList with true for ordered list', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const listButton = screen.getByLabelText('List')
      await user.click(listButton)
      
      await waitFor(() => {
        expect(screen.getByText('Ordered List')).toBeInTheDocument()
      })
      
      const orderedOption = screen.getByText('Ordered List')
      await user.click(orderedOption)
      
      expect(mockOnList).toHaveBeenCalledWith(true)
    })

    it('should close list menu after selecting a list type', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const listButton = screen.getByLabelText('List')
      await user.click(listButton)
      
      await waitFor(() => {
        expect(screen.getByText('Unordered List')).toBeInTheDocument()
      })
      
      const unorderedOption = screen.getByText('Unordered List')
      await user.click(unorderedOption)
      
      await waitFor(() => {
        expect(screen.queryByText('Unordered List')).not.toBeInTheDocument()
      })
    })
  })

  describe('Menu Interactions', () => {
    it('should allow opening header menu while list menu is closed', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const headingButton = screen.getByLabelText('Heading')
      await user.click(headingButton)
      
      await waitFor(() => {
        expect(screen.getByText('H1')).toBeInTheDocument()
        expect(screen.queryByText('Unordered List')).not.toBeInTheDocument()
      })
    })

    it('should allow opening list menu while header menu is closed', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const listButton = screen.getByLabelText('List')
      await user.click(listButton)
      
      await waitFor(() => {
        expect(screen.getByText('Unordered List')).toBeInTheDocument()
        expect(screen.queryByText('H1')).not.toBeInTheDocument()
      })
    })

    it('should allow both menus to be open simultaneously', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const headingButton = screen.getByLabelText('Heading')
      await user.click(headingButton)
      
      await waitFor(() => {
        expect(screen.getByText('H1')).toBeInTheDocument()
      })
      
      const listButton = screen.getByLabelText('List')
      await user.click(listButton)
      
      await waitFor(() => {
        // Both menus can be open at the same time
        expect(screen.getByText('H1')).toBeInTheDocument()
        expect(screen.getByText('Unordered List')).toBeInTheDocument()
      })
    })
  })

  describe('Visibility', () => {
    it('should apply visible class when visible is true', () => {
      render(<SeedComposerToolbar {...defaultProps} visible={true} />)
      
      const toolbar = document.querySelector('.seed-composer-toolbar')
      expect(toolbar).toHaveClass('visible')
    })

    it('should not apply visible class when visible is false', () => {
      render(<SeedComposerToolbar {...defaultProps} visible={false} />)
      
      const toolbar = document.querySelector('.seed-composer-toolbar')
      expect(toolbar).not.toHaveClass('visible')
    })

    it('should update visibility when visible prop changes', () => {
      const { rerender } = render(<SeedComposerToolbar {...defaultProps} visible={false} />)
      
      let toolbar = document.querySelector('.seed-composer-toolbar')
      expect(toolbar).not.toHaveClass('visible')
      
      rerender(<SeedComposerToolbar {...defaultProps} visible={true} />)
      
      toolbar = document.querySelector('.seed-composer-toolbar')
      expect(toolbar).toHaveClass('visible')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid button clicks', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const boldButton = screen.getByLabelText('Bold')
      const italicButton = screen.getByLabelText('Italic')
      const linkButton = screen.getByLabelText('Link')
      
      await user.click(boldButton)
      await user.click(italicButton)
      await user.click(linkButton)
      
      expect(mockOnBold).toHaveBeenCalledTimes(1)
      expect(mockOnItalic).toHaveBeenCalledTimes(1)
      expect(mockOnLink).toHaveBeenCalledTimes(1)
    })

    it('should handle rapid menu toggles', async () => {
      const user = userEvent.setup()
      render(<SeedComposerToolbar {...defaultProps} />)
      
      const headingButton = screen.getByLabelText('Heading')
      
      await user.click(headingButton)
      await user.click(headingButton)
      await user.click(headingButton)
      
      // Menu state should be consistent
      const menuVisible = screen.queryByText('H1') !== null
      expect(menuVisible).toBe(true) // Should be open after odd number of clicks
    })

    it('should handle position changes', () => {
      const { rerender } = render(
        <SeedComposerToolbar {...defaultProps} position={{ top: 100, left: 200 }} />
      )
      
      let toolbar = document.querySelector('.seed-composer-toolbar') as HTMLElement
      expect(toolbar.style.top).toBe('100px')
      expect(toolbar.style.left).toBe('200px')
      
      rerender(
        <SeedComposerToolbar {...defaultProps} position={{ top: 300, left: 500 }} />
      )
      
      toolbar = document.querySelector('.seed-composer-toolbar') as HTMLElement
      expect(toolbar.style.top).toBe('300px')
      expect(toolbar.style.left).toBe('500px')
    })
  })
})

