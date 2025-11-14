// Slug utility tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateSeedSlug } from './slug'
import db from '../db/connection'

// Mock database
vi.mock('../db/connection', () => {
  const createMockQueryBuilder = (methods: Record<string, any> = {}) => {
    const builder: any = {
      where: vi.fn().mockImplementation((...args: any[]) => {
        return createMockQueryBuilder({ ...methods, whereArgs: args })
      }),
      first: vi.fn(),
      ...methods,
    }
    return builder
  }

  return {
    default: vi.fn((table: string) => createMockQueryBuilder()),
  }
})

describe('generateSeedSlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate slug from content', async () => {
    const content = 'This is a test seed content'
    const uuidPrefix = 'abc1234'

    vi.mocked(db).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null), // No collision
    } as any)

    const result = await generateSeedSlug(content, uuidPrefix)

    expect(result).toMatch(/^abc1234\/this-is-a-test-seed/)
    expect(result.length).toBeLessThanOrEqual(200) // Max slug length
  })

  it('should handle collisions by appending numbers', async () => {
    const content = 'Test content'
    const uuidPrefix = 'abc1234'

    // First call: collision exists
    // Second call: no collision (unique slug found)
    let callCount = 0
    vi.mocked(db).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ id: 'existing-seed' }) // Collision
        }
        return Promise.resolve(null) // No collision
      }),
    } as any)

    const result = await generateSeedSlug(content, uuidPrefix)

    expect(result).toBe('abc1234/test-content-2')
  })

  it('should handle multiple collisions', async () => {
    const content = 'Test content'
    const uuidPrefix = 'abc1234'

    let callCount = 0
    vi.mocked(db).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.resolve({ id: 'existing-seed' }) // Collisions
        }
        return Promise.resolve(null) // No collision
      }),
    } as any)

    const result = await generateSeedSlug(content, uuidPrefix)

    expect(result).toBe('abc1234/test-content-3')
  })

  it('should handle empty content with default slug', async () => {
    const content = '   '
    const uuidPrefix = 'abc1234'

    vi.mocked(db).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    } as any)

    const result = await generateSeedSlug(content, uuidPrefix)

    expect(result).toBe('abc1234/seed')
  })

  it('should handle special characters in content', async () => {
    const content = 'Test @#$% content with special chars!'
    const uuidPrefix = 'abc1234'

    vi.mocked(db).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    } as any)

    const result = await generateSeedSlug(content, uuidPrefix)

    expect(result).toMatch(/^abc1234\/test-content-with-special-chars/)
    expect(result).not.toMatch(/[@#$%!]/) // Special chars should be removed
  })

  it('should truncate long content', async () => {
    const content = 'a'.repeat(200) // Very long content
    const uuidPrefix = 'abc1234'

    vi.mocked(db).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    } as any)

    const result = await generateSeedSlug(content, uuidPrefix)

    expect(result.length).toBeLessThanOrEqual(200)
    expect(result).toMatch(/^abc1234\/a+/)
  })

  it('should handle missing slug column gracefully', async () => {
    const content = 'Test content'
    const uuidPrefix = 'abc1234'

    const dbError = new Error('column "slug" does not exist')
    dbError.name = 'error'
    ;(dbError as any).code = '42703'

    vi.mocked(db).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockRejectedValue(dbError),
    } as any)

    // The function should throw the error (not swallow it)
    // In production, this would be caught by error handling middleware
    await expect(
      generateSeedSlug(content, uuidPrefix)
    ).rejects.toThrow('column "slug" does not exist')
  })
})



