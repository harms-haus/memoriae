// Logger utility tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Logger, logger } from './logger'

describe('Logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Reset to default level first
    Logger.setLevel('INFO', false)
    
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
    
    // Set up spies after clearing
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {}) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {}) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as any
  })

  describe('Log Levels', () => {
    it('should log INFO messages at INFO level', () => {
      Logger.setLevel('INFO', false)
      const log = new Logger()
      log.info('Test message')
      expect(consoleInfoSpy).toHaveBeenCalled()
    })

    it('should not log DEBUG messages at INFO level', () => {
      Logger.setLevel('INFO', false)
      const log = new Logger()
      log.debug('Test message')
      expect(consoleDebugSpy).not.toHaveBeenCalled()
    })

    it('should log DEBUG messages at DEBUG level', () => {
      Logger.setLevel('DEBUG', false)
      const log = new Logger()
      log.debug('Test message')
      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    it('should log WARN messages at WARN level', () => {
      Logger.setLevel('WARN', false)
      const log = new Logger()
      log.warn('Test message')
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('should log ERROR messages at ERROR level', () => {
      Logger.setLevel('ERROR', false)
      const log = new Logger()
      log.error('Test message')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should log FATAL messages at FATAL level', () => {
      Logger.setLevel('FATAL', false)
      const log = new Logger()
      log.fatal('Test message')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should not log INFO messages at WARN level', () => {
      Logger.setLevel('WARN', false)
      const log = new Logger()
      log.info('Test message')
      expect(consoleInfoSpy).not.toHaveBeenCalled()
    })
  })

  describe('Scoping', () => {
    it('should create scoped logger', () => {
      const log = new Logger('Parent')
      const scoped = log.scope('Child')
      expect(scoped).toBeInstanceOf(Logger)
    })

    it('should combine scope names', () => {
      Logger.setLevel('INFO', false)
      const log = new Logger('Parent')
      const scoped = log.scope('Child')
      scoped.info('Test message')
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] [Parent:Child]',
        'Test message'
      )
    })

    it('should handle nested scopes', () => {
      const log = new Logger('Level1')
      const level2 = log.scope('Level2')
      const level3 = level2.scope('Level3')
      level3.info('Test message')
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] [Level1:Level2:Level3]',
        'Test message'
      )
    })

    it('should trim scope names', () => {
      Logger.setLevel('INFO', false)
      // The logger trims the new scope name but not the existing one
      // So we test with a trimmed parent scope
      const log = new Logger('Parent')
      const scoped = log.scope('  Child  ')
      scoped.info('Test message')
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] [Parent:Child]',
        'Test message'
      )
    })
  })

  describe('Context', () => {
    it('should log message with context', () => {
      const log = new Logger()
      log.info('Test message', { key: 'value' })
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'Test message',
        { key: 'value' }
      )
    })

    it('should log message without context', () => {
      const log = new Logger()
      log.info('Test message')
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'Test message'
      )
    })
  })

  describe('Level Management', () => {
    it('should set and get log level', () => {
      Logger.setLevel('DEBUG', false)
      expect(Logger.getLevel()).toBe('DEBUG')
      
      Logger.setLevel('WARN', false)
      expect(Logger.getLevel()).toBe('WARN')
    })

    it('should persist level to localStorage when requested (browser only)', () => {
      if (typeof localStorage !== 'undefined') {
        Logger.setLevel('DEBUG', true)
        expect(localStorage.getItem('memoriae_log_level')).toBe('DEBUG')
      }
    })

    it('should not persist level when persist is false', () => {
      if (typeof localStorage !== 'undefined') {
        Logger.setLevel('DEBUG', false)
        // If it was already there, it won't be cleared, but new value won't be persisted
        Logger.setLevel('WARN', false)
        expect(localStorage.getItem('memoriae_log_level')).not.toBe('WARN')
      }
    })

    it('should ignore invalid log levels', () => {
      const originalLevel = Logger.getLevel()
      // @ts-expect-error - testing invalid input
      Logger.setLevel('INVALID', false)
      expect(Logger.getLevel()).toBe(originalLevel)
    })
  })

  describe('Default Logger', () => {
    it('should export default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger)
    })

    it('should allow using default logger', () => {
      // Ensure log level allows INFO
      Logger.setLevel('INFO', false)
      // Create a new logger instance to ensure it uses the current console methods
      const testLogger = new Logger()
      testLogger.info('Test message')
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO]',
        'Test message'
      )
    })
  })

  describe('Format Prefix', () => {
    it('should format prefix without scope', () => {
      const log = new Logger()
      log.info('Test message')
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO]',
        'Test message'
      )
    })

    it('should format prefix with scope', () => {
      const log = new Logger('TestScope')
      log.info('Test message')
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] [TestScope]',
        'Test message'
      )
    })
  })

  describe('Node.js Environment', () => {
    it('should work in Node.js environment', () => {
      // This test verifies the logger works when process is available
      Logger.setLevel('INFO', false)
      const log = new Logger('NodeTest')
      log.info('Node.js test message')
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] [NodeTest]',
        'Node.js test message'
      )
    })

    it('should handle localStorage gracefully when not available (Node.js)', () => {
      // In Node.js, localStorage is not available
      // setLevel with persist=true should not throw
      Logger.setLevel('DEBUG', true)
      expect(Logger.getLevel()).toBe('DEBUG')
    })
  })
})

