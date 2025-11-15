import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OverlayExamples } from './OverlayExamples';
import { createUserEvent } from '../../../test/utils';

// Mock all components
const mockSetDialogOpen = vi.fn();
const mockSetDrawerOpen = vi.fn();
const mockSetNotificationVisible = vi.fn();
const mockToast = vi.fn();

vi.mock('../../../components', async () => {
  const actual = await vi.importActual('../../../components');
  return {
    ...actual,
    ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useToast: () => ({
      toast: mockToast,
    }),
    Button: ({ children, onClick, variant }: any) => (
      <button onClick={onClick} className={`btn-${variant}`} data-testid="button">
        {children}
      </button>
    ),
    Dialog: ({ children, open, onOpenChange, size = 'default' }: any) =>
      open ? (
        <div data-testid="dialog" data-size={size} data-open={open}>
          {children}
          <button onClick={() => onOpenChange(false)} data-testid="close-dialog">
            Close
          </button>
        </div>
      ) : null,
    DialogHeader: ({ title, onClose }: any) => (
      <div data-testid="dialog-header">
        <h2>{title}</h2>
        {onClose && <button onClick={onClose}>×</button>}
      </div>
    ),
    DialogBody: ({ children }: any) => <div data-testid="dialog-body">{children}</div>,
    DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
    Drawer: ({ children, open, onOpenChange, position }: any) =>
      open ? (
        <div data-testid="drawer" data-position={position} data-open={open}>
          {children}
          <button onClick={() => onOpenChange(false)} data-testid="close-drawer">
            Close
          </button>
        </div>
      ) : null,
    DrawerHeader: ({ title, onClose }: any) => (
      <div data-testid="drawer-header">
        <h2>{title}</h2>
        {onClose && <button onClick={onClose}>×</button>}
      </div>
    ),
    DrawerBody: ({ children }: any) => <div data-testid="drawer-body">{children}</div>,
    DrawerFooter: ({ children }: any) => <div data-testid="drawer-footer">{children}</div>,
    DrawerItem: ({ icon, title, description }: any) => (
      <div data-testid="drawer-item">
        {icon && <span data-testid="drawer-item-icon">icon</span>}
        <div>{title}</div>
        {description && <div>{description}</div>}
      </div>
    ),
    Notification: ({ variant, title, message, onClose, duration }: any) => (
      <div data-testid="notification" data-variant={variant}>
        <h3>{title}</h3>
        <p>{message}</p>
        {onClose && (
          <button onClick={onClose} data-testid="close-notification">
            Close
          </button>
        )}
      </div>
    ),
    Input: ({ label, placeholder }: any) => (
      <div>
        {label && <label>{label}</label>}
        <input type="text" placeholder={placeholder} data-testid="input" />
      </div>
    ),
    Textarea: ({ label, placeholder }: any) => (
      <div>
        {label && <label>{label}</label>}
        <textarea placeholder={placeholder} data-testid="textarea" />
      </div>
    ),
    Checkbox: ({ children, checked }: any) => (
      <label>
        <input type="checkbox" checked={checked} data-testid="checkbox" />
        {children}
      </label>
    ),
  };
});

