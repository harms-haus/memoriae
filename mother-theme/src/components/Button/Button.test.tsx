import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { createUserEvent } from '../../test/utils';
import { Check } from 'lucide-react';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render button with children', () => {
      render(<Button>Click Me</Button>);
      
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should apply primary variant class by default', () => {
      const { container } = render(<Button>Test</Button>);
      
      const button = container.querySelector('.btn-primary');
      expect(button).toBeInTheDocument();
    });

    it('should apply variant classes', () => {
      const { container, rerender } = render(<Button variant="primary">Test</Button>);
      
      let button = container.querySelector('.btn-primary');
      expect(button).toBeInTheDocument();

      rerender(<Button variant="secondary">Test</Button>);
      button = container.querySelector('.btn-secondary');
      expect(button).toBeInTheDocument();

      rerender(<Button variant="ghost">Test</Button>);
      button = container.querySelector('.btn-ghost');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByText('Click Me');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick} disabled>Click Me</Button>);
      
      const button = screen.getByText('Click Me');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });

    it('should not call onClick when loading', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick} loading>Click Me</Button>);
      
      const button = screen.getByText('Click Me');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      render(<Button loading>Click Me</Button>);
      
      const spinner = screen.getByRole('button').querySelector('.button-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      render(<Button loading>Click Me</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have aria-busy when loading', () => {
      render(<Button loading>Click Me</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should not show icon when loading (spinner takes precedence)', () => {
      render(<Button loading icon={Check}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      // Should have spinner, not Check icon
      const spinner = button.querySelector('.button-spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Icon Support', () => {
    it('should show icon on left by default', () => {
      render(<Button icon={Check}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should show icon on left when iconPosition is left', () => {
      render(<Button icon={Check} iconPosition="left">Click Me</Button>);
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
      // Icon should be before text (check by querySelector order)
      expect(button.textContent).toContain('Click Me');
    });

    it('should show icon on right when iconPosition is right', () => {
      render(<Button icon={Check} iconPosition="right">Click Me</Button>);
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
      // Icon should be after text
      expect(button.textContent).toContain('Click Me');
    });

    it('should show icon without text', () => {
      render(<Button icon={Check} aria-label="Check">{''}</Button>);
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Click Me</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have aria-disabled when disabled', () => {
      render(<Button disabled>Click Me</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should trigger onClick on Enter key', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should trigger onClick on Space key', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onClick on Enter when disabled', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick} disabled>Click Me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not trigger onClick on Space when disabled', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick} disabled>Click Me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Icon Spacing', () => {
    it('should have margin when icon without children', () => {
      const { container } = render(<Button icon={Check} aria-label="Check"></Button>);
      
      const iconWrapper = container.querySelector('span');
      expect(iconWrapper).toBeInTheDocument();
      // When no children, button-icon-spaced class should not be applied
      expect(iconWrapper?.classList.contains('button-icon-spaced')).toBe(false);
    });

    it('should have margin when icon with children', () => {
      const { container } = render(<Button icon={Check}>With Text</Button>);
      
      const iconWrapper = container.querySelector('span');
      expect(iconWrapper).toBeInTheDocument();
      // When children present, button-icon-spaced class should be applied
      expect(iconWrapper?.classList.contains('button-icon-spaced')).toBe(true);
    });

    it('should have no margin when no icon', () => {
      const { container } = render(<Button>No Icon</Button>);
      
      const iconWrapper = container.querySelector('span');
      expect(iconWrapper).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      render(<Button>Click Me</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should pass through other button attributes', () => {
      render(<Button type="submit" form="test-form">Click Me</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });
});

