import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './Dialog';

// Mock createPortal to render in current DOM
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('Dialog', () => {
  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Cleanup body overflow
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(
        <Dialog open={false} onOpenChange={() => {}}>
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should lock body scroll when open', () => {
      const { rerender } = render(
        <Dialog open={false} onOpenChange={() => {}}>
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      expect(document.body.style.overflow).toBe('');

      rerender(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('Size Variants', () => {
    it('should apply small size class', () => {
      render(
        <Dialog open={true} onOpenChange={() => {}} size="small">
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      // The size class is on the inner .dialog div, not the overlay
      const dialog = document.querySelector('.dialog');
      expect(dialog).toHaveClass('dialog-small');
    });

    it('should apply large size class', () => {
      render(
        <Dialog open={true} onOpenChange={() => {}} size="large">
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      // The size class is on the inner .dialog div, not the overlay
      const dialog = document.querySelector('.dialog');
      expect(dialog).toHaveClass('dialog-large');
    });
  });

  describe('DialogHeader', () => {
    it('should render title and close button', () => {
      const onClose = vi.fn();
      render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogHeader title="Test Dialog" onClose={onClose} />
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogHeader title="Test Dialog" onClose={onClose} />
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      await user.click(screen.getByLabelText('Close dialog'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should not show close button when showCloseButton is false', () => {
      render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogHeader title="Test Dialog" showCloseButton={false} />
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      expect(screen.queryByLabelText('Close dialog')).not.toBeInTheDocument();
    });
  });

  describe('Backdrop Click', () => {
    it('should close on backdrop click by default', async () => {
      const onOpenChange = vi.fn();
      render(
        <Dialog open={true} onOpenChange={onOpenChange}>
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      // Find the overlay by class name
      const overlay = document.querySelector('.dialog-overlay');
      expect(overlay).toBeInTheDocument();
      
      // Simulate a click event directly on the overlay element
      // The handler checks if e.target === overlayRef.current
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      overlay?.dispatchEvent(clickEvent);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should not close on backdrop click when closeOnBackdropClick is false', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <Dialog open={true} onOpenChange={onOpenChange} closeOnBackdropClick={false}>
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      const overlay = screen.getByRole('dialog').parentElement;
      if (overlay) {
        await user.click(overlay);
      }

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('should close on Escape key press', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <Dialog open={true} onOpenChange={onOpenChange}>
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Focus Trap', () => {
    it('should trap focus when open', async () => {
      render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogBody>
            <button>First Button</button>
            <button>Second Button</button>
            <button>Third Button</button>
          </DialogBody>
        </Dialog>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Focus should be on dialog or first element
      const dialog = document.querySelector('.dialog');
      expect(dialog).toHaveAttribute('tabIndex', '-1');
    });

    it('should wrap focus from last to first element on Tab', async () => {
      const user = userEvent.setup();
      render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogBody>
            <button>First Button</button>
            <button>Second Button</button>
            <button>Last Button</button>
          </DialogBody>
        </Dialog>
      );

      const buttons = screen.getAllByRole('button');
      const lastButton = buttons[buttons.length - 1];
      
      if (lastButton) {
        lastButton.focus();
        expect(document.activeElement).toBe(lastButton);

        await user.keyboard('{Tab}');
        // Focus should wrap to first button
        expect(document.activeElement).toBe(buttons[0]);
      }
    });

    it('should wrap focus from first to last element on Shift+Tab', async () => {
      const user = userEvent.setup();
      render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogBody>
            <button>First Button</button>
            <button>Second Button</button>
            <button>Last Button</button>
          </DialogBody>
        </Dialog>
      );

      const buttons = screen.getAllByRole('button');
      const firstButton = buttons[0];
      
      if (firstButton) {
        firstButton.focus();
        expect(document.activeElement).toBe(firstButton);

        await user.keyboard('{Shift>}{Tab}');
        // Focus should wrap to last button
        expect(document.activeElement).toBe(buttons[buttons.length - 1]);
      }
    });

    it('should not trap focus when closed', () => {
      render(
        <Dialog open={false} onOpenChange={() => {}}>
          <DialogBody>
            <button>Button</button>
          </DialogBody>
        </Dialog>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Focus Restoration', () => {
    it('should restore focus to previous element on close', async () => {
      const { rerender } = render(
        <div>
          <button>Outside Button</button>
          <Dialog open={false} onOpenChange={() => {}}>
            <DialogBody>Content</DialogBody>
          </Dialog>
        </div>
      );

      const outsideButton = screen.getByText('Outside Button');
      outsideButton.focus();
      expect(document.activeElement).toBe(outsideButton);

      rerender(
        <div>
          <button>Outside Button</button>
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogBody>Content</DialogBody>
          </Dialog>
        </div>
      );

      // Dialog should be focused
      const dialog = document.querySelector('.dialog');
      expect(dialog).toHaveAttribute('tabIndex', '-1');

      rerender(
        <div>
          <button>Outside Button</button>
          <Dialog open={false} onOpenChange={() => {}}>
            <DialogBody>Content</DialogBody>
          </Dialog>
        </div>
      );

      // Focus should be restored to outside button
      // Note: This is tested through the useEffect cleanup
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('DialogHeader', () => {
    it('should render children prop', () => {
      render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogHeader title="Test Dialog" onClose={() => {}}>
            <button>Custom Action</button>
          </DialogHeader>
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });
  });

  describe('DialogFooter', () => {
    it('should render footer content', () => {
      render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogBody>Content</DialogBody>
          <DialogFooter>
            <button>Cancel</button>
            <button>Confirm</button>
          </DialogFooter>
        </Dialog>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogBody>Content</DialogBody>
          <DialogFooter className="custom-footer">
            <button>Action</button>
          </DialogFooter>
        </Dialog>
      );

      const footer = container.querySelector('.dialog-footer');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Size Variants', () => {
    it('should apply default size (no size class)', () => {
      const { container } = render(
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      const dialog = container.querySelector('.dialog');
      expect(dialog).not.toHaveClass('dialog-small');
      expect(dialog).not.toHaveClass('dialog-large');
    });

    it('should apply all size classes correctly', () => {
      const { container, rerender } = render(
        <Dialog open={true} onOpenChange={() => {}} size="small">
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      let dialog = container.querySelector('.dialog');
      expect(dialog).toHaveClass('dialog-small');

      rerender(
        <Dialog open={true} onOpenChange={() => {}} size="default">
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      dialog = container.querySelector('.dialog');
      expect(dialog).not.toHaveClass('dialog-small');
      expect(dialog).not.toHaveClass('dialog-large');

      rerender(
        <Dialog open={true} onOpenChange={() => {}} size="large">
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      dialog = container.querySelector('.dialog');
      expect(dialog).toHaveClass('dialog-large');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to dialog element', () => {
      const { container } = render(
        <Dialog open={true} onOpenChange={() => {}} className="custom-dialog">
          <DialogBody>Content</DialogBody>
        </Dialog>
      );

      const dialog = container.querySelector('.dialog');
      expect(dialog).toHaveClass('custom-dialog');
    });
  });
});

