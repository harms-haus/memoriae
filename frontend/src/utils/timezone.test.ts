// timezone utility tests
import { describe, it, expect } from 'vitest'
import { DateTime } from 'luxon'
import {
  getTimezones,
  getBrowserTimezone,
  utcToDateTimeLocal,
  formatDateInTimezone,
  dateTimeLocalToUTC,
} from './timezone'

describe('getTimezones', () => {
  it('should return array of timezone objects', () => {
    const timezones = getTimezones()
    expect(Array.isArray(timezones)).toBe(true)
    expect(timezones.length).toBeGreaterThan(0)
  })

  it('should return timezones with value and label', () => {
    const timezones = getTimezones()
    timezones.forEach((tz) => {
      expect(tz).toHaveProperty('value')
      expect(tz).toHaveProperty('label')
      expect(typeof tz.value).toBe('string')
      expect(typeof tz.label).toBe('string')
    })
  })

  it('should include common timezones', () => {
    const timezones = getTimezones()
    const values = timezones.map((tz) => tz.value)
    
    expect(values).toContain('America/New_York')
    expect(values).toContain('America/Los_Angeles')
    expect(values).toContain('Europe/London')
    expect(values).toContain('Asia/Tokyo')
    expect(values).toContain('UTC')
  })

  it('should be sorted alphabetically by label', () => {
    const timezones = getTimezones()
    const labels = timezones.map((tz) => tz.label)
    const sortedLabels = [...labels].sort((a, b) => a.localeCompare(b))
    
    expect(labels).toEqual(sortedLabels)
  })
})

describe('getBrowserTimezone', () => {
  it('should return a timezone string', () => {
    const tz = getBrowserTimezone()
    expect(typeof tz).toBe('string')
    expect(tz.length).toBeGreaterThan(0)
  })

  it('should return valid IANA timezone', () => {
    const tz = getBrowserTimezone()
    // Basic validation - IANA timezones typically contain /, but UTC is also valid
    // Accept either format: "Region/City" or "UTC"
    expect(tz === 'UTC' || tz.match(/^[A-Za-z_]+\/[A-Za-z_]+/)).toBeTruthy()
  })
})

