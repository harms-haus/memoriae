import { DateTime } from 'luxon'

/**
 * Get a list of common IANA timezone identifiers
 * Returns a sorted list of timezones grouped by region
 */
export function getTimezones(): Array<{ value: string; label: string }> {
  // Common timezones grouped by region
  const timezones = [
    // Americas
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'America/Phoenix', label: 'Arizona' },
    { value: 'America/Anchorage', label: 'Alaska' },
    { value: 'America/Toronto', label: 'Toronto' },
    { value: 'America/Vancouver', label: 'Vancouver' },
    { value: 'America/Mexico_City', label: 'Mexico City' },
    { value: 'America/Sao_Paulo', label: 'São Paulo' },
    { value: 'America/Buenos_Aires', label: 'Buenos Aires' },
    { value: 'America/Lima', label: 'Lima' },
    
    // Europe
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Europe/Rome', label: 'Rome' },
    { value: 'Europe/Madrid', label: 'Madrid' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam' },
    { value: 'Europe/Brussels', label: 'Brussels' },
    { value: 'Europe/Vienna', label: 'Vienna' },
    { value: 'Europe/Stockholm', label: 'Stockholm' },
    { value: 'Europe/Zurich', label: 'Zurich' },
    { value: 'Europe/Athens', label: 'Athens' },
    { value: 'Europe/Moscow', label: 'Moscow' },
    { value: 'Europe/Istanbul', label: 'Istanbul' },
    
    // Asia
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'Asia/Seoul', label: 'Seoul' },
    { value: 'Asia/Dubai', label: 'Dubai' },
    { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata' },
    { value: 'Asia/Bangkok', label: 'Bangkok' },
    { value: 'Asia/Jakarta', label: 'Jakarta' },
    { value: 'Asia/Manila', label: 'Manila' },
    { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur' },
    { value: 'Asia/Taipei', label: 'Taipei' },
    { value: 'Asia/Jerusalem', label: 'Jerusalem' },
    { value: 'Asia/Riyadh', label: 'Riyadh' },
    
    // Oceania
    { value: 'Australia/Sydney', label: 'Sydney' },
    { value: 'Australia/Melbourne', label: 'Melbourne' },
    { value: 'Australia/Brisbane', label: 'Brisbane' },
    { value: 'Australia/Perth', label: 'Perth' },
    { value: 'Pacific/Auckland', label: 'Auckland' },
    { value: 'Pacific/Honolulu', label: 'Honolulu' },
    
    // Africa
    { value: 'Africa/Cairo', label: 'Cairo' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg' },
    { value: 'Africa/Lagos', label: 'Lagos' },
    { value: 'Africa/Nairobi', label: 'Nairobi' },
    
    // UTC
    { value: 'UTC', label: 'UTC' },
  ]
  
  return timezones.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Get the user's browser timezone
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Convert UTC ISO string to datetime-local format in user's timezone
 * 
 * @param isoString - UTC ISO string (e.g., "2024-03-15T10:30:00Z")
 * @param timezone - Optional IANA timezone identifier. If not provided, uses browser timezone.
 * @returns datetime-local format string (e.g., "2024-03-15T10:30")
 */
export function utcToDateTimeLocal(isoString: string, timezone?: string): string {
  const dt = DateTime.fromISO(isoString, { zone: 'utc' })
  
  if (!dt.isValid) {
    throw new Error(`Invalid ISO string: ${isoString}`)
  }

  // Convert to user's timezone (or browser timezone if not specified)
  const targetZone = timezone || getBrowserTimezone()
  const localDt = dt.setZone(targetZone)
  
  // Format as datetime-local (YYYY-MM-DDTHH:mm)
  return localDt.toFormat('yyyy-MM-dd\'T\'HH:mm')
}

/**
 * Format date for display in user's timezone
 * 
 * Shows relative time for near dates (e.g., "In 5m", "In 2h") or
 * formatted date for distant dates.
 * 
 * @param isoString - UTC ISO string
 * @param timezone - Optional IANA timezone identifier. If not provided, uses browser timezone.
 * @returns Formatted date string
 */
export function formatDateInTimezone(isoString: string, timezone?: string): string {
  const dt = DateTime.fromISO(isoString, { zone: 'utc' })
  
  if (!dt.isValid) {
    return 'Invalid date'
  }

  const targetZone = timezone || getBrowserTimezone()
  const localDt = dt.setZone(targetZone)
  const now = DateTime.now().setZone(targetZone)
  
  const diff = localDt.diff(now, ['minutes', 'hours', 'days'])
  
  const diffMins = Math.floor(diff.minutes)
  const diffHours = Math.floor(diff.hours)
  const diffDays = Math.floor(diff.days)

  if (diffMins < 0) {
    return `Overdue by ${Math.abs(diffMins)}m`
  }
  if (diffMins < 60) {
    return `In ${diffMins}m`
  }
  if (diffHours < 24) {
    return `In ${diffHours}h`
  }
  if (diffDays < 7) {
    return `In ${diffDays}d`
  }

  // Format date using Luxon
  if (localDt.year !== now.year) {
    return localDt.toFormat('MMM d, yyyy')
  }
  return localDt.toFormat('MMM d')
}

/**
 * Convert datetime-local input (browser timezone) to UTC ISO string
 * 
 * The datetime-local input returns a string without timezone info.
 * This function interprets it in the user's specified timezone (or browser timezone)
 * and converts it to UTC.
 * 
 * @param dateTimeLocal - datetime-local format string (e.g., "2024-03-15T10:30")
 * @param timezone - Optional IANA timezone identifier. If not provided, uses browser timezone.
 * @returns UTC ISO string
 */
export function dateTimeLocalToUTC(dateTimeLocal: string, timezone?: string): string {
  const targetZone = timezone || getBrowserTimezone()
  
  // Parse the datetime-local string as being in the target timezone
  const dt = DateTime.fromISO(dateTimeLocal, { zone: targetZone })
  
  if (!dt.isValid) {
    throw new Error(`Invalid datetime-local format: ${dateTimeLocal}`)
  }

  // Convert to UTC and return as ISO string
  return dt.toUTC().toISO() || ''
}
