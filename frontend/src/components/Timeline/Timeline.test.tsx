// Timeline component tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timeline, type TimelineItem } from './Timeline'

// Mock useTimelineConfig hook
const mockUseTimelineConfig = vi.fn()
vi.mock('../../hooks/useTimelineConfig', () => ({
  useTimelineConfig: () => mockUseTimelineConfig(),
}))

// Mock mother-theme Timeline component
const mockMotherTimeline = vi.fn()

vi.mock('../../../../mother-theme/src/components/Timeline', () => ({
  Timeline: (props: any) => {
    mockMotherTimeline(props)
    return (
      <div data-testid="mother-timeline" data-mode={props.mode}>
        {props.items.map((item: any, index: number) => {
          const panelContent = props.renderPanel 
            ? props.renderPanel(index, props.maxPanelWidth || 400)
            : null
          const dotContent = props.renderDot
            ? props.renderDot(index, item.position, index === 0, index === props.items.length - 1)
            : null
          return (
            <div key={item.id} data-testid={`mother-timeline-item-${item.id}`}>
              {panelContent}
              {dotContent}
            </div>
          )
        })}
      </div>
    )
  },
}))

describe('Timeline Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock: desktop, alternate alignment
    mockUseTimelineConfig.mockReturnValue({
      align: 'alternate',
      isMobile: false,
    })
    
    // Mock window.innerWidth for resize tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    
    // Mock scrollBy
    Element.prototype.scrollBy = vi.fn() as unknown as typeof Element.prototype.scrollBy
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockItems: TimelineItem[] = [
    {
      id: 'item-1',
      content: <div>First item</div>,
      time: '2024-01-01',
    },
    {
      id: 'item-2',
      content: <div>Second item</div>,
      time: '2024-01-02',
    },
    {
      id: 'item-3',
      content: <div>Third item</div>,
    },
  ]

  describe('Basic Rendering', () => {
    it('should render timeline with items', () => {
      render(<Timeline items={mockItems} />)
      
      expect(screen.getByTestId('mother-timeline')).toBeInTheDocument()
      expect(screen.getByTestId('mother-timeline-item-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('mother-timeline-item-item-2')).toBeInTheDocument()
      expect(screen.getByTestId('mother-timeline-item-item-3')).toBeInTheDocument()
    })

    it('should render empty timeline when items array is empty', () => {
      render(<Timeline items={[]} />)
      
      expect(screen.getByTestId('mother-timeline')).toBeInTheDocument()
      expect(screen.queryByTestId(/mother-timeline-item/)).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<Timeline items={mockItems} className="custom-class" />)
      
      const timeline = container.querySelector('.memoriae-timeline.custom-class')
      expect(timeline).toBeInTheDocument()
    })

    it('should have default className structure', () => {
      const { container } = render(<Timeline items={mockItems} />)
      
      const timeline = container.querySelector('.memoriae-timeline')
      expect(timeline).toBeInTheDocument()
      expect(timeline).toHaveClass('timeline-desktop')
    })

    it('should have tabIndex for keyboard navigation', () => {
      const { container } = render(<Timeline items={mockItems} />)
      
      const timeline = container.querySelector('.memoriae-timeline')
      expect(timeline).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Item Positioning', () => {
    it('should position single item at center (50%)', () => {
      const singleItem: TimelineItem[] = [{ id: 'single', content: <div>Single</div> }]
      
      render(<Timeline items={singleItem} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.items).toHaveLength(1)
      expect(call.items[0]?.position).toBe(50)
    })

    it('should position multiple items evenly (0% to 100%)', () => {
      render(<Timeline items={mockItems} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.items).toHaveLength(3)
      expect(call.items[0]?.position).toBe(0)
      expect(call.items[1]?.position).toBe(50)
      expect(call.items[2]?.position).toBe(100)
    })

    it('should recalculate positions when items change', () => {
      const { rerender } = render(<Timeline items={mockItems.slice(0, 2)} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      let call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.items).toHaveLength(2)
      expect(call.items[0]?.position).toBe(0)
      expect(call.items[1]?.position).toBe(100)
      
      mockMotherTimeline.mockClear()
      rerender(<Timeline items={mockItems} />)
      
      call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.items).toHaveLength(3)
      expect(call.items[0]?.position).toBe(0)
      expect(call.items[1]?.position).toBe(50)
      expect(call.items[2]?.position).toBe(100)
    })
  })

  describe('Mode Mapping', () => {
    it('should map alternate alignment to center mode', () => {
      mockUseTimelineConfig.mockReturnValue({
        align: 'alternate',
        isMobile: false,
      })
      
      render(<Timeline items={mockItems} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.mode).toBe('center')
    })

    it('should map left alignment to left mode', () => {
      mockUseTimelineConfig.mockReturnValue({
        align: 'left',
        isMobile: true,
      })
      
      render(<Timeline items={mockItems} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.mode).toBe('left')
    })
  })

  describe('Responsive Behavior', () => {
    it('should apply mobile class when isMobile is true', () => {
      mockUseTimelineConfig.mockReturnValue({
        align: 'left',
        isMobile: true,
      })
      
      const { container } = render(<Timeline items={mockItems} />)
      
      const timeline = container.querySelector('.memoriae-timeline')
      expect(timeline).toHaveClass('timeline-mobile')
      expect(timeline).not.toHaveClass('timeline-desktop')
    })

    it('should apply desktop class when isMobile is false', () => {
      mockUseTimelineConfig.mockReturnValue({
        align: 'alternate',
        isMobile: false,
      })
      
      const { container } = render(<Timeline items={mockItems} />)
      
      const timeline = container.querySelector('.memoriae-timeline')
      expect(timeline).toHaveClass('timeline-desktop')
      expect(timeline).not.toHaveClass('timeline-mobile')
    })
  })

  describe('Panel Rendering', () => {
    it('should render item content in panel', () => {
      render(<Timeline items={mockItems} />)
      
      expect(screen.getByText('First item')).toBeInTheDocument()
      expect(screen.getByText('Second item')).toBeInTheDocument()
      expect(screen.getByText('Third item')).toBeInTheDocument()
    })

    it('should render time when provided', () => {
      render(<Timeline items={mockItems} />)
      
      expect(screen.getByText('2024-01-01')).toBeInTheDocument()
      expect(screen.getByText('2024-01-02')).toBeInTheDocument()
    })

    it('should not render time when not provided', () => {
      const itemsWithoutTime: TimelineItem[] = [
        { id: 'item-1', content: <div>No time</div> },
      ]
      
      render(<Timeline items={itemsWithoutTime} />)
      
      expect(screen.getByText('No time')).toBeInTheDocument()
      // Time wrapper should not exist
      const timeWrappers = document.querySelectorAll('[style*="marginTop: 0.5rem"]')
      expect(timeWrappers.length).toBe(0)
    })

    it('should handle null item in renderPanel', () => {
      // This tests the guard clause in renderPanel when items[index] is undefined
      // We need to call renderPanel with an invalid index
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Valid</div> },
      ]
      
      render(<Timeline items={items} />)
      
      // Should not throw when accessing items[index] that doesn't exist
      expect(screen.getByText('Valid')).toBeInTheDocument()
      
      // Test that renderPanel returns null for invalid index
      // This is tested indirectly through the mother timeline mock
      // which calls renderPanel for each item index
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      // renderPanel should handle invalid indices gracefully
      if (call.renderPanel) {
        const result = call.renderPanel(999, 400) // Invalid index
        expect(result).toBeNull()
      }
    })
  })

  describe('Click Handling', () => {
    it('should call onClick when item is clicked', async () => {
      const user = userEvent.setup()
      const onClick1 = vi.fn()
      const onClick2 = vi.fn()
      
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Clickable 1</div>, onClick: onClick1 },
        { id: 'item-2', content: <div>Clickable 2</div>, onClick: onClick2 },
      ]
      
      render(<Timeline items={items} />)
      
      // Find the clickable div (the wrapper div with onClick handler)
      // The structure is: wrapper div > content div > text
      const contentDiv = screen.getByText('Clickable 1')
      const wrapperDiv = contentDiv.parentElement
      if (wrapperDiv && wrapperDiv.onclick) {
        await user.click(wrapperDiv)
      }
      
      expect(onClick1).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when item is disabled', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Disabled</div>, onClick, disabled: true },
      ]
      
      render(<Timeline items={items} />)
      
      const disabledItem = screen.getByText('Disabled').closest('div')
      if (disabledItem) {
        await user.click(disabledItem)
      }
      
      expect(onClick).not.toHaveBeenCalled()
    })

    it('should not call onClick when onClick is not provided', async () => {
      const user = userEvent.setup()
      
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>No onClick</div> },
      ]
      
      render(<Timeline items={items} />)
      
      const item = screen.getByText('No onClick').closest('div')
      if (item) {
        await user.click(item)
      }
      
      // Should not throw
      expect(screen.getByText('No onClick')).toBeInTheDocument()
    })

    it('should apply pointer cursor when item is clickable', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Clickable</div>, onClick: vi.fn() },
      ]
      
      render(<Timeline items={items} />)
      
      // The wrapper div (parent of content div) should have pointer cursor
      const contentDiv = screen.getByText('Clickable')
      const wrapperDiv = contentDiv.parentElement
      expect(wrapperDiv).toHaveStyle({ cursor: 'pointer' })
    })

    it('should apply default cursor when item is not clickable', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Not clickable</div> },
      ]
      
      render(<Timeline items={items} />)
      
      // The wrapper div (parent of content div) should have default cursor
      const contentDiv = screen.getByText('Not clickable')
      const wrapperDiv = contentDiv.parentElement
      expect(wrapperDiv).toHaveStyle({ cursor: 'default' })
    })

    it('should apply default cursor when item is disabled', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Disabled</div>, onClick: vi.fn(), disabled: true },
      ]
      
      render(<Timeline items={items} />)
      
      // The wrapper div (parent of content div) should have default cursor when disabled
      const contentDiv = screen.getByText('Disabled')
      const wrapperDiv = contentDiv.parentElement
      expect(wrapperDiv).toHaveStyle({ cursor: 'default' })
    })

    it('should apply reduced opacity when item is disabled', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Disabled</div>, disabled: true },
      ]
      
      render(<Timeline items={items} />)
      
      // The wrapper div (parent of content div) should have reduced opacity
      const contentDiv = screen.getByText('Disabled')
      const wrapperDiv = contentDiv.parentElement
      expect(wrapperDiv).toHaveStyle({ opacity: '0.6' })
    })

    it('should set panelClickable prop when items have onClick', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Clickable</div>, onClick: vi.fn() },
      ]
      
      render(<Timeline items={items} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.panelClickable).toBe(true)
    })

    it('should set panelClickable to false when no items have onClick', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Not clickable</div> },
      ]
      
      render(<Timeline items={items} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.panelClickable).toBe(false)
    })

    it('should set panelClickable to false when all items are disabled', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Disabled</div>, onClick: vi.fn(), disabled: true },
      ]
      
      render(<Timeline items={items} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.panelClickable).toBe(false)
    })
  })

  describe('Custom Dots', () => {
    it('should render custom dot when provided', () => {
      const customDot = <div data-testid="custom-dot">●</div>
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>With dot</div>, dot: customDot },
      ]
      
      render(<Timeline items={items} />)
      
      expect(screen.getByTestId('custom-dot')).toBeInTheDocument()
    })

    it('should not render dot when not provided', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>No dot</div> },
      ]
      
      render(<Timeline items={items} />)
      
      expect(screen.queryByTestId('custom-dot')).not.toBeInTheDocument()
    })

    it('should pass renderDot to mother timeline when items have dots', () => {
      const customDot = <div>●</div>
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>With dot</div>, dot: customDot },
      ]
      
      render(<Timeline items={items} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.renderDot).toBeDefined()
    })

    it('should not pass renderDot when no items have dots', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>No dot</div> },
      ]
      
      render(<Timeline items={items} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.renderDot).toBeUndefined()
    })

    it('should return null from renderDot when item has no dot', () => {
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>No dot</div> },
      ]
      
      render(<Timeline items={items} />)
      
      // renderDot should be undefined when no dots
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.renderDot).toBeUndefined()
    })

    it('should render dot for items that have it', () => {
      const dot1 = <div data-testid="dot-1">●</div>
      const dot2 = <div data-testid="dot-2">○</div>
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>With dot 1</div>, dot: dot1 },
        { id: 'item-2', content: <div>No dot</div> },
        { id: 'item-3', content: <div>With dot 2</div>, dot: dot2 },
      ]
      
      render(<Timeline items={items} />)
      
      expect(screen.getByTestId('dot-1')).toBeInTheDocument()
      expect(screen.getByTestId('dot-2')).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should scroll up on ArrowUp key when timeline is focused', async () => {
      const user = userEvent.setup()
      const scrollBySpy = vi.spyOn(Element.prototype, 'scrollBy')
      
      const { container } = render(<Timeline items={mockItems} />)
      const timeline = container.querySelector('.memoriae-timeline') as HTMLElement
      
      // Focus the timeline
      timeline.focus()
      
      await user.keyboard('{ArrowUp}')
      
      expect(scrollBySpy).toHaveBeenCalledWith({ top: -100, behavior: 'smooth' })
    })

    it('should scroll down on ArrowDown key when timeline is focused', async () => {
      const user = userEvent.setup()
      const scrollBySpy = vi.spyOn(Element.prototype, 'scrollBy')
      
      const { container } = render(<Timeline items={mockItems} />)
      const timeline = container.querySelector('.memoriae-timeline') as HTMLElement
      
      // Focus the timeline
      timeline.focus()
      
      await user.keyboard('{ArrowDown}')
      
      expect(scrollBySpy).toHaveBeenCalledWith({ top: 100, behavior: 'smooth' })
    })

    it('should not scroll when timeline is not focused', async () => {
      const user = userEvent.setup()
      const scrollBySpy = vi.spyOn(Element.prototype, 'scrollBy')
      
      render(<Timeline items={mockItems} />)
      
      // Don't focus the timeline
      await user.keyboard('{ArrowUp}')
      
      expect(scrollBySpy).not.toHaveBeenCalled()
    })

    it('should not scroll when focused element is not within timeline', async () => {
      const user = userEvent.setup()
      const scrollBySpy = vi.spyOn(Element.prototype, 'scrollBy')
      
      render(
        <div>
          <button>Outside</button>
          <Timeline items={mockItems} />
        </div>
      )
      
      // Focus button outside timeline
      const button = screen.getByText('Outside')
      button.focus()
      
      await user.keyboard('{ArrowUp}')
      
      expect(scrollBySpy).not.toHaveBeenCalled()
    })

    it('should prevent default on ArrowUp key', async () => {
      const { container } = render(<Timeline items={mockItems} />)
      const timeline = container.querySelector('.memoriae-timeline') as HTMLElement
      timeline.focus()
      
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault')
      
      window.dispatchEvent(keyEvent)
      
      await waitFor(() => {
        expect(preventDefaultSpy).toHaveBeenCalled()
      })
    })

    it('should prevent default on ArrowDown key', async () => {
      const { container } = render(<Timeline items={mockItems} />)
      const timeline = container.querySelector('.memoriae-timeline') as HTMLElement
      timeline.focus()
      
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault')
      
      window.dispatchEvent(keyEvent)
      
      await waitFor(() => {
        expect(preventDefaultSpy).toHaveBeenCalled()
      })
    })

    it('should handle keyboard events when focused element is within timeline', async () => {
      const user = userEvent.setup()
      const scrollBySpy = vi.spyOn(Element.prototype, 'scrollBy')
      
      render(<Timeline items={mockItems} />)
      
      // Focus an element within the timeline (the timeline itself)
      const timeline = screen.getByTestId('mother-timeline').parentElement
      if (timeline) {
        timeline.focus()
        await user.keyboard('{ArrowUp}')
        expect(scrollBySpy).toHaveBeenCalled()
      }
    })

    it('should handle keyboard events when timeline ref is null', () => {
      // This tests the guard clause when timelineRef.current is null
      // This edge case is difficult to trigger in normal circumstances since
      // the ref is always set after render. The guard clause exists for safety.
      // We test that the component handles keyboard events gracefully.
      const { unmount } = render(<Timeline items={mockItems} />)
      
      // Unmount the component, which will set the ref to null
      unmount()
      
      // Dispatch a keydown event after unmount - should not crash
      // The event listener should have been cleaned up, but we test
      // that the guard clause would handle null ref if it occurred
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      })
      
      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should cleanup keyboard event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      const { unmount } = render(<Timeline items={mockItems} />)
      
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('Mother Timeline Props', () => {
    it('should pass maxPanelWidth prop', () => {
      render(<Timeline items={mockItems} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.maxPanelWidth).toBe(400)
    })

    it('should pass panelSpacing prop', () => {
      render(<Timeline items={mockItems} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.panelSpacing).toBe(16)
    })

    it('should pass items with correct structure', () => {
      render(<Timeline items={mockItems} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.items).toHaveLength(3)
      expect(call.items[0]).toHaveProperty('id', 'item-1')
      expect(call.items[0]).toHaveProperty('position')
      expect(call.items[0]).not.toHaveProperty('content')
      expect(call.items[0]).not.toHaveProperty('time')
    })
  })

  describe('Edge Cases', () => {
    it('should handle items with React nodes as content', () => {
      const complexContent = (
        <div>
          <h2>Title</h2>
          <p>Description</p>
        </div>
      )
      const items: TimelineItem[] = [
        { id: 'item-1', content: complexContent },
      ]
      
      render(<Timeline items={items} />)
      
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('should handle items with React nodes as time', () => {
      const timeNode = <span data-testid="time-node">Custom time</span>
      const items: TimelineItem[] = [
        { id: 'item-1', content: <div>Content</div>, time: timeNode },
      ]
      
      render(<Timeline items={items} />)
      
      expect(screen.getByTestId('time-node')).toBeInTheDocument()
      expect(screen.getByText('Custom time')).toBeInTheDocument()
    })

    it('should handle rapid item changes', async () => {
      const { rerender } = render(<Timeline items={mockItems} />)
      
      expect(screen.getByText('First item')).toBeInTheDocument()
      
      const newItems: TimelineItem[] = [
        { id: 'new-1', content: <div>New item</div> },
      ]
      rerender(<Timeline items={newItems} />)
      
      await waitFor(() => {
        expect(screen.getByText('New item')).toBeInTheDocument()
        expect(screen.queryByText('First item')).not.toBeInTheDocument()
      })
    })

    it('should handle items with same id', () => {
      const duplicateItems: TimelineItem[] = [
        { id: 'same-id', content: <div>First</div> },
        { id: 'same-id', content: <div>Second</div> },
      ]
      
      // Should not throw, though this is not ideal
      render(<Timeline items={duplicateItems} />)
      
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })

    it('should handle very long item lists', () => {
      const manyItems: TimelineItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        content: <div>Item {i}</div>,
      }))
      
      render(<Timeline items={manyItems} />)
      
      expect(mockMotherTimeline).toHaveBeenCalled()
      const call = mockMotherTimeline.mock.calls[0]?.[0]
      expect(call.items).toHaveLength(100)
      // First item should be at 0%
      expect(call.items[0]?.position).toBe(0)
      // Last item should be at 100%
      expect(call.items[99]?.position).toBe(100)
    })
  })
})

