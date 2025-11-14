const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50,
} as const

export type LogLevel = keyof typeof LOG_LEVELS

const STORAGE_KEY = 'memoriae_log_level'

const isValidLogLevel = (value: string | null | undefined): value is LogLevel => {
  return value !== null && value !== undefined && value in LOG_LEVELS
}

// Detect if we're in a browser environment
const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

// Detect if we're in development mode
const isDevelopment = (): boolean => {
  // Check for Node.js process.env (backend)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'development'
  }
  // For browser, we can't reliably detect dev mode from shared package
  // Frontend will need to set level explicitly or use localStorage
  return false
}

// Get log level from environment variables
const resolveLevelFromEnv = (): LogLevel | null => {
  // Check for Node.js process.env (backend) - LOG_LEVEL
  if (typeof process !== 'undefined' && process.env && process.env.LOG_LEVEL) {
    if (isValidLogLevel(process.env.LOG_LEVEL)) {
      return process.env.LOG_LEVEL
    }
  }
  // For Vite frontend, import.meta.env.VITE_LOG_LEVEL will be replaced at build time
  // We can't access it directly here, but we can check a global that might be set
  // In practice, frontend should use setLevel() or localStorage
  return null
}

// Get log level from localStorage (browser only)
const resolveLevelFromStorage = (): LogLevel | null => {
  if (!isBrowser()) {
    return null
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isValidLogLevel(stored) ? stored : null
  } catch {
    // localStorage might be disabled or throw errors
    return null
  }
}

const determineLogLevel = (): LogLevel => {
  return resolveLevelFromEnv() ?? resolveLevelFromStorage() ?? (isDevelopment() ? 'DEBUG' : 'INFO')
}

const getConsoleMethod = (level: LogLevel): ((...args: unknown[]) => void) => {
  switch (level) {
    case 'DEBUG':
      return console.debug
    case 'INFO':
      return console.info
    case 'WARN':
      return console.warn
    case 'ERROR':
    case 'FATAL':
      return console.error
  }
}

const formatPrefix = (level: LogLevel, scope?: string): string => {
  return `[${level}]${scope ? ` [${scope}]` : ''}`
}

/**
 * Logger exposes structured logging helpers that keep level, scope, and context consistent.
 * Works in both browser (frontend) and Node.js (backend) environments.
 * 
 * Log levels: DEBUG, INFO, WARN, ERROR, FATAL
 * 
 * Environment variables:
 * - Frontend (Vite): VITE_LOG_LEVEL
 * - Backend (Node.js): LOG_LEVEL
 * 
 * In browser, log level can be persisted to localStorage by calling setLevel(level, true).
 */
export class Logger {
  private static currentLevel: LogLevel = determineLogLevel()
  private scopeName: string | undefined

  constructor(scope?: string) {
    this.scopeName = scope
  }

  static setLevel(level: LogLevel, persist = false): void {
    if (!isValidLogLevel(level)) {
      return
    }
    Logger.currentLevel = level
    if (persist && isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, level)
      } catch {
        // localStorage might be disabled or throw errors
      }
    }
  }

  static getLevel(): LogLevel {
    return Logger.currentLevel
  }

  scope(scopeName: string): Logger {
    const trimmed = scopeName.trim()
    const combined = this.scopeName ? `${this.scopeName}:${trimmed}` : trimmed
    return new Logger(combined)
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('DEBUG', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('INFO', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('WARN', message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('ERROR', message, context)
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.log('FATAL', message, context)
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[Logger.currentLevel]
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return

    const prefix = formatPrefix(level, this.scopeName)
    const consoleMethod = getConsoleMethod(level)
    if (context) {
      consoleMethod(prefix, message, context)
    } else {
      consoleMethod(prefix, message)
    }
  }
}

export const logger = new Logger()

