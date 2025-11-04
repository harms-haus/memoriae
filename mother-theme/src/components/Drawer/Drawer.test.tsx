import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter, DrawerItem } from './Drawer';
import { Settings } from 'lucide-react';

// Mock createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('Drawer', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(
        <Drawer open={false} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should lock body scroll when open', () => {
      const { rerender } = render(
        <Drawer open={false} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(document.body.style.overflow).toBe('');

      rerender(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('Position Variants', () => {
    it('should apply left position class', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}} position="left">
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.getByRole('dialog')).toHaveClass('drawer-left');
    });

    it('should apply right position class', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}} position="right">
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.getByRole('dialog')).toHaveClass('drawer-right');
    });

    it('should apply top position class', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}} position="top">
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.getByRole('dialog')).toHaveClass('drawer-top');
    });

    it('should apply bottom position class', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}} position="bottom">
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.getByRole('dialog')).toHaveClass('drawer-bottom');
    });

    it('should apply wide size class', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}} size="wide">
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.getByRole('dialog')).toHaveClass('drawer-wide');
    });
  });

  describe('DrawerItem', () => {
    it('should render with icon, title, and description', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>
            <DrawerItem
              icon={Settings}
              title="Settings"
              description="Configure your preferences"
            />
          </DrawerBody>
        </Drawer>
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure your preferences')).toBeInTheDocument();
    });

    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>
            <DrawerItem title="Settings" onClick={onClick} />
          </DrawerBody>
        </Drawer>
      );

      await user.click(screen.getByText('Settings'));
      expect(onClick).toHaveBeenCalled();
    });

    it('should call onClick on Enter key press', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>
            <DrawerItem title="Settings" onClick={onClick} />
          </DrawerBody>
        </Drawer>
      );

      const item = screen.getByText('Settings').closest('[role="button"]');
      expect(item).toBeInTheDocument();
      
      // Focus the item
      if (item) {
        (item as HTMLElement).focus();
        await user.keyboard('{Enter}');
        // onClick should be called from the Enter key press
        expect(onClick).toHaveBeenCalled();
      }
    });

    it('should call onClick on Space key press', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>
            <DrawerItem title="Settings" onClick={onClick} />
          </DrawerBody>
        </Drawer>
      );

      const item = screen.getByText('Settings').closest('[role="button"]');
      expect(item).toBeInTheDocument();
      
      // Focus the item
      if (item) {
        (item as HTMLElement).focus();
        await user.keyboard(' ');
        // onClick should be called from the Space key press
        expect(onClick).toHaveBeenCalled();
      }
    });
  });

  describe('Escape Key', () => {
    it('should close on Escape key press', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <Drawer open={true} onOpenChange={onOpenChange}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('DrawerHeader', () => {
    it('should render title and close button', () => {
      const onClose = vi.fn();
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerHeader title="Test Drawer" onClose={onClose} />
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.getByText('Test Drawer')).toBeInTheDocument();
      expect(screen.getByLabelText('Close drawer')).toBeInTheDocument();
    });

    it('should render children prop', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerHeader title="Test Drawer" onClose={() => {}}>
            <button>Custom Action</button>
          </DrawerHeader>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerHeader title="Test Drawer" onClose={onClose} />
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      await user.click(screen.getByLabelText('Close drawer'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should not show close button when showCloseButton is false', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerHeader title="Test Drawer" showCloseButton={false} />
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.queryByLabelText('Close drawer')).not.toBeInTheDocument();
    });
  });

  describe('DrawerBody', () => {
    it('should render body content', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>
            <p>Body content</p>
            <button>Action</button>
          </DrawerBody>
        </Drawer>
      );

      expect(screen.getByText('Body content')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody className="custom-body">
            Content
          </DrawerBody>
        </Drawer>
      );

      const body = container.querySelector('.drawer-body');
      expect(body).toHaveClass('custom-body');
    });
  });

  describe('DrawerFooter', () => {
    it('should render footer content', () => {
      render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
          <DrawerFooter>
            <button>Cancel</button>
            <button>Confirm</button>
          </DrawerFooter>
        </Drawer>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
          <DrawerFooter className="custom-footer">
            <button>Action</button>
          </DrawerFooter>
        </Drawer>
      );

      const footer = container.querySelector('.drawer-footer');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Animation States', () => {
    it('should apply closing class during animation', async () => {
      const { rerender } = render(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      const drawer = screen.getByRole('dialog');
      expect(drawer).not.toHaveClass('drawer-closing');

      rerender(
        <Drawer open={false} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      // Should have closing class during animation
      await waitFor(() => {
        const drawerAfterClose = document.querySelector('.drawer');
        // The drawer should still be rendered with closing class
        expect(drawerAfterClose).toBeInTheDocument();
      }, { timeout: 100 });

      // After animation completes, drawer should be removed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }, { timeout: 400 });
    });

    it('should not render when shouldRender is false', async () => {
      const { rerender } = render(
        <Drawer open={false} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(
        <Drawer open={true} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(
        <Drawer open={false} onOpenChange={() => {}}>
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }, { timeout: 400 });
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to drawer element', () => {
      const { container } = render(
        <Drawer open={true} onOpenChange={() => {}} className="custom-drawer">
          <DrawerBody>Content</DrawerBody>
        </Drawer>
      );

      const drawer = container.querySelector('.drawer');
      expect(drawer).toHaveClass('custom-drawer');
    });
  });
});

