// Request logging middleware - logs HTTP requests and responses
import { Request, Response, NextFunction } from 'express'
import log from 'loglevel'

const logRequest = log.getLogger('Request')

/**
 * Request logging middleware
 * 
 * Logs incoming HTTP requests with:
 * - Method and path
 * - Query parameters (if any)
 * - User ID (if authenticated)
 * - Response status code
 * - Request duration
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint()
  const method = req.method
  const path = req.originalUrl || req.path
  const query = Object.keys(req.query).length > 0 ? req.query : undefined
  const userId = req.user?.id

  // Log request start (debug level)
  logRequest.debug(`--> ${method} ${path} from ${req.ip}`, {
    query,
    userId,
  })

  // Log response when finished
  res.on('finish', () => {
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1_000_000 // Convert nanoseconds to milliseconds
    const statusCode = res.statusCode

    // Log response (info for success, warn for client errors, error for server errors)
    if (statusCode >= 500) {
      logRequest.error(`<-- ${method} ${path} ${statusCode} ${durationMs.toFixed(2)}ms`, {
        query,
        userId,
        statusCode,
        duration: durationMs,
      })
    } else if (statusCode >= 400) {
      logRequest.warn(`<-- ${method} ${path} ${statusCode} ${durationMs.toFixed(2)}ms`, {
        query,
        userId,
        statusCode,
        duration: durationMs,
      })
    } else {
      logRequest.info(`<-- ${method} ${path} ${statusCode} ${durationMs.toFixed(2)}ms`, {
        query,
        userId,
        statusCode,
        duration: durationMs,
      })
    }
  })

  next()
}

