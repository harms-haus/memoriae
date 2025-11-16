# Backend Patterns

This page documents backend service and route patterns, middleware usage, error handling, and database query patterns used in Memoriae.

## Service Layer Pattern

### Structure

**Location**: `backend/src/services/`

Services contain business logic separated from routes:

```typescript
export class SeedsService {
  static async getById(id: string, userId: string): Promise<Seed | null> {
    // Business logic here
  }
  
  static async create(userId: string, data: CreateSeedDto): Promise<Seed> {
    // Business logic here
  }
  
  static async update(id: string, userId: string, data: UpdateSeedDto): Promise<Seed> {
    // Business logic here
  }
}
```

### Service Responsibilities

1. **Business Logic**: Core application logic
2. **Data Validation**: Validate input data
3. **Database Operations**: Query and update database
4. **State Computation**: Compute current state from transactions
5. **Error Handling**: Handle and format errors

### Benefits

- **Reusability**: Services can be used by routes, automations, etc.
- **Testability**: Services can be tested in isolation
- **Separation of Concerns**: Routes handle HTTP, services handle business logic

## Route Handler Pattern

### Standard Route Structure

**Location**: `backend/src/routes/seeds.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth'
import { SeedsService } from '../services/seeds'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/seeds/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const seedId = req.params.id
    
    const seed = await SeedsService.getById(seedId, userId)
    
    if (!seed) {
      return res.status(404).json({ error: 'Seed not found' })
    }
    
    res.json(seed)
  } catch (error) {
    next(error) // Pass to error handler middleware
  }
})

export default router
```

### Route Patterns

1. **Authentication**: `router.use(authenticate)` applied to all routes
2. **User ID Extraction**: `req.user!.id` from authenticated request
3. **Service Calls**: Business logic in services, not routes
4. **Error Handling**: `next(error)` passes to error middleware
5. **Response Format**: JSON responses with consistent structure

### Error Responses

```typescript
// 404 Not Found
res.status(404).json({ error: 'Resource not found' })

// 400 Bad Request
res.status(400).json({ error: 'Invalid input', details: [...] })

// 401 Unauthorized (handled by auth middleware)

// 500 Internal Server Error (handled by error middleware)
```

## Middleware Usage

### Authentication Middleware

**Location**: `backend/src/middleware/auth.ts`

```typescript
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = payload as User
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

### Request Logging Middleware

**Location**: `backend/src/middleware/requestLogger.ts`

Logs all requests with:
- Method and path
- User ID (if authenticated)
- Response status
- Duration

### Error Handling Middleware

**Location**: `backend/src/app.ts`

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id || 'anonymous'
  logApp.error(`Error in ${req.method} ${req.path} (user: ${userId}):`, err.message)
  
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
```

## Database Query Patterns

### Knex.js Usage

**Location**: `backend/src/services/seeds.ts`

```typescript
// Simple query
const seed = await db('seeds')
  .where({ id: seedId, user_id: userId })
  .first()

// Query with joins
const seeds = await db('seeds')
  .where({ user_id: userId })
  .orderBy('created_at', 'desc')
  .limit(limit)

// Parameterized queries (always use, never string concatenation)
const seeds = await db('seeds')
  .where({ user_id: userId })
  .where('created_at', '>', since)
```

### Transaction Management

**Location**: `backend/src/services/seeds.ts`

```typescript
const seed = await db.transaction(async (trx) => {
  // Create seed row
  const [seedRow] = await trx('seeds')
    .insert({
      id: uuidv4(),
      user_id: userId,
      slug: slug,
      created_at: new Date(),
    })
    .returning('*')
  
  // Create creation transaction
  await trx('seed_transactions').insert({
    id: uuidv4(),
    seed_id: seedRow.id,
    transaction_type: 'create_seed',
    transaction_data: { content: data.content },
    created_at: new Date(),
  })
  
  return seedRow
})
```

### Query Best Practices

1. **Always parameterize**: Never use string concatenation
2. **Use indexes**: Query on indexed columns
3. **Limit results**: Use `.limit()` for large datasets
4. **Order consistently**: Use `.orderBy()` for predictable ordering
5. **Handle nulls**: Use `.first()` which returns `undefined` if not found

## Error Handling Patterns

### Service-Level Errors

