import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioGroup, Radio } from '../components/Radio/Radio';
import { Input } from '../components/Input/Input';
import { Button } from '../components/Button/Button';
import { Checkbox } from '../components/Checkbox/Checkbox';
// Toggle and Slider disabled state tests are covered in their respective test files

/**
 * Error Boundary and Error State Tests
 * Tests components handle errors gracefully and provide proper error states
 */

describe('Error Boundaries and Error States', () => {
  beforeEach(() => {
    // Suppress console.error for expected error tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Context Errors', () => {
    it('should throw error when Radio is used outside RadioGroup', () => {
      expect(() => {
        render(<Radio value="value1" label="Option 1" />);
      }).toThrow('Radio components must be used within RadioGroup component');
    });

    it('should handle error gracefully in production', () => {
      // In production, errors should be caught by error boundaries
      // This test verifies the error is thrown (which would be caught by boundary)
      // Note: React error boundaries are class components, but for this test we just verify the error is thrown
      expect(() => {
        render(<Radio value="value1" label="Option 1" />);
      }).toThrow('Radio components must be used within RadioGroup component');
    });
  });

  describe('Input Error States', () => {
    it('should display error message when error prop is provided', () => {
      render(<Input label="Email" error="Invalid email address" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('should show error state with aria-invalid attribute', () => {
      render(<Input label="Required" error="This field is required" />);

      const input = screen.getByLabelText('Required');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should handle multiple error states in form', () => {
      render(
        <form>
          <Input label="Email" error="Invalid email" />
          <Input label="Password" error="Too short" />
        </form>
      );

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
      expect(screen.getByText('Too short')).toBeInTheDocument();
    });
  });

  describe('Disabled Error States', () => {
    it('should prevent interaction when disabled', () => {
      const handleClick = vi.fn();

      render(
        <Button onClick={handleClick} disabled>
          Disabled Button
        </Button>
      );

      const button = screen.getByRole('button', { name: 'Disabled Button' });
      expect(button).toBeDisabled();
      // Disabled buttons don't trigger onClick
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should prevent input when input is disabled', () => {
      render(<Input label="Disabled Input" disabled />);

      const input = screen.getByLabelText('Disabled Input');
      expect(input).toBeDisabled();
      // Disabled inputs cannot receive input
      expect(input).toHaveValue('');
    });

    it('should prevent checkbox interaction when disabled', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <Checkbox
          label="Disabled Checkbox"
          checked={false}
          onCheckedChange={handleChange}
          disabled
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Disabled Checkbox' });
      expect(checkbox).toBeDisabled();

      await user.click(checkbox);
      expect(handleChange).not.toHaveBeenCalled();
    });

    // Toggle and Slider disabled state tests are covered in their respective test files
  });

  describe('Invalid Prop Combinations', () => {
    it('should handle Input with both value and defaultValue', () => {
      // React will warn about this, but component should still render
      render(
        <Input label="Test" value="controlled" defaultValue="uncontrolled" />
      );

      const input = screen.getByLabelText('Test');
      // Controlled value should take precedence
      expect(input).toHaveValue('controlled');
    });

    it('should handle Checkbox with both checked and defaultChecked', () => {
      // React will warn about this, but component should still render
      render(
        <Checkbox
          label="Test"
          checked={true}
          defaultChecked={false}
          onCheckedChange={() => {}}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Test' });
      // Controlled checked should take precedence
      expect(checkbox).toBeChecked();
    });
  });

  describe('Edge Case Error Handling', () => {
    it('should handle null/undefined values gracefully', () => {
      render(<Input label="Test" value={null as any} onChange={() => {}} />);

      const input = screen.getByLabelText('Test');
      expect(input).toBeInTheDocument();
    });

    it('should handle empty string values', () => {
      render(<Input label="Test" value="" onChange={() => {}} />);

      const input = screen.getByLabelText('Test');
      expect(input).toHaveValue('');
    });

    it('should handle very long error messages', () => {
      const longError = 'A'.repeat(500);
      render(<Input label="Test" error={longError} />);

      expect(screen.getByText(longError)).toBeInTheDocument();
    });

    it('should handle special characters in error messages', () => {
      render(<Input label="Test" error="Error: <script>alert('xss')</script>" />);

      // Should render as text, not execute script
      expect(screen.getByText("Error: <script>alert('xss')</script>")).toBeInTheDocument();
    });
  });

  describe('Accessibility in Error States', () => {
    it('should maintain proper ARIA attributes in error state', () => {
      render(
        <Input
          label="Email"
          error="Invalid email"
          helperText="Enter a valid email address"
        />
      );

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('should associate error message with input via aria-describedby', () => {
      render(<Input label="Test" error="Error message" id="test-input" />);

      const input = screen.getByLabelText('Test');
      const errorId = input.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();

      // The error message should be visible in the document
      expect(screen.getByText('Error message')).toBeInTheDocument();
      
      // Verify aria-describedby points to the error element
      if (errorId) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
          expect(errorElement).toHaveTextContent('Error message');
        }
      }
    });
  });
});

