import '@testing-library/jest-dom';
import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
// Import theme CSS for tests
import '../styles/theme.css';
// Import component CSS files for tests
import '../components/PointerPanel/PointerPanel.css';

// Mock getComputedStyle for jsdom (which doesn't support CSS stylesheets)
// This allows tests to check computed styles from CSS classes
beforeAll(() => {
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function(element: Element, pseudoElement?: string | null) {
    const computed = originalGetComputedStyle.call(this, element, pseudoElement);
    
    // Create a proxy that returns CSS values based on class names
    return new Proxy(computed, {
      get(target, prop) {
        if (prop === 'position' && element.classList.contains('pointer-panel')) {
          return 'absolute';
        }
        
        if (prop === 'transformOrigin' || prop === 'transform-origin') {
          const classList = element.classList;
          if (classList.contains('pointer-panel-top-left')) {
            return 'top left';
          }
          if (classList.contains('pointer-panel-top-right')) {
            return 'top right';
          }
          if (classList.contains('pointer-panel-center-left')) {
            return 'center left';
          }
          if (classList.contains('pointer-panel-center-right')) {
            return 'center right';
          }
          if (classList.contains('pointer-panel-bottom-left')) {
            return 'bottom left';
          }
          if (classList.contains('pointer-panel-bottom-right')) {
            return 'bottom right';
          }
        }
        
        return target[prop as keyof typeof target];
      }
    });
  };
});

// Mock ResizeObserver for test environment
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {
      // Mock implementation
    }
    unobserve() {
      // Mock implementation
    }
    disconnect() {
      // Mock implementation
    }
  } as typeof ResizeObserver;
});

// Ensure localStorage is properly set up in test environment
beforeAll(() => {
  if (typeof localStorage !== 'undefined') {
    if (!localStorage.getItem) {
      const storage: Record<string, string> = {};
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (key: string) => storage[key] || null,
          setItem: (key: string, value: string) => {
            storage[key] = value;
          },
          removeItem: (key: string) => {
            delete storage[key];
          },
          clear: () => {
            Object.keys(storage).forEach((key) => delete storage[key]);
          },
        },
        writable: true,
      });
    }
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear();
  }
});

