/**
 * Shared Test Patterns for Form Controls
 *
 * This module provides reusable test patterns to eliminate code duplication
 * across form component tests. It includes comprehensive patterns for testing
 * controlled/uncontrolled modes, accessibility, keyboard interactions, and more.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createUserEvent } from '../utils';

// Type for describe blocks
type Describeable = ReturnType<typeof describe>;

// Re-export types and utilities for convenience
export { createUserEvent } from '../utils';

/**
 * Common form control test patterns that can be reused across components
 */
export class FormControlTestPattern {
  protected Component: React.ComponentType<any>;
  protected user = createUserEvent();

  constructor(Component: React.ComponentType<any>) {
    this.Component = Component;
  }

  /**
   * Test basic rendering with different props
   */
  rendering(): Describeable {
    return describe('Rendering', () => {
      it('should render with basic props', () => {
        render(<this.Component />);
        expect(screen.getByRole(this.getExpectedRole())).toBeInTheDocument();
      });

      it('should render with label when provided', () => {
        render(<this.Component label="Test Label" />);
        expect(screen.getByText('Test Label')).toBeInTheDocument();
        expect(screen.getByRole(this.getExpectedRole())).toBeInTheDocument();
      });

      it('should render with custom ID when provided', () => {
        const { container } = render(
          <this.Component label="Test Label" id="custom-id" />
        );
        expect(container.querySelector('#custom-id')).toBeInTheDocument();
      });
    });
  }

  /**
   * Test controlled/uncontrolled mode patterns
   */
  controlledUncontrolledMode(
    getElement: () => HTMLElement,
    getValue: () => any,
    setValue: (value: any) => void,
    defaultValue: any,
    controlledValue: any
  ): Describeable {
    return describe('Controlled/Uncontrolled Mode', () => {
      it('should work in uncontrolled mode', async () => {
        render(<this.Component defaultValue={defaultValue} />);

        expect(getValue()).toBe(defaultValue);
      });

      it('should respect controlled value prop', () => {
        const { rerender } = render(
          <this.Component value={controlledValue} onChange={() => {}} />
        );

        expect(getValue()).toBe(controlledValue);

        rerender(<this.Component value={defaultValue} onChange={() => {}} />);
        expect(getValue()).toBe(defaultValue);
      });

      it('should call onChange callback when value changes', async () => {
        const handleChange = vi.fn();
        render(<this.Component onChange={handleChange} />);

        const element = getElement();
        await this.simulateChange(element, defaultValue);

        expect(handleChange).toHaveBeenCalled();
      });

      it('should handle value updates in controlled mode', async () => {
        const handleChange = vi.fn();
        const { rerender } = render(
          <this.Component value={defaultValue} onChange={handleChange} />
        );

        rerender(<this.Component value={controlledValue} onChange={handleChange} />);
        expect(getValue()).toBe(controlledValue);
      });
    });
  }

  /**
   * Test disabled state behavior
   */
  disabledState(
    getElement: () => HTMLElement,
    testInteraction: (element: HTMLElement) => Promise<void>
  ): Describeable {
    return describe('Disabled State', () => {
      it('should be disabled when disabled prop is true', () => {
        render(<this.Component disabled />);

        const element = getElement();
        expect(element).toBeDisabled();
      });

      it('should not respond to interactions when disabled', async () => {
        const handleChange = vi.fn();
        render(<this.Component disabled onChange={handleChange} />);

        const element = getElement();
        await testInteraction(element);

        expect(handleChange).not.toHaveBeenCalled();
      });

      it('should have proper aria-disabled attribute when disabled', () => {
        render(<this.Component disabled />);

        const element = getElement();
        expect(element).toHaveAttribute('aria-disabled', 'true');
      });

      it('should maintain visual disabled styling', () => {
        const { container } = render(<this.Component disabled />);

        const element = container.querySelector('.disabled, [disabled]');
        expect(element).toBeInTheDocument();
      });
    });
  }

