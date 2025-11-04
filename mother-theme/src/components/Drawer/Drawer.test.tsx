import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer, DrawerBody, DrawerItem } from './Drawer';
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
});

