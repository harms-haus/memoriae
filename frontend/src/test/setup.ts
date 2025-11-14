import '@testing-library/jest-dom'
import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { logger } from '../utils/logger'

// WebSocket error suppression is handled in vitest.config.ts for earlier initialization

// Suppress expected logging output (both console and structured logger helpers) in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let consoleDebugSpy: any
let consoleInfoSpy: any
let consoleErrorSpy: any
let consoleWarnSpy: any
let consoleLogSpy: any
let loggerDebugSpy: any
let loggerInfoSpy: any
let loggerWarnSpy: any
let loggerErrorSpy: any
let loggerFatalSpy: any

const spyConsole = () => {
  consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
  consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
}

const spyLogger = () => {
  loggerDebugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {})
  loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})
  loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
  loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
  loggerFatalSpy = vi.spyOn(logger, 'fatal').mockImplementation(() => {})
}

beforeAll(() => {
  spyConsole()
  spyLogger()

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

  restoreSpy(loggerDebugSpy, () => {
    loggerDebugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {})
  })
  restoreSpy(loggerInfoSpy, () => {
    loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})
  })
  restoreSpy(loggerWarnSpy, () => {
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
  })
  restoreSpy(loggerErrorSpy, () => {
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
  })
  restoreSpy(loggerFatalSpy, () => {
    loggerFatalSpy = vi.spyOn(logger, 'fatal').mockImplementation(() => {})
  })
})