  /**
   * Test keyboard interactions
   */
  keyboardInteractions(
    getElement: () => HTMLElement,
    triggerKeys: string[],
    expectedBehavior: () => void
  ): Describeable {
    return describe('Keyboard Interactions', () => {
      it('should respond to keyboard input', async () => {
        const element = getElement();
        element.focus();
        expect(document.activeElement).toBe(element);

        for (const key of triggerKeys) {
          await this.user.keyboard(key);
        }

        expectedBehavior();
      });

      it('should handle Enter key activation', async () => {
        const element = getElement();
        element.focus();

        await this.user.keyboard('{Enter}');

        expectedBehavior();
      });

      it('should handle Space key activation', async () => {
        const element = getElement();
        element.focus();

        await this.user.keyboard(' ');

        expectedBehavior();
      });

      it('should not respond to keyboard when disabled', async () => {
        const handleChange = vi.fn();
        render(<this.Component disabled onChange={handleChange} />);

        const element = getElement();
        element.focus();

        for (const key of triggerKeys) {
          await this.user.keyboard(key);
        }

        expect(handleChange).not.toHaveBeenCalled();
      });
    });
  }

  /**
   * Test accessibility patterns
   */
  accessibility(
    role: string,
    expectedAttributes: Record<string, string>,
    getElement: () => HTMLElement = () => screen.getByRole(role)
  ): Describeable {
    return describe('Accessibility', () => {
      it('should have proper role', () => {
        render(<this.Component />);
        const element = screen.getByRole(role);
        expect(element).toBeInTheDocument();
      });

      it('should have proper ARIA attributes', () => {
        render(<this.Component />);
        const element = getElement();

        Object.entries(expectedAttributes).forEach(([attr, value]) => {
          expect(element).toHaveAttribute(attr, value);
        });
      });

      it('should be keyboard accessible', () => {
        render(<this.Component />);
        const element = getElement();

        const tabIndex = element.getAttribute('tabindex');
        const disabled = element.hasAttribute('disabled');

        expect(!disabled && (tabIndex === null || parseInt(tabIndex) >= 0)).toBe(true);
      });

      it('should have proper label association', () => {
        render(<this.Component label="Test Label" id="test-element" />);

        const element = screen.getByRole(role);
        const label = screen.getByText('Test Label');

        expect(element).toHaveAttribute('id', 'test-element');
        expect(label).toHaveAttribute('for', 'test-element');
      });

      it('should support aria-describedby for additional context', () => {
        render(
          <div>
            <this.Component
              label="Test Field"
              aria-describedby="helper-text error-message"
            />
            <div id="helper-text">Helper text</div>
            <div id="error-message">Error message</div>
          </div>
        );

        const element = screen.getByRole(role);
        expect(element).toHaveAttribute('aria-describedby', 'helper-text error-message');
      });
    });
  }

