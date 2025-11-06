<!-- fe49a05f-7b45-4d80-9e1a-5266fd38cc41 9fe0b8fd-b591-4eec-b135-6f82aef8f53a -->
# Memoriae Web App Implementation Plan

## Architecture Overview

**Stack:**

- Frontend: React + TypeScript, React Context + hooks for state
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- AI: OpenRouter API (user-provided keys)
- Auth: OAuth (Google + GitHub)
- Queue: Bull/BullMQ for async automation processing
- API: REST

## Database Schema

### Core Tables

- `users` - OAuth user data (id, email, name, provider, provider_id, created_at)
- `seeds` - Base seed data (id, user_id, seed_content, created_at)
- `events` - Immutable timeline events (id, seed_id, event_type, patch_json, enabled, created_at, automation_id)
- `automations` - Automation definitions (id, name, description, handler_fn_name, enabled)
- `categories` - Hierarchical categories (id, parent_id, name, path, created_at)
- `tags` - Tag lookup (id, name, color)
- `seed_tags` - Many-to-many relationship (seed_id, tag_id, added_by_event_id)
- `seed_categories` - Many-to-many relationship (seed_id, category_id, added_by_event_id)
- `pressure_points` - Pressure tracking for re-evaluation (seed_id, automation_id, pressure_amount, last_updated)
- `automation_queue` - Queue items for processing (id, seed_id, automation_id, priority, created_at)

### Indexes

- seeds: user_id, created_at
- events: seed_id, enabled, created_at
- categories: path (for hierarchical queries)
- pressure_points: automation_id, pressure_amount

## Key Components

### Frontend Structure

```
src/
  components/
    SeedEditor/ - Dynamic 3-stage editor (small/medium/large)
    SeedList/ - List view with filtering
    SeedDetail/ - Detailed view with timeline
    TimelineView/ - Visual timeline of seeds
    CategoryTree/ - Hierarchical category browser
    TagCloud/ - Tag visualization
    SearchBar/ - Full-text search
    Settings/ - User settings (OAuth, model selection, API key)
  contexts/
    AuthContext - OAuth state
    SeedContext - Seed data and operations
    ThemeContext - Style guide CSS variables
  hooks/
    useSeedTimeline - Compute seed state from enabled events
    useCategoryPressure - Monitor category changes for pressure
  services/
    api.ts - REST API client
```

### Backend Structure

```
src/
  routes/
    auth.ts - OAuth endpoints
    seeds.ts - CRUD for seeds
    events.ts - Event toggling
    categories.ts - Category management
    tags.ts - Tag operations
    search.ts - Search endpoint
  services/
    automation/
      base.ts - Base automation interface
      tag.ts - Tag automation handler
      categorize.ts - Categorize automation handler
      registry.ts - Automation registration
    queue/
      processor.ts - Queue job processor
      scheduler.ts - Timer-based pressure evaluation
    openrouter/
      client.ts - OpenRouter API client
  middleware/
    auth.ts - JWT/session validation
    queue.ts - Queue job management
  utils/
    jsonpatch.ts - JSON Patch application
    pressure.ts - Pressure calculation logic
```

## Implementation Details

### Seed Timeline System

- Each seed starts with base state: `{ seed: string, timestamp: Date, metadata: {} }`
- Events store JSON Patch (RFC 6902) operations
- Computing current state: Apply all enabled events in chronological order
- Toggling: Simple boolean flag on event, recompute state on frontend/backend
- Event types: ADD_TAG, REMOVE_TAG, SET_CATEGORY, UPDATE_CONTENT, etc.

### Dynamic Editor (3 Stages)

- **Small**: `<textarea>` autosize, max-height ~250 chars visible, no markdown UI
- **Medium**: Markdown toolbar (bold, italic, link), max-height ~1000 chars
- **Large**: Full-screen modal/overlay, zen-mode with markdown toolbar
- Auto-transition based on content length and scroll position

### Automation System

- Base class: `Automation` with methods:
  - `process(seed, context)` - Process new seed
  - `calculatePressure(seed, context, changes)` - Timer-based pressure calculation
  - `handlePressure(seed, pressure)` - Trigger when threshold reached
- Default automations: TagAutomation, CategorizeAutomation
- Queue jobs execute automations asynchronously
- Timer service (setInterval/cron) evaluates pressure points every N seconds

### Category Hierarchy & Pressure

- Categories stored with `path` field (e.g., "/work/projects/web")
- Pressure triggers:
  - Category rename: +pressure to all seeds in category
  - Add child category: +pressure to parent category seeds
  - Remove category: +pressure to affected seeds
  - Move subcategory: +pressure to old and new parent seeds
- Pressure thresholds configurable per automation
- When threshold reached: Add to automation queue for re-evaluation

### Responsive Layout

- Mobile-first design (320px+)
- Breakpoints: 320px, 768px, 1024px
- Container expands: phone → tablet → desktop
- Use CSS Grid/Flexbox from style guide
- Touch-friendly button sizes on mobile

### Visualization Components

- **Category Tree**: Recursive component, expandable nodes, click to filter seeds
- **Tag Cloud**: Frequency-based sizing, click to filter, color from style guide palette
- **Timeline**: Vertical timeline with seeds plotted by created_at, filterable
- **Search**: Full-text on content + tags + categories, instant results

## API Endpoints

