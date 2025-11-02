// OpenRouter client tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import {
  OpenRouterClient,
  OpenRouterError,
  createOpenRouterClient,
} from './client'
import type { OpenRouterChatCompletionResponse } from './client'

// Mock axios - functions must be defined inside the factory due to hoisting
vi.mock('axios', () => {
  const mockPost = vi.fn()
  const mockGet = vi.fn()
  const mockIsAxiosError = vi.fn()
  
  // Return a mock that has isAxiosError on both default and as named export
  const mockAxiosInstance = {
    post: mockPost,
    get: mockGet,
    isAxiosError: mockIsAxiosError,
  }
  
  return {
    default: mockAxiosInstance,
    isAxiosError: mockIsAxiosError,
    AxiosError: class AxiosError extends Error {},
  }
})

// Access the mocked functions directly from axios after import
// The mock factory hoists, but we can access the mocked instance here
const mockPost = (axios as any).post
const mockGet = (axios as any).get
const mockIsAxiosError = (axios as any).isAxiosError

// Mock config
vi.mock('../../config', () => ({
  config: {
    openrouter: {
      apiUrl: 'https://openrouter.ai/api/v1',
    },
  },
}))

describe('OpenRouterClient', () => {
  const mockApiKey = 'test-api-key'
  const mockModel = 'openai/gpt-3.5-turbo'

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mocks to default behavior
    mockPost.mockReset()
    mockGet.mockReset()
    mockIsAxiosError.mockReset()
    // By default, isAxiosError returns false (not an axios error)
    mockIsAxiosError.mockReturnValue(false)
  })

  describe('constructor', () => {
    it('should create client with API key and model', () => {
      const client = new OpenRouterClient({
        apiKey: mockApiKey,
        model: mockModel,
      })

      expect(client).toBeDefined()
      expect(client.getDefaultModel()).toBe(mockModel)
    })

    it('should create client with only API key', () => {
      const client = new OpenRouterClient({
        apiKey: mockApiKey,
      })

      expect(client).toBeDefined()
      expect(client.getDefaultModel()).toBeUndefined()
    })

    it('should throw error if API key is missing', () => {
      expect(() => {
        new OpenRouterClient({
          apiKey: '',
        })
      }).toThrow('OpenRouter API key is required')
    })

    it('should use custom app name and URL', () => {
      const client = new OpenRouterClient({
        apiKey: mockApiKey,
        appName: 'Test App',
        appUrl: 'https://test.app',
      })

      expect(client).toBeDefined()
    })
  })

  describe('createChatCompletion', () => {
    const mockResponse: OpenRouterChatCompletionResponse = {
      id: 'chatcmpl-123',
      model: mockModel,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you?',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
      created: 1234567890,
    }

    it('should create chat completion successfully', async () => {
      mockPost.mockResolvedValueOnce({
        data: mockResponse,
      })

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
        model: mockModel,
      })

      const result = await client.createChatCompletion([
        { role: 'user', content: 'Hello' },
      ])

      expect(result).toEqual(mockResponse)
      expect(mockPost).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          model: mockModel,
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://memoriae.app',
            'X-Title': 'Memoriae',
          }),
        })
      )
    })

    it('should include optional parameters', async () => {
      mockPost.mockResolvedValueOnce({
        data: mockResponse,
      })

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
      })

      await client.createChatCompletion(
        [{ role: 'user', content: 'Test' }],
        {
          model: mockModel,
          temperature: 0.7,
          max_tokens: 100,
          top_p: 0.9,
        }
      )

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: mockModel,
          temperature: 0.7,
          max_tokens: 100,
          top_p: 0.9,
        }),
        expect.any(Object)
      )
    })

    it('should use default model if provided in constructor', async () => {
      mockPost.mockResolvedValueOnce({
        data: mockResponse,
      })

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
        model: mockModel,
      })

      await client.createChatCompletion([{ role: 'user', content: 'Test' }])

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: mockModel,
        }),
        expect.any(Object)
      )
    })

    it('should throw error if model is not provided', async () => {
      const client = new OpenRouterClient({
        apiKey: mockApiKey,
      })

      await expect(
        client.createChatCompletion([{ role: 'user', content: 'Test' }])
      ).rejects.toThrow('Model is required')
    })

    it('should handle 401 error (invalid API key)', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            error: {
              message: 'Invalid API key',
              code: 'invalid_api_key',
            },
          },
        },
        message: 'Request failed with status code 401',
      } as any

      mockPost.mockRejectedValueOnce(error)
      mockIsAxiosError.mockReturnValue(true)

      const client = new OpenRouterClient({
        apiKey: 'invalid-key',
        model: mockModel,
      })

      try {
        await client.createChatCompletion([{ role: 'user', content: 'Test' }])
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err).toBeInstanceOf(OpenRouterError)
        const openRouterErr = err as OpenRouterError
        expect(openRouterErr.statusCode).toBe(401)
        expect(openRouterErr.message).toContain('Invalid API key')
      }
    })

    it('should handle 429 error (rate limit)', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            error: {
              message: 'Rate limit exceeded',
            },
          },
        },
        message: 'Request failed with status code 429',
      } as any

      mockPost.mockRejectedValueOnce(error)
      mockIsAxiosError.mockReturnValue(true)

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
        model: mockModel,
      })

      try {
        await client.createChatCompletion([{ role: 'user', content: 'Test' }])
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err).toBeInstanceOf(OpenRouterError)
        const openRouterErr = err as OpenRouterError
        expect(openRouterErr.statusCode).toBe(429)
        expect(openRouterErr.message).toContain('Rate limit exceeded')
      }
    })

    it('should handle 500 error (server error)', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {},
        },
        message: 'Internal server error',
      } as any

      mockPost.mockRejectedValueOnce(error)
      mockIsAxiosError.mockReturnValue(true)

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
        model: mockModel,
      })

      try {
        await client.createChatCompletion([{ role: 'user', content: 'Test' }])
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err).toBeInstanceOf(OpenRouterError)
        const openRouterErr = err as OpenRouterError
        expect(openRouterErr.statusCode).toBe(500)
        expect(openRouterErr.message).toContain('temporarily unavailable')
      }
    })
  })

  describe('generateText', () => {
    it('should generate text from prompt', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'chatcmpl-123',
        model: mockModel,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Generated response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
        created: 1234567890,
      }

      mockPost.mockResolvedValueOnce({
        data: mockResponse,
      })

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
        model: mockModel,
      })

      const result = await client.generateText('What is AI?')

      expect(result).toBe('Generated response')
      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: [{ role: 'user', content: 'What is AI?' }],
        }),
        expect.any(Object)
      )
    })

    it('should include system prompt when provided', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'chatcmpl-123',
        model: mockModel,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: 1234567890,
      }

      mockPost.mockResolvedValueOnce({
        data: mockResponse,
      })

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
        model: mockModel,
      })

      await client.generateText('Prompt', 'You are a helpful assistant')

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Prompt' },
          ],
        }),
        expect.any(Object)
      )
    })

    it('should throw error if no response in choices', async () => {
      const mockResponse: OpenRouterChatCompletionResponse = {
        id: 'chatcmpl-123',
        model: mockModel,
        choices: [],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 0,
          total_tokens: 5,
        },
        created: 1234567890,
      }

      mockPost.mockResolvedValueOnce({
        data: mockResponse,
      })

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
        model: mockModel,
      })

      await expect(client.generateText('Test')).rejects.toThrow(
        'No response from OpenRouter API'
      )
    })
  })

  describe('getModels', () => {
    it('should fetch available models', async () => {
      const mockModels = {
        data: [
          { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
          { id: 'openai/gpt-4', name: 'GPT-4' },
        ],
      }

      mockGet.mockResolvedValueOnce({
        data: mockModels,
      })

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
      })

      const result = await client.getModels()

      expect(result).toEqual(mockModels.data)
      expect(mockGet).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
          }),
        })
      )
    })

    it('should handle empty models array', async () => {
      mockGet.mockResolvedValueOnce({
        data: { data: [] },
      })

      const client = new OpenRouterClient({
        apiKey: mockApiKey,
      })

      const result = await client.getModels()

      expect(result).toEqual([])
    })
  })

  describe('setApiKey and setDefaultModel', () => {
    it('should update API key', () => {
      const client = new OpenRouterClient({
        apiKey: mockApiKey,
      })

      client.setApiKey('new-api-key')
      // Can't directly test, but shouldn't throw
      expect(client).toBeDefined()
    })

    it('should throw error if setting empty API key', () => {
      const client = new OpenRouterClient({
        apiKey: mockApiKey,
      })

      expect(() => {
        client.setApiKey('')
      }).toThrow('API key cannot be empty')
    })

    it('should update default model', () => {
      const client = new OpenRouterClient({
        apiKey: mockApiKey,
      })

      expect(client.getDefaultModel()).toBeUndefined()

      client.setDefaultModel('new-model')
      expect(client.getDefaultModel()).toBe('new-model')
    })
  })

  describe('createOpenRouterClient factory', () => {
    it('should create client with API key and model', () => {
      const client = createOpenRouterClient(mockApiKey, mockModel)

      expect(client).toBeInstanceOf(OpenRouterClient)
      expect(client.getDefaultModel()).toBe(mockModel)
    })

    it('should create client with only API key', () => {
      const client = createOpenRouterClient(mockApiKey)

      expect(client).toBeInstanceOf(OpenRouterClient)
      expect(client.getDefaultModel()).toBeUndefined()
    })
  })
})

