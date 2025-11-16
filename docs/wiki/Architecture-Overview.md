# Architecture Overview

This page provides a comprehensive overview of the Memoriae system architecture, including monorepo structure, request flows, design patterns, and architectural principles.

## Monorepo Structure

Memoriae is organized as a **monorepo** using npm workspaces with three distinct packages:

```
memoriae/
├── mother-theme/     # Theme library and React components
├── backend/          # Backend API server
└── frontend/         # Frontend web application
```

### Package Organization

1. **`mother-theme`** (`@harms-haus/mother`)
   - Shared React components
   - Design system CSS variables
   - Reusable UI components (Button, Panel, Tabs, etc.)
   - Published as separate NPM package

2. **`backend`** (`@harms-haus/memoriae-server`)
   - Express API server
   - Database models and migrations
   - Business logic services
   - Automation framework
   - Queue processing
   - Published as separate NPM package

3. **`frontend`** (`@harms-haus/memoriae`)
   - React application
   - User interface components
   - State management (Context + Hooks)
   - API client
   - Published as separate NPM package

### Workspace Benefits

- Shared dependencies (single `node_modules` for common packages)
- Coordinated versioning
- Cross-package type references
- Unified build and test scripts

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Application (Frontend)                        │  │
│  │  - Component Tree                                    │  │
│  │  - React Context (Auth, State)                      │  │
│  │  - React Router (Navigation)                        │  │
│  └──────────────┬───────────────────────────────────────┘  │
└─────────────────┼───────────────────────────────────────────┘
                  │ HTTP/REST API
                  │ (JSON)
┌─────────────────▼───────────────────────────────────────────┐
│              Express API Server (Backend)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes Layer                                        │  │
│  │  - /api/auth, /api/seeds, /api/categories, etc.     │  │
│  │  - Authentication middleware                         │  │
│  │  - Request validation                                │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Services Layer                                      │  │
│  │  - SeedsService, CategoriesService, etc.            │  │
│  │  - Business logic                                    │  │
│  │  - State computation                                │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Database Layer (Knex.js)                           │  │
│  │  - Query builder                                    │  │
│  │  - Migrations                                       │  │
│  └──────────────┬───────────────────────────────────────┘  │
└─────────────────┼───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              PostgreSQL Database                             │
│  - users, seeds, seed_transactions                         │
│  - tags, tag_transactions                                  │
│  - categories, sprouts, sprout_transactions                │
│  - automations, pressure_points, automation_queue          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Background Processing                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BullMQ Worker                                        │  │
│  │  - Processes automation jobs                         │  │
│  │  - Concurrency: 5 jobs                               │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Automation Registry                                │  │
│  │  - TagAutomation, CategorizeAutomation, etc.        │  │
│  │  - process() → creates transactions                 │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  OpenRouter API Client                               │  │
│  │  - User-provided API keys                            │  │
│  │  - AI model integration                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Redis (Job Queue)                              │
│  - automation queue                                         │
│  - Job persistence                                         │
│  - Retry logic                                             │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow

### 1. User Request Flow

```
User Action (Browser)
    ↓
React Component
    ↓
API Client (axios)
    ↓
HTTP Request → Express Server
    ↓
Authentication Middleware (JWT validation)
    ↓
Route Handler
    ↓
Service Layer (business logic)
    ↓
Database Query (Knex.js)
    ↓
PostgreSQL
    ↓
Response flows back up the chain
```

### 2. Automation Processing Flow

```
Seed Created/Updated
    ↓
Queue Job Added (BullMQ)
    ↓
Redis (Job Queue)
    ↓
Worker Picks Up Job
    ↓
Automation.process() called
    ↓
OpenRouter API (AI processing)
    ↓
Transactions Created
    ↓
Saved to Database
    ↓
Pressure Points Updated (if category changes)
```

### 3. Pressure Evaluation Flow

```
Category Change Detected
    ↓
CategoryChangeService calculates pressure
    ↓
Pressure Points Updated in Database
    ↓
Scheduler (runs every 30s by default)
    ↓
Checks for exceeded thresholds
    ↓
Calls automation.handlePressure()
    ↓
Adds job to queue for re-processing
```

## Design Patterns

### Event Sourcing / Transaction-Based Timeline

**Principle**: All changes are immutable transactions. Current state is computed by replaying transactions.

**Implementation**:
- Seeds start with a `create_seed` transaction
- All modifications create new transactions
- State computed by `computeSeedState()` function
- Transactions stored in `seed_transactions` table
- Chronological ordering ensures correct state

**Benefits**:
- Complete history of all changes
- Ability to reconstruct any point in time
- Immutability prevents data corruption
- Audit trail built-in

### Service Layer Pattern

**Structure**: Business logic separated from routes and database

**Example** (`backend/src/services/seeds.ts`):
```typescript
class SeedsService {
  static async getById(id: string, userId: string): Promise<Seed | null>
  static async create(userId: string, data: CreateSeedDto): Promise<Seed>
  static async update(id: string, userId: string, data: UpdateSeedDto): Promise<Seed>
}
```

**Benefits**:
- Reusable business logic
- Testable in isolation
- Clear separation of concerns
- Consistent error handling

### Middleware Pattern

**Layers**:
1. CORS middleware
2. Body parsing (JSON, URL-encoded)
3. Request logging
4. Authentication (JWT validation)
5. Error handling (last)

**Implementation** (`backend/src/app.ts`):
- Middleware applied in order
- Each middleware can modify request/response
- Error middleware catches all errors

### Automation Framework Pattern

