# Memoriae Project Overview

## Purpose

Memoriae is a powerful, AI-enhanced memory and note-taking web application that helps users capture, organize, and evolve their thoughts over time. The application uses an immutable timeline system to track changes to memories, with intelligent automation that suggests tags and categories using AI.

## Core Concepts

- **Seed**: A memory/note with base content (`seed_content`)
- **Event**: Immutable change record using JSON Patch (RFC 6902)
- **Timeline**: Chronological sequence of events that can be toggled on/off
- **Automation**: Background process that analyzes seeds and creates events
- **Pressure**: Metric that triggers re-evaluation when categories change

## Tech Stack

### Frontend
- **React 19** + **TypeScript** - Modern UI framework with type safety
- **React Context + Hooks** - State management
- **Vite** - Fast build tool and dev server
- **CSS Custom Properties** - Themeable design system
- **React Router** - Client-side routing
- **React Markdown** - Markdown rendering
- **Luxon** - Date/time handling

### Backend
- **Node.js** + **Express** + **TypeScript** - Robust API server
- **PostgreSQL** - Relational database (14+)
- **Knex.js** - SQL query builder and migrations
- **Redis** + **BullMQ** - Job queue for async processing
- **OpenRouter API** - AI model integration (user-provided API keys)
- **JWT** - Authentication tokens
- **Fast JSON Patch** - JSON Patch (RFC 6902) operations

### Authentication
- **OAuth 2.0** - Google and GitHub providers
- **JWT** - Secure session management

### Development Tools
- **Vitest** - Test framework (all packages)
- **Playwright** - Component testing (mother-theme, frontend)
- **TypeScript** - Type checking and compilation
- **ESLint** - Linting
- **Docker/Podman** - Containerization

## Architecture

### Monorepo Structure

The project is a **monorepo** using npm workspaces with three packages:

1. **`mother-theme`** - Theme library and React components (`@harms-haus/mother`)
2. **`backend`** - Backend API server (`@harms-haus/memoriae-server`)
3. **`frontend`** - Frontend web application (`@harms-haus/memoriae`)

### Database Schema

Key tables:
- **users** - OAuth user data
- **seeds** - Base memory/note data
- **events** - Immutable timeline events (using JSON Patch format)
- **automations** - Automation definitions and handlers
- **categories** - Hierarchical category structure with path-based queries
- **tags** - Tag definitions with colors
- **pressure_points** - Tracks when automations need re-evaluation
- **automation_queue** - Queue of pending automation jobs

### Timeline System

Each seed (memory) starts with a base state. All changes are stored as JSON Patch (RFC 6902) operations in the events table. The current state of a seed is computed by applying all enabled events in chronological order. You can toggle events on/off to explore different versions of your memories.

### Automation System

Automations process new seeds and calculate "pressure" - a metric that determines when re-evaluation is needed. When categories change (rename, add, remove, move), pressure increases for related seeds. Once pressure crosses a threshold, the automation is queued for re-evaluation.

Default automations:
- **TagAutomation**: Generates tags using AI
- **CategorizeAutomation**: Assigns categories using AI

## Entry Points

### Development
- **Frontend**: `cd frontend && npm run dev` → http://localhost:5173
- **Backend**: `cd backend && npm run dev` → http://localhost:3123/api
- **Docker**: `npm run dev` → Starts all services with hot reload

### Production
- **Frontend**: Built static files served from `frontend/dist/`
- **Backend**: `cd backend && npm start` → Runs `node dist/index.js`
- **Docker**: `npm run install-docker` → Production containers

## Environment Variables

All environment variables are loaded from `.env` in the project root.

**Required:**
- `JWT_SECRET` - Secret for JWT token signing
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

**Optional:**
- `PORT` - Backend port (default: 3123)
- `FRONTEND_URL` - Frontend URL for CORS
- `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET`
- `OAUTH_GITHUB_CLIENT_ID` / `OAUTH_GITHUB_CLIENT_SECRET`
- `OPENROUTER_API_KEY` - OpenRouter API key for AI features
