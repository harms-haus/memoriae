// Express app configuration
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import authRoutes from './routes/auth'
import transactionsRoutes from './routes/transactions'
import seedsRoutes from './routes/seeds'
import categoriesRoutes from './routes/categories'
import tagsRoutes from './routes/tags'
import settingsRoutes from './routes/settings'
import searchRoutes from './routes/search'
import followupsRoutes from './routes/followups'
import ideaMusingsRoutes from './routes/idea-musings'
import { config } from './config'
import log from 'loglevel'
import { requestLogger } from './middleware/requestLogger'

const logApp = log.getLogger('App')
const app = express()

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true)
    }
    
    // Check if the origin is in the allowed list
    if (config.frontend.allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    
    // Log rejected origin for debugging
    logApp.warn(`CORS: Rejected origin "${origin}". Allowed origins:`, config.frontend.allowedOrigins)
    
    // Reject the request (return false, not an error)
    callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware (after body parsers, before routes)
app.use(requestLogger)

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/seeds', seedsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/tags', tagsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/search', searchRoutes)
app.use('/api', transactionsRoutes)
app.use('/api', followupsRoutes)
app.use('/api/idea-musings', ideaMusingsRoutes)

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '../../frontend/dist')
  app.use(express.static(frontendDistPath))
  
  // Serve index.html for all non-API routes (SPA routing)
  // This must come after API routes but before error handlers
  app.get('*', (req: Request, res: Response) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' })
    }
    return res.sendFile(path.join(frontendDistPath, 'index.html'))
  })
}

// 404 handler for API routes (only reached if API route doesn't match)
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handling middleware (must be last)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id || 'anonymous'
  const requestPath = req.originalUrl || req.path
  const requestMethod = req.method
  
  logApp.error(`Error in ${requestMethod} ${requestPath} (user: ${userId}):`, err.message)
  logApp.error(`Error stack:`, err.stack)
  logApp.error(`Request details:`, {
    method: requestMethod,
    path: requestPath,
    userId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })
  
  // In development, send more details
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    })
  } else {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default app