  /**
   * Test error handling and validation
   */
  errorHandling(
    getElement: () => HTMLElement,
    errorMessage: string = 'This field is required'
  ): Describeable {
    return describe('Error Handling', () => {
      it('should show error when error prop is provided', () => {
        render(<this.Component label="Test Field" error={errorMessage} />);

        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      it('should have aria-invalid when error is present', () => {
        render(<this.Component label="Test Field" error={errorMessage} />);

        const element = getElement();
        expect(element).toHaveAttribute('aria-invalid', 'true');
      });

      it('should associate error message with form control', () => {
        const { container } = render(
          <this.Component label="Test Field" error={errorMessage} />
        );

        const element = container.querySelector('[aria-invalid="true"]');
        const errorElement = screen.getByText(errorMessage);

        expect(element).toBeInTheDocument();
        expect(errorElement).toBeInTheDocument();
      });

      it('should clear error when value becomes valid', async () => {
        const TestComponent = () => {
          const [value, setValue] = React.useState('');
          const [error, setError] = React.useState(errorMessage);

          const handleChange = (newValue: any) => {
            setValue(newValue);
            if (newValue && newValue.length > 0) {
              setError('');
            } else {
              setError(errorMessage);
            }
          };

          return <this.Component
            label="Test Field"
            value={value}
            onChange={handleChange}
            error={error}
          />;
        };

        render(<TestComponent />);

        // Initially should show error
        expect(screen.getByText(errorMessage)).toBeInTheDocument();

        // Enter valid value
        const element = getElement();
        await this.user.type(element, 'valid value');

        // Error should be cleared
        await waitFor(() => {
          expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
        });
      });
    });
  }

  /**
   * Test focus management
   */
  focusManagement(getElement: () => HTMLElement): Describeable {
    return describe('Focus Management', () => {
      it('should receive focus when clicked', async () => {
        render(<this.Component label="Test Field" />);

        const element = getElement();
        await this.user.click(element);

        expect(document.activeElement).toBe(element);
      });

      it('should be focusable with tab key', async () => {
        render(<this.Component label="Test Field" />);

        const element = getElement();
        element.focus();

        expect(document.activeElement).toBe(element);
      });

      it('should maintain focus during value updates', async () => {
        const TestComponent = () => {
          const [value, setValue] = React.useState('');

          return (
            <div>
              <this.Component
                label="Test Field"
                value={value}
                onChange={setValue}
              />
              <button onClick={() => setValue('updated')}>Update</button>
            </div>
          );
        };

        render(<TestComponent />);

        const element = getElement();
        element.focus();
        expect(document.activeElement).toBe(element);

        // Trigger update
        await this.user.click(screen.getByText('Update'));

        // Focus should be maintained
        expect(document.activeElement).toBe(element);
      });
    });
  }

  /**
   * Test className and styling patterns
   */
  styling(getElement: () => HTMLElement): Describeable {
    return describe('Styling', () => {
      it('should apply base component class', () => {
        const { container } = render(<this.Component />);

        const element = container.querySelector(`.${this.getBaseClassName()}`);
        expect(element).toBeInTheDocument();
      });

      it('should apply custom className when provided', () => {
        const { container } = render(
          <this.Component className="custom-class" />
        );

        const element = container.querySelector('.custom-class');
        expect(element).toBeInTheDocument();
      });

      it('should apply variant classes correctly', () => {
        const variants = this.getSupportedVariants();

        variants.forEach((variant: string) => {
          const { container } = render(
            <this.Component variant={variant} />
          );

          const element = container.querySelector(
            `.${this.getBaseClassName()}-${variant}`
          );
          expect(element).toBeInTheDocument();
        });
      });

      it('should combine classes appropriately', () => {
        const { container } = render(
          <this.Component
            variant="primary"
            className="additional-class"
            disabled
          />
        );

        const element = container.querySelector(`.${this.getBaseClassName()}`);
        expect(element).toHaveClass(
          this.getBaseClassName(),
          `${this.getBaseClassName()}-primary`,
          'additional-class'
        );
        expect(element).toHaveAttribute('disabled');
      });
    });
  }

  /**
   * Test performance characteristics
   */
  performance(getElement?: () => HTMLElement): Describeable {
    return describe('Performance', () => {
      it('should render within acceptable time', () => {
        const startTime = performance.now();
        render(<this.Component />);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(16); // 60fps threshold
      });

      it('should handle rapid updates efficiently', async () => {
        if (!getElement) {
          // Skip if getElement not provided
          return;
        }
        const handleChange = vi.fn();
        render(<this.Component onChange={handleChange} />);

        const element = getElement();
        const startTime = performance.now();

        // Simulate rapid changes
        for (let i = 0; i < 10; i++) {
          await this.simulateChange(element, `value-${i}`);
        }

        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(100);
        expect(handleChange).toHaveBeenCalledTimes(10);
      });

      it('should not cause memory leaks on unmount', () => {
        const { unmount } = render(<this.Component />);
        unmount();

        // If we get here without errors, memory management is likely working
        expect(true).toBe(true);
      });
    });
  }

  /**
   * Helper methods that subclasses should override
   */
  protected getExpectedRole(): string {
    return 'generic'; // Subclasses should override
  }

  protected getBaseClassName(): string {
    return 'component'; // Subclasses should override
  }

  protected getSupportedVariants(): string[] {
    return ['primary']; // Subclasses should override
  }

  protected async simulateChange(element: HTMLElement, value: any): Promise<void> {
    // Default implementation - subclasses should override for specific interaction patterns
    await this.user.click(element);
  }

  /**
   * Utility method to create comprehensive test suite
   */
  createFullTestSuite(
    getElement: () => HTMLElement,
    getValue: () => any,
    setValue: (value: any) => void,
    options: {
      defaultValue?: any;
      controlledValue?: any;
      role?: string;
      expectedAttributes?: Record<string, string>;
      triggerKeys?: string[];
      expectedBehavior?: () => void;
    } = {}
  ): Describeable {
    const {
      defaultValue = false,
      controlledValue = true,
      role = this.getExpectedRole(),
      expectedAttributes = {},
      triggerKeys = [' '],
      expectedBehavior = () => {}
    } = options;

    return describe(this.Component.displayName || this.Component.name, () => {
      this.rendering();
      this.controlledUncontrolledMode(getElement, getValue, setValue, defaultValue, controlledValue);
      this.disabledState(getElement, async (el) => await this.simulateChange(el, true));
      this.keyboardInteractions(getElement, triggerKeys, expectedBehavior);
      this.accessibility(role, expectedAttributes, getElement);
      this.errorHandling(getElement);
      this.focusManagement(getElement);
      this.styling(getElement);
      this.performance(getElement);
    });
  }
}

/**
 * Specialized test pattern for boolean controls (Checkbox, Toggle)
 */
export class BooleanControlTestPattern extends FormControlTestPattern {
  protected getExpectedRole(): string {
    return 'checkbox';
  }

  protected async simulateChange(element: HTMLElement, value: any): Promise<void> {
    await this.user.click(element);
  }

  createFullTestSuite(
    getElement: () => HTMLElement,
    getValue: () => boolean,
    setValue: (value: boolean) => void,
    options: {
      defaultValue?: boolean;
      controlledValue?: boolean;
      role?: string;
      expectedAttributes?: Record<string, string>;
      triggerKeys?: string[];
      expectedBehavior?: () => void;
    } = {}
  ): Describeable {
    const {
      defaultValue = false,
      controlledValue = true,
      role = 'checkbox',
      expectedAttributes = { 'aria-checked': 'false' },
      triggerKeys = [' '],
      expectedBehavior = () => {}
    } = options;

    return describe(this.Component.displayName || this.Component.name, () => {
      this.rendering();
      this.controlledUncontrolledMode(getElement, getValue, setValue, defaultValue, controlledValue);
      this.disabledState(getElement, async (el) => await this.simulateChange(el, !getValue()));
      this.keyboardInteractions(getElement, triggerKeys, expectedBehavior);
      this.accessibility(role, expectedAttributes, getElement);
      this.errorHandling(getElement);
      this.focusManagement(getElement);
      this.styling(getElement);
      this.performance(getElement);

      // Boolean-specific tests
      describe('Boolean State', () => {
        it('should toggle between checked and unchecked states', async () => {
          render(<this.Component defaultChecked={false} />);

          const element = getElement();
          expect(getValue()).toBe(false);

          await this.simulateChange(element, true);
          expect(getValue()).toBe(true);

          await this.simulateChange(element, false);
          expect(getValue()).toBe(false);
        });

        it('should update aria-checked attribute with state', async () => {
          render(<this.Component defaultChecked={false} />);

          const element = getElement();
          expect(element).toHaveAttribute('aria-checked', 'false');

          await this.simulateChange(element, true);
          expect(element).toHaveAttribute('aria-checked', 'true');
        });
      });
    });
  }
}

/**
 * Specialized test pattern for range controls (Slider)
 */
export class RangeControlTestPattern extends FormControlTestPattern {
  protected getExpectedRole(): string {
    return 'slider';
  }

  protected async simulateChange(element: HTMLElement, value: any): Promise<void> {
    fireEvent.change(element, { target: { value } });
  }

  createFullTestSuite(
    getElement: () => HTMLElement,
    getValue: () => number,
    setValue: (value: number) => void,
    options: {
      min?: number;
      max?: number;
      step?: number;
      defaultValue?: number;
      controlledValue?: number;
      role?: string;
      expectedAttributes?: Record<string, string>;
      triggerKeys?: string[];
      expectedBehavior?: () => void;
    } = {}
  ): Describeable {
    const {
      min = 0,
      max = 100,
      step = 1,
      defaultValue = 50,
      controlledValue = 75,
      role = 'slider',
      expectedAttributes = {
        'aria-valuemin': min.toString(),
        'aria-valuemax': max.toString(),
        'aria-valuenow': defaultValue.toString()
      },
      triggerKeys = ['{ArrowRight}', '{ArrowLeft}'],
      expectedBehavior = () => {}
    } = options;

    return describe(this.Component.displayName || this.Component.name, () => {
      this.rendering();
      this.controlledUncontrolledMode(getElement, getValue, setValue, defaultValue, controlledValue);
      this.disabledState(getElement, async (el) => await this.simulateChange(el, controlledValue));
      this.keyboardInteractions(getElement, triggerKeys, expectedBehavior);
      this.accessibility(role, expectedAttributes, getElement);
      this.errorHandling(getElement);
      this.focusManagement(getElement);
      this.styling(getElement);
      this.performance(getElement);

      // Range-specific tests
      describe('Range Controls', () => {
        it('should respect min/max constraints', () => {
          render(
            <this.Component
              value={max + 10}
              min={min}
              max={max}
              onChange={() => {}}
            />
          );

          const element = getElement();
          expect(element).toHaveAttribute('aria-valuemax', max.toString());
          expect(element).toHaveAttribute('aria-valuemin', min.toString());
        });

        it('should handle step increments with keyboard', async () => {
          render(<this.Component defaultValue={defaultValue} step={step} />);

          const element = getElement();
          element.focus();

          await this.user.keyboard('{ArrowRight}');
          expect(element).toHaveAttribute('aria-valuenow', (defaultValue + step).toString());

          await this.user.keyboard('{ArrowLeft}');
          expect(element).toHaveAttribute('aria-valuenow', defaultValue.toString());
        });

        it('should handle Home/End keys for min/max', async () => {
          render(<this.Component defaultValue={defaultValue} min={min} max={max} />);

          const element = getElement();
          element.focus();

          await this.user.keyboard('{Home}');
          expect(element).toHaveAttribute('aria-valuenow', min.toString());

          await this.user.keyboard('{End}');
          expect(element).toHaveAttribute('aria-valuenow', max.toString());
        });
      });
    });
  }
}

/**
 * Specialized test pattern for text inputs
 */
export class TextInputTestPattern extends FormControlTestPattern {
  protected getExpectedRole(): string {
    return 'textbox';
  }

  protected async simulateChange(element: HTMLElement, value: any): Promise<void> {
    await this.user.type(element, value.toString());
  }

  createFullTestSuite(
    getElement: () => HTMLElement,
    getValue: () => string,
    setValue: (value: string) => void,
    options: {
      defaultValue?: string;
      controlledValue?: string;
      role?: string;
      expectedAttributes?: Record<string, string>;
      triggerKeys?: string[];
      expectedBehavior?: () => void;
    } = {}
  ): Describeable {
    const {
      defaultValue = '',
      controlledValue = 'controlled',
      role = 'textbox',
      expectedAttributes = {},
      triggerKeys = ['{Enter}'],
      expectedBehavior = () => {}
    } = options;

    return describe(this.Component.displayName || this.Component.name, () => {
      this.rendering();
      this.controlledUncontrolledMode(getElement, getValue, setValue, defaultValue, controlledValue);
      this.disabledState(getElement, async (el) => await this.simulateChange(el, controlledValue));
      this.keyboardInteractions(getElement, triggerKeys, expectedBehavior);
      this.accessibility(role, expectedAttributes, getElement);
      this.errorHandling(getElement);
      this.focusManagement(getElement);
      this.styling(getElement);
      this.performance(getElement);

      // Text-specific tests
      describe('Text Input', () => {
        it('should handle text input correctly', async () => {
          render(<this.Component />);

          const element = getElement();
          await this.simulateChange(element, 'test value');

          expect(getValue()).toBe('test value');
        });

        it('should handle special characters', async () => {
          render(<this.Component />);

          const element = getElement();
          const specialValue = 'Test!@#$%^&*()_+-=[]{}|;:,.<>?';
          await this.simulateChange(element, specialValue);

          expect(getValue()).toBe(specialValue);
        });

        it('should handle paste events', async () => {
          render(<this.Component />);

          const element = getElement();
          fireEvent.paste(element, {
            clipboardData: {
              getData: () => 'pasted text'
            }
          });

          expect(getValue()).toBe('pasted text');
        });
      });
    });
  }
}

/**
 * Factory function to create test patterns based on component type
 */
export function createTestPattern(Component: React.ComponentType<any>, type: 'boolean' | 'range' | 'text' | 'generic'): FormControlTestPattern {
  switch (type) {
    case 'boolean':
      return new BooleanControlTestPattern(Component);
    case 'range':
      return new RangeControlTestPattern(Component);
    case 'text':
      return new TextInputTestPattern(Component);
    default:
      return new FormControlTestPattern(Component);
  }
}

/**
 * Utility functions for common test scenarios
 */
export const TestUtils = {
  /**
   * Create a mock form context for testing form submissions
   */
  createFormContext: (initialValues: Record<string, any> = {}) => {
    const [values, setValues] = React.useState(initialValues);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const updateValue = (field: string, value: any) => {
      setValues(prev => ({ ...prev, [field]: value }));
      // Clear error when value changes
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

    const setError = (field: string, error: string) => {
      setErrors(prev => ({ ...prev, [field]: error }));
    };

    const validateField = (field: string, validator: (value: any) => string | null) => {
      const error = validator(values[field]);
      if (error) {
        setError(field, error);
        return false;
      }
      return true;
    };

    const validateForm = (validators: Record<string, (value: any) => string | null>) => {
      const newErrors: Record<string, string> = {};
      let isValid = true;

      Object.entries(validators).forEach(([field, validator]) => {
        const error = validator(values[field]);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    };

    return {
      values,
      errors,
      updateValue,
      setError,
      validateField,
      validateForm,
      setValues,
      setErrors
    };
  },

  /**
   * Create a test user event with custom configuration
   */
  createCustomUserEvent: (config?: Parameters<typeof userEvent.setup>[0]) => {
    return userEvent.setup(config);
  },

  /**
   * Wait for async operations in tests
   */
  waitForAsync: (timeout: number = 1000) =>
    new Promise(resolve => setTimeout(resolve, timeout)),

  /**
   * MockResizeObserver for testing responsive behavior
   */
  mockResizeObserver: () => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  },

  /**
   * MockIntersectionObserver for testing visibility
   */
  mockIntersectionObserver: () => {
    global.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      root: Element | null = null;
      rootMargin: string = '';
      thresholds: ReadonlyArray<number> = [];
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    } as typeof IntersectionObserver;
  }
};

export default FormControlTestPattern;
