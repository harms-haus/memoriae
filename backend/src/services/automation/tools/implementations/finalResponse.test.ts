// Tests for finalResponse tool

import { describe, it, expect } from 'vitest'
import { finalResponseTool } from './finalResponse'

describe('finalResponseTool', () => {
  it('should return response format string', async () => {
    const format = 'Return a JSON object with keys: result, data'
    const result = await finalResponseTool.implementation([format])

    expect(result).toBe(format)
  })

  it('should throw error for non-string argument', async () => {
    await expect(
      finalResponseTool.implementation([123])
    ).rejects.toThrow('responseFormat must be a string')
  })

  it('should handle empty string', async () => {
    const result = await finalResponseTool.implementation([''])
    expect(result).toBe('')
  })
})

