// BottomNavigation component tests
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNavigation } from './BottomNavigation'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  FileText: () => <div data-testid="filetext-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  FolderTree: () => <div data-testid="foldertree-icon" />,
  Tags: () => <div data-testid="tags-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
}))

describe('BottomNavigation Component', () => {
  const mockOnViewChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render all navigation tabs', () => {
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      expect(screen.getByLabelText('Seeds')).toBeInTheDocument()
      expect(screen.getByLabelText('Timeline')).toBeInTheDocument()
      expect(screen.getByLabelText('Categories')).toBeInTheDocument()
      expect(screen.getByLabelText('Tags')).toBeInTheDocument()
      expect(screen.getByLabelText('Settings')).toBeInTheDocument()
    })

    it('should render all icons', () => {
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      expect(screen.getByTestId('filetext-icon')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
      expect(screen.getByTestId('foldertree-icon')).toBeInTheDocument()
      expect(screen.getByTestId('tags-icon')).toBeInTheDocument()
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
    })

    it('should render labels for all tabs', () => {
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      expect(screen.getByText('Seeds')).toBeInTheDocument()
      expect(screen.getByText('Timeline')).toBeInTheDocument()
      expect(screen.getByText('Categories')).toBeInTheDocument()
      // Tags appears in both icon and label, so use getAllByText
      expect(screen.getAllByText('Tags').length).toBeGreaterThan(0)
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should have correct navigation structure', () => {
      const { container } = render(
        <BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />
      )
      
      const nav = container.querySelector('nav.bottom-navigation')
      expect(nav).toBeInTheDocument()
      
      const buttons = container.querySelectorAll('button.bottom-nav-item')
      expect(buttons.length).toBe(5)
    })
  })

  describe('Active State', () => {
    it('should mark seeds tab as active when activeView is seeds', () => {
      const { container } = render(
        <BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />
      )
      
      const seedsButton = screen.getByLabelText('Seeds')
      expect(seedsButton).toHaveClass('active')
      
      const otherButtons = container.querySelectorAll('button.bottom-nav-item:not(.active)')
      expect(otherButtons.length).toBe(4)
    })

    it('should mark timeline tab as active when activeView is timeline', () => {
      render(<BottomNavigation activeView="timeline" onViewChange={mockOnViewChange} />)
      
      const timelineButton = screen.getByLabelText('Timeline')
      expect(timelineButton).toHaveClass('active')
    })

    it('should mark categories tab as active when activeView is categories', () => {
      render(<BottomNavigation activeView="categories" onViewChange={mockOnViewChange} />)
      
      const categoriesButton = screen.getByLabelText('Categories')
      expect(categoriesButton).toHaveClass('active')
    })

    it('should mark tags tab as active when activeView is tags', () => {
      render(<BottomNavigation activeView="tags" onViewChange={mockOnViewChange} />)
      
      const tagsButton = screen.getByLabelText('Tags')
      expect(tagsButton).toHaveClass('active')
    })

    it('should mark settings tab as active when activeView is settings', () => {
      render(<BottomNavigation activeView="settings" onViewChange={mockOnViewChange} />)
      
      const settingsButton = screen.getByLabelText('Settings')
      expect(settingsButton).toHaveClass('active')
    })

    it('should update active state when activeView prop changes', () => {
      const { rerender } = render(
        <BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />
      )
      
      expect(screen.getByLabelText('Seeds')).toHaveClass('active')
      
      rerender(<BottomNavigation activeView="timeline" onViewChange={mockOnViewChange} />)
      
      expect(screen.getByLabelText('Timeline')).toHaveClass('active')
      expect(screen.getByLabelText('Seeds')).not.toHaveClass('active')
    })
  })

  describe('View Change Handling', () => {
    it('should call onViewChange when seeds tab is clicked', async () => {
      const user = userEvent.setup()
      render(<BottomNavigation activeView="timeline" onViewChange={mockOnViewChange} />)
      
      const seedsButton = screen.getByLabelText('Seeds')
      await user.click(seedsButton)
      
      expect(mockOnViewChange).toHaveBeenCalledWith('seeds')
      expect(mockOnViewChange).toHaveBeenCalledTimes(1)
    })

    it('should call onViewChange when timeline tab is clicked', async () => {
      const user = userEvent.setup()
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      const timelineButton = screen.getByLabelText('Timeline')
      await user.click(timelineButton)
      
      expect(mockOnViewChange).toHaveBeenCalledWith('timeline')
    })

    it('should call onViewChange when categories tab is clicked', async () => {
      const user = userEvent.setup()
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      const categoriesButton = screen.getByLabelText('Categories')
      await user.click(categoriesButton)
      
      expect(mockOnViewChange).toHaveBeenCalledWith('categories')
    })

    it('should call onViewChange when tags tab is clicked', async () => {
      const user = userEvent.setup()
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      const tagsButton = screen.getByLabelText('Tags')
      await user.click(tagsButton)
      
      expect(mockOnViewChange).toHaveBeenCalledWith('tags')
    })

    it('should call onViewChange when settings tab is clicked', async () => {
      const user = userEvent.setup()
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      const settingsButton = screen.getByLabelText('Settings')
      await user.click(settingsButton)
      
      expect(mockOnViewChange).toHaveBeenCalledWith('settings')
    })

    it('should call onViewChange even when clicking the already active tab', async () => {
      const user = userEvent.setup()
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      const seedsButton = screen.getByLabelText('Seeds')
      await user.click(seedsButton)
      
      expect(mockOnViewChange).toHaveBeenCalledWith('seeds')
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on all buttons', () => {
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      expect(screen.getByLabelText('Seeds')).toBeInTheDocument()
      expect(screen.getByLabelText('Timeline')).toBeInTheDocument()
      expect(screen.getByLabelText('Categories')).toBeInTheDocument()
      expect(screen.getByLabelText('Tags')).toBeInTheDocument()
      expect(screen.getByLabelText('Settings')).toBeInTheDocument()
    })

    it('should render buttons as clickable elements', () => {
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      const seedsButton = screen.getByLabelText('Seeds')
      expect(seedsButton.tagName).toBe('BUTTON')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid view changes', async () => {
      const user = userEvent.setup()
      render(<BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />)
      
      const seedsButton = screen.getByLabelText('Seeds')
      const timelineButton = screen.getByLabelText('Timeline')
      const categoriesButton = screen.getByLabelText('Categories')
      
      await user.click(seedsButton)
      await user.click(timelineButton)
      await user.click(categoriesButton)
      
      expect(mockOnViewChange).toHaveBeenCalledTimes(3)
      expect(mockOnViewChange).toHaveBeenNthCalledWith(1, 'seeds')
      expect(mockOnViewChange).toHaveBeenNthCalledWith(2, 'timeline')
      expect(mockOnViewChange).toHaveBeenNthCalledWith(3, 'categories')
    })

    it('should maintain correct active state during rapid changes', () => {
      const { rerender } = render(
        <BottomNavigation activeView="seeds" onViewChange={mockOnViewChange} />
      )
      
      rerender(<BottomNavigation activeView="timeline" onViewChange={mockOnViewChange} />)
      rerender(<BottomNavigation activeView="categories" onViewChange={mockOnViewChange} />)
      rerender(<BottomNavigation activeView="tags" onViewChange={mockOnViewChange} />)
      rerender(<BottomNavigation activeView="settings" onViewChange={mockOnViewChange} />)
      
      expect(screen.getByLabelText('Settings')).toHaveClass('active')
      expect(screen.getByLabelText('Seeds')).not.toHaveClass('active')
    })
  })
})

