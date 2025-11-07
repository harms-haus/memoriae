import { DateTime, Info } from 'luxon'

/**
 * Convert a date/time string (without timezone) from a specific timezone to UTC
 * 
 * @param dateTimeStr - Date/time string in format "YYYY-MM-DDTHH:mm:ss" (no timezone)
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 * @returns Date object in UTC
 */
export function convertLocalTimeToUTC(dateTimeStr: string, timezone: string): Date {
  // Validate timezone
  if (!Info.isValidIANAZone(timezone)) {
    throw new Error(`Invalid IANA timezone: ${timezone}`)
  }

  // Parse the date/time string and interpret it as being in the specified timezone
  const dt = DateTime.fromISO(dateTimeStr, { zone: timezone })
  
  if (!dt.isValid) {
    throw new Error(`Invalid date/time format: ${dateTimeStr} (${dt.invalidReason}: ${dt.invalidExplanation})`)
  }

  // Convert to UTC and return as Date object
  return dt.toUTC().toJSDate()
}

/**
 * Validate IANA timezone identifier
 * 
 * @param timezone - IANA timezone identifier to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  return Info.isValidIANAZone(timezone)
}
