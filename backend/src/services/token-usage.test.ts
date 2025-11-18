import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/connection'
import { TokenUsageService, type TokenUsageRecord } from './token-usage'
import { config } from '../config'

// Suppress logs during tests
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

describe('TokenUsageService', () => {
  beforeEach(async () => {
    // Suppress logs
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()

    // Clean up test data
    await db('token_usage').del()
    
    // Create a test user for foreign key constraints
    await db('users').insert({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'google',
      provider_id: 'test-provider-id-1',
      created_at: new Date(),
    }).onConflict('id').ignore()
  })

  afterEach(() => {
    // Restore logs
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  })

  describe('create', () => {
    it('should create record with all required fields', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      const automationId = uuidv4()
      
      // Create automation for foreign key constraint
      await db('automations').insert({
        id: automationId,
        name: `tag-${automationId}`,
        handler_fn_name: 'processTag',
        enabled: true,
        created_at: new Date(),
      }).onConflict('id').ignore()
      
      const record: TokenUsageRecord = {
        userId,
        automationId,
        automationName: 'tag',
        model: 'openai/gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        cachedInputTokens: 20,
        cachedOutputTokens: 10,
        totalTokens: 150,
      }

      await TokenUsageService.create(record)

      const result = await db('token_usage').where({ user_id: userId }).first()
      expect(result).toBeDefined()
      expect(result?.user_id).toBe(userId)
      expect(result?.automation_id).toBe(automationId)
      expect(result?.automation_name).toBe('tag')
      expect(result?.model).toBe('openai/gpt-4')
      expect(result?.input_tokens).toBe(100)
      expect(result?.output_tokens).toBe(50)
      expect(result?.cached_input_tokens).toBe(20)
      expect(result?.cached_output_tokens).toBe(10)
      expect(result?.total_tokens).toBe(150)
    })

    it('should default cached tokens to 0 when not provided', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      
      const record: TokenUsageRecord = {
        userId,
        model: 'openai/gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      }

      await TokenUsageService.create(record)

      const result = await db('token_usage').where({ user_id: userId }).first()
      expect(result?.cached_input_tokens).toBe(0)
      expect(result?.cached_output_tokens).toBe(0)
    })

    it('should store messages when debug is enabled', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      const originalDebug = config.tokenUsage.debug
      // @ts-expect-error - accessing private property for testing
      config.tokenUsage.debug = true

      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Hello' },
      ]

      const record: TokenUsageRecord = {
        userId,
        model: 'openai/gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        messages,
      }

      await TokenUsageService.create(record)

      const result = await db('token_usage').where({ user_id: userId }).first()
      expect(result?.messages).toBeDefined()
      expect(result?.messages).not.toBeNull()
      // JSONB is automatically parsed by Knex
      const parsed = typeof result?.messages === 'string' ? JSON.parse(result?.messages) : result?.messages
      expect(parsed).toEqual(messages)

      // Restore original value
      // @ts-expect-error - accessing private property for testing
      config.tokenUsage.debug = originalDebug
    })

    it('should NOT store messages when debug is disabled', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      const originalDebug = config.tokenUsage.debug
      // @ts-expect-error - accessing private property for testing
      config.tokenUsage.debug = false

      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Hello' },
      ]

      const record: TokenUsageRecord = {
        userId,
        model: 'openai/gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        messages,
      }

      await TokenUsageService.create(record)

      const result = await db('token_usage').where({ user_id: userId }).first()
      expect(result?.messages).toBeNull()

      // Restore original value
      // @ts-expect-error - accessing private property for testing
      config.tokenUsage.debug = originalDebug
    })

    it('should handle null automationId and automationName for manual calls', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      
      const record: TokenUsageRecord = {
        userId,
        model: 'openai/gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      }

      await TokenUsageService.create(record)

      const result = await db('token_usage').where({ user_id: userId }).first()
      expect(result?.automation_id).toBeNull()
      expect(result?.automation_name).toBeNull()
    })

    it('should handle very long messages when debug is enabled', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      const originalDebug = config.tokenUsage.debug
      // @ts-expect-error - accessing private property for testing
      config.tokenUsage.debug = true

      const longContent = 'x'.repeat(100000) // 100KB message
      const messages = [
        { role: 'user' as const, content: longContent },
      ]

      const record: TokenUsageRecord = {
        userId,
        model: 'openai/gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        messages,
      }

      await TokenUsageService.create(record)

      const result = await db('token_usage').where({ user_id: userId }).first()
      expect(result?.messages).toBeDefined()
      // JSONB is automatically parsed by Knex
      const parsed = typeof result?.messages === 'string' ? JSON.parse(result?.messages) : result?.messages
      expect(parsed[0]?.content).toBe(longContent)

      // Restore original value
      // @ts-expect-error - accessing private property for testing
      config.tokenUsage.debug = originalDebug
    })
  })

  describe('getByUser', () => {
    it('should return records for specific user', async () => {
      const userId1 = '00000000-0000-0000-0000-000000000001'
      const userId2 = uuidv4()
      
      // Create second user
      await db('users').insert({
        id: userId2,
        email: `test-${userId2}@example.com`,
        name: 'Test User 2',
        provider: 'google',
        provider_id: `test-provider-id-${userId2}`,
        created_at: new Date(),
      }).onConflict('id').ignore()
      
      await db('token_usage').insert([
        {
          id: uuidv4(),
          user_id: userId1,
          model: 'openai/gpt-4',
          input_tokens: 100,
          output_tokens: 50,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 150,
          created_at: new Date('2024-01-01'),
        },
        {
          id: uuidv4(),
          user_id: userId2,
          model: 'openai/gpt-4',
          input_tokens: 200,
          output_tokens: 100,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 300,
          created_at: new Date('2024-01-02'),
        },
      ])

      const results = await TokenUsageService.getByUser(userId1)
      expect(results).toHaveLength(1)
      expect(results[0]?.user_id).toBe(userId1)
    })

    it('should order by created_at desc', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      const id1 = uuidv4()
      const id2 = uuidv4()
      
      await db('token_usage').insert([
        {
          id: id1,
          user_id: userId,
          model: 'openai/gpt-4',
          input_tokens: 100,
          output_tokens: 50,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 150,
          created_at: new Date('2024-01-01'),
        },
        {
          id: id2,
          user_id: userId,
          model: 'openai/gpt-4',
          input_tokens: 200,
          output_tokens: 100,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 300,
          created_at: new Date('2024-01-02'),
        },
      ])

      const results = await TokenUsageService.getByUser(userId)
      expect(results).toHaveLength(2)
      expect(results[0]?.id).toBe(id2) // Most recent first
      expect(results[1]?.id).toBe(id1)
    })

    it('should respect limit parameter', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      
      await db('token_usage').insert([
        {
          id: uuidv4(),
          user_id: userId,
          model: 'openai/gpt-4',
          input_tokens: 100,
          output_tokens: 50,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 150,
          created_at: new Date('2024-01-01'),
        },
        {
          id: uuidv4(),
          user_id: userId,
          model: 'openai/gpt-4',
          input_tokens: 200,
          output_tokens: 100,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 300,
          created_at: new Date('2024-01-02'),
        },
        {
          id: uuidv4(),
          user_id: userId,
          model: 'openai/gpt-4',
          input_tokens: 300,
          output_tokens: 150,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 450,
          created_at: new Date('2024-01-03'),
        },
      ])

      const results = await TokenUsageService.getByUser(userId, 2)
      expect(results).toHaveLength(2)
    })

    it('should return empty array for non-existent user', async () => {
      const nonExistentUserId = uuidv4()
      const results = await TokenUsageService.getByUser(nonExistentUserId)
      expect(results).toEqual([])
    })
  })

  describe('getByAutomation', () => {
    it('should return records for specific automation', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      const automationId1 = uuidv4()
      const automationId2 = uuidv4()
      
      // Create automations for foreign key constraints
      await db('automations').insert([
        {
          id: automationId1,
          name: `tag-${automationId1}`,
          handler_fn_name: 'processTag',
          enabled: true,
          created_at: new Date(),
        },
        {
          id: automationId2,
          name: `categorize-${automationId2}`,
          handler_fn_name: 'processCategorize',
          enabled: true,
          created_at: new Date(),
        },
      ]).onConflict('id').ignore()
      
      await db('token_usage').insert([
        {
          id: uuidv4(),
          user_id: userId,
          automation_id: automationId1,
          automation_name: 'tag',
          model: 'openai/gpt-4',
          input_tokens: 100,
          output_tokens: 50,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 150,
          created_at: new Date('2024-01-01'),
        },
        {
          id: uuidv4(),
          user_id: userId,
          automation_id: automationId2,
          automation_name: 'categorize',
          model: 'openai/gpt-4',
          input_tokens: 200,
          output_tokens: 100,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 300,
          created_at: new Date('2024-01-02'),
        },
      ])

      const results = await TokenUsageService.getByAutomation(automationId1)
      expect(results).toHaveLength(1)
      expect(results[0]?.automation_id).toBe(automationId1)
    })

    it('should return empty array for non-existent automation', async () => {
      const nonExistentAutomationId = uuidv4()
      const results = await TokenUsageService.getByAutomation(nonExistentAutomationId)
      expect(results).toEqual([])
    })
  })

  describe('getStats', () => {
    it('should calculate correct sums for all token types', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)

      await db('token_usage').insert([
        {
          id: uuidv4(),
          user_id: userId,
          model: 'openai/gpt-4',
          input_tokens: 100,
          output_tokens: 50,
          cached_input_tokens: 20,
          cached_output_tokens: 10,
          total_tokens: 150,
          created_at: yesterday,
        },
        {
          id: uuidv4(),
          user_id: userId,
          model: 'openai/gpt-4',
          input_tokens: 200,
          output_tokens: 100,
          cached_input_tokens: 30,
          cached_output_tokens: 15,
          total_tokens: 300,
          created_at: now,
        },
      ])

      const stats = await TokenUsageService.getStats(userId, 30)
      // PostgreSQL sum returns strings, convert to numbers
      expect(Number(stats?.total_input)).toBe(300)
      expect(Number(stats?.total_output)).toBe(150)
      expect(Number(stats?.total_cached_input)).toBe(50)
      expect(Number(stats?.total_cached_output)).toBe(25)
      expect(Number(stats?.total_all)).toBe(450)
    })

    it('should filter by date range correctly', async () => {
      const userId = '00000000-0000-0000-0000-000000000001'
      const now = new Date()
      const oldDate = new Date(now)
      oldDate.setDate(oldDate.getDate() - 40) // 40 days ago

      await db('token_usage').insert([
        {
          id: uuidv4(),
          user_id: userId,
          model: 'openai/gpt-4',
          input_tokens: 100,
          output_tokens: 50,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 150,
          created_at: oldDate, // Outside range
        },
        {
          id: uuidv4(),
          user_id: userId,
          model: 'openai/gpt-4',
          input_tokens: 200,
          output_tokens: 100,
          cached_input_tokens: 0,
          cached_output_tokens: 0,
          total_tokens: 300,
          created_at: now, // Inside range
        },
      ])

      const stats = await TokenUsageService.getStats(userId, 30)
      // PostgreSQL sum returns strings, convert to numbers
      expect(Number(stats?.total_input)).toBe(200) // Only recent record
      expect(Number(stats?.total_output)).toBe(100)
    })

    it('should handle user with no usage', async () => {
      const nonExistentUserId = uuidv4()
      const stats = await TokenUsageService.getStats(nonExistentUserId, 30)
      // When no records, sum returns null for all fields
      expect(stats?.total_input).toBeNull()
      expect(stats?.total_output).toBeNull()
    })
  })
})

