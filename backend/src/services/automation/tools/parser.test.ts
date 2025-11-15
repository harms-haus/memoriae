// Tests for tool call parser

import { describe, it, expect } from 'vitest'
import { parseToolCalls } from './parser'

describe('parseToolCalls', () => {
  it('should parse a simple tool call', () => {
    const text = '```tool\nreturn wget("https://example.com", 30000);\n```'
    const calls = parseToolCalls(text)
    
    expect(calls).toHaveLength(1)
    expect(calls[0]?.toolName).toBe('wget')
    expect(calls[0]?.arguments).toEqual(['https://example.com', 30000])
  })

  it('should parse multiple tool calls', () => {
    const text = '```tool\nreturn wget("https://example.com", 30000);\n```\n\n```tool\nreturn finalResponse(\'Return JSON\');\n```'
    const calls = parseToolCalls(text)
    
    expect(calls).toHaveLength(2)
    expect(calls[0]?.toolName).toBe('wget')
    expect(calls[1]?.toolName).toBe('finalResponse')
  })

  it('should parse string arguments with quotes', () => {
    const text = '```tool\nreturn wget("https://example.com", 30000);\n```'
    const calls = parseToolCalls(text)
    
    expect(calls[0]?.arguments[0]).toBe('https://example.com')
  })

  it('should parse number arguments', () => {
    const text = '```tool\nreturn wget("https://example.com", 30000);\n```'
    const calls = parseToolCalls(text)
    
    expect(calls[0]?.arguments[1]).toBe(30000)
  })

  it('should parse boolean arguments', () => {
    const text = '```tool\nreturn someTool(true, false);\n```'
    const calls = parseToolCalls(text)
    
    expect(calls[0]?.arguments).toEqual([true, false])
  })

  it('should parse object arguments', () => {
    const text = '```tool\nreturn someTool({"key": "value"});\n```'
    const calls = parseToolCalls(text)
    
    expect(calls[0]?.arguments).toEqual([{ key: 'value' }])
  })

  it('should parse array arguments', () => {
    const text = '```tool\nreturn someTool([1, 2, 3]);\n```'
    const calls = parseToolCalls(text)
    
    expect(calls[0]?.arguments).toEqual([[1, 2, 3]])
  })

  it('should parse empty arguments', () => {
    const text = '```tool\nreturn someTool();\n```'
    const calls = parseToolCalls(text)
    
    expect(calls[0]?.arguments).toEqual([])
  })

  it('should handle nested objects and arrays', () => {
    const text = '```tool\nreturn someTool({"items": [1, 2, {"nested": true}]});\n```'
    const calls = parseToolCalls(text)
    
    expect(calls[0]?.arguments).toEqual([{ items: [1, 2, { nested: true }] }])
  })

  it('should return empty array when no tool calls found', () => {
    const text = 'This is just regular text with no tool calls.'
    const calls = parseToolCalls(text)
    
    expect(calls).toEqual([])
  })

  it('should handle malformed tool calls gracefully', () => {
    const text = '```tool\nreturn invalid syntax;\n```'
    const calls = parseToolCalls(text)
    
    // Should skip malformed calls
    expect(calls).toHaveLength(0)
  })
})

