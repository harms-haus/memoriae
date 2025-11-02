# Agent Guide: Memoriae Project

This document provides comprehensive guidance for AI agents working on the Memoriae project. Use this as a reference for understanding architecture, patterns, conventions, and implementation details.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Patterns](#architecture--patterns)
3. [File Structure](#file-structure)
4. [Style Guide Integration](#style-guide-integration)
5. [Frontend Patterns](#frontend-patterns)
6. [Backend Patterns](#backend-patterns)
7. [Database Patterns](#database-patterns)
8. [Key Systems](#key-systems)
9. [Common Tasks](#common-tasks)
10. [Testing & Quality](#testing--quality)
11. [Security Considerations](#security-considerations)

## Project Overview

**Memoriae** is a memory/note-taking application with an immutable timeline system. Users create "seeds" (memories) that evolve over time through events. AI-powered automations suggest tags and categories, and changes are tracked immutably.

### Core Concepts

- **Seed**: A memory/note with base content (`seed_content`)
- **Event**: Immutable change record using JSON Patch (RFC 6902)
- **Timeline**: Chronological sequence of events that can be toggled on/off
- **Automation**: Background process that analyzes seeds and creates events
- **Pressure**: Metric that triggers re-evaluation when categories change

### Tech Stack Summary

- **Frontend**: React 18+ with TypeScript, React Context for state, Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with migrations
- **Queue**: BullMQ with Redis
- **AI**: OpenRouter API (user-provided keys)
- **Auth**: OAuth 2.0 (Google + GitHub), JWT

## Architecture & Patterns

### General Principles

1. **Immutability First**: All changes are events; never mutate seed base data directly
2. **Timeline-Based State**: Current seed state = base + all enabled events applied chronologically
3. **Event Sourcing**: Every change creates an event; toggling events reconstructs history
4. **Async Processing**: Automations run in background queue, not blocking user requests
5. **Type Safety**: TypeScript strict mode throughout; avoid `any`, use proper types
6. **Component Composition**: React components should be small, focused, reusable

### Code Style

- **Naming**: 
  - Components: PascalCase (`SeedEditor.tsx`)
  - Files: kebab-case for utilities, PascalCase for components
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Database tables: snake_case (plural)

- **Imports**: Group imports: external → internal → types → relative
- **Formatting**: 2-space indentation, trailing commas, semicolons
- **Comments**: JSDoc for public functions, inline comments for complex logic

## File Structure

### Frontend Structure

```
frontend/src/
├── main.tsx                 # Entry point, React root
├── App.tsx                  # Root component, routing setup
├── components/
│   ├── SeedEditor/         # Dynamic 3-stage editor
│   │   ├── SeedEditor.tsx  # Main component
│   │   ├── SeedEditor.small.tsx  # Small stage
│   │   ├── SeedEditor.medium.tsx # Medium stage
│   │   ├── SeedEditor.large.tsx  # Large stage
│   │   └── index.ts        # Exports
│   ├── SeedList/           # List view with filters
│   ├── SeedDetail/         # Detail view with timeline
│   ├── TimelineView/       # Timeline visualization
│   ├── CategoryTree/       # Hierarchical category browser
│   ├── TagCloud/           # Tag visualization
│   ├── SearchBar/          # Search interface
│   └── Settings/           # User settings page
├── contexts/
│   ├── AuthContext.tsx     # OAuth state management
│   ├── SeedContext.tsx     # Seed data & operations
│   └── ThemeContext.tsx    # Style guide CSS variables
├── hooks/
│   ├── useSeedTimeline.ts  # Compute seed state from events
│   ├── useCategoryPressure.ts # Monitor category changes
│   └── useApi.ts           # API call wrapper
├── services/
│   └── api.ts              # REST API client (axios/fetch)
├── styles/
│   └── theme.css           # Style guide CSS variables
└── types/
    └── index.ts            # Shared TypeScript types
```

### Backend Structure

```
backend/src/
├── index.ts                # Entry point, server startup
├── app.ts                  # Express app configuration
├── config.ts               # Environment config
├── routes/
│   ├── auth.ts            # OAuth endpoints
│   ├── seeds.ts           # Seed CRUD
│   ├── events.ts          # Event operations
│   ├── categories.ts      # Category management
│   ├── tags.ts            # Tag operations
│   └── search.ts          # Search endpoint
├── services/
│   ├── automation/
│   │   ├── base.ts        # Automation interface
│   │   ├── tag.ts         # Tag automation
│   │   ├── categorize.ts  # Categorize automation
│   │   └── registry.ts    # Automation registry
│   ├── queue/
│   │   ├── processor.ts  # Job processor
│   │   └── scheduler.ts  # Pressure evaluation timer
│   └── openrouter/
│       └── client.ts      # OpenRouter API client
├── middleware/
│   ├── auth.ts           # JWT validation
│   ├── errorHandler.ts   # Error handling
│   └── validator.ts      # Request validation
├── utils/
│   ├── jsonpatch.ts      # JSON Patch application
│   └── pressure.ts       # Pressure calculations
└── db/
    ├── migrations/        # Knex/Prisma migrations
    ├── models/           # Database models
    └── connection.ts     # DB connection
```

## Style Guide Integration

**CRITICAL**: Always reference `STYLE-GUIDE.md` when creating UI components. The style guide defines the complete design system.

### Key Style Guide Points

1. **CSS Variables**: All colors, spacing, fonts use CSS custom properties from `styles/theme.css`
   ```css
   background: var(--bg-secondary);
   color: var(--text-primary);
   border: 3px solid var(--border-primary);
   ```

2. **Component Classes**: Use predefined classes from style guide:
   - `.btn-primary`, `.btn-secondary`, `.btn-ghost`
   - `.panel`, `.panel-elevated`, `.panel-accent`
   - `.input`, `.textarea`
   - `.tag-item`, `.tag-list`
   - `.badge`, `.badge-primary`

3. **Typography**: Use semantic HTML and style guide font variables:
   ```css
   font-size: var(--text-base);
   font-weight: var(--weight-bold);
   font-family: var(--font-primary);
   ```

4. **Responsive Design**: Mobile-first, breakpoints at 320px, 768px, 1024px
   ```css
   @media (min-width: 768px) { /* tablet */ }
   @media (min-width: 1024px) { /* desktop */ }
   ```

5. **Animations**: Use defined animations (subtle, purposeful):
   ```css
   animation: slide-up 0.3s ease-out;
   animation: fade-in 0.4s ease-out;
   ```

6. **Accessibility**: 
   - Always include focus states using `var(--focus-ring)`
   - Use `prefers-reduced-motion` media query
   - Ensure WCAG AA contrast ratios

### Using ThemeContext

The `ThemeContext` provides access to all CSS variables:

```typescript
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

function MyComponent() {
  const theme = useContext(ThemeContext);
  // Access theme variables if needed in JS
  return <div style={{ color: theme.getCSSVar('--text-primary') }}>...</div>;
}
```

**Note**: Prefer CSS classes and variables over inline styles.

## Frontend Patterns

### Component Structure

```typescript
// Standard component pattern
import React, { useState, useEffect } from 'react';
import { useSeedContext } from '../contexts/SeedContext';
import { useApi } from '../hooks/useApi';
import './ComponentName.css';

interface ComponentNameProps {
  seedId: string;
  onUpdate?: (data: Seed) => void;
}

export function ComponentName({ seedId, onUpdate }: ComponentNameProps) {
  const { seeds, updateSeed } = useSeedContext();
  const [loading, setLoading] = useState(false);
  const api = useApi();

  useEffect(() => {
    // Initial load logic
  }, [seedId]);

  const handleAction = async () => {
    setLoading(true);
    try {
      const result = await api.post(`/seeds/${seedId}/action`);
      updateSeed(result);
      onUpdate?.(result);
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      {/* JSX */}
    </div>
  );
}
```

### Context Pattern

Contexts manage global state. Always provide loading and error states:

```typescript
interface SeedContextValue {
  seeds: Seed[];
  loading: boolean;
  error: string | null;
  createSeed: (content: string) => Promise<Seed>;
  updateSeed: (id: string, updates: Partial<Seed>) => Promise<Seed>;
  deleteSeed: (id: string) => Promise<void>;
}

export const SeedContext = createContext<SeedContextValue | null>(null);
```

### Hook Patterns

Custom hooks encapsulate logic:

```typescript
// useSeedTimeline.ts - Compute state from events
export function useSeedTimeline(seedId: string) {
  const { seeds } = useSeedContext();
  const [timeline, setTimeline] = useState<Event[]>([]);
  const [currentState, setCurrentState] = useState<SeedState | null>(null);

  useEffect(() => {
    const seed = seeds.find(s => s.id === seedId);
    if (!seed) return;

    // Fetch timeline events
    fetchTimeline(seedId).then(setTimeline);
  }, [seedId, seeds]);

  useEffect(() => {
    if (!timeline.length) return;
    
    // Apply enabled events in chronological order
    const state = computeSeedState(seed.baseState, timeline);
    setCurrentState(state);
  }, [timeline]);

  return { timeline, currentState, toggleEvent };
}
```

### Dynamic Editor (3 Stages)

The `SeedEditor` component automatically transitions between stages:

```typescript
// Stages determined by content length and scroll position
const getEditorStage = (content: string, scrollTop: number): 'small' | 'medium' | 'large' => {
  if (content.length < 100 && scrollTop < 500) return 'small';
  if (content.length < 1000 && scrollTop < 2000) return 'medium';
  return 'large';
};

// Small: Plain textarea, autosize
// Medium: Markdown toolbar (bold, italic, link)
// Large: Full-screen modal with full markdown support
```

## Backend Patterns

### Route Pattern

```typescript
// routes/seeds.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { SeedsService } from '../services/seeds';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category, tags, search } = req.query;
    const seeds = await SeedsService.getByUser(userId, { category, tags, search });
    res.json(seeds);
  } catch (error) {
    next(error);
  }
});

router.post('/', validateRequest(createSeedSchema), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const seed = await SeedsService.create(userId, req.body);
    
    // Queue automation jobs
    await queueAutomations(seed.id);
    
    res.status(201).json(seed);
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Service Pattern

Services contain business logic:

```typescript
// services/seeds.ts
export class SeedsService {
  static async create(userId: string, data: CreateSeedDto): Promise<Seed> {
    // 1. Validate input
    // 2. Insert seed
    // 3. Create initial event if needed
    // 4. Return seed with computed state
    
    const seed = await db('seeds').insert({
      user_id: userId,
      seed_content: data.content,
      created_at: new Date(),
    }).returning('*');

    // Compute initial state
    const initialState = {
      seed: data.content,
      timestamp: seed[0].created_at,
      metadata: {},
    };

    return { ...seed[0], currentState: initialState };
  }

  static async getById(id: string, userId: string): Promise<Seed | null> {
    const seed = await db('seeds').where({ id, user_id: userId }).first();
    if (!seed) return null;

    // Compute current state from enabled events
    const events = await EventsService.getEnabledBySeedId(id);
    const currentState = applyEvents(seed.baseState, events);
    
    return { ...seed, currentState };
  }
}
```

### Middleware Pattern

```typescript
// middleware/auth.ts
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = payload as User;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Database Patterns

### Migration Pattern

```typescript
// db/migrations/001_create_seeds.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('seeds', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.text('seed_content').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('user_id');
    table.index('created_at');
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('seeds');
}
```

### Query Pattern

Always use parameterized queries, never string concatenation:

```typescript
// ✅ Good
const seeds = await db('seeds')
  .where({ user_id: userId })
  .where('created_at', '>', since);

// ❌ Bad
const seeds = await db.raw(`SELECT * FROM seeds WHERE user_id = '${userId}'`);
```

### Event Application Pattern

Events use JSON Patch (RFC 6902). Always validate patches:

```typescript
// utils/jsonpatch.ts
import { applyPatch } from 'fast-json-patch';

export function applyEvents(baseState: SeedState, events: Event[]): SeedState {
  // Filter enabled events, sort by created_at
  const enabledEvents = events
    .filter(e => e.enabled)
    .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

  let state = { ...baseState };
  
  for (const event of enabledEvents) {
    try {
      // Validate patch
      validatePatch(event.patch_json);
      
      // Apply patch
      const result = applyPatch(state, event.patch_json, false, false);
      state = result.newDocument;
    } catch (error) {
      console.error(`Failed to apply event ${event.id}:`, error);
      // Log but continue (don't fail entire computation)
    }
  }
  
  return state;
}
```

## Key Systems

### Timeline System

**Core Principle**: Seeds are immutable; all changes are events.

1. **Base State**: Initial seed content stored in `seeds.seed_content`
2. **Events**: Stored in `events` table as JSON Patch operations
3. **Current State**: Computed by applying all enabled events to base state
4. **Toggling**: Setting `events.enabled = false` removes that change from state

```typescript
// Example event JSON Patch:
{
  "op": "add",
  "path": "/tags/-",
  "value": { "id": "tag-123", "name": "work" }
}
```

**When creating events:**
- Always compute the patch from the previous state
- Store patch in `events.patch_json` column
- Set `events.enabled = true` by default
- Link to automation if created by automation (`automation_id`)

### Automation System

Automations extend the base `Automation` class:

```typescript
// services/automation/base.ts
export abstract class Automation {
  abstract name: string;
  abstract handlerFnName: string;

  abstract process(seed: Seed, context: AutomationContext): Promise<Event[]>;
  abstract calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number;
  abstract handlePressure(seed: Seed, pressure: number): Promise<void>;
}
```

**Implementing an automation:**

```typescript
// services/automation/tag.ts
export class TagAutomation extends Automation {
  name = 'tag';
  handlerFnName = 'processTag';

  async process(seed: Seed, context: AutomationContext): Promise<Event[]> {
    // 1. Call OpenRouter API with seed content
    const tags = await this.generateTags(seed.currentState.seed);
    
    // 2. Create ADD_TAG events for each tag
    const events = tags.map(tag => ({
      seed_id: seed.id,
      event_type: 'ADD_TAG',
      patch_json: [{ op: 'add', path: '/tags/-', value: tag }],
      enabled: true,
      automation_id: this.id,
    }));
    
    // 3. Save events
    await EventsService.createMany(events);
    
    return events;
  }

  calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
    // Calculate pressure based on category changes
    // Return number 0-100
  }
}
```

**Queue Processing:**

```typescript
// services/queue/processor.ts
import { Worker, Job } from 'bullmq';

export const automationWorker = new Worker(
  'automation-queue',
  async (job: Job<AutomationJobData>) => {
    const { seedId, automationId } = job.data;
    
    const automation = AutomationRegistry.get(automationId);
    const seed = await SeedsService.getById(seedId);
    
    await automation.process(seed, { openrouter: openrouterClient });
  }
);
```

### Pressure System

Pressure tracks when automations need re-evaluation:

1. **Category Changes Trigger Pressure**: Rename, add, remove, move categories
2. **Pressure Calculated**: Each automation calculates pressure (0-100)
3. **Pressure Stored**: In `pressure_points` table
4. **Timer Evaluates**: Every `QUEUE_CHECK_INTERVAL` (default 30s)
5. **Threshold Crossed**: Add to automation queue for re-processing

```typescript
// services/utils/pressure.ts
export function calculateCategoryPressure(
  seed: Seed,
  categoryChange: CategoryChange,
  affectedCategories: Category[]
): number {
  // If seed is in affected category, add pressure
  const seedCategories = seed.currentState.categories || [];
  const isAffected = seedCategories.some(sc => 
    affectedCategories.some(ac => ac.id === sc.id)
  );
  
  if (!isAffected) return 0;
  
  // Pressure increases based on change type
  switch (categoryChange.type) {
    case 'rename': return 10;
    case 'add_child': return 5;
    case 'remove': return 20;
    case 'move': return 15;
    default: return 0;
  }
}
```

### Category Hierarchy

Categories use path-based hierarchy:

```typescript
// Path format: "/parent/child/grandchild"
// Example: "/work/projects/web"

// Finding all children:
const children = await db('categories')
  .where('path', 'like', `${parentPath}/%`);

// Finding parent:
const parent = await db('categories')
  .where('path', parentPath)
  .first();
```

## Common Tasks

### Adding a New API Endpoint

1. **Create route handler** in `routes/` directory
2. **Add service method** in `services/` if needed
3. **Add validation** using middleware
4. **Add authentication** middleware
5. **Register route** in `app.ts`
6. **Update API client** in `frontend/src/services/api.ts`
7. **Add TypeScript types** if needed

### Creating a New Component

1. **Create component directory** in `components/`
2. **Follow naming**: PascalCase file names
3. **Use style guide classes**: Reference `STYLE-GUIDE.md`
4. **Add TypeScript interface** for props
5. **Handle loading/error states**
6. **Use Context hooks** for data
7. **Export from index.ts**

### Adding a New Automation

1. **Create automation class** extending `Automation` base
2. **Implement** `process()`, `calculatePressure()`, `handlePressure()`
3. **Register** in `services/automation/registry.ts`
4. **Add to database** `automations` table
5. **Create queue jobs** when seeds are created/updated

### Modifying Database Schema

1. **Create migration file** in `db/migrations/`
2. **Implement `up()` and `down()`** functions
3. **Add indexes** for query performance
4. **Update TypeScript types** in models
5. **Run migration**: `npm run migrate`

### Adding a New Visualization

1. **Create component** in `components/`
2. **Use style guide** for colors, spacing, typography
3. **Make responsive**: Mobile-first design
4. **Handle loading states**
5. **Add interactions**: Click handlers, filters
6. **Use Context** for data access

## Testing & Quality

### Unit Tests

Test utilities and pure functions:

```typescript
// __tests__/utils/jsonpatch.test.ts
import { applyEvents } from '../utils/jsonpatch';

describe('applyEvents', () => {
  it('should apply enabled events in order', () => {
    const baseState = { seed: 'initial', tags: [] };
    const events = [
      { id: '1', enabled: true, patch_json: [{ op: 'add', path: '/tags/-', value: 'work' }] },
      { id: '2', enabled: false, patch_json: [{ op: 'add', path: '/tags/-', value: 'personal' }] },
      { id: '3', enabled: true, patch_json: [{ op: 'add', path: '/tags/-', value: 'important' }] },
    ];
    
    const result = applyEvents(baseState, events);
    expect(result.tags).toEqual(['work', 'important']);
  });
});
```

### Integration Tests

Test API endpoints and database interactions:

```typescript
// __tests__/routes/seeds.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('GET /api/seeds', () => {
  it('should require authentication', async () => {
    const res = await request(app).get('/api/seeds');
    expect(res.status).toBe(401);
  });
  
  it('should return user seeds', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .get('/api/seeds')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

### Component Tests

Test React components:

```typescript
// __tests__/components/SeedEditor.test.tsx
import { render, screen } from '@testing-library/react';
import { SeedEditor } from '../components/SeedEditor';

describe('SeedEditor', () => {
  it('should render small stage for short content', () => {
    render(<SeedEditor content="short" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
```

### Code Quality Rules

- **TypeScript**: Strict mode, no `any`, proper types
- **Linting**: ESLint + Prettier
- **Error Handling**: Always catch and handle errors
- **Logging**: Use structured logging (e.g., Winston)
- **Validation**: Validate all user input
- **Security**: Never expose secrets, sanitize output

## Security Considerations

### Input Validation

Always validate and sanitize:

```typescript
// ✅ Good
const schema = z.object({
  content: z.string().max(10000).trim(),
  tags: z.array(z.string()).max(20),
});

// ❌ Bad
const content = req.body.content; // No validation
```

### JSON Patch Validation

Validate patches before applying:

```typescript
function validatePatch(patch: PatchOperation[]): void {
  // Only allow safe operations
  const allowedOps = ['add', 'remove', 'replace'];
  const allowedPaths = ['/tags/-', '/categories/-', '/metadata'];
  
  for (const op of patch) {
    if (!allowedOps.includes(op.op)) {
      throw new Error(`Invalid operation: ${op.op}`);
    }
    if (!allowedPaths.some(path => op.path.startsWith(path))) {
      throw new Error(`Invalid path: ${op.path}`);
    }
  }
}
```

### Authentication

- All API routes (except auth) require `authenticate` middleware
- Validate JWT tokens on every request
- Store tokens securely (httpOnly cookies preferred)
- Implement token refresh if needed

### Rate Limiting

Implement rate limiting for:
- API endpoints (especially search, automations)
- Authentication endpoints
- OpenRouter API calls

### Error Handling

Never expose internal errors to users:

```typescript
// ✅ Good
catch (error) {
  logger.error('Internal error', { error, userId });
  res.status(500).json({ error: 'Internal server error' });
}

// ❌ Bad
catch (error) {
  res.status(500).json({ error: error.message }); // Exposes stack traces
}
```

## Reference Files

When working on this project, always reference:

1. **STYLE-GUIDE.md** - Complete design system, CSS variables, component classes
2. **README.md** - User-facing documentation, setup instructions
3. **This file (AGENTS.md)** - Implementation patterns and conventions
4. **Implementation Plan** (`.cursor/plans/`) - Original architecture decisions

## Quick Reference

### CSS Variables (from STYLE-GUIDE.md)

```css
/* Backgrounds */
--bg-primary: #0a0a0a;
--bg-secondary: #141414;
--bg-tertiary: #1a1a1a;

/* Text */
--text-primary: #f0f0f0;
--text-secondary: #d0d0d0;

/* Accents */
--accent-yellow: #ffd43b;
--accent-blue: #4fc3f7;
--accent-green: #66bb6a;

/* Borders */
--border-primary: #3a3a3a;
--border-vibrant: #ffd43b;

/* Spacing */
--space-4: 1rem;
--space-6: 1.5rem;
```

### Common Patterns

```typescript
// Context usage
const { seeds, loading, error } = useSeedContext();

// API call
const api = useApi();
const result = await api.get(`/seeds/${id}`);

// Event creation
const event = {
  seed_id: seedId,
  event_type: 'ADD_TAG',
  patch_json: [{ op: 'add', path: '/tags/-', value: tag }],
  enabled: true,
};

// Styling
<div className="panel panel-elevated">
  <button className="btn-primary">Action</button>
</div>
```

---

**Remember**: When in doubt, check `STYLE-GUIDE.md` for UI patterns, and maintain immutability in the timeline system.

