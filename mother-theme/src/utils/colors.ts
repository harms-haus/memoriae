/**
 * Color Palette Utilities
 * 
 * Provides access to the mother theme color palette by reading CSS custom properties.
 * This ensures colors are always in sync with the theme without duplication.
 */

/**
 * CSS custom property names for accent colors in the mother theme
 */
export const ACCENT_COLOR_VARS = [
  '--accent-yellow',
  '--accent-blue',
  '--accent-green',
  '--accent-purple',
  '--accent-pink',
  '--accent-orange',
] as const

/**
 * Gets a theme accent color by reading CSS custom properties
 * 
 * @param index - Index into the accent color array (0-5)
 * @returns A hex color value from CSS custom properties
 * @throws Error if called outside browser environment or if color is not defined
 */
export function getAccentColor(index: number): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('getAccentColor can only be called in browser environment')
  }
  
  const root = document.documentElement
  const colorVar = ACCENT_COLOR_VARS[index]
  if (!colorVar) {
    throw new Error(`Invalid color index: ${index}. Must be between 0 and ${ACCENT_COLOR_VARS.length - 1}`)
  }
  
  const computedColor = getComputedStyle(root).getPropertyValue(colorVar).trim()
  if (!computedColor) {
    throw new Error(`CSS variable ${colorVar} is not defined in the theme`)
  }
  
  return computedColor
}

/**
 * Gets all accent colors from the theme
 * 
 * @returns Array of hex color values from CSS custom properties
 * @throws Error if called outside browser environment
 */
export function getAccentColorPalette(): string[] {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('getAccentColorPalette can only be called in browser environment')
  }
  
  return ACCENT_COLOR_VARS.map((_, index) => getAccentColor(index))
}

/**
 * Gets accent color CSS variable names
 * 
 * @returns Array of CSS custom property names (e.g., ['--accent-yellow', ...])
 */
export function getAccentColorVarNames(): readonly string[] {
  return ACCENT_COLOR_VARS
}

