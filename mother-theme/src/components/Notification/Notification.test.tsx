import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Notification } from './Notification';

describe('Notification', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render title and message', () => {
      render(
        <Notification
          title="Test Title"
          message="Test Message"
          onClose={() => {}}
        />
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('should render with variant classes', () => {
      const { rerender } = render(
        <Notification
          title="Test Success"
          message="Test Message"
          variant="success"
          onClose={() => {}}
        />
      );

      const notification = screen.getByText('Test Success').closest('.notification');
      expect(notification).toHaveClass('notification-success');

      rerender(
        <Notification
          title="Test Error"
          message="Test Message"
          variant="error"
          onClose={() => {}}
        />
      );

      const errorNotification = screen.getByText('Test Error').closest('.notification');
      expect(errorNotification).toHaveClass('notification-error');
    });

    it('should render action buttons', () => {
      const handleAction = vi.fn();
      render(
        <Notification
          title="Test"
          message="Test"
          actions={[
            { label: 'Action 1', onClick: handleAction },
            { label: 'Action 2', onClick: () => {} },
          ]}
          onClose={() => {}}
        />
      );

      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
    });

    it('should call action onClick when action button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const handleAction = vi.fn();
      render(
        <Notification
          title="Test"
          message="Test"
          actions={[{ label: 'Action', onClick: handleAction }]}
          onClose={() => {}}
        />
      );

      await user.click(screen.getByText('Action'));
      expect(handleAction).toHaveBeenCalled();
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after duration', async () => {
      const onClose = vi.fn();
      
      await act(async () => {
        render(
          <Notification
            title="Auto Dismiss Test"
            message="Test Message"
            duration={5000}
            onClose={onClose}
          />
        );
      });

      expect(screen.getByText('Auto Dismiss Test')).toBeInTheDocument();

      // Advance by the full duration (5000ms) to trigger the setTimeout
      // This will set isVisible to false and schedule onClose after 300ms
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Now advance by the animation delay (300ms) to trigger onClose
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // onClose should be called after the full duration + animation delay
      expect(onClose).toHaveBeenCalled();
    });

    it('should not auto-dismiss when duration is 0', async () => {
      const onClose = vi.fn();
      
      await act(async () => {
        render(
          <Notification
            title="No Auto Dismiss Test"
            message="Test Message"
            duration={0}
            onClose={onClose}
          />
        );
      });

      expect(screen.getByText('No Auto Dismiss Test')).toBeInTheDocument();

      // Fast-forward time - should not trigger dismissal since duration is 0
      // When duration is 0, the useEffect returns early and no timers are set
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      // Should still be visible and onClose not called
      expect(screen.getByText('No Auto Dismiss Test')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Manual Close', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();
      await act(async () => {
        render(
          <Notification
            title="Test"
            message="Test"
            onClose={onClose}
          />
        );
      });

      // Advance timers to ensure component initializes
      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      const closeButton = screen.getByLabelText('Close notification');
      await act(async () => {
        await user.click(closeButton);
      });

      // Wait for the 300ms animation delay before onClose is called
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // onClose should be called after the 300ms delay
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Timer Progress', () => {
    it('should render timer when duration > 0', () => {
      const { container } = render(
        <Notification
          title="Test"
          message="Test"
          duration={5000}
          onClose={() => {}}
        />
      );

      // Timer should render immediately when duration > 0
      const timer = container.querySelector('.notification-timer');
      expect(timer).toBeInTheDocument();
    });

    it('should not render timer when duration is 0', () => {
      const { container } = render(
        <Notification
          title="Test"
          message="Test"
          duration={0}
          onClose={() => {}}
        />
      );

      const timer = container.querySelector('.notification-timer');
      expect(timer).not.toBeInTheDocument();
    });
  });
});

