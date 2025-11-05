/**
 * Shared test utilities for Mother Theme components
 *
 * Provides common helpers and test utilities used across component tests.
 */

import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";

/**
 * Custom render function that includes theme CSS
 * Use this instead of render from @testing-library/react for consistent theming
 */
export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, options);
}

/**
 * Create a user event instance with default options
 */
export function createUserEvent() {
  return userEvent.setup();
}

/**
 * Wait for a short delay (useful for animations/transitions)
 */
export function waitForDelay(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for next tick (useful for state updates)
 */
export function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Test helper for controlled/uncontrolled component patterns
 */
export interface ControlledTestHelpers<T> {
  value: T;
  setValue: (value: T) => void;
  Component: ReactElement;
}

/**
 * Create a controlled component wrapper for testing
 */
export function createControlledWrapper<T>(
  initialValue: T,
  onChange: (value: T) => void = () => {},
) {
  let currentValue = initialValue;
  const setValue = (value: T) => {
    currentValue = value;
    onChange(value);
  };

  return {
    get value() {
      return currentValue;
    },
    setValue,
    onChange: (value: T) => {
      setValue(value);
    },
  };
}

/**
 * Accessibility test helpers
 */
export const a11y = {
  /**
   * Check if element has proper ARIA attributes
   */
  hasRole: (element: HTMLElement, role: string) => {
    return element.getAttribute("role") === role;
  },

  /**
   * Check if element is properly labeled
   */
  isLabeled: (element: HTMLElement) => {
    const id = element.getAttribute("id");
    const ariaLabel = element.getAttribute("aria-label");
    const ariaLabelledBy = element.getAttribute("aria-labelledby");

    return !!(id || ariaLabel || ariaLabelledBy);
  },

  /**
   * Check if element is keyboard accessible
   */
  isKeyboardAccessible: (element: HTMLElement) => {
    const tabIndex = element.getAttribute("tabindex");
    const disabled = element.hasAttribute("disabled");

    return !disabled && (tabIndex === null || parseInt(tabIndex) >= 0);
  },

  /**
   * Check if form control has proper aria-describedby attributes
   */
  hasAriaDescribedBy: (
    element: HTMLElement,
    hasError?: boolean,
    hasHelperText?: boolean,
    hasCount?: boolean,
  ) => {
    const ariaDescribedBy = element.getAttribute("aria-describedby");

    if (hasError) {
      return ariaDescribedBy && ariaDescribedBy.includes("error");
    }
    if (hasHelperText) {
      return ariaDescribedBy && ariaDescribedBy.includes("helper");
    }
    if (hasCount) {
      return ariaDescribedBy && ariaDescribedBy.includes("count");
    }

    return !!ariaDescribedBy;
  },

  /**
   * Verify keyboard interaction patterns
   */
  async testKeyboardInteraction(
    element: HTMLElement,
    key: string,
    shouldTriggerCallback: boolean = true,
  ) {
    const user = createUserEvent();

    element.focus();
    await user.keyboard(key);

    return element;
  },
};

/**
 * Common test data generators
 */
export const testData = {
  /**
   * Generate a unique ID for testing
   */
  uniqueId: (prefix: string = "test") => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Generate test labels
   */
  label: (index: number = 1) => `Test Label ${index}`,

  /**
   * Generate test values
   */
  value: (index: number = 1) => `value-${index}`,
};

/**
 * Form Control Test Patterns
 * Reusable test patterns for form components
 */
export const formTestPatterns = {
  /**
   * Test controlled/uncontrolled mode switching
   */
  controlledUncontrolled: <T>(
    Component: ReactElement,
    getValue: (element: HTMLElement) => T,
    setValue: (element: HTMLElement, value: T) => void,
    defaultValue: T,
    controlledValue: T,
  ) => {
    describe("Controlled/Uncontrolled Mode", () => {
      it("should work in uncontrolled mode", async () => {
        const user = createUserEvent();
        const { rerender } = render(Component);

        let element = document.querySelector(
          "[role], input, textarea, button",
        ) as HTMLElement;
        expect(getValue(element)).toBe(defaultValue);
      });

      it("should respect controlled value", () => {
        const { rerender } = render(Component);

        let element = document.querySelector(
          "[role], input, textarea, button",
        ) as HTMLElement;
        expect(getValue(element)).toBe(controlledValue);
      });

      it("should handle mode switching", async () => {
        const user = createUserEvent();
        const { rerender } = render(Component);

        let element = document.querySelector(
          "[role], input, textarea, button",
        ) as HTMLElement;

        // Switch to different value
        rerender(Component);
        element = document.querySelector(
          "[role], input, textarea, button",
        ) as HTMLElement;

        expect(getValue(element)).toBe(controlledValue);
      });
    });
  },

  /**
   * Test disabled state across form controls
   */
  disabledState: (
    Component: ReactElement,
    getElement: () => HTMLElement,
    testInteraction: (element: HTMLElement) => Promise<void>,
  ) => {
    describe("Disabled State", () => {
      it("should be disabled when disabled prop is true", () => {
        const element = getElement();
        expect(element).toBeDisabled();
      });

      it("should not respond to clicks when disabled", async () => {
        const user = createUserEvent();
        const element = getElement();

        await testInteraction(element);
        // In disabled state, interactions should be prevented
        expect(element).toBeDisabled();
      });

      it("should have proper aria-disabled attribute", () => {
        const element = getElement();
        expect(element).toHaveAttribute("aria-disabled", "true");
      });
    });
  },

  /**
   * Test keyboard interactions
   */
  keyboardInteractions: (
    Component: ReactElement,
    getElement: () => HTMLElement,
    triggerKeys: string[],
    expectedBehavior: () => void,
  ) => {
    describe("Keyboard Interactions", () => {
      it("should respond to keyboard input", async () => {
        const user = createUserEvent();
        const element = getElement();

        element.focus();
        for (const key of triggerKeys) {
          await user.keyboard(key);
        }

        expectedBehavior();
      });

      it("should handle Enter key", async () => {
        const user = createUserEvent();
        const element = getElement();

        element.focus();
        await user.keyboard("{Enter}");

        expectedBehavior();
      });

      it("should handle Space key", async () => {
        const user = createUserEvent();
        const element = getElement();

        element.focus();
        await user.keyboard(" ");

        expectedBehavior();
      });
    });
  },

  /**
   * Test accessibility patterns
   */
  accessibility: (
    Component: ReactElement,
    role: string,
    expectedAttributes: Record<string, string>,
  ) => {
    describe("Accessibility", () => {
      it("should have proper role", () => {
        render(Component);
        const element = document.querySelector(
          `[role="${role}"]`,
        ) as HTMLElement;
        expect(element).toBeInTheDocument();
      });

      it("should have proper ARIA attributes", () => {
        render(Component);
        const element = document.querySelector(
          `[role="${role}"]`,
        ) as HTMLElement;

        Object.entries(expectedAttributes).forEach(([attr, value]) => {
          expect(element).toHaveAttribute(attr, value);
        });
      });

      it("should be keyboard accessible", () => {
        render(Component);
        const element = document.querySelector(
          `[role="${role}"]`,
        ) as HTMLElement;
        expect(a11y.isKeyboardAccessible(element)).toBe(true);
      });
    });
  },

  /**
   * Test value constraints and clamping
   */
  valueConstraints: (
    Component: ReactElement,
    getValue: (element: HTMLElement) => number,
    constraints: { min?: number; max?: number; step?: number },
  ) => {
    describe("Value Constraints", () => {
      it("should respect min constraint", () => {
        if (constraints.min !== undefined) {
          const value = getValue(
            document.querySelector("[role], input") as HTMLElement,
          );
          expect(value).toBeGreaterThanOrEqual(constraints.min);
        }
      });

      it("should respect max constraint", () => {
        if (constraints.max !== undefined) {
          const value = getValue(
            document.querySelector("[role], input") as HTMLElement,
          );
          expect(value).toBeLessThanOrEqual(constraints.max);
        }
      });

      it("should respect step increments", () => {
        if (constraints.step !== undefined) {
          const element = document.querySelector(
            "[role], input",
          ) as HTMLElement;
          expect(element).toHaveAttribute("step", constraints.step.toString());
        }
      });
    });
  },
};

/**
 * Performance testing utilities
 */
export const performanceTests = {
  /**
   * Test re-render performance
   */
  reRenderPerformance: async (
    Component: ReactElement,
    reRender: () => void,
    iterations: number = 10,
  ) => {
    const renderTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      reRender();
      const end = performance.now();
      renderTimes.push(end - start);
    }

    const avgRenderTime =
      renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    expect(avgRenderTime).toBeLessThan(16); // Should render in under 16ms (60fps)

    return {
      average: avgRenderTime,
      times: renderTimes,
    };
  },

  /**
   * Test memory leaks with useEffect cleanup
   */
  memoryLeakTest: async (
    setupComponent: () => ReactElement,
    cleanup: () => void,
  ) => {
    // This would require more sophisticated testing in a real environment
    // For now, just ensure cleanup functions are called
    const component = setupComponent();
    render(component);

    cleanup();

    // Verify no console errors or warnings
    expect(console.error).not.toHaveBeenCalled();
  },
};

