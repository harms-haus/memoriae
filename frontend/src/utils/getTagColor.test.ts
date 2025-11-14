// getTagColor utility tests
import { describe, it, expect } from 'vitest'
import { getTagColor } from './getTagColor'

describe('getTagColor', () => {
  it('should return existing color when provided', () => {
    expect(getTagColor('test-tag', '#ff0000')).toBe('#ff0000')
  })

  it('should return existing color even when null is passed as tagName', () => {
    expect(getTagColor('', '#00ff00')).toBe('#00ff00')
  })

  it('should generate consistent color for same tag name', () => {
    const color1 = getTagColor('work')
    const color2 = getTagColor('work')
    expect(color1).toBe(color2)
  })

  it('should generate different colors for different tag names', () => {
    const color1 = getTagColor('work')
    const color2 = getTagColor('personal')
    expect(color1).not.toBe(color2)
  })

  it('should return a color from theme palette when no existing color', () => {
    const themeColors = [
      '#ffd43b', // yellow
      '#4fc3f7', // blue
      '#66bb6a', // green
      '#ab47bc', // purple
      '#ec407a', // pink
      '#ff9800', // orange
    ]

    const color = getTagColor('test-tag')
    expect(themeColors).toContain(color)
  })

  it('should handle empty string tag name', () => {
    const color = getTagColor('')
    expect(typeof color).toBe('string')
    expect(color.length).toBeGreaterThan(0)
  })

  it('should handle special characters in tag name', () => {
    const color1 = getTagColor('tag-with-dashes')
    const color2 = getTagColor('tag_with_underscores')
    const color3 = getTagColor('tag.with.dots')
    
    expect(typeof color1).toBe('string')
    expect(typeof color2).toBe('string')
    expect(typeof color3).toBe('string')
  })

  it('should handle unicode characters in tag name', () => {
    const color = getTagColor('tag-émoji-🚀')
    expect(typeof color).toBe('string')
    expect(color.length).toBeGreaterThan(0)
  })

  it('should prioritize existing color over generated color', () => {
    const existingColor = '#custom-color'
    const generatedColor = getTagColor('work')
    const result = getTagColor('work', existingColor)
    
    expect(result).toBe(existingColor)
    expect(result).not.toBe(generatedColor)
  })

  it('should handle very long tag names', () => {
    const longTagName = 'a'.repeat(1000)
    const color = getTagColor(longTagName)
    expect(typeof color).toBe('string')
    expect(color.length).toBeGreaterThan(0)
  })

  it('should handle null existing color', () => {
    const color = getTagColor('test-tag', null)
    expect(typeof color).toBe('string')
    expect(color.length).toBeGreaterThan(0)
  })

  it('should handle undefined existing color', () => {
    const color = getTagColor('test-tag', undefined)
    expect(typeof color).toBe('string')
    expect(color.length).toBeGreaterThan(0)
  })
})

