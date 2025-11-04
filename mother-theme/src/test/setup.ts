import '@testing-library/jest-dom';
import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
// Import theme CSS for tests
import '../styles/theme.css';

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

