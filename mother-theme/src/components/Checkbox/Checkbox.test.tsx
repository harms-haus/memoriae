import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Checkbox } from './Checkbox';
import { createUserEvent } from '../../test/utils';

describe('Checkbox', () => {
  describe('Rendering', () => {
    it('should render checkbox with label', () => {
      render(<Checkbox label="Test Label" />);
      
      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('Test Label');
      
      expect(checkbox).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });

    it('should render checkbox with children as label', () => {
      render(<Checkbox>Custom Label</Checkbox>);
      
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should render checkbox without label', () => {
      render(<Checkbox />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('Uncontrolled Mode', () => {
    it('should use defaultChecked value', () => {
      render(<Checkbox defaultChecked={true} label="Test" />);
      
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should toggle when clicked', async () => {
      const user = createUserEvent();
      render(<Checkbox defaultChecked={false} label="Test" />);
      
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      
      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);
      
      await user.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('should call onCheckedChange when toggled', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Checkbox defaultChecked={false} onCheckedChange={handleChange} label="Test" />);
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      
      expect(handleChange).toHaveBeenCalledWith(true);
      
      await user.click(checkbox);
      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Controlled Mode', () => {
    it('should respect controlled checked prop', () => {
      const { rerender } = render(
        <Checkbox checked={false} onCheckedChange={() => {}} label="Test" />
      );
      
      let checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      
      rerender(<Checkbox checked={true} onCheckedChange={() => {}} label="Test" />);
      
      checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should call onCheckedChange when clicked', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Checkbox checked={false} onCheckedChange={handleChange} label="Test" />);
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Label Click Handling', () => {
    it('should toggle checkbox when label is clicked', async () => {
      const handleChange = vi.fn();
      
      render(<Checkbox defaultChecked={false} onCheckedChange={handleChange} label="Test Label" />);
      
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      
      const label = screen.getByText('Test Label');
      // Click the label - htmlFor should trigger input click, or onClick handler will
      fireEvent.click(label);
      
      // Wait for onChange to be called
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(true);
      });
      
      // Re-query to get updated state
      const updatedCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(updatedCheckbox.checked).toBe(true);
    });
  });

  describe('Disabled State', () => {
    it('should not respond to clicks when disabled', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Checkbox disabled defaultChecked={false} onCheckedChange={handleChange} label="Test" />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
      
      await user.click(checkbox);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should not toggle when label is clicked and disabled', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Checkbox disabled defaultChecked={false} onCheckedChange={handleChange} label="Test Label" />);
      
      const label = screen.getByText('Test Label');
      await user.click(label);
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Checkbox label="Test Label" defaultChecked={true} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
      expect(checkbox).toHaveAttribute('aria-labelledby');
    });

    it('should associate label with checkbox', () => {
      render(<Checkbox label="Test Label" id="test-checkbox" />);
      
      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('Test Label');
      
      expect(checkbox).toHaveAttribute('id', 'test-checkbox');
      expect(label).toHaveAttribute('for', 'test-checkbox');
      expect(checkbox).toHaveAttribute('aria-labelledby', label.getAttribute('id'));
    });

    it('should have proper checked state in ARIA', () => {
      const { rerender } = render(<Checkbox label="Test" checked={false} onCheckedChange={() => {}} />);
      
      let checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
      
      rerender(<Checkbox label="Test" checked={true} onCheckedChange={() => {}} />);
      
      checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });
  });
});

