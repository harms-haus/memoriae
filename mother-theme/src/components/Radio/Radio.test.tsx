import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadioGroup, Radio } from './Radio';
import { createUserEvent } from '../../test/utils';

describe('RadioGroup', () => {
  describe('Rendering', () => {
    it('should render radio group with radios', () => {
      render(
        <RadioGroup defaultValue="value1">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Option 1' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Option 2' })).toBeInTheDocument();
    });
  });

  describe('Uncontrolled Mode', () => {
    it('should use defaultValue', () => {
      render(
        <RadioGroup defaultValue="value2">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' }) as HTMLInputElement;
      const radio2 = screen.getByRole('radio', { name: 'Option 2' }) as HTMLInputElement;
      
      expect(radio1.checked).toBe(false);
      expect(radio2.checked).toBe(true);
    });

    it('should select radio when clicked', async () => {
      const user = createUserEvent();
      render(
        <RadioGroup defaultValue="value1">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      const radio2 = screen.getByRole('radio', { name: 'Option 2' });
      await user.click(radio2);
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' }) as HTMLInputElement;
      const radio2Element = screen.getByRole('radio', { name: 'Option 2' }) as HTMLInputElement;
      
      expect(radio1.checked).toBe(false);
      expect(radio2Element.checked).toBe(true);
    });

    it('should deselect other radios when one is selected', async () => {
      const user = createUserEvent();
      render(
        <RadioGroup defaultValue="value1">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
          <Radio value="value3" label="Option 3" />
        </RadioGroup>
      );
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' }) as HTMLInputElement;
      const radio2 = screen.getByRole('radio', { name: 'Option 2' }) as HTMLInputElement;
      const radio3 = screen.getByRole('radio', { name: 'Option 3' }) as HTMLInputElement;
      
      expect(radio1.checked).toBe(true);
      expect(radio2.checked).toBe(false);
      expect(radio3.checked).toBe(false);
      
      await user.click(radio2);
      
      expect(radio1.checked).toBe(false);
      expect(radio2.checked).toBe(true);
      expect(radio3.checked).toBe(false);
    });

    it('should call onValueChange when radio is selected', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(
        <RadioGroup defaultValue="value1" onValueChange={handleChange}>
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      const radio2 = screen.getByRole('radio', { name: 'Option 2' });
      await user.click(radio2);
      
      expect(handleChange).toHaveBeenCalledWith('value2');
    });
  });

  describe('Controlled Mode', () => {
    it('should respect controlled value prop', () => {
      const { rerender } = render(
        <RadioGroup value="value1" onValueChange={() => {}}>
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      let radio1 = screen.getByRole('radio', { name: 'Option 1' }) as HTMLInputElement;
      let radio2 = screen.getByRole('radio', { name: 'Option 2' }) as HTMLInputElement;
      
      expect(radio1.checked).toBe(true);
      expect(radio2.checked).toBe(false);
      
      rerender(
        <RadioGroup value="value2" onValueChange={() => {}}>
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      radio1 = screen.getByRole('radio', { name: 'Option 1' }) as HTMLInputElement;
      radio2 = screen.getByRole('radio', { name: 'Option 2' }) as HTMLInputElement;
      
      expect(radio1.checked).toBe(false);
      expect(radio2.checked).toBe(true);
    });

    it('should call onValueChange when radio is clicked', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(
        <RadioGroup value="value1" onValueChange={handleChange}>
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      const radio2 = screen.getByRole('radio', { name: 'Option 2' });
      await user.click(radio2);
      
      expect(handleChange).toHaveBeenCalledWith('value2');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate with ArrowRight key', async () => {
      const user = createUserEvent();
      render(
        <RadioGroup defaultValue="value1">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
          <Radio value="value3" label="Option 3" />
        </RadioGroup>
      );
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' });
      radio1.focus();
      
      await user.keyboard('{ArrowRight}');
      
      const radio2 = screen.getByRole('radio', { name: 'Option 2' });
      expect(radio2).toHaveFocus();
      expect((radio2 as HTMLInputElement).checked).toBe(true);
    });

    it('should navigate with ArrowLeft key', async () => {
      const user = createUserEvent();
      render(
        <RadioGroup defaultValue="value2">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
          <Radio value="value3" label="Option 3" />
        </RadioGroup>
      );
      
      const radio2 = screen.getByRole('radio', { name: 'Option 2' });
      radio2.focus();
      
      await user.keyboard('{ArrowLeft}');
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' });
      expect(radio1).toHaveFocus();
      expect((radio1 as HTMLInputElement).checked).toBe(true);
    });

    it('should navigate with ArrowDown key', async () => {
      const user = createUserEvent();
      render(
        <RadioGroup defaultValue="value1">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' });
      radio1.focus();
      
      await user.keyboard('{ArrowDown}');
      
      const radio2 = screen.getByRole('radio', { name: 'Option 2' });
      expect(radio2).toHaveFocus();
    });

    it('should navigate with ArrowUp key', async () => {
      const user = createUserEvent();
      render(
        <RadioGroup defaultValue="value2">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      const radio2 = screen.getByRole('radio', { name: 'Option 2' });
      radio2.focus();
      
      await user.keyboard('{ArrowUp}');
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' });
      expect(radio1).toHaveFocus();
    });
  });

  describe('Disabled State', () => {
    it('should not respond to clicks when disabled', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(
        <RadioGroup defaultValue="value1" onValueChange={handleChange}>
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" disabled />
        </RadioGroup>
      );
      
      const radio2 = screen.getByRole('radio', { name: 'Option 2' });
      expect(radio2).toBeDisabled();
      
      await user.click(radio2);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <RadioGroup defaultValue="value1">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' });
      expect(radio1).toHaveAttribute('aria-checked', 'true');
      
      const radio2 = screen.getByRole('radio', { name: 'Option 2' });
      expect(radio2).toHaveAttribute('aria-checked', 'false');
    });

    it('should group radios with same name attribute', () => {
      render(
        <RadioGroup name="test-group">
          <Radio value="value1" label="Option 1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' }) as HTMLInputElement;
      const radio2 = screen.getByRole('radio', { name: 'Option 2' }) as HTMLInputElement;
      
      expect(radio1.name).toBe('test-group');
      expect(radio2.name).toBe('test-group');
      expect(radio1.name).toBe(radio2.name);
    });

    it('should associate labels with radios', () => {
      render(
        <RadioGroup>
          <Radio value="value1" label="Option 1" id="radio-1" />
          <Radio value="value2" label="Option 2" />
        </RadioGroup>
      );
      
      const radio1 = screen.getByRole('radio', { name: 'Option 1' });
      const label1 = screen.getByText('Option 1');
      
      expect(radio1).toHaveAttribute('id', 'radio-1');
      expect(label1).toHaveAttribute('for', 'radio-1');
    });
  });
});

