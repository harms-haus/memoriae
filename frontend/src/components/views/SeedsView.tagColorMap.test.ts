// Tests for tagColorMap creation in SeedsView
// These tests verify that tagColorMap includes ALL tags, generating colors for tags without colors
import { describe, it, expect } from 'vitest'
import { getTagColor } from '../../utils/getTagColor'

describe('SeedsView tagColorMap creation', () => {
  it('should include all tags in tagColorMap, using existing colors when available', () => {
    const tags = [
      { id: 'tag-1', name: 'work', color: '#ff0000' },
      { id: 'tag-2', name: 'personal', color: '#00ff00' },
    ]

    // Simulate the tagColorMap creation logic from SeedsView
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
})