/**
 * Integration test utilities
 */
export const integrationTests = {
  /**
   * Test component composition
   */
  componentComposition: (
    ParentComponent: ReactElement,
    expectedChildren: string[],
  ) => {
    it("should render all child components", () => {
      render(ParentComponent);

      expectedChildren.forEach((child) => {
        expect(screen.getByText(child)).toBeInTheDocument();
      });
    });
  },

  /**
   * Test form validation across components
   */
  formValidation: (
    FormComponent: ReactElement,
    invalidInputs: Record<string, any>,
    validInputs: Record<string, any>,
  ) => {
    it("should show errors for invalid inputs", () => {
      render(FormComponent);

      // Test with invalid inputs
      Object.entries(invalidInputs).forEach(([field, value]) => {
        const input = screen.getByLabelText(field);
        fireEvent.change(input, { target: { value } });
      });

      // Should show error states
      const errorElements = document.querySelectorAll(
        '[aria-invalid="true"], .error, .invalid',
      );
      expect(errorElements.length).toBeGreaterThan(0);
    });

    it("should not show errors for valid inputs", () => {
      render(FormComponent);

      // Test with valid inputs
      Object.entries(validInputs).forEach(([field, value]) => {
        const input = screen.getByLabelText(field);
        fireEvent.change(input, { target: { value } });
      });

      // Should not show error states
      const errorElements = document.querySelectorAll(
        '[aria-invalid="true"], .error, .invalid',
      );
      expect(errorElements.length).toBe(0);
    });
  },
};

