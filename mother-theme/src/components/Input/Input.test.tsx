import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { createUserEvent } from '../../test/utils';
import { Search } from 'lucide-react';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input without label', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render input with label', () => {
      render(<Input label="Username" />);
      
      const label = screen.getByText('Username');
      const input = screen.getByLabelText('Username');
      
      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('should associate label with input', () => {
      render(<Input label="Username" id="test-input" />);
      
      const label = screen.getByText('Username');
      const input = screen.getByLabelText('Username');
      
      expect(label).toHaveAttribute('for', 'test-input');
      expect(input).toHaveAttribute('id', 'test-input');
    });
  });

  describe('Controlled Mode', () => {
    it('should respect controlled value prop', () => {
      const { rerender } = render(
        <Input value="value1" onChange={() => {}} />
      );
      
      let input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('value1');
      
      rerender(<Input value="value2" onChange={() => {}} />);
      
      input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('value2');
    });

    it('should call onChange when value changes', async () => {
      const user = createUserEvent();
      const handleChange = vi.fn();
      
      render(<Input value="" onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Uncontrolled Mode', () => {
    it('should use defaultValue', () => {
      render(<Input defaultValue="default" />);
      
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('default');
    });
  });

  describe('Error State', () => {
    it('should show error message when error prop is provided', () => {
      render(<Input error="This field is required" />);
      
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error class when error prop is provided', () => {
      const { container } = render(<Input error="Error" />);
      
      const input = container.querySelector('.input-error');
      expect(input).toBeInTheDocument();
    });

    it('should have aria-invalid when error is provided', () => {
      render(<Input error="Error" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not show helper text when error is shown', () => {
      render(<Input error="Error" helperText="Helper" />);
      
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should show helper text when helperText prop is provided', () => {
      render(<Input helperText="Enter your username" />);
      
      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('should not show helper text when error is shown', () => {
      render(<Input error="Error" helperText="Helper" />);
      
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });
  });

  describe('Character Count', () => {
    it('should show character count when showCount and maxLength are provided', () => {
      render(<Input value="test" showCount maxLength={10} onChange={() => {}} />);
      
      expect(screen.getByText('4 / 10')).toBeInTheDocument();
    });

    it('should not show character count when showCount is false', () => {
      render(<Input value="test" maxLength={10} onChange={() => {}} />);
      
      expect(screen.queryByText(/\/ 10/)).not.toBeInTheDocument();
    });

    it('should update character count when value changes', () => {
      const { rerender } = render(
        <Input value="test" showCount maxLength={10} onChange={() => {}} />
      );
      
      expect(screen.getByText('4 / 10')).toBeInTheDocument();
      
      rerender(<Input value="testing" showCount maxLength={10} onChange={() => {}} />);
      
      expect(screen.getByText('7 / 10')).toBeInTheDocument();
    });
  });

  describe('Icon Support', () => {
    it('should show icon when icon prop is provided', () => {
      render(<Input icon={Search} />);
      
      const icon = screen.getByRole('textbox').parentElement?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should adjust padding when icon is provided', () => {
      const { container } = render(<Input icon={Search} />);
      
      const input = container.querySelector('.input') as HTMLElement;
      expect(input.style.paddingLeft).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-describedby when error is provided', () => {
      render(<Input error="Error" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('should have proper aria-describedby when helperText is provided', () => {
      render(<Input helperText="Helper" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('should have proper aria-describedby when showCount is provided', () => {
      render(<Input showCount maxLength={10} onChange={() => {}} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
    });
  });
});

describe('Textarea', () => {
  describe('Rendering', () => {
    it('should render textarea without label', () => {
      render(<Textarea />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should render textarea with label', () => {
      render(<Textarea label="Description" />);
      
      const label = screen.getByText('Description');
      const textarea = screen.getByLabelText('Description');
      
      expect(label).toBeInTheDocument();
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Controlled Mode', () => {
    it('should respect controlled value prop', () => {
      const { rerender } = render(
        <Textarea value="value1" onChange={() => {}} />
      );
      
      let textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('value1');
      
      rerender(<Textarea value="value2" onChange={() => {}} />);
      
      textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('value2');
    });
  });

  describe('Uncontrolled Mode', () => {
    it('should use defaultValue', () => {
      render(<Textarea defaultValue="default" />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('default');
    });
  });

  describe('Error State', () => {
    it('should show error message when error prop is provided', () => {
      render(<Textarea error="This field is required" />);
      
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error class when error prop is provided', () => {
      const { container } = render(<Textarea error="Error" />);
      
      const textarea = container.querySelector('.textarea-error');
      expect(textarea).toBeInTheDocument();
    });

    it('should have aria-invalid when error is provided', () => {
      render(<Textarea error="Error" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Helper Text', () => {
    it('should show helper text when helperText prop is provided', () => {
      render(<Textarea helperText="Enter your description" />);
      
      expect(screen.getByText('Enter your description')).toBeInTheDocument();
    });
  });

  describe('Character Count', () => {
    it('should show character count when showCount and maxLength are provided', () => {
      render(<Textarea value="test" showCount maxLength={100} onChange={() => {}} />);
      
      expect(screen.getByText('4 / 100')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Textarea disabled />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-describedby when error is provided', () => {
      render(<Textarea error="Error" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby');
    });
  });
});

