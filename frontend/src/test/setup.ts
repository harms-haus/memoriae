import '@testing-library/jest-dom'
import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
// Initialize loglevel - set to SILENT level in test environment
import log from 'loglevel'
log.setLevel(log.levels.SILENT)

// WebSocket error suppression is handled in vitest.config.ts for earlier initialization

// Suppress expected logging output in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let consoleDebugSpy: any
let consoleInfoSpy: any
let consoleErrorSpy: any
let consoleWarnSpy: any
let consoleLogSpy: any

const spyConsole = () => {
  consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
  consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
}

beforeAll(() => {
  spyConsole()

  // jsdom should provide localStorage, but ensure it has all methods
  if (typeof localStorage !== 'undefined') {
    if (!localStorage.getItem) {
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

  const restoreSpy = (spy: any, factory: () => void) => {
    if (spy) {
      spy.mockRestore()
      factory()
    }
  }

  restoreSpy(consoleDebugSpy, () => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
  })
  restoreSpy(consoleInfoSpy, () => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  restoreSpy(consoleErrorSpy, () => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  restoreSpy(consoleWarnSpy, () => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  restoreSpy(consoleLogSpy, () => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })
})
