// Tests for tool executor

import { describe, it, expect, beforeEach } from 'vitest'
import { ToolExecutor } from './executor'
import { ToolRegistry } from './registry'
import type { ToolDefinition, ToolCall } from './types'

describe('ToolExecutor', () => {
  let registry: ToolRegistry
  let executor: ToolExecutor

  beforeEach(() => {
    registry = ToolRegistry.getInstance()
    registry.clear()
    executor = new ToolExecutor(registry)
  })

  it('should execute a tool successfully', async () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(string arg): string',
      description: 'A test tool',
      parameters: [
        { name: 'arg', type: 'string', required: true },
      ],
      implementation: async (args: unknown[]) => {
        return `Result: ${args[0]}`
      },
    }

    registry.register(tool)

    const toolCall: ToolCall = {
      toolName: 'testTool',
      arguments: ['test'],
      rawText: 'testTool("test")',
    }

    const result = await executor.execute(toolCall)

    expect(result.success).toBe(true)
    expect(result.result).toBe('Result: test')
    expect(result.toolName).toBe('testTool')
  })

  it('should return error for non-existent tool', async () => {
    const toolCall: ToolCall = {
      toolName: 'nonExistent',
      arguments: [],
      rawText: 'nonExistent()',
    }

    const result = await executor.execute(toolCall)

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('should validate argument count', async () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(string arg1, string arg2): void',
      description: 'A test tool',
      parameters: [
        { name: 'arg1', type: 'string', required: true },
        { name: 'arg2', type: 'string', required: true },
      ],
      implementation: async () => {},
    }

    registry.register(tool)

    const toolCall: ToolCall = {
      toolName: 'testTool',
      arguments: ['only one arg'],
      rawText: 'testTool("only one arg")',
    }

    const result = await executor.execute(toolCall)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Expected at least')
  })

  it('should validate argument types', async () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(string arg): void',
      description: 'A test tool',
      parameters: [
        { name: 'arg', type: 'string', required: true },
      ],
      implementation: async () => {},
    }

    registry.register(tool)

    const toolCall: ToolCall = {
      toolName: 'testTool',
      arguments: [123], // Wrong type
      rawText: 'testTool(123)',
    }

    const result = await executor.execute(toolCall)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Expected string')
  })

  it('should handle tool execution errors', async () => {
    const tool: ToolDefinition = {
      name: 'failingTool',
      signature: 'failingTool(): void',
      description: 'A failing tool',
      parameters: [],
      implementation: async () => {
        throw new Error('Tool execution failed')
      },
    }

    registry.register(tool)

    const toolCall: ToolCall = {
      toolName: 'failingTool',
      arguments: [],
      rawText: 'failingTool()',
    }

    const result = await executor.execute(toolCall)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Tool execution failed')
  })

  it('should execute multiple tool calls', async () => {
    const tool1: ToolDefinition = {
      name: 'tool1',
      signature: 'tool1(): string',
      description: 'Tool 1',
      parameters: [],
      implementation: async () => 'result1',
    }

    const tool2: ToolDefinition = {
      name: 'tool2',
      signature: 'tool2(): string',
      description: 'Tool 2',
      parameters: [],
      implementation: async () => 'result2',
    }

    registry.register(tool1)
    registry.register(tool2)

    const toolCalls: ToolCall[] = [
      {
        toolName: 'tool1',
        arguments: [],
        rawText: 'tool1()',
      },
      {
        toolName: 'tool2',
        arguments: [],
        rawText: 'tool2()',
      },
    ]

    const results = await executor.executeAll(toolCalls)

    expect(results).toHaveLength(2)
    expect(results[0]?.success).toBe(true)
    expect(results[0]?.result).toBe('result1')
    expect(results[1]?.success).toBe(true)
    expect(results[1]?.result).toBe('result2')
  })

  it('should handle optional parameters', async () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(string arg1, string arg2?): string',
      description: 'A test tool',
      parameters: [
        { name: 'arg1', type: 'string', required: true },
        { name: 'arg2', type: 'string', required: false },
      ],
      implementation: async (args: unknown[]) => {
        return `Result: ${args[0]}, ${args[1] ?? 'default'}`
      },
    }

    registry.register(tool)

    const toolCall: ToolCall = {
      toolName: 'testTool',
      arguments: ['required'],
      rawText: 'testTool("required")',
    }

    const result = await executor.execute(toolCall)

    expect(result.success).toBe(true)
    expect(result.result).toBe('Result: required, default')
  })
})

