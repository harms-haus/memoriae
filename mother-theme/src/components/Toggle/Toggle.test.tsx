import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Toggle } from './Toggle';
import { createUserEvent } from '../../test/utils';

describe('Toggle', () => {
  describe('Rendering', () => {
    it('should render toggle with label', () => {
      render(<Toggle label="Test Label" />);
      
      const toggle = screen.getByRole('switch');
      const label = screen.getByText('Test Label');
      
      expect(toggle).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });

    it('should render toggle with children as label', () => {
      render(<Toggle>Custom Label</Toggle>);
      
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should render toggle without label', () => {
      render(<Toggle />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
    });
  });

  describe('Uncontrolled Mode', () => {
    it('should use defaultChecked value', () => {
      render(<Toggle defaultChecked={true} label="Test" />);
      
      const toggle = screen.getByRole('switch') as HTMLInputElement;
      expect(toggle.checked).toBe(true);
    });

    it('should toggle when clicked', async () => {
      const user = createUserEvent();
      render(<Toggle defaultChecked={false} label="Test" />);
      
      const toggle = screen.getByRole('switch') as HTMLInputElement;
      expect(toggle.checked).toBe(false);
      
      await user.click(toggle);
      expect(toggle.checked).toBe(true);
      
      await user.click(toggle);
      expect(toggle.checked).toBe(false);
    });

    it('should call onCheckedChange when toggled', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Toggle defaultChecked={false} onCheckedChange={handleChange} label="Test" />);
      
      const toggle = screen.getByRole('switch');
      await user.click(toggle);
      
      expect(handleChange).toHaveBeenCalledWith(true);
      
      await user.click(toggle);
      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Controlled Mode', () => {
    it('should respect controlled checked prop', () => {
      const { rerender } = render(
        <Toggle checked={false} onCheckedChange={() => {}} label="Test" />
      );
      
      let toggle = screen.getByRole('switch') as HTMLInputElement;
      expect(toggle.checked).toBe(false);
      
      rerender(<Toggle checked={true} onCheckedChange={() => {}} label="Test" />);
      
      toggle = screen.getByRole('switch') as HTMLInputElement;
      expect(toggle.checked).toBe(true);
    });

    it('should call onCheckedChange when clicked', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Toggle checked={false} onCheckedChange={handleChange} label="Test" />);
      
      const toggle = screen.getByRole('switch');
      await user.click(toggle);
      
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Label Click Handling', () => {
    it('should toggle when label is clicked', async () => {
      const handleChange = vi.fn();
      
      render(<Toggle defaultChecked={false} onCheckedChange={handleChange} label="Test Label" />);
      
      const toggle = screen.getByRole('switch') as HTMLInputElement;
      expect(toggle.checked).toBe(false);
      
      const label = screen.getByText('Test Label');
      // Click the label - htmlFor should trigger input click, or onClick handler will
      fireEvent.click(label);
      
      // Wait for onChange to be called
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(true);
      });
      
      // Re-query to get updated state
      const updatedToggle = screen.getByRole('switch') as HTMLInputElement;
      expect(updatedToggle.checked).toBe(true);
    });
  });

  describe('Disabled State', () => {
    it('should not respond to clicks when disabled', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Toggle disabled defaultChecked={false} onCheckedChange={handleChange} label="Test" />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
      
      await user.click(toggle);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should not toggle when label is clicked and disabled', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Toggle disabled defaultChecked={false} onCheckedChange={handleChange} label="Test Label" />);
      
      const label = screen.getByText('Test Label');
      await user.click(label);
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Toggle label="Test Label" defaultChecked={true} />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('role', 'switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect(toggle).toHaveAttribute('aria-labelledby');
    });

    it('should associate label with toggle', () => {
      render(<Toggle label="Test Label" id="test-toggle" />);
      
      const toggle = screen.getByRole('switch');
      const label = screen.getByText('Test Label');
      
      expect(toggle).toHaveAttribute('id', 'test-toggle');
      expect(label).toHaveAttribute('for', 'test-toggle');
      expect(toggle).toHaveAttribute('aria-labelledby', label.getAttribute('id'));
    });

    it('should have proper checked state in ARIA', () => {
      const { rerender } = render(<Toggle label="Test" checked={false} onCheckedChange={() => {}} />);
      
      let toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      
      rerender(<Toggle label="Test" checked={true} onCheckedChange={() => {}} />);
      
      toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });
});

