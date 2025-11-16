/**
 * Theme accent colors available for tags
 */
const THEME_COLORS = [
  '#ffd43b', // yellow
  '#4fc3f7', // blue
  '#66bb6a', // green
  '#ab47bc', // purple
  '#ec407a', // pink
  '#ff9800', // orange
] as const satisfies readonly string[]

/**
 * Generates a consistent color for a tag based on its name
 * If the tag already has a color, returns that color
 * Otherwise, generates a consistent color from the theme palette
 * 
 * @param tagName - The name of the tag (may be undefined/null)
 * @param existingColor - Optional existing color for the tag
 * @returns A color value (hex code or CSS variable)
 */
export function getTagColor(tagName: string | undefined | null, existingColor?: string | null): string {
  // If tag already has a color, use it
  if (existingColor) {
    return existingColor
  }

  // Handle undefined/null tag names
  if (!tagName) {
    return THEME_COLORS[0] as string // Default to first color
  }

  // Generate a consistent color based on tag name
  // This ensures the same tag always gets the same color
  let hash = 0
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Use hash to select a color from the theme palette
  // colorIndex is always valid (0 to length-1) due to modulo, so access is safe
  const colorIndex = Math.abs(hash) % THEME_COLORS.length
  return THEME_COLORS[colorIndex] as string
}

