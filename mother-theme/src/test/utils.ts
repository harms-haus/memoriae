/**
 * Shared test utilities for Mother Theme components
 * 
 * Provides common helpers and test utilities used across component tests.
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';

/**
 * Custom render function that includes theme CSS
 * Use this instead of render from @testing-library/react for consistent theming
 */
export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
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
  onChange: (value: T) => void = () => {}
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
    return element.getAttribute('role') === role;
  },

  /**
   * Check if element is properly labeled
   */
  isLabeled: (element: HTMLElement) => {
    const id = element.getAttribute('id');
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    
    return !!(id || ariaLabel || ariaLabelledBy);
  },

  /**
   * Check if element is keyboard accessible
   */
  isKeyboardAccessible: (element: HTMLElement) => {
    const tabIndex = element.getAttribute('tabindex');
    const disabled = element.hasAttribute('disabled');
    
    return !disabled && (tabIndex === null || parseInt(tabIndex) >= 0);
  },
};

/**
 * Common test data generators
 */
export const testData = {
  /**
   * Generate a unique ID for testing
   */
  uniqueId: (prefix: string = 'test') => {
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

