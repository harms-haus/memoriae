// JWT authentication middleware
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

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
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized - No token provided' })
    return
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      provider: payload.provider,
    }
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Unauthorized - Token expired' })
      return
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Unauthorized - Invalid token' })
      return
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 * Sets req.user if valid token is present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      provider: payload.provider,
    }
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
  }

  next()
}