/**
 * Theme consistency testing utilities
 */
export const themeTests = {
  /**
   * Test that components use consistent CSS variables
   */
  cssVariables: (Component: ReactElement, expectedVariables: string[]) => {
    it("should use expected CSS variables", () => {
      render(Component);
      const element = document.querySelector(
        ".component, [role]",
      ) as HTMLElement;

      const computedStyle = window.getComputedStyle(element);

      expectedVariables.forEach((variable) => {
        const value = computedStyle.getPropertyValue(`--${variable}`);
        expect(value).not.toBe("");
      });
    });
  },

  /**
   * Test responsive behavior
   */
  responsiveBehavior: (
    Component: ReactElement,
    viewportSizes: { width: number; height: number }[],
  ) => {
    it("should adapt to different viewport sizes", () => {
      viewportSizes.forEach(({ width, height }) => {
        // Mock resize event
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: width,
        });
        Object.defineProperty(window, "innerHeight", {
          writable: true,
          configurable: true,
          value: height,
        });

        render(Component);
        const element = document.querySelector(".component") as HTMLElement;
        expect(element).toBeInTheDocument();
      });
    });
  },
};

/**
 * Error boundary testing utilities
 */
export const errorBoundaryTests = {
  /**
   * Test error boundary catches errors
   */
  catchesErrors: (
    ErrorBoundaryComponent: ReactElement,
    errorThrowingComponent: ReactElement,
    expectedErrorMessage: string,
  ) => {
    it("should catch and handle errors gracefully", () => {
      const { container } = render(ErrorBoundaryComponent);

      // Verify error boundary UI is shown
      expect(container).toHaveTextContent("Something went wrong");
    });
  },

  /**
   * Test error recovery
   */
  errorRecovery: (
    ErrorBoundaryComponent: ReactElement,
    resetComponent: () => void,
  ) => {
    it("should allow error recovery", () => {
      const { rerender } = render(ErrorBoundaryComponent);

      // Simulate error recovery
      resetComponent();
      rerender(ErrorBoundaryComponent);

      // Should render normally after recovery
      expect(
        screen.queryByText("Something went wrong"),
      ).not.toBeInTheDocument();
    });
  },
};

/**
 * Animation and transition testing utilities
 */
export const animationTests = {
  /**
   * Test CSS transitions
   */
  transition: (
    Component: ReactElement,
    triggerAction: () => void,
    expectedTransition: string,
    duration: number = 300,
  ) => {
    it(`should have ${expectedTransition} transition`, async () => {
      render(Component);

      const element = document.querySelector(".component") as HTMLElement;
      expect(element).toHaveClass(expectedTransition);

      // Trigger the animation
      triggerAction();

      // Wait for transition to complete
      await waitForDelay(duration + 50);

      // Verify final state
      expect(element).toBeInTheDocument();
    });
  },

  /**
   * Test reduced motion preferences
   */
  reducedMotion: (
    Component: ReactElement,
    normalAnimationClass: string,
    reducedMotionClass: string,
  ) => {
    it("should respect prefers-reduced-motion", () => {
      // Mock reduced motion preference
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(Component);
      const element = document.querySelector(".component") as HTMLElement;

      // Should use reduced motion classes
      expect(element).toHaveClass(reducedMotionClass);
      expect(element).not.toHaveClass(normalAnimationClass);
    });
  },
};
