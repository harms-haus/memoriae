// Parser for extracting tool calls from AI responses

import type { ToolCall } from './types'

/**
 * Parse tool calls from AI response text
 * 
 * Detects patterns like:
 * ```tool
 * return functionName(args);
 * ```
 * 
 * @param text - AI response text to parse
 * @returns Array of parsed tool calls
 */
export function parseToolCalls(text: string): ToolCall[] {
  const toolCalls: ToolCall[] = []

  // Pattern to match tool call blocks
  // Matches: ```tool\nreturn functionName(args);\n```
  // Also handles variations with or without trailing newline
  const toolCallPattern = /```tool\s*\n\s*return\s+(\w+)\s*\(([^)]*)\)\s*;?\s*\n?```/g

  let match: RegExpExecArray | null
  while ((match = toolCallPattern.exec(text)) !== null) {
    const toolName = match[1]
    const argsText = match[2]?.trim() || ''
    const rawText = match[0] || ''

    if (!toolName) {
      continue
    }

    try {
      const args = parseArguments(argsText)
      toolCalls.push({
        toolName,
        arguments: args,
        rawText,
      })
    } catch (error) {
      // Skip malformed tool calls but log for debugging
      console.warn(`Failed to parse tool call: ${rawText}`, error)
    }
  }

  return toolCalls
}

/**
 * Parse function arguments from a string
 * Supports: string, number, boolean, object, array literals
 * 
 * @param argsText - Comma-separated arguments as string
 * @returns Array of parsed argument values
 */
function parseArguments(argsText: string): unknown[] {
  if (!argsText.trim()) {
    return []
  }

  const args: unknown[] = []
  let current = ''
  let depth = 0 // Track nesting depth for objects/arrays
  let inString = false
  let stringChar = '' // Track which quote character started the string

  for (let i = 0; i < argsText.length; i++) {
    const char = argsText[i]
    const prevChar = i > 0 ? argsText[i - 1] : ''

    // Handle string literals
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
        current += char
      } else if (char === stringChar) {
        inString = false
        stringChar = ''
        current += char
      } else {
        current += char
      }
      continue
    }

    if (inString) {
      current += char
      continue
    }

    // Track object/array nesting
    if (char === '{' || char === '[') {
      depth++
      current += char
    } else if (char === '}' || char === ']') {
      depth--
      current += char
    } else if (char === ',' && depth === 0) {
      // Comma at top level - end of argument
      args.push(parseValue(current.trim()))
      current = ''
    } else {
      current += char
    }
  }

  // Add the last argument
  if (current.trim()) {
    args.push(parseValue(current.trim()))
  }

  return args
}

/**
 * Parse a single argument value
 * 
 * @param value - String representation of the value
 * @returns Parsed value (string, number, boolean, object, array)
 */
function parseValue(value: string): unknown {
  value = value.trim()

  // Empty string
  if (value === '') {
    return ''
  }

  // String literals
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    // Remove quotes and unescape
    const unquoted = value.slice(1, -1)
    return unquoted.replace(/\\(.)/g, '$1')
  }

  // Boolean literals
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }

  // null
  if (value === 'null') {
    return null
  }

  // undefined
  if (value === 'undefined') {
    return undefined
  }

  // Number (integer or float)
  const numberMatch = value.match(/^-?\d+(\.\d+)?$/)
  if (numberMatch) {
    return parseFloat(value)
  }

  // Object or array (JSON)
  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value)
    } catch {
      // If JSON parsing fails, return as string
      return value
    }
  }

  // Default: return as string
  return value
}

