import '@testing-library/jest-dom'
import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// WebSocket error suppression is handled in vitest.config.ts for earlier initialization

// Suppress all console methods for expected errors/logs in tests
// Components log errors/warnings/info for error handling tests, which is expected behavior
// Tests can restore the original if they need to verify error logging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let consoleErrorSpy: any
let consoleWarnSpy: any
let consoleLogSpy: any

beforeAll(() => {
  // Suppress all console methods by default in tests
  // This prevents expected logs from cluttering test output
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  
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
  // Restore console mocks after vi.clearAllMocks() might have cleared them
  if (consoleErrorSpy) {
    consoleErrorSpy.mockRestore()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  }
  if (consoleWarnSpy) {
    consoleWarnSpy.mockRestore()
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  }
  if (consoleLogSpy) {
    consoleLogSpy.mockRestore()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  }
})
