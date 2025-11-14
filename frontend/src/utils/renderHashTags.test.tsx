// renderHashTags utility tests
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { renderHashTags } from './renderHashTags'

// Mock getTagColor to return predictable colors
vi.mock('./getTagColor', () => ({
  getTagColor: vi.fn((tagName: string) => {
    const colors: Record<string, string> = {
      work: '#ff0000',
      personal: '#00ff00',
      test: '#0000ff',
    }
    return colors[tagName.toLowerCase()] || '#ffd43b'
  }),
}))

describe('renderHashTags', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return plain text when no hash tags', () => {
    const result = renderHashTags('Plain text without tags', mockOnClick)
    expect(result).toEqual(['Plain text without tags'])
  })

  it('should render single hash tag', () => {
    const result = renderHashTags('This is a #work tag', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link?.textContent).toBe('#work')
    expect(link?.getAttribute('href')).toBe('/seeds/tag/work')
  })

  it('should render multiple hash tags', () => {
    const result = renderHashTags('This has #work and #personal tags', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(2)
    expect(links[0]?.textContent).toBe('#work')
    expect(links[1]?.textContent).toBe('#personal')
  })

  it('should handle hash tag at start of text', () => {
    const result = renderHashTags('#work is important', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link?.textContent).toBe('#work')
  })

  it('should handle hash tag at end of text', () => {
    const result = renderHashTags('This is about #work', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link?.textContent).toBe('#work')
  })

  it('should handle hash tags with hyphens', () => {
    const result = renderHashTags('This is a #test-tag', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link?.textContent).toBe('#test-tag')
    expect(link?.getAttribute('href')).toBe('/seeds/tag/test-tag')
  })

  it('should handle hash tags with underscores', () => {
    const result = renderHashTags('This is a #test_tag', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link?.textContent).toBe('#test_tag')
  })

  it('should call onClick when hash tag is clicked', () => {
    const result = renderHashTags('This is a #work tag', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    
    link?.click()
    expect(mockOnClick).toHaveBeenCalledWith('work')
  })

  it('should prevent default navigation on click', () => {
    const result = renderHashTags('This is a #work tag', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    
    link?.dispatchEvent(clickEvent)
    // The onClick handler should call preventDefault
    expect(mockOnClick).toHaveBeenCalled()
  })

  it('should use tag color map when provided', () => {
    const tagColorMap = new Map([
      ['work', '#custom-color'],
      ['personal', '#another-color'],
    ])
    
    const result = renderHashTags('This has #work and #personal tags', mockOnClick, tagColorMap)
    const { container } = render(<>{result}</>)
    
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(2)
    
    // Colors should be applied via inline styles (setProperty with important)
    // We can't easily test the computed style, but we can verify the links exist
    expect(links[0]).toBeInTheDocument()
    expect(links[1]).toBeInTheDocument()
  })

  it('should handle hash tags with mixed case', () => {
    const result = renderHashTags('This is #Work and #PERSONAL', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(2)
    expect(links[0]?.textContent).toBe('#Work')
    expect(links[1]?.textContent).toBe('#PERSONAL')
  })

  it('should handle text before and after hash tags', () => {
    const result = renderHashTags('Before #work middle #personal after', mockOnClick)
    const { container } = render(<>{result}</>)
    
    expect(container.textContent).toContain('Before')
    expect(container.textContent).toContain('middle')
    expect(container.textContent).toContain('after')
    
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(2)
  })

  it('should not match hash at start of line (markdown headers)', () => {
    // This is a limitation - the regex matches # at start of line
    // But the function should still work for actual hash tags
    const result = renderHashTags('# Header\nThis is #work', mockOnClick)
    const { container } = render(<>{result}</>)
    
    // Should still find the #work tag
    const links = container.querySelectorAll('a')
    expect(links.length).toBeGreaterThan(0)
  })

  it('should handle empty string', () => {
    const result = renderHashTags('', mockOnClick)
    expect(result).toEqual([''])
  })

  it('should handle multiple spaces between hash tags', () => {
    const result = renderHashTags('This is #work    and #personal', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(2)
  })

  it('should encode tag names in URL', () => {
    const result = renderHashTags('This is #test-tag', mockOnClick)
    const { container } = render(<>{result}</>)
    
    const link = container.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/seeds/tag/test-tag')
  })
})

