// Tests for tool injector

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateToolPrompt, detectToolCalls, useToolsWithAI } from './injector'
import type { ToolDefinition } from './types'
import type { OpenRouterClient } from '../../openrouter/client'
import { initializeTools } from './implementations'
import { ToolRegistry } from './registry'

describe('generateToolPrompt', () => {
  it('should generate prompt with tool descriptions', () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(string arg): string',
      description: 'A test tool that does something',
      parameters: [
        { name: 'arg', type: 'string', description: 'An argument', required: true },
      ],
      implementation: async () => 'result',
    }

    const prompt = generateToolPrompt([tool])

    expect(prompt).toContain('testTool')
    expect(prompt).toContain('A test tool that does something')
    expect(prompt).toContain('arg: string')
    expect(prompt).toContain('An argument')
    expect(prompt).toContain('```tool')
  })

  it('should include finalResponse instructions', () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(): void',
      description: 'A test tool',
      parameters: [],
      implementation: async () => {},
    }

    const prompt = generateToolPrompt([tool])

    expect(prompt).toContain('finalResponse()')
  })
})

describe('detectToolCalls', () => {
  it('should detect tool calls in text', () => {
    const text = '```tool\nreturn wget("https://example.com", 30000);\n```'
    const calls = detectToolCalls(text)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.toolName).toBe('wget')
  })

  it('should return empty array when no tool calls found', () => {
    const text = 'This is just regular text.'
    const calls = detectToolCalls(text)

    expect(calls).toEqual([])
  })
})

describe('useToolsWithAI', () => {
  let mockOpenRouter: OpenRouterClient
  let mockCreateChatCompletion: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Clear registry and initialize tools so finalResponse is available
    const registry = ToolRegistry.getInstance()
    registry.clear()
    initializeTools()
    
    mockCreateChatCompletion = vi.fn()
    mockOpenRouter = {
      createChatCompletion: mockCreateChatCompletion,
    } as unknown as OpenRouterClient
  })

  it('should handle simple tool call and final response', async () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(): string',
      description: 'A test tool',
      parameters: [],
      implementation: async () => 'tool result',
    }

    // First call: AI makes tool call
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{
        message: {
          content: '```tool\nreturn testTool();\n```',
        },
      }],
    })

    // Second call: AI calls finalResponse
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{
        message: {
          content: '```tool\nreturn finalResponse("Return JSON");\n```',
        },
      }],
    })

    // Third call: Final response
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{
        message: {
          content: '{"result": "success"}',
        },
      }],
    })

    const result = await useToolsWithAI({
      baseSystemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Do something',
      tools: [tool],
      openrouter: mockOpenRouter,
      maxIterations: 10,
    })

    expect(result).toEqual({ result: 'success' })
    expect(mockCreateChatCompletion).toHaveBeenCalledTimes(3)
  })

  it('should handle max iterations limit', async () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(): string',
      description: 'A test tool',
      parameters: [],
      implementation: async () => 'result',
    }

    // Keep returning tool calls without finalResponse
    mockCreateChatCompletion.mockResolvedValue({
      choices: [{
        message: {
          content: '```tool\nreturn testTool();\n```',
        },
      }],
    })

    await expect(
      useToolsWithAI({
        baseSystemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Do something',
        tools: [tool],
        openrouter: mockOpenRouter,
        maxIterations: 2,
      })
    ).rejects.toThrow('Maximum iterations')
  })

  it('should automatically include finalResponse tool even when not explicitly passed', async () => {
    const tool: ToolDefinition = {
      name: 'testTool',
      signature: 'testTool(): string',
      description: 'A test tool',
      parameters: [],
      implementation: async () => 'tool result',
    }

    // First call: AI makes tool call
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{
        message: {
          content: '```tool\nreturn testTool();\n```',
        },
      }],
    })

    // Second call: AI calls finalResponse (which should be available even though not passed)
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{
        message: {
          content: '```tool\nreturn finalResponse("Return JSON");\n```',
        },
      }],
    })

    // Third call: Final response
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{
        message: {
          content: '{"result": "success"}',
        },
      }],
    })

    // Call useToolsWithAI WITHOUT explicitly including finalResponseTool
    const result = await useToolsWithAI({
      baseSystemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Do something',
      tools: [tool], // Only testTool, no finalResponseTool
      openrouter: mockOpenRouter,
      maxIterations: 10,
    })

    // Should still work because finalResponse is automatically included
    expect(result).toEqual({ result: 'success' })
    expect(mockCreateChatCompletion).toHaveBeenCalledTimes(3)
    
    // Verify that the first call included finalResponse in the prompt
    const firstCall = mockCreateChatCompletion.mock.calls[0]
    expect(firstCall).toBeDefined()
    const firstSystemMessage = firstCall?.[0]?.[0]
    if (firstSystemMessage && typeof firstSystemMessage === 'object' && 'content' in firstSystemMessage) {
      expect(firstSystemMessage.content).toContain('finalResponse')
    }
  })
})

