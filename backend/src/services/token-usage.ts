import db from '../db/connection'
import { config } from '../config'

export interface TokenUsageRecord {
  userId: string
  automationId?: string
  automationName?: string
  model: string
  inputTokens: number
  outputTokens: number
  cachedInputTokens?: number
  cachedOutputTokens?: number
  totalTokens: number
  messages?: any[]
}

export class TokenUsageService {
  static async create(record: TokenUsageRecord): Promise<void> {
    // Only store messages if debug is enabled
    const messages = config.tokenUsage.debug ? JSON.stringify(record.messages) : null

    await db('token_usage').insert({
      user_id: record.userId,
      automation_id: record.automationId,
      automation_name: record.automationName,
      model: record.model,
      input_tokens: record.inputTokens,
      output_tokens: record.outputTokens,
      cached_input_tokens: record.cachedInputTokens || 0,
      cached_output_tokens: record.cachedOutputTokens || 0,
      total_tokens: record.totalTokens,
      messages: messages,
    })
  }

  static async getByUser(userId: string, limit = 100): Promise<any[]> {
    return await db('token_usage')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  static async getByAutomation(automationId: string, limit = 100): Promise<any[]> {
    return await db('token_usage')
      .where({ automation_id: automationId })
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  static async getStats(userId: string, days = 30): Promise<any> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    return await db('token_usage')
      .where({ user_id: userId })
      .where('created_at', '>=', since)
      .sum({
        total_input: 'input_tokens',
        total_output: 'output_tokens',
        total_cached_input: 'cached_input_tokens',
        total_cached_output: 'cached_output_tokens',
        total_all: 'total_tokens',
      })
      .first()
  }
}

