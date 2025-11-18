import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TrackedOpenRouterClient, type TrackingContext } from './tracked-client'
import { OpenRouterClient, type OpenRouterChatCompletionResponse, type OpenRouterMessage } from './client'
import { TokenUsageService } from '../../services/token-usage'

// Suppress logs during tests
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// Mock TokenUsageService
vi.mock('../../services/token-usage', () => ({
  TokenUsageService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('TrackedOpenRouterClient', () => {
  let mockClient: OpenRouterClient
  let defaultContext: TrackingContext

  beforeEach(async () => {
    // Suppress logs
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()

    // Reset mocks
    vi.clearAllMocks()

    defaultContext = {
      userId: 'user-1',
      automationId: 'auto-1',
      automationName: 'tag',
    }

    mockClient = {
      createChatCompletion: vi.fn(),
      generateText: vi.fn(),
      getModels: vi.fn(),
      setApiKey: vi.fn(),
      setDefaultModel: vi.fn(),
      getDefaultModel: vi.fn(),
    } as unknown as OpenRouterClient
  })

  afterEach(() => {
    // Restore logs
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  })

  describe('createChatCompletion', () => {
    it('should track usage after successful API call', async () => {
      const messages: OpenRouterMessage[] = [
        { role: 'user', content: 'Hello' },
      ]

      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi there' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      const result = await trackedClient.createChatCompletion(messages, {})

      expect(result).toEqual(mockResponse)
      expect(TokenUsageService.create).toHaveBeenCalledTimes(1)
      expect(TokenUsageService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        automationId: 'auto-1',
        automationName: 'tag',
        model: 'openai/gpt-4',
        inputTokens: 10,
        outputTokens: 5,
        cachedInputTokens: undefined,
        cachedOutputTokens: undefined,
        totalTokens: 15,
        messages,
      })
    })

    it('should use default context from constructor', async () => {
      const messages: OpenRouterMessage[] = [
        { role: 'user', content: 'Hello' },
      ]

      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      await trackedClient.createChatCompletion(messages, {})

      expect(TokenUsageService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          automationId: 'auto-1',
          automationName: 'tag',
        })
      )
    })

    it('should merge override context correctly', async () => {
      const messages: OpenRouterMessage[] = [
        { role: 'user', content: 'Hello' },
      ]

      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      await trackedClient.createChatCompletion(messages, {}, {
        automationName: 'categorize', // Override
      })

      expect(TokenUsageService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          automationId: 'auto-1', // From default
          automationName: 'categorize', // From override
        })
      )
    })

    it('should handle missing cached token fields', async () => {
      const messages: OpenRouterMessage[] = [
        { role: 'user', content: 'Hello' },
      ]

      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
          // No cached fields
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      await trackedClient.createChatCompletion(messages, {})

      expect(TokenUsageService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          automationId: 'auto-1',
          automationName: 'tag',
          model: 'openai/gpt-4',
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          messages: messages,
        })
      )
      // Verify cached fields are not included when undefined
      const callArgs = vi.mocked(TokenUsageService.create).mock.calls[0]?.[0]
      expect(callArgs).not.toHaveProperty('cachedInputTokens')
      expect(callArgs).not.toHaveProperty('cachedOutputTokens')
    })

    it('should handle cached token fields when present', async () => {
      const messages: OpenRouterMessage[] = [
        { role: 'user', content: 'Hello' },
      ]

      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
          cached_prompt_tokens: 5,
          cached_completion_tokens: 2,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      await trackedClient.createChatCompletion(messages, {})

      expect(TokenUsageService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cachedInputTokens: 5,
          cachedOutputTokens: 2,
        })
      )
    })

    it('should NOT break if tracking fails', async () => {
      const messages: OpenRouterMessage[] = [
        { role: 'user', content: 'Hello' },
      ]

      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)
      vi.mocked(TokenUsageService.create).mockRejectedValue(new Error('Tracking failed'))

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      
      // Should not throw - tracking failure should be silent
      const result = await trackedClient.createChatCompletion(messages, {})
      expect(result).toEqual(mockResponse)
      
      // Give tracking promise time to fail
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Verify error was logged (suppressed in test, but should not throw)
      expect(console.error).toHaveBeenCalled()
    })

    it('should track multiple calls separately', async () => {
      const messages: OpenRouterMessage[] = [
        { role: 'user', content: 'Hello' },
      ]

      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      await trackedClient.createChatCompletion(messages, {})
      await trackedClient.createChatCompletion(messages, {})

      expect(TokenUsageService.create).toHaveBeenCalledTimes(2)
    })

    it('should return response correctly', async () => {
      const messages: OpenRouterMessage[] = [
        { role: 'user', content: 'Hello' },
      ]

      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi there' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      const result = await trackedClient.createChatCompletion(messages, {})

      expect(result).toEqual(mockResponse)
      expect(result.choices[0]?.message.content).toBe('Hi there')
    })
  })

  describe('generateText', () => {
    it('should track usage (calls createChatCompletion internally)', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Generated text' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      const result = await trackedClient.generateText('Hello', 'You are helpful')

      expect(result).toBe('Generated text')
      expect(TokenUsageService.create).toHaveBeenCalledTimes(1)
    })

    it('should use default context', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Text' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      await trackedClient.generateText('Hello')

      expect(TokenUsageService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          automationId: 'auto-1',
          automationName: 'tag',
        })
      )
    })

    it('should handle system prompt correctly', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Text' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }

      vi.mocked(mockClient.createChatCompletion).mockResolvedValue(mockResponse)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      await trackedClient.generateText('Hello', 'You are helpful')

      expect(mockClient.createChatCompletion).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
        {}
      )
    })
  })

  describe('delegation methods', () => {
    it('should delegate getModels correctly', async () => {
      const mockModels = [{ id: 'model-1', name: 'GPT-4' }]
      vi.mocked(mockClient.getModels).mockResolvedValue(mockModels)

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      const result = await trackedClient.getModels()

      expect(result).toEqual(mockModels)
      expect(mockClient.getModels).toHaveBeenCalledTimes(1)
    })

    it('should delegate setApiKey correctly', () => {
      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      trackedClient.setApiKey('new-key')

      expect(mockClient.setApiKey).toHaveBeenCalledWith('new-key')
    })

    it('should delegate setDefaultModel correctly', () => {
      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      trackedClient.setDefaultModel('new-model')

      expect(mockClient.setDefaultModel).toHaveBeenCalledWith('new-model')
    })

    it('should delegate getDefaultModel correctly', () => {
      vi.mocked(mockClient.getDefaultModel).mockReturnValue('default-model')

      const trackedClient = new TrackedOpenRouterClient(mockClient, defaultContext)
      const result = trackedClient.getDefaultModel()

      expect(result).toBe('default-model')
      expect(mockClient.getDefaultModel).toHaveBeenCalledTimes(1)
    })
  })
})

