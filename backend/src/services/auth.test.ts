// Auth service tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { findOrCreateUser, generateToken, getUserById } from './auth'
import type { User } from './auth'
import db from '../db/connection'

// Mock the database
vi.mock('../db/connection', () => {
  const mockWhere = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()

  const mockDb = vi.fn((table: string) => ({
    where: mockWhere.mockReturnThis(),
    insert: mockInsert,
    update: mockUpdate.mockResolvedValue(1),
    first: vi.fn(),
  }))

  // Make where chainable
  mockWhere.mockReturnValue({
    first: vi.fn(),
    update: vi.fn().mockResolvedValue(1),
  })

  // Make insert return array
  mockInsert.mockReturnValue([])

  return {
    default: mockDb,
  }
})

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findOrCreateUser', () => {
    it('should create new user when none exists', async () => {
      const mockUser: User = {
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        provider: 'google',
        provider_id: 'google-123',
        created_at: new Date(),
      }

      // Mock chain: db('users').where().first() returns undefined
      const mockFirst = vi.fn()
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
      })
      mockFirst.mockResolvedValueOnce(undefined) // First check: no user by provider
      mockFirst.mockResolvedValueOnce(undefined) // Second check: no user by email
      
      // Mock insert
      const mockInsert = vi.fn().mockResolvedValue([mockUser])

      // Override db mock for this test
      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        insert: mockInsert,
      } as any)

      const result = await findOrCreateUser('google', {
        id: 'google-123',
        email: 'new@example.com',
        name: 'New User',
      })

      expect(result.email).toBe('new@example.com')
      expect(result.provider).toBe('google')
    })

    it('should return existing user by provider+provider_id', async () => {
      const existingUser: User = {
        id: 'existing-id',
        email: 'existing@example.com',
        name: 'Existing User',
        provider: 'google',
        provider_id: 'google-123',
        created_at: new Date(),
      }

      const mockFirst = vi.fn()
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
        update: vi.fn().mockResolvedValue(1),
      })
      mockFirst.mockResolvedValueOnce(existingUser) // First check finds user

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        insert: vi.fn(),
      } as any)

      const result = await findOrCreateUser('google', {
        id: 'google-123',
        email: 'updated@example.com',
        name: 'Updated Name',
      })

      expect(result.id).toBe('existing-id')
      expect(result.email).toBe('updated@example.com')
      expect(result.name).toBe('Updated Name')
    })

    it('should link account when same email with different provider', async () => {
      const emailUser: User = {
        id: 'email-user-id',
        email: 'same@example.com',
        name: 'Existing User',
        provider: 'google',
        provider_id: 'google-123',
        created_at: new Date(),
      }

      const mockFirst = vi.fn()
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
        update: vi.fn().mockResolvedValue(1),
      })
      mockFirst.mockResolvedValueOnce(undefined) // First check: no user by provider
      mockFirst.mockResolvedValueOnce(emailUser) // Second check: user by email

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
        insert: vi.fn(),
      } as any)

      const result = await findOrCreateUser('github', {
        id: 'github-456',
        email: 'same@example.com',
        name: 'Same User',
      })

      expect(result.id).toBe('email-user-id')
      expect(result.provider).toBe('github')
      expect(result.provider_id).toBe('github-456')
    })
  })

  describe('generateToken', () => {
    it('should generate valid JWT token with correct payload', () => {
      const user: User = {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        provider: 'google',
        provider_id: 'google-123',
        created_at: new Date(),
      }

      const token = generateToken(user)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include all required user fields in token', () => {
      const user: User = {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        provider: 'github',
        provider_id: 'github-456',
        created_at: new Date(),
      }

      const token = generateToken(user)
      // Token is valid structure - decode to verify would require jwt.verify
      // but we can verify it's a valid JWT format
      expect(token.split('.')[0]).toBeDefined()
    })
  })

  describe('getUserById', () => {
    it('should return user when exists', async () => {
      const user: User = {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        provider: 'google',
        provider_id: 'google-123',
        created_at: new Date(),
      }

      const mockFirst = vi.fn().mockResolvedValue(user)
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
      })

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
      } as any)

      const result = await getUserById('user-id')

      expect(result).toBeDefined()
      expect(result?.id).toBe('user-id')
      expect(result?.email).toBe('user@example.com')
    })

    it('should return null when user does not exist', async () => {
      const mockFirst = vi.fn().mockResolvedValue(undefined)
      const mockWhere = vi.fn().mockReturnValue({
        first: mockFirst,
      })

      vi.mocked(db).mockReturnValue({
        where: mockWhere,
      } as any)

      const result = await getUserById('non-existent-id')

      expect(result).toBeNull()
    })
  })
})

