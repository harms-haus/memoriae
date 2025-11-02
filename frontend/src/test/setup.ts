import '@testing-library/jest-dom'
import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Ensure localStorage is properly set up in test environment
beforeAll(() => {
  // jsdom should provide localStorage, but ensure it has all methods
  if (typeof localStorage !== 'undefined') {
    if (!localStorage.getItem) {
      // Create a minimal localStorage implementation if missing
      const storage: Record<string, string> = {}
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (key: string) => storage[key] || null,
          setItem: (key: string, value: string) => {
            storage[key] = value
          },
          removeItem: (key: string) => {
            delete storage[key]
          },
          clear: () => {
            Object.keys(storage).forEach(key => delete storage[key])
          },
        },
        writable: true,
      })
    }
  }
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  // Clear localStorage between tests
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
})
