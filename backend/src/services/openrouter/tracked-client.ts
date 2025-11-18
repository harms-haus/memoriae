import { OpenRouterClient, type OpenRouterChatCompletionResponse, type OpenRouterMessage } from './client'
import { TokenUsageService } from '../token-usage'

export interface TrackingContext {
  userId: string
  automationId?: string
  automationName?: string
}

/**
 * Wrapper for OpenRouterClient that tracks token usage
 */
export class TrackedOpenRouterClient extends OpenRouterClient {
  private wrappedClient: OpenRouterClient
  private defaultContext: TrackingContext

  constructor(client: OpenRouterClient, defaultContext: TrackingContext) {
    // Pass the same options to super as the wrapped client, but we'll override methods
    // We can't easily get the options from the instance, so we pass empty/dummy values
    // This is a bit hacky but we're delegating everything anyway
    super({ apiKey: 'dummy' })
    this.wrappedClient = client
    this.defaultContext = defaultContext
  }

  /**
   * Create a chat completion request with tracking
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
    context?: Partial<TrackingContext>
  ): Promise<OpenRouterChatCompletionResponse> {
    // Use the wrapped client to make the actual call
    const response = await this.wrappedClient.createChatCompletion(messages, options)

    // Merge contexts
    const finalContext = { ...this.defaultContext, ...context }

    // Track usage (non-blocking - don't fail API call if tracking fails)
    void TokenUsageService.create({
      userId: finalContext.userId,
      ...(finalContext.automationId !== undefined && { automationId: finalContext.automationId }),
      ...(finalContext.automationName !== undefined && { automationName: finalContext.automationName }),
      model: response.model,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      ...(response.usage.cached_prompt_tokens !== undefined && { cachedInputTokens: response.usage.cached_prompt_tokens }),
      ...(response.usage.cached_completion_tokens !== undefined && { cachedOutputTokens: response.usage.cached_completion_tokens }),
      totalTokens: response.usage.total_tokens,
      messages: messages,
    }).catch((error) => {
      // Log error but don't throw - tracking failure shouldn't break API calls
      console.error('Failed to track token usage:', error)
    })

    return response
  }

  // Delegate other methods
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options: {
      model?: string
      temperature?: number
      max_tokens?: number
    } = {}
  ): Promise<string> {
    // Use our tracked createChatCompletion instead of delegating
    const messages: OpenRouterMessage[] = []
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    
    messages.push({ role: 'user', content: prompt })

    const response = await this.createChatCompletion(messages, options)
    
    const choice = response.choices[0]
    if (!choice || !choice.message) {
      throw new Error('No response from OpenRouter API')
    }

    return choice.message.content
  }

  async getModels(): Promise<Array<{ id: string; name: string }>> {
    return this.wrappedClient.getModels()
  }

  setApiKey(apiKey: string): void {
    this.wrappedClient.setApiKey(apiKey)
  }

  setDefaultModel(model: string): void {
    this.wrappedClient.setDefaultModel(model)
  }

  getDefaultModel(): string | undefined {
    return this.wrappedClient.getDefaultModel()
  }
}

