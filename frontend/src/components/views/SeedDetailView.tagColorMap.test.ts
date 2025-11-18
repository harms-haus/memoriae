// Tests for tagColorMap creation in SeedDetailView
// These tests verify that tagColorMap includes ALL tags, generating colors for tags without colors
import { describe, it, expect } from 'vitest'
import { getTagColor } from '../../utils/getTagColor'

describe('SeedDetailView tagColorMap creation', () => {
  it('should include all tags in tagColorMap, using existing colors when available', () => {
    const tags = [
      { id: 'tag-1', name: 'work', color: '#ff0000' },
      { id: 'tag-2', name: 'personal', color: '#00ff00' },
    ]

    // Simulate the tagColorMap creation logic from SeedDetailView
    const tagColorMap = new Map<string, string>()
    tags.forEach(tag => {
      const color = tag.color || getTagColor(tag.name, null)
      tagColorMap.set(tag.name.toLowerCase(), color)
    })

    expect(tagColorMap.size).toBe(2)
    expect(tagColorMap.get('work')).toBe('#ff0000')
    expect(tagColorMap.get('personal')).toBe('#00ff00')
  })

  it('should generate colors for tags without colors (empty string)', () => {
    const tags = [
      { id: 'tag-1', name: 'work', color: '' }, // Empty string
      { id: 'tag-2', name: 'personal', color: '#00ff00' },
    ]

    // Simulate the tagColorMap creation logic
    const tagColorMap = new Map<string, string>()
    tags.forEach(tag => {
      const color = tag.color || getTagColor(tag.name, null)
      tagColorMap.set(tag.name.toLowerCase(), color)
    })

    expect(tagColorMap.size).toBe(2)
    // work should have a generated color (not empty string)
    const workColor = tagColorMap.get('work')
    expect(workColor).toBeTruthy()
    expect(workColor).not.toBe('')
    expect(typeof workColor).toBe('string')
    expect(workColor!.length).toBeGreaterThan(0)

    // personal should have the provided color
    expect(tagColorMap.get('personal')).toBe('#00ff00')
  })

  it('should generate colors for all tags when all have empty string colors', () => {
    const tags = [
      { id: 'tag-1', name: 'work', color: '' },
      { id: 'tag-2', name: 'personal', color: '' },
      { id: 'tag-3', name: 'important', color: '' },
    ]

    // Simulate the tagColorMap creation logic
    const tagColorMap = new Map<string, string>()
    tags.forEach(tag => {
      const color = tag.color || getTagColor(tag.name, null)
      tagColorMap.set(tag.name.toLowerCase(), color)
    })

    expect(tagColorMap.size).toBe(3)
    // All should have generated colors
    tags.forEach(tag => {
      const color = tagColorMap.get(tag.name.toLowerCase())
      expect(color).toBeTruthy()
      expect(color).not.toBe('')
      expect(typeof color).toBe('string')
    })
  })

  it('should use lowercase tag names as keys in tagColorMap', () => {
    const tags = [
      { id: 'tag-1', name: 'Work', color: '#ff0000' }, // Mixed case
      { id: 'tag-2', name: 'PERSONAL', color: '#00ff00' }, // Uppercase
    ]

    // Simulate the tagColorMap creation logic
    const tagColorMap = new Map<string, string>()
    tags.forEach(tag => {
      const color = tag.color || getTagColor(tag.name, null)
      tagColorMap.set(tag.name.toLowerCase(), color)
    })

    expect(tagColorMap.size).toBe(2)
    // Keys should be lowercase
    expect(tagColorMap.has('work')).toBe(true)
    expect(tagColorMap.has('personal')).toBe(true)
    expect(tagColorMap.has('Work')).toBe(false)
    expect(tagColorMap.has('PERSONAL')).toBe(false)
  })

  it('should generate consistent colors for same tag name', () => {
    const tags = [
      { id: 'tag-1', name: 'work', color: '' },
    ]

    // Simulate the tagColorMap creation logic twice
    const tagColorMap1 = new Map<string, string>()
    tags.forEach(tag => {
      const color = tag.color || getTagColor(tag.name, null)
      tagColorMap1.set(tag.name.toLowerCase(), color)
    })

    const tagColorMap2 = new Map<string, string>()
    tags.forEach(tag => {
      const color = tag.color || getTagColor(tag.name, null)
      tagColorMap2.set(tag.name.toLowerCase(), color)
    })

    // Same tag should get same generated color
    expect(tagColorMap1.get('work')).toBe(tagColorMap2.get('work'))
  })

  it('should handle mixed scenarios: some tags with colors, some without', () => {
    const tags = [
      { id: 'tag-1', name: 'work', color: '#ff0000' }, // Has color
      { id: 'tag-2', name: 'personal', color: '' }, // Empty string
      { id: 'tag-3', name: 'important', color: '#00ff00' }, // Has color
      { id: 'tag-4', name: 'urgent', color: '' }, // Empty string
    ]

    // Simulate the tagColorMap creation logic
    const tagColorMap = new Map<string, string>()
    tags.forEach(tag => {
      const color = tag.color || getTagColor(tag.name, null)
      tagColorMap.set(tag.name.toLowerCase(), color)
    })

    expect(tagColorMap.size).toBe(4)
    // Tags with colors should use provided colors
    expect(tagColorMap.get('work')).toBe('#ff0000')
    expect(tagColorMap.get('important')).toBe('#00ff00')

    // Tags without colors should have generated colors
    const personalColor = tagColorMap.get('personal')
    expect(personalColor).toBeTruthy()
    expect(personalColor).not.toBe('')

    const urgentColor = tagColorMap.get('urgent')
    expect(urgentColor).toBeTruthy()
    expect(urgentColor).not.toBe('')
  })
})
