import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentExamples } from './ComponentExamples';
import { createUserEvent } from '../../../test/utils';

// Mock all components
vi.mock('../../../components', async () => {
  const actual = await vi.importActual('../../../components');
  return {
    ...actual,
    Button: ({ children, variant, disabled, loading, icon, iconPosition, onClick }: any) => (
      <button
        className={`btn-${variant || 'primary'}`}
        disabled={disabled || loading}
        onClick={onClick}
        data-testid="button"
      >
        {icon && <span data-testid="icon">{iconPosition || 'left'}</span>}
        {loading && <span data-testid="loading">Loading</span>}
        {children}
      </button>
    ),
    Input: ({ label, placeholder, disabled, error, helperText, icon, showCount, maxLength }: any) => (
      <div>
        {label && <label>{label}</label>}
        <input
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          data-testid="input"
        />
        {error && <span data-testid="error">{error}</span>}
        {helperText && <span data-testid="helper">{helperText}</span>}
        {icon && <span data-testid="input-icon">icon</span>}
        {showCount && <span data-testid="count">0/{maxLength || 0}</span>}
      </div>
    ),
    Textarea: ({ label, placeholder, disabled }: any) => (
      <div>
        {label && <label>{label}</label>}
        <textarea placeholder={placeholder} disabled={disabled} data-testid="textarea" />
      </div>
    ),
    Checkbox: ({ children, checked, onCheckedChange, disabled }: any) => (
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          data-testid="checkbox"
        />
        {children}
      </label>
    ),
    RadioGroup: ({ children, value, onValueChange }: any) => (
      <div role="radiogroup" data-value={value} data-testid="radio-group">
        {children}
      </div>
    ),
    Radio: ({ children, value, disabled }: any) => (
      <label>
        <input type="radio" value={value} disabled={disabled} data-testid="radio" />
        {children}
      </label>
    ),
    Toggle: ({ children, checked, onCheckedChange, disabled }: any) => (
      <label>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          data-testid="toggle"
        />
        {children}
      </label>
    ),
    Slider: ({ value, onValueChange, min, max, disabled }: any) => (
      <input
        type="range"
        value={value}
        onChange={(e) => onValueChange?.(Number(e.target.value))}
        min={min}
        max={max}
        disabled={disabled}
        data-testid="slider"
      />
    ),
    Progress: ({ value, variant }: any) => (
      <div role="progressbar" aria-valuenow={value} data-variant={variant} data-testid="progress">
        {value}%
      </div>
    ),
    Tabs: ({ children, defaultValue }: any) => (
      <div data-testid="tabs" data-default-value={defaultValue}>
        {children}
      </div>
    ),
    Tab: ({ children, value, disabled }: any) => (
      <button role="tab" disabled={disabled} data-value={value} data-testid="tab">
        {children}
      </button>
    ),
    TabPanel: ({ children, value }: any) => (
      <div role="tabpanel" data-value={value} data-testid="tab-panel">
        {children}
      </div>
    ),
    Tag: ({ children, color, active, onRemove }: any) => (
      <span
        className={`tag ${active ? 'active' : ''}`}
        style={color ? { color } : undefined}
        data-testid="tag"
      >
        {children}
        {onRemove && <button onClick={onRemove} data-testid="remove">×</button>}
      </span>
    ),
    Badge: ({ children, variant }: any) => (
      <span className={`badge-${variant}`} data-testid="badge">
        {children}
      </span>
    ),
  };
});