**Base Class** (`backend/src/services/automation/base.ts`):
```typescript
abstract class Automation {
  abstract process(seed: Seed, context: AutomationContext): Promise<AutomationProcessResult>
  abstract calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number
  async handlePressure(seed: Seed, pressure: number, context: AutomationContext): Promise<void>
}
```

**Benefits**:
- Consistent automation interface
- Easy to add new automations
- Pressure system integration
- Tool execution support

### Registry Pattern

**Automation Registry** (`backend/src/services/automation/registry.ts`):
- Centralized automation management
- Singleton pattern
- Loads automations from database
- Provides lookup by ID or name

## Immutability Principles

### Core Principle

**Never mutate base data directly**. All changes create new transactions.

### Transaction Types

- `create_seed` - Initial seed creation
- `edit_content` - Content changes
- `add_tag` / `remove_tag` - Tag modifications
- `set_category` / `remove_category` - Category assignments
- `add_sprout` - AI-generated content

### State Computation

State is always computed, never stored:
```typescript
const currentState = computeSeedState(transactions)
```

This ensures:
- Consistency across all reads
- No stale data
- Ability to recompute at any time

## Separation of Concerns

### Frontend Responsibilities

- User interface rendering
- User interaction handling
- Client-side routing
- API communication
- Local state management (Context)

### Backend Responsibilities

- Business logic
- Data validation
- Database operations
- Authentication/authorization
- Queue management
- AI integration

### Database Responsibilities

- Data persistence
- Transaction integrity
- Query optimization (indexes)
- Relationship management (foreign keys)

## Queue System Architecture

### BullMQ Integration

**Queue Name**: `automation`

**Worker Configuration**:
- Concurrency: 5 jobs
- Retry logic: Built-in
- Job persistence: Redis
- Progress tracking: Supported

**Job Data Structure**:
```typescript
interface AutomationJobData {
  seedId: string
  automationId: string
  userId: string
  priority: number
}
```

### Scheduler System

**Pressure Evaluation Scheduler**:
- Runs on configurable interval (default: 30s)
- Checks all pressure points
- Detects threshold crossings
- Triggers re-evaluation

**Idea Musing Scheduler**:
- Time-based scheduling (default: 02:00)
- Daily limit enforcement
- Exclusion days support

## Database Architecture

### Transaction-Based State

**Key Tables**:
- `seed_transactions` - All seed state changes
- `tag_transactions` - All tag state changes
- `sprout_transactions` - All sprout state changes

**Base Tables**:
- `seeds` - Minimal seed metadata (id, user_id, slug, created_at)
- `tags` - Minimal tag metadata
- `sprouts` - Minimal sprout metadata

**Computed State**: Always computed from transactions, never stored

### Hierarchical Categories

**Path-Based Hierarchy**:
- Path format: `/parent/child/grandchild`
- Stored in `categories.path` column
- Indexed for fast queries
- Self-referencing via `parent_id`

**Query Patterns**:
- Find children: `WHERE path LIKE '/parent/%'`
- Find parent: `WHERE path = '/parent'`
- Tree building: Two-pass algorithm (create nodes, build relationships)

## API Architecture

### RESTful Design

**Resource-Based URLs**:
- `/api/seeds` - Seed collection
- `/api/seeds/:id` - Individual seed
- `/api/categories` - Category collection
- `/api/tags` - Tag collection

**HTTP Methods**:
- GET - Retrieve resources
- POST - Create resources
- PUT - Update resources
- DELETE - Remove resources

### Authentication

**JWT-Based**:
- Token in `Authorization: Bearer <token>` header
- Validated on every protected route
- User info attached to request object

**OAuth Providers**:
- Google OAuth 2.0
- GitHub OAuth 2.0

## Frontend Architecture

### Component Hierarchy

```
App
├── AuthProvider (Context)
├── BrowserRouter
│   └── TabNavigation
│       ├── SeedsView
│       ├── CategoriesView
│       ├── TagsView
│       ├── SettingsView
│       └── SeedDetailView
│           └── SeedTimeline
```

### State Management

**React Context**:
- `AuthContext` - Authentication state
- Component-level state for UI

**No Global State Library**: Context + Hooks sufficient for needs

### Code Splitting

**Lazy Loading**:
- View components loaded on demand
- Reduces initial bundle size
- Improves time to interactive

## Error Handling

### Backend Error Handling

**Middleware Chain**:
1. Route handlers catch errors
2. Pass to `next(error)`
3. Error middleware formats response
4. Logs error details

**Error Types**:
- Validation errors (400)
- Authentication errors (401)
- Not found errors (404)
- Server errors (500)

### Frontend Error Handling

**API Client**:
- Axios interceptors for errors
- User-friendly error messages
- Retry logic for transient failures

## Performance Considerations

### Database Optimization

- Indexes on frequently queried columns
- Composite indexes for common query patterns
- Connection pooling
- Query optimization (Knex.js)

### Frontend Optimization

- Code splitting (lazy loading)
- Bundle optimization (Vite)
- Memoization where needed
- Efficient re-renders (React)

### Queue Optimization

- Concurrency limits prevent overload
- Priority-based job processing
- Job persistence for reliability
- Retry logic for failures

## Related Documentation

- [Tech Stack Deep Dive](Tech-Stack-Deep-Dive) - Technology details
- [Data Structures](Data-Structures) - Database schema
- [Timeline System](Timeline-System) - Event sourcing details
- [Automation System](Automation-System) - Automation framework
- [Frontend Patterns](Frontend-Patterns) - React patterns
- [Backend Patterns](Backend-Patterns) - Service patterns

