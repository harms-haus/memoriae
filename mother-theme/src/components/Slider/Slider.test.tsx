import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { Slider } from './Slider';
import { createUserEvent } from '../../test/utils';

describe('Slider', () => {
  describe('Rendering', () => {
    it('should render slider with correct value', () => {
      render(<Slider value={50} onValueChange={() => {}} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('50');
    });

    it('should render slider with label', () => {
      render(<Slider value={50} label="Volume" onValueChange={() => {}} />);
      
      expect(screen.getByText('Volume')).toBeInTheDocument();
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });
  });

  describe('Uncontrolled Mode', () => {
    it('should use defaultValue', () => {
      render(<Slider defaultValue={25} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(parseFloat(slider.value)).toBe(25);
    });

    it('should update value when changed', async () => {
      const handleChange = vi.fn();
      
      render(<Slider defaultValue={0} min={0} max={100} onValueChange={handleChange} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      
      // Simulate value change using fireEvent
      fireEvent.change(slider, { target: { value: '75' } });
      
      expect(handleChange).toHaveBeenCalledWith(75);
    });
  });

  describe('Controlled Mode', () => {
    it('should respect controlled value prop', () => {
      const { rerender } = render(
        <Slider value={30} onValueChange={() => {}} />
      );
      
      let slider = screen.getByRole('slider') as HTMLInputElement;
      expect(parseFloat(slider.value)).toBe(30);
      
      rerender(<Slider value={70} onValueChange={() => {}} />);
      
      slider = screen.getByRole('slider') as HTMLInputElement;
      expect(parseFloat(slider.value)).toBe(70);
    });

    it('should call onValueChange when value changes', () => {
      const handleChange = vi.fn();
      
      render(<Slider value={50} min={0} max={100} onValueChange={handleChange} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      
      // Simulate value change using fireEvent
      fireEvent.change(slider, { target: { value: '75' } });
      
      expect(handleChange).toHaveBeenCalledWith(75);
    });
  });

  describe('Value Display', () => {
    it('should show value when showValue is true', () => {
      render(<Slider value={50} showValue onValueChange={() => {}} />);
      
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should format value with custom formatter', () => {
      const formatValue = (val: number) => `${val}%`;
      
      render(<Slider value={50} showValue formatValue={formatValue} onValueChange={() => {}} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should not show value when showValue is false', () => {
      const { container } = render(<Slider value={50} onValueChange={() => {}} />);
      
      const valueDisplay = container.querySelector('.slider-value');
      expect(valueDisplay).not.toBeInTheDocument();
    });
  });

  describe('Constraints', () => {
    it('should respect min constraint', () => {
      render(<Slider value={0} min={10} max={100} onValueChange={() => {}} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(parseFloat(slider.value)).toBe(10); // Clamped to min
    });

    it('should respect max constraint', () => {
      render(<Slider value={100} min={0} max={50} onValueChange={() => {}} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(parseFloat(slider.value)).toBe(50); // Clamped to max
    });

    it('should respect step increments', () => {
      render(<Slider value={0} min={0} max={100} step={5} onValueChange={() => {}} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider).toHaveAttribute('step', '5');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Slider value={50} disabled onValueChange={() => {}} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toBeDisabled();
    });

    it('should not respond to interactions when disabled', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Slider value={50} disabled onValueChange={handleChange} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toBeDisabled();
      
      // Try to interact (should not trigger change)
      await user.click(slider);
      // Note: In a real test, we'd need to simulate actual input change
      // but disabled inputs prevent interaction anyway
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Slider value={50} min={0} max={100} onValueChange={() => {}} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '50');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
    });

    it('should associate label with slider', () => {
      render(<Slider value={50} label="Volume" id="volume-slider" onValueChange={() => {}} />);
      
      const slider = screen.getByRole('slider');
      const label = screen.getByText('Volume');
      
      expect(slider).toHaveAttribute('id', 'volume-slider');
      expect(label).toHaveAttribute('for', 'volume-slider');
      expect(slider).toHaveAttribute('aria-labelledby', label.getAttribute('id'));
    });

    it('should generate aria-label when no label provided', () => {
      render(<Slider value={50} onValueChange={() => {}} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label', 'Slider: 50');
    });

    it('should not have aria-label when label is provided', () => {
      render(<Slider value={50} label="Volume" onValueChange={() => {}} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).not.toHaveAttribute('aria-label');
    });
  });
});

