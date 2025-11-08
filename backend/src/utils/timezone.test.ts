// Timezone utility tests
import { describe, it, expect } from 'vitest'
import { convertLocalTimeToUTC, isValidTimezone } from './timezone'

describe('Timezone Utilities', () => {
  describe('isValidTimezone', () => {
    it('should return true for valid IANA timezone identifiers', () => {
      expect(isValidTimezone('America/New_York')).toBe(true)
      expect(isValidTimezone('Europe/London')).toBe(true)
      expect(isValidTimezone('Asia/Tokyo')).toBe(true)
      expect(isValidTimezone('UTC')).toBe(true)
      expect(isValidTimezone('America/Los_Angeles')).toBe(true)
    })

    it('should return false for invalid timezone identifiers', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false)
      // Note: 'EST' might be valid in some contexts, but should fail IANA validation
      // 'GMT+5' is not a valid IANA timezone
      expect(isValidTimezone('GMT+5')).toBe(false)
      expect(isValidTimezone('')).toBe(false)
      expect(isValidTimezone('Not/A/Timezone')).toBe(false)
    })
  })

  describe('convertLocalTimeToUTC', () => {
    it('should convert local time to UTC correctly', () => {
      // Test with America/New_York (UTC-5 in winter, UTC-4 in summer)
      // Using a date in winter (EST, UTC-5)
      const result = convertLocalTimeToUTC('2024-01-15T10:00:00', 'America/New_York')
      expect(result).toBeInstanceOf(Date)
      
      // Verify it's approximately 5 hours ahead (UTC)
      const utcHours = result.getUTCHours()
      expect(utcHours).toBe(15) // 10:00 EST = 15:00 UTC
    })

    it('should handle different timezones', () => {
      // Test with Europe/London (UTC+0 in winter, UTC+1 in summer)
      const result = convertLocalTimeToUTC('2024-01-15T12:00:00', 'Europe/London')
      expect(result).toBeInstanceOf(Date)
      expect(result.getUTCHours()).toBe(12) // Same in winter
    })

    it('should handle UTC timezone', () => {
      const result = convertLocalTimeToUTC('2024-01-15T12:00:00', 'UTC')
      expect(result).toBeInstanceOf(Date)
      expect(result.getUTCHours()).toBe(12)
      expect(result.getUTCMinutes()).toBe(0)
    })

    it('should handle Asia/Tokyo (UTC+9)', () => {
      const result = convertLocalTimeToUTC('2024-01-15T12:00:00', 'Asia/Tokyo')
      expect(result).toBeInstanceOf(Date)
      // Tokyo is UTC+9, so 12:00 JST = 03:00 UTC
      expect(result.getUTCHours()).toBe(3)
    })

    it('should throw error for invalid timezone', () => {
      expect(() => {
        convertLocalTimeToUTC('2024-01-15T10:00:00', 'Invalid/Timezone')
      }).toThrow('Invalid IANA timezone: Invalid/Timezone')
    })

    it('should throw error for invalid date format', () => {
      expect(() => {
        convertLocalTimeToUTC('invalid-date', 'America/New_York')
      }).toThrow('Invalid date/time format')
    })

    it('should handle date with seconds', () => {
      const result = convertLocalTimeToUTC('2024-01-15T10:30:45', 'UTC')
      expect(result).toBeInstanceOf(Date)
      expect(result.getUTCHours()).toBe(10)
      expect(result.getUTCMinutes()).toBe(30)
      expect(result.getUTCSeconds()).toBe(45)
    })

    it('should handle date without seconds', () => {
      const result = convertLocalTimeToUTC('2024-01-15T10:30', 'UTC')
      expect(result).toBeInstanceOf(Date)
      expect(result.getUTCHours()).toBe(10)
      expect(result.getUTCMinutes()).toBe(30)
    })
  })
})