describe('OverlayExamples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header with title and description', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Overlays')).toBeInTheDocument();
      expect(screen.getByText('Modal dialogs, drawers, notifications, and toasts')).toBeInTheDocument();
    });

    it('should render examples-container', () => {
      const { container } = render(<OverlayExamples />);
      const containerEl = container.querySelector('.examples-container');
      expect(containerEl).toBeInTheDocument();
    });

    it('should render examples-header', () => {
      const { container } = render(<OverlayExamples />);
      const header = container.querySelector('.examples-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Notifications & Toasts Section', () => {
    it('should render notifications section', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Notifications & Toasts')).toBeInTheDocument();
    });

    it('should render message notifications', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Message Notifications')).toBeInTheDocument();
      expect(screen.getByText('Information')).toBeInTheDocument();
      expect(
        screen.getByText(/This is an informational message/i)
      ).toBeInTheDocument();
    });

    it('should render info notification', () => {
      render(<OverlayExamples />);

      // Multiple notifications exist, find the info one
      const notifications = screen.getAllByTestId('notification');
      const infoNotification = notifications.find((n) =>
        n.getAttribute('data-variant') === 'info'
      );
      expect(infoNotification).toBeInTheDocument();
    });

    it('should render warning notifications', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Warning Notifications')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should render warning notification', () => {
      render(<OverlayExamples />);

      const notifications = screen.getAllByTestId('notification');
      const warningNotification = notifications.find((n) =>
        n.getAttribute('data-variant') === 'warning'
      );
      expect(warningNotification).toBeInTheDocument();
    });

    it('should render error notifications', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Error Notifications')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should render error notification', () => {
      render(<OverlayExamples />);

      const notifications = screen.getAllByTestId('notification');
      const errorNotification = notifications.find((n) =>
        n.getAttribute('data-variant') === 'error'
      );
      expect(errorNotification).toBeInTheDocument();
    });

    it('should render toast variants section', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Toast Variants')).toBeInTheDocument();
      expect(screen.getByText('Show Success Toast')).toBeInTheDocument();
      expect(screen.getByText('Show Info Toast')).toBeInTheDocument();
      expect(screen.getByText('Show Warning Toast')).toBeInTheDocument();
      expect(screen.getByText('Show Error Toast')).toBeInTheDocument();
    });

    it('should call toast function when toast buttons are clicked', async () => {
      const user = createUserEvent();
      render(<OverlayExamples />);

      const successButton = screen.getByText('Show Success Toast');
      await user.click(successButton);

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'success',
        message: 'Changes saved successfully',
      });
      },
      { timeout: 5000 }
    );
  });

  describe('Dialog Pop-overs Section', () => {
    it('should render dialogs section', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Dialog Pop-overs')).toBeInTheDocument();
    });

    it('should render dialog modals section', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Dialog Modals')).toBeInTheDocument();
      expect(screen.getByText('Open Default Dialog')).toBeInTheDocument();
      expect(screen.getByText('Open Small Dialog')).toBeInTheDocument();
      expect(screen.getByText('Open Large Dialog')).toBeInTheDocument();
    });

    it(
      'should open default dialog when button is clicked',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Default Dialog');
        await user.click(openButton);

        await waitFor(
          () => {
            const dialog = screen.getByTestId('dialog');
            expect(dialog).toBeInTheDocument();
          },
          { timeout: 5000 }
        );

        const dialog = screen.getByTestId('dialog');
        expect(dialog).toHaveAttribute('data-size', 'default');
      },
      { timeout: 10000 }
    );

    it(
      'should open small dialog when button is clicked',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Small Dialog');
        await user.click(openButton);

        await waitFor(
          () => {
            const dialog = screen.getByTestId('dialog');
            expect(dialog).toBeInTheDocument();
            expect(dialog).toHaveAttribute('data-size', 'small');
          },
          { timeout: 5000 }
        );
      },
      { timeout: 10000 }
    );

    it(
      'should open large dialog when button is clicked',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Large Dialog');
        await user.click(openButton);

        await waitFor(
          () => {
            const dialog = screen.getByTestId('dialog');
            expect(dialog).toBeInTheDocument();
            expect(dialog).toHaveAttribute('data-size', 'large');
          },
          { timeout: 5000 }
        );
      },
      { timeout: 10000 }
    );

    it(
      'should render dialog header',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        // Open a dialog first
        const openButton = screen.getByText('Open Default Dialog');
        await user.click(openButton);

        await waitFor(
          () => {
            expect(screen.getByTestId('dialog-header')).toBeInTheDocument();
            expect(screen.getByText('Confirm Action')).toBeInTheDocument();
          },
          { timeout: 5000 }
        );
      },
      { timeout: 10000 }
    );

    it(
      'should render dialog body',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Default Dialog');
        await user.click(openButton);

        await waitFor(
          () => {
            expect(screen.getByTestId('dialog-body')).toBeInTheDocument();
          },
          { timeout: 5000 }
        );
      },
      { timeout: 10000 }
    );

    it(
      'should render dialog footer',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Default Dialog');
        await user.click(openButton);

        await waitFor(
          () => {
            expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
          },
          { timeout: 5000 }
        );
      },
      { timeout: 10000 }
    );

    it('should close dialog when close button is clicked', async () => {
      const user = createUserEvent();
      render(<OverlayExamples />);

      const openButton = screen.getByText('Open Default Dialog');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId('close-dialog');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      });
      },
      { timeout: 5000 }
    );
  });

  describe('Drawers Section', () => {
    it('should render drawers section', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Drawers (Mobile Side Panels)')).toBeInTheDocument();
    });

    it('should render left drawer section', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Left Drawer')).toBeInTheDocument();
      expect(screen.getByText('Open Left Drawer')).toBeInTheDocument();
    });

    it('should render right drawer section', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Right Drawer')).toBeInTheDocument();
      expect(screen.getByText('Open Right Drawer')).toBeInTheDocument();
    });

    it('should render bottom drawer section', () => {
      render(<OverlayExamples />);

      expect(screen.getByText('Bottom Drawer')).toBeInTheDocument();
      expect(screen.getByText('Open Bottom Drawer')).toBeInTheDocument();
    });

    it(
      'should open left drawer when button is clicked',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Left Drawer');
        await user.click(openButton);

        await waitFor(() => {
          const drawer = screen.getByTestId('drawer');
          expect(drawer).toBeInTheDocument();
          expect(drawer).toHaveAttribute('data-position', 'left');
        });
      },
      { timeout: 5000 }
    );

    it(
      'should open right drawer when button is clicked',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Right Drawer');
        await user.click(openButton);

        await waitFor(() => {
          const drawer = screen.getByTestId('drawer');
          expect(drawer).toHaveAttribute('data-position', 'right');
        });
      },
      { timeout: 5000 }
    );

    it(
      'should open bottom drawer when button is clicked',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Bottom Drawer');
        await user.click(openButton);

        await waitFor(() => {
          const drawer = screen.getByTestId('drawer');
          expect(drawer).toHaveAttribute('data-position', 'bottom');
        });
      },
      { timeout: 5000 }
    );

    it(
      'should render drawer items',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Left Drawer');
        await user.click(openButton);

        await waitFor(() => {
          const drawerItems = screen.getAllByTestId('drawer-item');
          expect(drawerItems.length).toBeGreaterThan(0);
        });
      },
      { timeout: 5000 }
    );

    it(
      'should render drawer header',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Left Drawer');
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.getByTestId('drawer-header')).toBeInTheDocument();
          expect(screen.getByText('Navigation')).toBeInTheDocument();
        });
      },
      { timeout: 5000 }
    );

    it(
      'should render drawer body',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Left Drawer');
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.getByTestId('drawer-body')).toBeInTheDocument();
        });
      },
      { timeout: 5000 }
    );

    it(
      'should render drawer footer',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Left Drawer');
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.getByTestId('drawer-footer')).toBeInTheDocument();
        });
      },
      { timeout: 5000 }
    );

    it('should close drawer when close button is clicked', async () => {
      const user = createUserEvent();
      render(<OverlayExamples />);

      const openButton = screen.getByText('Open Left Drawer');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('drawer')).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId('close-drawer');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
      });
      },
      { timeout: 5000 }
    );
  });

  describe('State Management', () => {
    it(
      'should handle multiple dialogs state',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        // Open first dialog
        const openDefault = screen.getByText('Open Default Dialog');
        await user.click(openDefault);

        await waitFor(() => {
          expect(screen.getByTestId('dialog')).toBeInTheDocument();
        });

        // Close it
        const closeButton = screen.getByTestId('close-dialog');
        await user.click(closeButton);

        // Open second dialog
        const openSmall = screen.getByText('Open Small Dialog');
        await user.click(openSmall);

        await waitFor(() => {
          const dialog = screen.getByTestId('dialog');
          expect(dialog).toHaveAttribute('data-size', 'small');
        });
      },
      { timeout: 10000 }
    );

    it('should handle notification visibility state', () => {
      render(<OverlayExamples />);

      // Notifications should be visible initially
      const notifications = screen.getAllByTestId('notification');
      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering with all sections', () => {
      const { container } = render(<OverlayExamples />);
      expect(container.querySelector('.examples-container')).toBeInTheDocument();
    });

    it('should handle ToastProvider wrapper', () => {
      render(<OverlayExamples />);
      // ToastProvider is mocked, so we just verify the component renders
      expect(screen.getByText('Overlays')).toBeInTheDocument();
    });

    it(
      'should handle form inputs in large dialog',
      async () => {
        const user = createUserEvent();
        render(<OverlayExamples />);

        const openButton = screen.getByText('Open Large Dialog');
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.getByTestId('input')).toBeInTheDocument();
          expect(screen.getByTestId('textarea')).toBeInTheDocument();
        });
      },
      { timeout: 5000 }
    );
  });
});