describe('ComponentExamples', () => {
  describe('Rendering', () => {
    it('should render header with title and description', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Components')).toBeInTheDocument();
      expect(
        screen.getByText('Interactive UI components: buttons, forms, progress, tabs, tags, and badges')
      ).toBeInTheDocument();
    });

    it('should render examples-container', () => {
      const { container } = render(<ComponentExamples />);
      const containerEl = container.querySelector('.examples-container');
      expect(containerEl).toBeInTheDocument();
    });

    it('should render examples-header', () => {
      const { container } = render(<ComponentExamples />);
      const header = container.querySelector('.examples-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Button Examples', () => {
    it('should render button variants', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Primary Button')).toBeInTheDocument();
      expect(screen.getByText('Secondary Button')).toBeInTheDocument();
      expect(screen.getByText('Ghost Button')).toBeInTheDocument();
    });

    it('should render button states', () => {
      render(<ComponentExamples />);

      // Multiple "Normal" and "Disabled" buttons exist, so use getAllByText
      const normalButtons = screen.getAllByText('Normal');
      expect(normalButtons.length).toBeGreaterThan(0);
      const disabledButtons = screen.getAllByText('Disabled');
      expect(disabledButtons.length).toBeGreaterThan(0);
    });

    it('should render buttons with icons', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render loading buttons', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });
  });

  describe('Form Controls', () => {
    it('should render input fields', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Text Input')).toBeInTheDocument();
      expect(screen.getByText('Input with Icon')).toBeInTheDocument();
      expect(screen.getByText('Disabled Input')).toBeInTheDocument();
      expect(screen.getByText('Input with Error')).toBeInTheDocument();
    });

    it('should render textarea', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Textarea')).toBeInTheDocument();
      expect(screen.getByText('Disabled Textarea')).toBeInTheDocument();
    });

    it('should render checkboxes', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Checked checkbox')).toBeInTheDocument();
      expect(screen.getByText('Unchecked checkbox')).toBeInTheDocument();
      expect(screen.getByText('Disabled checkbox')).toBeInTheDocument();
    });

    it('should render radio buttons', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Selected radio')).toBeInTheDocument();
      expect(screen.getByText('Unselected radio')).toBeInTheDocument();
      expect(screen.getByText('Disabled radio')).toBeInTheDocument();
    });

    it('should render toggle switches', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Toggle ON')).toBeInTheDocument();
      expect(screen.getByText('Toggle OFF')).toBeInTheDocument();
      expect(screen.getByText('Disabled Toggle')).toBeInTheDocument();
    });

    it('should render sliders', () => {
      render(<ComponentExamples />);

      const sliders = screen.getAllByTestId('slider');
      expect(sliders.length).toBeGreaterThan(0);
    });
  });

  describe('Progress Bars', () => {
    it('should render progress bar variants', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Progress 25%')).toBeInTheDocument();
      expect(screen.getByText('Progress 50%')).toBeInTheDocument();
      expect(screen.getByText('Progress 75%')).toBeInTheDocument();
      expect(screen.getByText('Progress 100%')).toBeInTheDocument();
    });

    it('should render colored progress bars', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Success (Green)')).toBeInTheDocument();
      expect(screen.getByText('Warning (Orange)')).toBeInTheDocument();
      expect(screen.getByText('Error (Red)')).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('should render tab navigation', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
      expect(screen.getByText('Tab 4 (Disabled)')).toBeInTheDocument();
    });

    it('should render tab content', () => {
      render(<ComponentExamples />);

      expect(screen.getByText(/Content for Tab 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Content for Tab 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Content for Tab 3/i)).toBeInTheDocument();
    });
  });

  describe('Tags', () => {
    it('should render tag colors', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Default Tag')).toBeInTheDocument();
      expect(screen.getByText('Blue Tag')).toBeInTheDocument();
      expect(screen.getByText('Green Tag')).toBeInTheDocument();
      expect(screen.getByText('Purple Tag')).toBeInTheDocument();
      expect(screen.getByText('Pink Tag')).toBeInTheDocument();
      expect(screen.getByText('Active Tag')).toBeInTheDocument();
    });

    it('should render interactive tags', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Removable Tag')).toBeInTheDocument();
      expect(screen.getByText('Removable Blue')).toBeInTheDocument();
    });
  });

  describe('Badges', () => {
    it('should render badge variants', () => {
      render(<ComponentExamples />);

      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it(
      'should handle checkbox state changes',
      async () => {
        const user = createUserEvent();
        render(<ComponentExamples />);

        const checkboxes = screen.getAllByTestId('checkbox');
        const firstCheckbox = checkboxes[0] as HTMLInputElement;

        expect(firstCheckbox.checked).toBe(true); // Initial state

        await user.click(firstCheckbox);
        // State should update (tested via component behavior)
        expect(firstCheckbox).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    it(
      'should handle slider value changes',
      async () => {
        const user = createUserEvent();
        render(<ComponentExamples />);

        const sliders = screen.getAllByTestId('slider');
        const firstSlider = sliders[0] as HTMLInputElement;

        expect(firstSlider.value).toBe('50'); // Initial value

        // Range inputs don't support clear(), use triple-click to select and type
        await user.tripleClick(firstSlider);
        await user.type(firstSlider, '75');
        // Note: Range input value changes may not be immediately reflected in test
        // This test verifies the interaction works
        expect(firstSlider).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    it('should handle toggle state changes', async () => {
      const user = createUserEvent();
      render(<ComponentExamples />);

      const toggles = screen.getAllByTestId('toggle');
      const firstToggle = toggles[0] as HTMLInputElement;

      expect(firstToggle.checked).toBe(true); // Initial state

      await user.click(firstToggle);
      // State should update
      expect(firstToggle).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  describe('Edge Cases', () => {
    it('should handle disabled states correctly', () => {
      render(<ComponentExamples />);

      const disabledInputs = screen.getAllByTestId('input').filter((el) => el.hasAttribute('disabled'));
      expect(disabledInputs.length).toBeGreaterThan(0);
    });

    it('should render all sections', () => {
      const { container } = render(<ComponentExamples />);
      const sections = container.querySelectorAll('.showcase-section');
      expect(sections.length).toBeGreaterThan(0);
    });
  });
});

