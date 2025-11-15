import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LayoutExamples } from './LayoutExamples';

// Mock PointerPanel and Timeline components
vi.mock('../../../components', async () => {
  const actual = await vi.importActual('../../../components');
  return {
    ...actual,
    PointerPanel: ({ children, position, arrowSize, style }: any) => (
      <div
        className={`pointer-panel pointer-panel-${position}`}
        data-position={position}
        data-arrow-size={arrowSize}
        style={style}
        data-testid="pointer-panel"
      >
        {children}
      </div>
    ),
    Timeline: ({ items, mode, renderPanel, renderOpposite, renderDot }: any) => (
      <div data-testid="timeline" data-mode={mode}>
        {items.map((item: any, index: number) => (
          <div key={item.id} data-testid={`timeline-item-${index}`}>
            {renderPanel && renderPanel(index, 200)}
            {renderOpposite && renderOpposite(index, 200, mode === 'center' ? (index % 2 === 0 ? 'left' : 'right') : mode)}
            {renderDot && renderDot(index, item.position, index === 0, index === items.length - 1)}
          </div>
        ))}
      </div>
    ),
  };
});

describe('LayoutExamples', () => {
  describe('Rendering', () => {
    it('should render header with title and description', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Layout')).toBeInTheDocument();
      expect(
        screen.getByText('Layout components: layered panels, pointer panels, and timeline')
      ).toBeInTheDocument();
    });

    it('should render examples-container', () => {
      const { container } = render(<LayoutExamples />);
      const containerEl = container.querySelector('.examples-container');
      expect(containerEl).toBeInTheDocument();
    });

    it('should render examples-header', () => {
      const { container } = render(<LayoutExamples />);
      const header = container.querySelector('.examples-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Layered Panels Section', () => {
    it('should render layered panels section', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Layered Panels')).toBeInTheDocument();
    });

    it('should render level 1 base panel', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Level 1 - Base Panel')).toBeInTheDocument();
      expect(screen.getByText(/This is the base panel with secondary background/i)).toBeInTheDocument();
    });

    it('should render level 2 elevated panel', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Level 2 - Elevated Panel')).toBeInTheDocument();
      expect(
        screen.getByText(/This is an elevated panel with tertiary background/i)
      ).toBeInTheDocument();
    });

    it('should render level 3 accent panel', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Level 3 - Accent Panel')).toBeInTheDocument();
      expect(screen.getByText(/This is a panel with yellow accent border/i)).toBeInTheDocument();
    });

    it('should render alternate layering example', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Alternate Layering')).toBeInTheDocument();
      expect(screen.getByText('Light Header Panel')).toBeInTheDocument();
    });

    it('should render panel classes correctly', () => {
      const { container } = render(<LayoutExamples />);

      const panels = container.querySelectorAll('.panel');
      expect(panels.length).toBeGreaterThan(0);

      const elevatedPanels = container.querySelectorAll('.panel-elevated');
      expect(elevatedPanels.length).toBeGreaterThan(0);

      const accentPanels = container.querySelectorAll('.panel-accent');
      expect(accentPanels.length).toBeGreaterThan(0);

      const headerPanels = container.querySelectorAll('.panel-header-light');
      expect(headerPanels.length).toBeGreaterThan(0);
    });
  });

  describe('Pointer Panels Section', () => {
    it('should render pointer panels section', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Pointer Panels')).toBeInTheDocument();
    });

    it('should render pointing panels description', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Pointing Panels')).toBeInTheDocument();
      expect(
        screen.getByText(/Panels with arrow pointers that extend from the panel body/i)
      ).toBeInTheDocument();
    });

    it('should render all pointer panel positions', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Top-left pointing left')).toBeInTheDocument();
      expect(screen.getByText('Top-right pointing right')).toBeInTheDocument();
      expect(screen.getByText('Center-left pointing left')).toBeInTheDocument();
      expect(screen.getByText('Center-right pointing right')).toBeInTheDocument();
      expect(screen.getByText('Bottom-left pointing left')).toBeInTheDocument();
      expect(screen.getByText('Bottom-right pointing right')).toBeInTheDocument();
    });

    it('should render pointer panels with correct positions', () => {
      const { container } = render(<LayoutExamples />);

      const topLeft = container.querySelector('[data-position="top-left"]');
      const topRight = container.querySelector('[data-position="top-right"]');
      const centerLeft = container.querySelector('[data-position="center-left"]');
      const centerRight = container.querySelector('[data-position="center-right"]');
      const bottomLeft = container.querySelector('[data-position="bottom-left"]');
      const bottomRight = container.querySelector('[data-position="bottom-right"]');

      expect(topLeft).toBeInTheDocument();
      expect(topRight).toBeInTheDocument();
      expect(centerLeft).toBeInTheDocument();
      expect(centerRight).toBeInTheDocument();
      expect(bottomLeft).toBeInTheDocument();
      expect(bottomRight).toBeInTheDocument();
    });

    it('should render customizable arrow size section', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Customizable Arrow Size')).toBeInTheDocument();
      expect(
        screen.getByText(/The arrow size can be customized using the arrowSize prop/i)
      ).toBeInTheDocument();
    });

    it('should render pointer panels with different arrow sizes', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Small arrow (12px)')).toBeInTheDocument();
      expect(screen.getByText('Large arrow (24px)')).toBeInTheDocument();
    });

    it('should render pointer panels with arrowSize prop', () => {
      const { container } = render(<LayoutExamples />);

      const smallArrow = container.querySelector('[data-arrow-size="12"]');
      const largeArrow = container.querySelector('[data-arrow-size="24"]');

      expect(smallArrow).toBeInTheDocument();
      expect(largeArrow).toBeInTheDocument();
    });
  });

  describe('Timeline Section', () => {
    it('should render timeline section', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    it('should render center mode timeline', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Center Mode (Alternating)')).toBeInTheDocument();
      expect(
        screen.getByText(/Timeline with panels alternating left and right/i)
      ).toBeInTheDocument();
    });

    it('should render center mode timeline items', () => {
      render(<LayoutExamples />);

      const timelines = screen.getAllByTestId('timeline');
      const centerTimeline = timelines.find((t) => t.getAttribute('data-mode') === 'center');
      expect(centerTimeline).toBeInTheDocument();

      const items = screen.getAllByTestId(/timeline-item-/);
      expect(items.length).toBeGreaterThanOrEqual(4);
    });

    it('should render center mode timeline content', () => {
      render(<LayoutExamples />);

      // Multiple "Item 1" texts exist (center, left, right modes), so use getAllByText
      const item1Texts = screen.getAllByText(/Item 1/i);
      expect(item1Texts.length).toBeGreaterThan(0);
      const panelContent = screen.getAllByText(/Panel content for timeline item 1/i);
      expect(panelContent.length).toBeGreaterThan(0);
    });

    it('should render left mode timeline', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Left Mode')).toBeInTheDocument();
      expect(screen.getByText(/Timeline aligned to the left/i)).toBeInTheDocument();
    });

    it('should render left mode timeline items', () => {
      render(<LayoutExamples />);

      const timelines = screen.getAllByTestId('timeline');
      const leftTimeline = timelines.find((t) => t.getAttribute('data-mode') === 'left');
      expect(leftTimeline).toBeInTheDocument();
    });

    it('should render left mode timeline content', () => {
      render(<LayoutExamples />);

      expect(screen.getByText(/Left Mode Item 1/i)).toBeInTheDocument();
    });

    it('should render right mode timeline', () => {
      render(<LayoutExamples />);

      expect(screen.getByText('Right Mode')).toBeInTheDocument();
      expect(screen.getByText(/Timeline aligned to the right/i)).toBeInTheDocument();
    });

    it('should render right mode timeline items', () => {
      render(<LayoutExamples />);

      const timelines = screen.getAllByTestId('timeline');
      const rightTimeline = timelines.find((t) => t.getAttribute('data-mode') === 'right');
      expect(rightTimeline).toBeInTheDocument();
    });

    it('should render right mode timeline content', () => {
      render(<LayoutExamples />);

      expect(screen.getByText(/Right Mode Item 1/i)).toBeInTheDocument();
    });

    it('should render timeline with renderPanel function', () => {
      render(<LayoutExamples />);

      // Timeline should render panel content (multiple instances exist)
      const itemTexts = screen.getAllByText(/Item 1/i);
      expect(itemTexts.length).toBeGreaterThan(0);
    });

    it('should render timeline with renderOpposite function', () => {
      render(<LayoutExamples />);

      // Timeline should render opposite content (dates) - multiple dates exist
      const dateTexts = screen.getAllByText(/2024/i);
      expect(dateTexts.length).toBeGreaterThan(0);
    });

    it('should render timeline with renderDot function', () => {
      const { container } = render(<LayoutExamples />);

      // Timeline dots should be rendered
      const timelineDots = container.querySelectorAll('.timeline-dot-default');
      expect(timelineDots.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering with all sections', () => {
      const { container } = render(<LayoutExamples />);
      expect(container.querySelector('.examples-container')).toBeInTheDocument();
    });

    it('should render all showcase sections', () => {
      const { container } = render(<LayoutExamples />);
      const sections = container.querySelectorAll('.showcase-section');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle pointer panel positioning', () => {
      const { container } = render(<LayoutExamples />);
      const pointerPanels = container.querySelectorAll('[data-testid="pointer-panel"]');
      expect(pointerPanels.length).toBeGreaterThan(0);
    });
  });
});

