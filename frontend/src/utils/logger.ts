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

const DEFAULT_LEVEL: LogLevel = import.meta.env.DEV ? 'DEBUG' : 'INFO'

const resolveLevelFromEnv = (): LogLevel | null => {
  const envLevel = import.meta.env.VITE_LOG_LEVEL
  return isValidLogLevel(envLevel) ? envLevel : null
}

const resolveLevelFromStorage = (): LogLevel | null => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isValidLogLevel(stored) ? stored : null
}

const determineLogLevel = (): LogLevel => {
  return resolveLevelFromEnv() ?? resolveLevelFromStorage() ?? DEFAULT_LEVEL
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
 * DEBUG messages are hidden by default in production, but they can be shown by setting
 * `VITE_LOG_LEVEL=DEBUG` or calling `setLogLevel('DEBUG', true)` (which persists the choice).
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
    if (persist && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, level)
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

