// OpenRouter API client
// Handles user-provided API keys, model selection, and request/response handling
import axios, { AxiosError } from 'axios'
import { config } from '../../config'

/**
 * OpenRouter API response types
 */
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterChatCompletionRequest {
  model: string
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stream?: boolean
}

export interface OpenRouterChoice {
  index: number
  message: OpenRouterMessage
  finish_reason: string | null
}

export interface OpenRouterUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cached_prompt_tokens?: number
  cached_completion_tokens?: number
}

export interface OpenRouterChatCompletionResponse {
  id: string
  model: string
  choices: OpenRouterChoice[]
  usage: OpenRouterUsage
  created: number
}

/**
 * OpenRouter API errors
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public response?: unknown
  ) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

/**
 * Options for creating an OpenRouter client instance
 */
export interface OpenRouterClientOptions {
  apiKey: string
  model?: string
  appName?: string
  appUrl?: string
}

/**
 * OpenRouter API client
 * 
 * Handles communication with OpenRouter API using user-provided API keys
 * and model selection.
 */
export class OpenRouterClient {
  private apiKey: string
  private defaultModel?: string
  private appName?: string
  private appUrl?: string
  private baseURL: string

  constructor(options: OpenRouterClientOptions) {
    if (!options.apiKey) {
      throw new Error('OpenRouter API key is required')
    }

    this.apiKey = options.apiKey
    
    if (options.model !== undefined) {
      this.defaultModel = options.model
    }
    
    this.appName = options.appName !== undefined ? options.appName : 'Memoriae'
    this.appUrl = options.appUrl !== undefined ? options.appUrl : 'https://memoriae.app'
    this.baseURL = config.openrouter.apiUrl
  }

  /**
   * Create a chat completion request
   * 
   * @param messages - Array of messages (system, user, assistant)
   * @param options - Optional request parameters (model, temperature, etc.)
   * @returns Chat completion response
   * @throws OpenRouterError if the request fails
   */
  async createChatCompletion(
    messages: OpenRouterMessage[],
    options: {
      model?: string
      temperature?: number
      max_tokens?: number
      top_p?: number
      frequency_penalty?: number
      presence_penalty?: number
    } = {},
    // Optional tracking context (used by TrackedOpenRouterClient, ignored here)
    context?: Record<string, any>
  ): Promise<OpenRouterChatCompletionResponse> {
    const model = options.model || this.defaultModel
    if (!model) {
      throw new Error('Model is required. Provide model in options or set default model when creating client.')
    }

    const requestBody: OpenRouterChatCompletionRequest = {
      model,
      messages,
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.max_tokens !== undefined && { max_tokens: options.max_tokens }),
      ...(options.top_p !== undefined && { top_p: options.top_p }),
      ...(options.frequency_penalty !== undefined && { frequency_penalty: options.frequency_penalty }),
      ...(options.presence_penalty !== undefined && { presence_penalty: options.presence_penalty }),
      stream: false,
    }

    try {
      const response = await axios.post<OpenRouterChatCompletionResponse>(
        `${this.baseURL}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.appUrl,
            'X-Title': this.appName,
          },
        }
      )

      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Generate a simple text completion (convenience method)
   * 
   * @param prompt - User prompt text
   * @param systemPrompt - Optional system prompt
   * @param options - Optional request parameters
   * @returns The assistant's reply text
   * @throws OpenRouterError if the request fails
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options: {
      model?: string
      temperature?: number
      max_tokens?: number
    } = {}
  ): Promise<string> {
    const messages: OpenRouterMessage[] = []
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    
    messages.push({ role: 'user', content: prompt })

    const response = await this.createChatCompletion(messages, options)
    
    const choice = response.choices[0]
    if (!choice || !choice.message) {
      throw new OpenRouterError('No response from OpenRouter API')
    }

    return choice.message.content
  }

  /**
   * Get available models from OpenRouter
   * 
   * @returns Array of available models
   * @throws OpenRouterError if the request fails
   */
  async getModels(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.appUrl,
          'X-Title': this.appName,
        },
      })

      // OpenRouter returns models in data array
      return response.data.data || []
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Handle API errors and convert to OpenRouterError
   */
  private handleError(error: unknown): OpenRouterError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        error?: {
          message?: string
          code?: string
          type?: string
        }
      }>

      const statusCode = axiosError.response?.status
      const errorData = axiosError.response?.data

      let message = 'OpenRouter API request failed'
      let code: string | undefined

      if (errorData?.error) {
        message = errorData.error.message || message
        code = errorData.error.code || errorData.error.type
      } else if (axiosError.message) {
        message = axiosError.message
      }

      // Handle specific HTTP status codes
      if (statusCode === 401) {
        message = 'Invalid API key. Please check your OpenRouter API key.'
      } else if (statusCode === 429) {
        message = 'Rate limit exceeded. Please try again later.'
      } else if (statusCode === 400) {
        message = `Invalid request: ${message}`
      } else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
        message = 'OpenRouter API is temporarily unavailable. Please try again later.'
      }

      return new OpenRouterError(message, statusCode, code, errorData)
    }

    if (error instanceof Error) {
      return new OpenRouterError(error.message)
    }

    return new OpenRouterError('Unknown error occurred')
  }

  /**
   * Update the API key (useful when user updates their settings)
   */
  setApiKey(apiKey: string): void {
    if (!apiKey) {
      throw new Error('API key cannot be empty')
    }
    this.apiKey = apiKey
  }

  /**
   * Update the default model
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model
  }

  /**
   * Get the current default model
   */
  getDefaultModel(): string | undefined {
    return this.defaultModel
  }
}

/**
 * Create an OpenRouter client instance for a user
 * 
 * This is a convenience factory function that creates a client
 * with user-specific settings (API key and model).
 * 
 * @param userId - User ID (for fetching settings from database)
 * @param apiKey - User's OpenRouter API key
 * @param model - User's preferred model (optional)
 * @returns OpenRouterClient instance
 */
export function createOpenRouterClient(
  apiKey: string,
  model?: string
): OpenRouterClient {
  const options: OpenRouterClientOptions = {
    apiKey,
    appName: 'Memoriae',
    appUrl: 'https://memoriae.app',
  }
  
  if (model !== undefined) {
    options.model = model
  }
  
  return new OpenRouterClient(options)
}