```typescript
static async getById(id: string, userId: string): Promise<Seed | null> {
  try {
    const seed = await db('seeds')
      .where({ id, user_id: userId })
      .first()
    
    if (!seed) {
      return null // Not an error, just not found
    }
    
    // Compute state
    const currentState = await computeCurrentState(seed.id)
    return { ...seed, currentState }
  } catch (error) {
    logService.error(`Error getting seed ${id}:`, error)
    throw error // Re-throw for route handler to handle
  }
}
```

### Validation Errors

```typescript
if (!data.content || data.content.trim().length === 0) {
  throw new Error('Content is required and must be a non-empty string')
}
```

### Database Errors

```typescript
try {
  await db('seeds').insert(data)
} catch (error) {
  if (error.code === '23505') { // Unique violation
    throw new Error('Seed with this slug already exists')
  }
  throw error
}
```

## OpenRouter Client Usage

### Client Creation

**Location**: `backend/src/services/openrouter/client.ts`

```typescript
const openrouterClient = createOpenRouterClient(
  settings.openrouter_api_key,
  settings.openrouter_model
)
```

### API Calls

```typescript
const response = await openrouterClient.createChatCompletion(
  [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  {
    temperature: 0.3,
    max_tokens: 2000,
  }
)

const content = response.choices[0]?.message?.content
```

### Error Handling

```typescript
try {
  const response = await openrouterClient.generateText(prompt)
  return response
} catch (error) {
  if (error instanceof OpenRouterError) {
    if (error.statusCode === 401) {
      throw new Error('Invalid API key')
    } else if (error.statusCode === 429) {
      throw new Error('Rate limit exceeded')
    }
  }
  throw error
}
```

## Queue Job Patterns

### Adding Jobs

**Location**: `backend/src/services/queue/queue.ts`

```typescript
async function addAutomationJob(data: AutomationJobData): Promise<void> {
  await automationQueue.add(
    'automation',
    data,
    {
      priority: data.priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  )
}
```

### Job Processing

**Location**: `backend/src/services/queue/processor.ts`

```typescript
const automationWorker = new Worker<AutomationJobData>(
  'automation',
  async (job: Job<AutomationJobData>) => {
    const { seedId, automationId, userId } = job.data
    
    // Process job
    await processAutomationJob(job)
    
    // Update progress
    await job.updateProgress(100)
  },
  {
    concurrency: 5,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  }
)
```

## Logging Patterns

### Structured Logging

**Location**: `backend/src/` (throughout)

```typescript
import log from 'loglevel'

const logService = log.getLogger('Service:Seeds')

logService.info('Creating seed', { userId, contentLength: content.length })
logService.error('Error creating seed', { error, userId })
logService.debug('Seed created', { seedId: seed.id })
```

### Log Levels

- **TRACE**: Very detailed debugging
- **DEBUG**: Debugging information
- **INFO**: General information
- **WARN**: Warnings
- **ERROR**: Errors

### Context in Logs

Always include relevant context:
- User ID
- Resource IDs
- Operation details
- Error information

## Configuration Pattern

### Config Module

**Location**: `backend/src/config.ts`

Centralized configuration loading:

```typescript
export const config = {
  port: parseInt(process.env.PORT || '3123', 10),
  database: {
    url: process.env.DATABASE_URL || '',
    // ... other database config
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
  },
  // ... other config
}
```

### Environment Variables

All configuration from `.env` file:
- Required variables validated on startup
- Sensible defaults where appropriate
- Type-safe access via config object

## Testing Patterns

### Service Tests

**Location**: `backend/src/services/**/*.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { SeedsService } from './seeds'

describe('SeedsService', () => {
  beforeEach(async () => {
    // Setup test data
  })

  it('should create a seed', async () => {
    const seed = await SeedsService.create(userId, { content: 'test' })
    expect(seed).toBeDefined()
    expect(seed.currentState.seed).toBe('test')
  })
})
```

### Integration Tests

**Location**: `backend/src/__tests__/integration/`

```typescript
import request from 'supertest'
import app from '../../app'

describe('GET /api/seeds', () => {
  it('should require authentication', async () => {
    const res = await request(app).get('/api/seeds')
    expect(res.status).toBe(401)
  })
  
  it('should return user seeds', async () => {
    const token = await getAuthToken()
    const res = await request(app)
      .get('/api/seeds')
      .set('Authorization', `Bearer ${token}`)
    
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
```

## Related Documentation

- [Architecture Overview](Architecture-Overview) - System architecture
- [Tech Stack Deep Dive](Tech-Stack-Deep-Dive) - Backend technologies
- [Database Schema](Database-Schema) - Database structure
- [API Documentation](API-Documentation) - API endpoints

