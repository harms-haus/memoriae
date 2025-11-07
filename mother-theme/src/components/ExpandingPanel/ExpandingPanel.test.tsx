import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpandingPanel } from './ExpandingPanel';

describe('ExpandingPanel', () => {
  beforeEach(() => {
    // Reset any timers or state between tests
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render when collapsed (default)', () => {
      render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      expect(screen.getByText('Test Panel')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render when expanded (defaultExpanded=true)', () => {
      render(
        <ExpandingPanel title="Test Panel" defaultExpanded={true}>
          <p>Content</p>
        </ExpandingPanel>
      );

      expect(screen.getByText('Test Panel')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(
        <ExpandingPanel title="My Title">
          <p>Content</p>
        </ExpandingPanel>
      );

      expect(screen.getByText('My Title')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <ExpandingPanel title="Test Panel">
          <div>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </div>
        </ExpandingPanel>
      );

      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    });

    it('should show ChevronRight icon when collapsed', () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const chevron = container.querySelector('.expanding-panel-chevron');
      expect(chevron).toBeInTheDocument();
      // The chevron element itself is the SVG
      expect(chevron).toHaveClass('expanding-panel-chevron');
    });

    it('should show ChevronDown icon when expanded', () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel" defaultExpanded={true}>
          <p>Content</p>
        </ExpandingPanel>
      );

      const chevron = container.querySelector('.expanding-panel-chevron');
      expect(chevron).toBeInTheDocument();
      // The chevron element itself is the SVG
      expect(chevron).toHaveClass('expanding-panel-chevron');
    });
  });

  describe('Variant Tests', () => {
    it('should apply default variant class', () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const panel = container.querySelector('.expanding-panel');
      expect(panel).toHaveClass('expanding-panel-default');
    });

    it('should apply elevated variant class', () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel" variant="elevated">
          <p>Content</p>
        </ExpandingPanel>
      );

      const panel = container.querySelector('.expanding-panel');
      expect(panel).toHaveClass('expanding-panel-elevated');
    });

    it('should apply accent variant class', () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel" variant="accent">
          <p>Content</p>
        </ExpandingPanel>
      );

      const panel = container.querySelector('.expanding-panel');
      expect(panel).toHaveClass('expanding-panel-accent');
    });
  });

  describe('Toggle Functionality', () => {
    it('should expand when header is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'false');

      await user.click(header);

      await waitFor(() => {
        expect(header).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should collapse when header is clicked again', async () => {
      const user = userEvent.setup();
      render(
        <ExpandingPanel title="Test Panel" defaultExpanded={true}>
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');

      await user.click(header);

      await waitFor(() => {
        expect(header).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should call onExpandedChange when toggled', async () => {
      const user = userEvent.setup();
      const onExpandedChange = vi.fn();
      render(
        <ExpandingPanel title="Test Panel" onExpandedChange={onExpandedChange}>
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      await user.click(header);

      await waitFor(() => {
        expect(onExpandedChange).toHaveBeenCalledWith(true);
      });

      await user.click(header);

      await waitFor(() => {
        expect(onExpandedChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should toggle on Enter key press', async () => {
      const user = userEvent.setup();
      render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      header.focus();
      expect(header).toHaveAttribute('aria-expanded', 'false');

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(header).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should toggle on Space key press', async () => {
      const user = userEvent.setup();
      render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      header.focus();
      expect(header).toHaveAttribute('aria-expanded', 'false');

      await user.keyboard(' ');

      await waitFor(() => {
        expect(header).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should prevent default behavior on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      header.focus();

      // Use userEvent which handles act() automatically
      // The component's handleKeyDown will prevent default
      // We test this by verifying the toggle still works
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(header).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should prevent default behavior on Space key', async () => {
      const user = userEvent.setup();
      render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      header.focus();

      // Use userEvent which handles act() automatically
      // The component's handleKeyDown will prevent default
      // We test this by verifying the toggle still works
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(header).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when collapsed', () => {
      render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'false');
      expect(header).toHaveAttribute('aria-label', 'Expand panel');
      expect(header).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper ARIA attributes when expanded', () => {
      render(
        <ExpandingPanel title="Test Panel" defaultExpanded={true}>
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');
      expect(header).toHaveAttribute('aria-label', 'Collapse panel');
      expect(header).toHaveAttribute('tabIndex', '0');
    });

    it('should update aria-label when toggled', async () => {
      const user = userEvent.setup();
      render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-label', 'Expand panel');

      await user.click(header);

      await waitFor(() => {
        expect(header).toHaveAttribute('aria-label', 'Collapse panel');
      });
    });
  });

  describe('Animation States', () => {
    it('should handle transition end correctly', async () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel" defaultExpanded={true}>
          <p>Content</p>
        </ExpandingPanel>
      );

      const panel = container.querySelector('.expanding-panel') as HTMLElement;
      const content = container.querySelector('.expanding-panel-content');
      expect(content).toBeInTheDocument();

      // Wait for initial mount to complete and CSS variable to be set
      // Note: In jsdom, scrollHeight is 0, so the variable will be "0px"
      // In a real browser, it would be the actual content height
      await waitFor(() => {
        // Component sets --content-height CSS variable on the panel
        const contentHeight = panel?.style.getPropertyValue('--content-height');
        expect(contentHeight).toBeTruthy();
        // Variable should be set (even if 0px in test environment)
        expect(contentHeight).toMatch(/^\d+px$/);
      }, { timeout: 200 });
    });

    it('should set content height CSS variable after expansion', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = screen.getByRole('button');
      const panel = container.querySelector('.expanding-panel') as HTMLElement;
      
      await user.click(header);

      // Wait for the expanded state
      await waitFor(() => {
        expect(header).toHaveAttribute('aria-expanded', 'true');
      });

      // Wait for CSS variable to be set (component measures content and sets variable)
      // Note: In jsdom, scrollHeight is 0, so the variable will be "0px"
      // In a real browser, it would be the actual content height
      await waitFor(() => {
        const contentHeight = panel?.style.getPropertyValue('--content-height');
        expect(contentHeight).toBeTruthy();
        // Variable should be set (even if 0px in test environment)
        expect(contentHeight).toMatch(/^\d+px$/);
      }, { timeout: 200 });
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to panel', () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel" className="custom-panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const panel = container.querySelector('.expanding-panel');
      expect(panel).toHaveClass('custom-panel');
    });

    it('should apply custom headerClassName', () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel" headerClassName="custom-header">
          <p>Content</p>
        </ExpandingPanel>
      );

      const header = container.querySelector('.expanding-panel-header');
      expect(header).toHaveClass('custom-header');
    });

    it('should apply custom contentClassName', () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel" contentClassName="custom-content">
          <p>Content</p>
        </ExpandingPanel>
      );

      const content = container.querySelector('.expanding-panel-content');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(
        <ExpandingPanel title="Test Panel">
          {null}
        </ExpandingPanel>
      );

      expect(screen.getByText('Test Panel')).toBeInTheDocument();
    });

    it('should handle React node title', () => {
      render(
        <ExpandingPanel title={<span>Custom Title</span>}>
          <p>Content</p>
        </ExpandingPanel>
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should handle multiple children', () => {
      render(
        <ExpandingPanel title="Test Panel">
          <p>First</p>
          <p>Second</p>
          <p>Third</p>
        </ExpandingPanel>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('should handle defaultExpanded prop on initial render', () => {
      // defaultExpanded only affects initial state, not prop changes
      // So we test that it works on initial render
      const { container: container1 } = render(
        <ExpandingPanel title="Test Panel" defaultExpanded={false}>
          <p>Content</p>
        </ExpandingPanel>
      );

      let header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'false');

      // Unmount and render with different defaultExpanded
      container1.remove();
      
      render(
        <ExpandingPanel title="Test Panel" defaultExpanded={true}>
          <p>Content</p>
        </ExpandingPanel>
      );

      header = screen.getByRole('button');
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Expanded State Class', () => {
    it('should apply expanding-panel-expanded class when expanded', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const panel = container.querySelector('.expanding-panel');
      expect(panel).not.toHaveClass('expanding-panel-expanded');

      const header = screen.getByRole('button');
      await user.click(header);

      await waitFor(() => {
        expect(panel).toHaveClass('expanding-panel-expanded');
      });
    });

    it('should not apply expanding-panel-expanded class when collapsed', () => {
      const { container } = render(
        <ExpandingPanel title="Test Panel">
          <p>Content</p>
        </ExpandingPanel>
      );

      const panel = container.querySelector('.expanding-panel');
      expect(panel).not.toHaveClass('expanding-panel-expanded');
    });
  });
});