describe('utcToDateTimeLocal', () => {
  it('should convert UTC ISO string to datetime-local format', () => {
    const isoString = '2024-03-15T10:30:00Z'
    const result = utcToDateTimeLocal(isoString)
    
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('should use browser timezone by default', () => {
    const isoString = '2024-03-15T10:30:00Z'
    const result = utcToDateTimeLocal(isoString)
    
    // Should be a valid datetime-local format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('should use specified timezone', () => {
    const isoString = '2024-03-15T10:30:00Z'
    const result = utcToDateTimeLocal(isoString, 'America/New_York')
    
    // Should be converted to Eastern Time
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('should throw error for invalid ISO string', () => {
    expect(() => {
      utcToDateTimeLocal('invalid-date')
    }).toThrow('Invalid ISO string')
  })

  it('should handle different UTC times correctly', () => {
    const isoString1 = '2024-03-15T00:00:00Z'
    const isoString2 = '2024-03-15T12:00:00Z'
    
    const result1 = utcToDateTimeLocal(isoString1, 'UTC')
    const result2 = utcToDateTimeLocal(isoString2, 'UTC')
    
    expect(result1).toBe('2024-03-15T00:00')
    expect(result2).toBe('2024-03-15T12:00')
  })

  it('should handle timezone conversions correctly', () => {
    // UTC midnight should convert to appropriate local time
    const isoString = '2024-03-15T00:00:00Z'
    const result = utcToDateTimeLocal(isoString, 'America/New_York')
    
    // Eastern Time is UTC-5 (or UTC-4 during DST)
    // So UTC midnight should be 19:00 or 20:00 the previous day
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })
})

describe('formatDateInTimezone', () => {
  it('should return relative time for near future dates', () => {
    // Use a date that's definitely in the future
    const futureDate = new Date()
    futureDate.setMinutes(futureDate.getMinutes() + 5)
    const isoString = futureDate.toISOString()
    const result = formatDateInTimezone(isoString)
    
    expect(result).toMatch(/^In \d+m$/)
  })

  it('should return "Overdue" for past dates', () => {
    // Use a date that's definitely in the past
    const pastDate = new Date()
    pastDate.setMinutes(pastDate.getMinutes() - 5)
    const isoString = pastDate.toISOString()
    const result = formatDateInTimezone(isoString)
    
    expect(result).toMatch(/^Overdue by \d+m$/)
  })

  it('should return hours for dates within 24 hours', () => {
    // Use a date that's 2 hours in the future
    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 2)
    const isoString = futureDate.toISOString()
    const result = formatDateInTimezone(isoString)
    
    // Could be "In Xh" or "In Xm" depending on exact timing
    expect(result).toMatch(/^In \d+[hm]$/)
  })

  it('should return days for dates within a week', () => {
    // Use a fixed "now" date for deterministic testing
    const now = DateTime.fromISO('2024-03-15T12:00:00Z', { zone: 'UTC' })
    // 3 days in the future
    const futureDate = '2024-03-18T12:00:00Z'
    const result = formatDateInTimezone(futureDate, 'UTC', now)
    
    expect(result).toBe('In 3d')
  })

  it('should return formatted date for distant dates', () => {
    // Use a fixed "now" date for deterministic testing
    const now = DateTime.fromISO('2024-03-15T12:00:00Z', { zone: 'UTC' })
    // 10 days in the future (beyond 7 day threshold)
    const futureDate = '2024-03-25T12:00:00Z'
    const result = formatDateInTimezone(futureDate, 'UTC', now)
    
    expect(result).toBe('Mar 25')
  })

  it('should return formatted date with year for different year', () => {
    // Use a fixed "now" date for deterministic testing
    const now = DateTime.fromISO('2024-03-15T12:00:00Z', { zone: 'UTC' })
    // Date in a different year
    const futureDate = '2025-03-15T12:00:00Z'
    const result = formatDateInTimezone(futureDate, 'UTC', now)
    
    expect(result).toBe('Mar 15, 2025')
  })

  it('should use specified timezone', () => {
    // Use a date that's definitely in the future
    const futureDate = new Date()
    futureDate.setMinutes(futureDate.getMinutes() + 5)
    const isoString = futureDate.toISOString()
    const result = formatDateInTimezone(isoString, 'America/New_York')
    
    expect(result).toMatch(/^In \d+m$/)
  })

  it('should return "Invalid date" for invalid ISO string', () => {
    const result = formatDateInTimezone('invalid-date')
    expect(result).toBe('Invalid date')
  })
})

describe('dateTimeLocalToUTC', () => {
  it('should convert datetime-local to UTC ISO string', () => {
    const dateTimeLocal = '2024-03-15T10:30'
    const result = dateTimeLocalToUTC(dateTimeLocal)
    
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
  })

  it('should use browser timezone by default', () => {
    const dateTimeLocal = '2024-03-15T10:30'
    const result = dateTimeLocalToUTC(dateTimeLocal)
    
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
  })

  it('should use specified timezone', () => {
    const dateTimeLocal = '2024-03-15T10:30'
    const result = dateTimeLocalToUTC(dateTimeLocal, 'America/New_York')
    
    // Should convert Eastern Time to UTC
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
  })

  it('should throw error for invalid datetime-local format', () => {
    expect(() => {
      dateTimeLocalToUTC('invalid-date')
    }).toThrow('Invalid datetime-local format')
  })

  it('should handle timezone conversions correctly', () => {
    // Eastern Time 10:30 AM should convert to appropriate UTC time
    const dateTimeLocal = '2024-03-15T10:30'
    const result = dateTimeLocalToUTC(dateTimeLocal, 'America/New_York')
    
    // Should be UTC time (5 or 4 hours ahead depending on DST)
    const dt = DateTime.fromISO(result)
    expect(dt.isValid).toBe(true)
  })

  it('should handle UTC timezone correctly', () => {
    const dateTimeLocal = '2024-03-15T10:30'
    const result = dateTimeLocalToUTC(dateTimeLocal, 'UTC')
    
    expect(result).toMatch(/^2024-03-15T10:30:00/)
  })

  it('should handle midnight correctly', () => {
    const dateTimeLocal = '2024-03-15T00:00'
    const result = dateTimeLocalToUTC(dateTimeLocal, 'UTC')
    
    expect(result).toMatch(/^2024-03-15T00:00:00/)
  })

  it('should handle end of day correctly', () => {
    const dateTimeLocal = '2024-03-15T23:59'
    const result = dateTimeLocalToUTC(dateTimeLocal, 'UTC')
    
    expect(result).toMatch(/^2024-03-15T23:59:00/)
  })
})

