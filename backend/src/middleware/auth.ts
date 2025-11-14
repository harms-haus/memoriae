// JWT authentication middleware
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { getUserById } from '../services/auth'
import log from 'loglevel'

const logAuth = log.getLogger('Auth')

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name: string
        provider: string
      }
    }
  }
}

export interface JWTPayload {
  id: string
  email: string
  name: string
  provider: string
}

/**
 * Middleware to authenticate requests using JWT token
 * Expects token in Authorization header as "Bearer <token>"
 * Also verifies that the user exists in the database
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logAuth.debug('No token provided in Authorization header')
    res.status(401).json({ error: 'Unauthorized - No token provided' })
    return
  }

  const token = authHeader.replace('Bearer ', '')
  log.debug('Token received, length:', token.length, 'first 20 chars:', token.substring(0, 20))

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload
    logAuth.debug('Token verified, user ID:', payload.id)
    
    // Verify user exists in database (handles cases where database was reset)
    const user = await getUserById(payload.id)
    if (!user) {
      logAuth.warn('User not found in database:', payload.id)
      res.status(401).json({ error: 'Unauthorized - User not found. Please log in again.' })
      return
    }

    logAuth.debug('User authenticated:', user.email)
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
    }
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logAuth.debug('Token expired')
      res.status(401).json({ error: 'Unauthorized - Token expired' })
      return
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logAuth.debug('Invalid token -', error.message)
      res.status(401).json({ error: 'Unauthorized - Invalid token' })
      return
    }
    logAuth.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 * Sets req.user if valid token is present and user exists in database
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload
    
    // Verify user exists in database
    const user = await getUserById(payload.id)
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      }
    }
    // Silently ignore if user doesn't exist (optional auth)
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
  }

  next()
}

