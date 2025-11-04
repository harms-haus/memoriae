import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Timeline } from './Timeline';
import type { TimelineItem } from './Timeline';

describe('Timeline', () => {
  const createItems = (count: number): TimelineItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      position: (i / (count - 1)) * 100,
    }));
  };

  describe('Rendering', () => {
    it('should render timeline container', () => {
      const items = createItems(3);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      const timeline = container.querySelector('.timeline');
      expect(timeline).toBeInTheDocument();
    });

    it('should render correct number of timeline items', () => {
      const items = createItems(4);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      const timelineItems = container.querySelectorAll('.timeline-item');
      expect(timelineItems.length).toBe(4);
    });

    it('should render nothing for empty items array', () => {
      const { container } = render(<Timeline items={[]} mode="center" renderPanel={() => null} />);

      expect(container.firstChild).toBeNull();
    });

    it('should apply correct mode class', () => {
      const items = createItems(2);
      const { container, rerender } = render(
        <Timeline items={items} mode="left" renderPanel={() => <div>Panel</div>} />
      );

      let timeline = container.querySelector('.timeline');
      expect(timeline).toHaveClass('timeline-mode-left');

      rerender(<Timeline items={items} mode="right" renderPanel={() => <div>Panel</div>} />);
      timeline = container.querySelector('.timeline');
      expect(timeline).toHaveClass('timeline-mode-right');

      rerender(<Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />);
      timeline = container.querySelector('.timeline');
      expect(timeline).toHaveClass('timeline-mode-center');
    });

    it('should apply custom className', () => {
      const items = createItems(2);
      const { container } = render(
        <Timeline
          items={items}
          mode="center"
          className="custom-class"
          renderPanel={() => <div>Panel</div>}
        />
      );

      const timeline = container.querySelector('.timeline');
      expect(timeline).toHaveClass('custom-class');
    });
  });

  describe('Panel Selection', () => {
    it('should use center-left panels for right-side items in center mode', () => {
      const items = createItems(4);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      // Index 0 (even) should be right side -> center-left pointer
      const firstItem = container.querySelectorAll('.timeline-item')[0];
      expect(firstItem).toBeTruthy();
      const panel = firstItem?.querySelector('.pointer-panel-center-left');
      expect(panel).toBeInTheDocument();
    });

    it('should use center-right panels for left-side items in center mode', () => {
      const items = createItems(4);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      // Index 1 (odd) should be left side -> center-right pointer
      const secondItem = container.querySelectorAll('.timeline-item')[1];
      expect(secondItem).toBeTruthy();
      const panel = secondItem?.querySelector('.pointer-panel-center-right');
      expect(panel).toBeInTheDocument();
    });

    it('should use center-left panels in left mode', () => {
      const items = createItems(3);
      const { container } = render(
        <Timeline items={items} mode="left" renderPanel={() => <div>Panel</div>} />
      );

      const panel = container.querySelector('.pointer-panel-center-left');
      expect(panel).toBeInTheDocument();
    });

    it('should use center-right panels in right mode', () => {
      const items = createItems(3);
      const { container } = render(
        <Timeline items={items} mode="right" renderPanel={() => <div>Panel</div>} />
      );

      const panel = container.querySelector('.pointer-panel-center-right');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Timeline Lines', () => {
    it('should not render top line for first item', () => {
      const items = createItems(3);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      const firstItem = container.querySelectorAll('.timeline-item')[0];
      expect(firstItem).toBeTruthy();
      const topLine = firstItem?.querySelector('.timeline-line-top');
      expect(topLine).not.toBeInTheDocument();
    });

    it('should not render bottom line for last item', () => {
      const items = createItems(3);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      const lastItem = container.querySelectorAll('.timeline-item')[2];
      expect(lastItem).toBeTruthy();
      const bottomLine = lastItem?.querySelector('.timeline-line-bottom');
      expect(bottomLine).not.toBeInTheDocument();
    });

    it('should render both lines for middle items', () => {
      const items = createItems(3);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      const middleItem = container.querySelectorAll('.timeline-item')[1];
      expect(middleItem).toBeTruthy();
      const topLine = middleItem?.querySelector('.timeline-line-top');
      const bottomLine = middleItem?.querySelector('.timeline-line-bottom');
      expect(topLine).toBeInTheDocument();
      expect(bottomLine).toBeInTheDocument();
    });
  });

  describe('Custom Rendering', () => {
    it('should call renderPanel with correct index and width', () => {
      const items = createItems(3);
      const renderPanel = vi.fn((index: number, width: number) => (
        <div>Panel {index}</div>
      ));

      render(<Timeline items={items} mode="center" renderPanel={renderPanel} />);

      expect(renderPanel).toHaveBeenCalledTimes(3);
      expect(renderPanel).toHaveBeenNthCalledWith(1, 0, 400);
      expect(renderPanel).toHaveBeenNthCalledWith(2, 1, 400);
      expect(renderPanel).toHaveBeenNthCalledWith(3, 2, 400);
    });

    it('should use custom maxPanelWidth', () => {
      const items = createItems(2);
      const renderPanel = vi.fn((index: number, width: number) => (
        <div>Panel {index}</div>
      ));

      render(
        <Timeline items={items} mode="center" renderPanel={renderPanel} maxPanelWidth={600} />
      );

      expect(renderPanel).toHaveBeenNthCalledWith(1, 0, 600);
    });

    it('should call createPanel when provided', () => {
      const items = createItems(2);
      const createPanel = vi.fn((direction, pos, index, width) => (
        <div>Custom Panel {index}</div>
      ));

      render(<Timeline items={items} mode="center" createPanel={createPanel} />);

      expect(createPanel).toHaveBeenCalledTimes(2);
      expect(createPanel).toHaveBeenNthCalledWith(
        1,
        'left',
        expect.objectContaining({ x: 0, y: 0 }),
        0,
        400
      );
    });

    it('should call renderOpposite in center mode', () => {
      const items = createItems(2);
      const renderOpposite = vi.fn((index, width, panelSide) => (
        <div>Tail {index}</div>
      ));

      render(
        <Timeline
          items={items}
          mode="center"
          renderPanel={() => <div>Panel</div>}
          renderOpposite={renderOpposite}
        />
      );

      expect(renderOpposite).toHaveBeenCalledTimes(2);
      expect(renderOpposite).toHaveBeenNthCalledWith(1, 0, 400, 'right');
      expect(renderOpposite).toHaveBeenNthCalledWith(2, 1, 400, 'left');
    });

    it('should not call renderOpposite in left mode', () => {
      const items = createItems(2);
      const renderOpposite = vi.fn();

      render(
        <Timeline
          items={items}
          mode="left"
          renderPanel={() => <div>Panel</div>}
          renderOpposite={renderOpposite}
        />
      );

      expect(renderOpposite).not.toHaveBeenCalled();
    });

    it('should call renderDot when provided', () => {
      const items = createItems(3);
      const renderDot = vi.fn((index, position, isTop, isBottom) => (
        <div>Dot {index}</div>
      ));

      render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} renderDot={renderDot} />
      );

      expect(renderDot).toHaveBeenCalledTimes(3);
      expect(renderDot).toHaveBeenNthCalledWith(1, 0, 0, true, false);
      expect(renderDot).toHaveBeenNthCalledWith(2, 1, 50, false, false);
      expect(renderDot).toHaveBeenNthCalledWith(3, 2, 100, false, true);
    });

    it('should render default dot when renderDot not provided', () => {
      const items = createItems(2);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      const dots = container.querySelectorAll('.timeline-dot-default');
      expect(dots.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item', () => {
      const items = [{ id: 'item-0', position: 50 }];
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      const timelineItems = container.querySelectorAll('.timeline-item');
      expect(timelineItems.length).toBe(1);

      const firstItem = timelineItems[0];
      expect(firstItem).toBeTruthy();
      const topLine = firstItem?.querySelector('.timeline-line-top');
      const bottomLine = firstItem?.querySelector('.timeline-line-bottom');
      expect(topLine).not.toBeInTheDocument();
      expect(bottomLine).not.toBeInTheDocument();
    });

    it('should handle two items', () => {
      const items = createItems(2);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      const timelineItems = container.querySelectorAll('.timeline-item');
      expect(timelineItems.length).toBe(2);

      // First item: no top line, has bottom line
      const firstItem = timelineItems[0];
      expect(firstItem).toBeTruthy();
      expect(firstItem?.querySelector('.timeline-line-top')).not.toBeInTheDocument();
      expect(firstItem?.querySelector('.timeline-line-bottom')).toBeInTheDocument();

      // Second item: has top line, no bottom line
      const secondItem = timelineItems[1];
      expect(secondItem).toBeTruthy();
      expect(secondItem?.querySelector('.timeline-line-top')).toBeInTheDocument();
      expect(secondItem?.querySelector('.timeline-line-bottom')).not.toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('should use correct grid layout for left mode', () => {
      const items = createItems(2);
      const { container } = render(
        <Timeline items={items} mode="left" renderPanel={() => <div>Panel</div>} />
      );

      const timeline = container.querySelector('.timeline-mode-left');
      expect(timeline).toBeInTheDocument();

      const firstItem = container.querySelectorAll('.timeline-item')[0];
      expect(firstItem).toBeTruthy();
      expect(firstItem).toHaveClass('timeline-item-right'); // In left mode, panels are on right
    });

    it('should use correct grid layout for right mode', () => {
      const items = createItems(2);
      const { container } = render(
        <Timeline items={items} mode="right" renderPanel={() => <div>Panel</div>} />
      );

      const timeline = container.querySelector('.timeline-mode-right');
      expect(timeline).toBeInTheDocument();
    });

    it('should use correct grid layout for center mode', () => {
      const items = createItems(3);
      const { container } = render(
        <Timeline items={items} mode="center" renderPanel={() => <div>Panel</div>} />
      );

      const timeline = container.querySelector('.timeline-mode-center');
      expect(timeline).toBeInTheDocument();
    });
  });
});

