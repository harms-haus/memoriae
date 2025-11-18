import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { processToolCalls, useToolsWithAI } from './injector'
import type { OpenRouterClient, OpenRouterChatCompletionResponse } from '../../openrouter/client'
import { TokenUsageService } from '../../token-usage'
import type { ToolDefinition } from './types'

// Suppress logs during tests
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// Mock TokenUsageService
vi.mock('../../token-usage', () => ({
  TokenUsageService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock tool executor
vi.mock('./executor', () => ({
  ToolExecutor: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      result: JSON.stringify({ result: 'done' }),
    }),
    executeAll: vi.fn().mockResolvedValue([{
      success: true,
      result: 'tool result',
    }]),
  })),
}))

// Mock tool implementations
vi.mock('./implementations', () => ({
  getTool: vi.fn((name: string) => {
    if (name === 'finalResponse') {
      return {
        name: 'finalResponse',
        description: 'Final response tool',
        signature: 'finalResponse(data: any)',
        parameters: [
          { name: 'data', type: 'any', required: true, description: 'Final response data' },
        ],
        handler: vi.fn((data: any) => data),
      }
    }
    return null
  }),
}))

describe('Tool Injector Integration', () => {
  let mockOpenRouterClient: OpenRouterClient
  let trackingContext: Record<string, any>

  beforeEach(() => {
    // Suppress logs
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()

    // Reset mocks
    vi.clearAllMocks()

    trackingContext = {
      userId: 'user-1',
      automationId: 'auto-1',
      automationName: 'tag',
    }

    // Setup mock OpenRouter client
    mockOpenRouterClient = {
      createChatCompletion: vi.fn(),
      generateText: vi.fn(),
      getModels: vi.fn(),
      setApiKey: vi.fn(),
      setDefaultModel: vi.fn(),
      getDefaultModel: vi.fn(),
    } as any
  })

  afterEach(() => {
    // Restore logs
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  })

  describe('processToolCalls', () => {
    it('should pass tracking context through iterations', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '```tool\nreturn finalResponse({ result: "done" });\n```',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockOpenRouterClient.createChatCompletion).mockResolvedValue(mockResponse)

      await processToolCalls({
        systemPrompt: 'You are helpful',
        userPrompt: 'Do something',
        tools: [],
        openrouter: mockOpenRouterClient,
        maxIterations: 5,
        trackingContext,
      })

      expect(mockOpenRouterClient.createChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        trackingContext
      )
    })

    it('should pass tracking context through multiple iterations', async () => {
      const mockResponse1: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '```tool\nreturn someTool();\n```',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      const mockResponse2: OpenRouterChatCompletionResponse = {
        id: 'resp-2',
        model: 'openai/gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '```tool\nreturn finalResponse({ result: "done" });\n```',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        },
        created: Date.now(),
      }

      const mockFinalResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-3',
        model: 'openai/gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '{"result": "done"}',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 15,
          total_tokens: 45,
        },
        created: Date.now(),
      }

      vi.mocked(mockOpenRouterClient.createChatCompletion)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)
        .mockResolvedValueOnce(mockFinalResponse)

      await processToolCalls({
        systemPrompt: 'You are helpful',
        userPrompt: 'Do something',
        tools: [{
          name: 'someTool',
          description: 'A tool',
          signature: 'someTool()',
          parameters: [],
        }],
        openrouter: mockOpenRouterClient,
        maxIterations: 5,
        trackingContext,
      })

      // Should be called 3 times (initial + after tool execution + final response)
      expect(mockOpenRouterClient.createChatCompletion).toHaveBeenCalledTimes(3)
      expect(mockOpenRouterClient.createChatCompletion).toHaveBeenNthCalledWith(
        1,
        expect.any(Array),
        expect.any(Object),
        trackingContext
      )
      expect(mockOpenRouterClient.createChatCompletion).toHaveBeenNthCalledWith(
        2,
        expect.any(Array),
        expect.any(Object),
        trackingContext
      )
      expect(mockOpenRouterClient.createChatCompletion).toHaveBeenNthCalledWith(
        3,
        expect.any(Array),
        expect.any(Object),
        trackingContext
      )
    })

    it('should handle missing tracking context gracefully', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '```tool\nreturn finalResponse({ result: "done" });\n```',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockOpenRouterClient.createChatCompletion).mockResolvedValue(mockResponse)

      await processToolCalls({
        systemPrompt: 'You are helpful',
        userPrompt: 'Do something',
        tools: [],
        openrouter: mockOpenRouterClient,
        maxIterations: 5,
        // No trackingContext
      })

      expect(mockOpenRouterClient.createChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        undefined
      )
    })

    it('should handle max iterations reached', async () => {
      // Return responses that don't call finalResponse and aren't valid JSON
      // This will cause the loop to continue until max iterations
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '```tool\nreturn someTool();\n```', // Tool call but not finalResponse
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      // Mock to return the same response every time (tool call but not finalResponse)
      vi.mocked(mockOpenRouterClient.createChatCompletion).mockResolvedValue(mockResponse)

      await expect(
        processToolCalls({
          systemPrompt: 'You are helpful',
          userPrompt: 'Do something',
          tools: [{
            name: 'someTool',
            description: 'A tool',
            signature: 'someTool()',
            parameters: [],
          }],
          openrouter: mockOpenRouterClient,
          maxIterations: 2, // Low limit to trigger max iterations
          trackingContext,
        })
      ).rejects.toThrow('Maximum iterations')
    })
  })

  describe('useToolsWithAI', () => {
    it('should pass tracking context through', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: '```tool\nreturn finalResponse({ result: "done" });\n```',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockOpenRouterClient.createChatCompletion).mockResolvedValue(mockResponse)

      await useToolsWithAI({
        baseSystemPrompt: 'You are helpful',
        userPrompt: 'Do something',
        tools: [],
        openrouter: mockOpenRouterClient,
        maxIterations: 5,
        trackingContext,
      })

      expect(mockOpenRouterClient.createChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        trackingContext
      )
    })
  })
})

