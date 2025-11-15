// Sprout registry tests
import { describe, it, expect, vi } from 'vitest'
import { getHandler } from './registry'
import * as followupHandler from './followup-sprout'
import * as musingHandler from './musing-sprout'

describe('Sprout Registry', () => {
  describe('getHandler', () => {
    it('should return followup handler for followup type', () => {
      const handler = getHandler('followup')
      expect(handler).toBe(followupHandler)
    })

    it('should return musing handler for musing type', () => {
      const handler = getHandler('musing')
      expect(handler).toBe(musingHandler)
    })

    it('should throw error for extra_context type (not implemented)', () => {
      expect(() => getHandler('extra_context')).toThrow('Extra context sprout handler not yet implemented')
    })

    it('should throw error for fact_check type (not implemented)', () => {
      expect(() => getHandler('fact_check')).toThrow('Fact check sprout handler not yet implemented')
    })

    it('should throw error for unknown type', () => {
      // TypeScript won't allow this, but test runtime behavior
      expect(() => {
        // @ts-expect-error - Testing runtime error handling
        getHandler('unknown_type')
      }).toThrow('Unknown sprout type: unknown_type')
    })
  })
})

