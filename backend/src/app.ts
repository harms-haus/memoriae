// Express app configuration
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import authRoutes from './routes/auth'
import eventsRoutes from './routes/events'
import seedsRoutes from './routes/seeds'
import categoriesRoutes from './routes/categories'
import tagsRoutes from './routes/tags'
import settingsRoutes from './routes/settings'
import searchRoutes from './routes/search'
import { config } from './config'

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
    console.warn(`CORS: Rejected origin "${origin}". Allowed origins:`, config.frontend.allowedOrigins)
    
    // Reject the request (return false, not an error)
    callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
app.use('/api', eventsRoutes)

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
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
