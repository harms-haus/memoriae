// Authentication service for user management and JWT tokens
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import db from '../db/connection'
import { config } from '../config'
import type { JWTPayload } from '../middleware/auth'

export interface User {
  id: string
  email: string
  name: string
  provider: 'google' | 'github'
  provider_id: string
  created_at: Date
}

export interface OAuthProfile {
  id: string
  email: string
  name: string
}

/**
 * Find or create user from OAuth provider
 */
export async function findOrCreateUser(
  provider: 'google' | 'github',
  profile: OAuthProfile
): Promise<User> {
  const existingUser = await db('users')
    .where({
      provider,
      provider_id: profile.id,
    })
    .first()

  if (existingUser) {
    // Update user info if email/name changed
    await db('users')
      .where({ id: existingUser.id })
      .update({
        email: profile.email,
        name: profile.name,
      })

    return {
      ...existingUser,
      email: profile.email,
      name: profile.name,
    }
  }

  // Check if email already exists (user might have logged in with different provider)
  const emailUser = await db('users').where({ email: profile.email }).first()

  if (emailUser) {
    // User exists with same email but different provider - update provider info
    await db('users')
      .where({ id: emailUser.id })
      .update({
        provider,
        provider_id: profile.id,
        name: profile.name,
      })

    return {
      ...emailUser,
      provider,
      provider_id: profile.id,
      email: profile.email,
      name: profile.name,
    }
  }

  // Create new user
  const newUser = {
    id: uuidv4(),
    email: profile.email,
    name: profile.name,
    provider,
    provider_id: profile.id,
    created_at: new Date(),
  }

  await db('users').insert(newUser)

  return newUser as User
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
  }

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions)
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const user = await db('users').where({ id }).first()
  return user || null
}