```
GET    /api/auth/status
GET    /api/auth/google
GET    /api/auth/github
POST   /api/auth/logout

GET    /api/seeds
POST   /api/seeds
GET    /api/seeds/:id
PUT    /api/seeds/:id
DELETE /api/seeds/:id
GET    /api/seeds/:id/timeline
POST   /api/seeds/:id/events/:eventId/toggle

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/tags
POST   /api/tags

GET    /api/search?q=query&category=&tags=

GET    /api/settings
PUT    /api/settings (openrouter_model, openrouter_api_key)
```

## Environment Setup

```env
# Backend
DATABASE_URL=postgresql://...
OPENROUTER_API_URL=https://openrouter.ai/api/v1
JWT_SECRET=...
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_CLIENT_SECRET=...
REDIS_URL=redis://... (for queue)
QUEUE_CHECK_INTERVAL=30000 (30s for pressure evaluation)

# Frontend
VITE_API_URL=http://localhost:3000/api
```

## Development Phases

1. **Phase 1: Core Infrastructure**

   - Project setup (frontend + backend)
   - Database schema and migrations
   - OAuth integration (Google + GitHub)
   - Basic seed CRUD
   - API client setup

2. **Phase 2: Timeline System**

   - Event creation and storage
   - JSON Patch application logic
   - Timeline computation (enabled events only)
   - Event toggle functionality
   - Seed state derivation

3. **Phase 3: Automation Pipeline**

   - Base automation framework
   - Tag automation
   - Categorize automation
   - Queue system setup
   - OpenRouter integration
   - Async job processing

4. **Phase 4: Pressure & Re-evaluation**

   - Pressure tracking system
   - Category change detection
   - Timer-based pressure evaluation
   - Automation pressure handlers
   - Re-evaluation queue

5. **Phase 5: UI Components**

   - Style guide CSS implementation
   - Dynamic seed editor (3 stages)
   - Seed list and detail views
   - Timeline visualization
   - Category tree
   - Tag cloud
   - Search interface

6. **Phase 6: Polish & Testing**

   - Responsive design refinement
   - Performance optimization
   - Error handling
   - User testing
   - Documentation

## File Structure

```
memoriae/
  backend/
    src/
      index.ts
      app.ts
      config.ts
      routes/
      services/
      middleware/
      utils/
      db/
        migrations/
        models/
    package.json
    tsconfig.json
  frontend/
    src/
      App.tsx
      main.tsx
      components/
      contexts/
      hooks/
      services/
      styles/
        theme.css (style guide CSS)
    package.json
    vite.config.ts
    tsconfig.json
  STYLE-GUIDE.md
  README.md
  docker-compose.yml (for local dev)
```

## Important Considerations

- **Performance**: Index database queries, cache computed seed states, paginate lists
- **Security**: Validate JSON patches, sanitize user input, rate limit API calls
- **Scalability**: Queue system allows horizontal scaling, database connection pooling
- **Error Handling**: Graceful degradation when OpenRouter fails, retry logic for queue jobs
- **Testing**: Unit tests for JSON Patch logic, integration tests for automation pipeline

### To-dos

- [x] Initialize project structure: create backend and frontend directories, set up TypeScript configs, install dependencies (Express, React, PostgreSQL client, etc.)
- [x] Create database schema and migrations: users, seeds, events, categories, tags, and all junction tables with proper indexes
- [x] Implement OAuth authentication with Google and GitHub providers, JWT token management, session handling
- [x] Build basic seed CRUD API endpoints, seed creation/reading with base state structure
- [x] Implement timeline event system: JSON Patch storage, event application logic, enabled/disabled state tracking
- [x] Create function to compute current seed state from enabled events, handle JSON Patch application correctly
- [x] Build base automation framework with interface for process(), calculatePressure(), and handlePressure() methods
- [x] Create OpenRouter API client, handle user-provided API keys, model selection, request/response handling
- [x] Implement TagAutomation: calls OpenRouter to generate tags, creates ADD_TAG events, calculates pressure
- [x] Implement CategorizeAutomation: calls OpenRouter for category assignment, creates SET_CATEGORY events, handles hierarchy
- [x] Set up Bull/BullMQ queue system with Redis, job processors for automation execution, error handling
- [x] Implement pressure points table and logic: track pressure per seed/automation, detect threshold crossing
- [x] Build category change detection: monitor renames, additions, removals, calculate and apply pressure to affected seeds
- [x] Create timer service that periodically evaluates pressure points, triggers re-evaluation queue jobs when thresholds reached
- [x] Convert style guide to CSS file with all custom properties, component classes, animations, responsive utilities
- [x] Build dynamic 3-stage seed editor: small (plain textarea), medium (markdown toolbar), large (full-screen zen mode)
- [x] Create seed list component with filtering, sorting, responsive layout following style guide
- [x] Build seed detail view with timeline visualization, event toggle controls, current state display
- [x] Implement hierarchical category browser component with expand/collapse, seed filtering by category
- [x] Create tag cloud visualization with frequency-based sizing, color coding, click-to-filter functionality
- [x] Build timeline view showing all seeds chronologically, with filters and interactive seed markers
- [ ] Implement search bar with full-text search across content, tags, and categories, instant results display
- [ ] Create settings page for OAuth account management, OpenRouter model selection, API key input
- [ ] Refine responsive design across all breakpoints, test mobile/tablet/desktop layouts, ensure touch-friendly interactions