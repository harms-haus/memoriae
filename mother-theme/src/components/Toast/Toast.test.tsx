import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';

// Component to test toast hook
function TestComponent() {
  const { toast } = useToast();

  return (
    <div>
      <button onClick={() => toast({ message: 'Success!', variant: 'success' })}>
        Show Success
      </button>
      <button onClick={() => toast({ message: 'Error!', variant: 'error' })}>
        Show Error
      </button>
      <button onClick={() => toast({ message: 'Info!', variant: 'info', duration: 0 })}>
        Show Persistent
      </button>
    </div>
  );
}

// Mock createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div>Test Content</div>
        </ToastProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should display toast when triggered', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        await user.click(screen.getByText('Show Success'));
      });
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should display multiple toasts', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        await user.click(screen.getByText('Show Success'));
      });
      await act(async () => {
        await user.click(screen.getByText('Show Error'));
      });

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('should auto-dismiss toast after duration', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        await user.click(screen.getByText('Show Success'));
      });
      expect(screen.getByText('Success!')).toBeInTheDocument();

      // Fast-forward time to trigger auto-dismiss
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Wait for the 300ms animation delay before removal
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // The toast should be removed from DOM
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    });

    it('should not auto-dismiss when duration is 0', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        await user.click(screen.getByText('Show Persistent'));
      });
      expect(screen.getByText('Info!')).toBeInTheDocument();

      // Fast-forward time
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      // Should still be visible
      expect(screen.getByText('Info!')).toBeInTheDocument();
    });

    it('should close toast when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        await user.click(screen.getByText('Show Success'));
      });
      expect(screen.getByText('Success!')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close toast');
      await act(async () => {
        await user.click(closeButton);
      });

      // Wait for the 300ms animation delay before removal
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // The toast should be removed from DOM
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    });

    it('should apply variant classes', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        await user.click(screen.getByText('Show Success'));
      });
      const toast = screen.getByText('Success!').closest('.toast');
      expect(toast).toHaveClass('toast-success');

      await act(async () => {
        await user.click(screen.getByText('Show Error'));
      });
      const errorToast = screen.getByText('Error!').closest('.toast');
      expect(errorToast).toHaveClass('toast-error');
    });
  });
});

