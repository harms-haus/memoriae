# Tech Stack Deep Dive

This page provides comprehensive documentation of all technologies, frameworks, and tools used in the Memoriae project, including version numbers, purposes, and configuration details.

## Frontend Stack

### React 19 with TypeScript

**Version**: React 19.0.0, React DOM 19.0.0

**Purpose**: Modern UI framework providing component-based architecture with type safety.

**Key Features Used**:
- Functional components with hooks
- React Context for global state management
- React Router for client-side routing
- React Markdown for content rendering

**TypeScript Configuration** (`frontend/tsconfig.json`):
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode enabled with:
  - `noImplicitAny: true`
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `noUnusedLocals: true`
  - `noImplicitReturns: true`

**Path Aliases**:
- `@/*` → `src/*`
- `@mother/*` → `../mother-theme/src/*`

### Vite

**Version**: 5.0.11

**Purpose**: Fast build tool and development server with Hot Module Replacement (HMR).

**Configuration** (`frontend/vite.config.ts`):
- React plugin for JSX transformation
- Path alias resolution
- Development server on port 5173
- Production builds output to `dist/`

**Features**:
- Lightning-fast HMR during development
- Optimized production builds
- Native ES modules support

### React Router

**Version**: 7.9.5

**Purpose**: Client-side routing for single-page application navigation.

**Usage**: Handles all route definitions in `frontend/src/App.tsx`, including:
- View routing (seeds, categories, tags, settings)
- Seed detail pages with slug-based URLs
- Tag detail pages
- Sprout detail pages

### React Markdown

**Version**: 9.0.1

**Purpose**: Renders markdown content in seed displays.

**Plugins**:
- `remark-gfm` (4.0.0) - GitHub Flavored Markdown support

### CSS Custom Properties

**Purpose**: Themeable design system using CSS variables.

**Implementation**: All design tokens defined in `frontend/src/styles/theme.css`:
- Background colors (`--bg-primary`, `--bg-secondary`, etc.)
- Text colors (`--text-primary`, `--text-secondary`, etc.)
- Accent colors (`--accent-yellow`, `--accent-blue`, etc.)
- Spacing (`--space-1` through `--space-24`)
- Typography (`--text-xs` through `--text-6xl`)
- Borders, shadows, transitions

### Additional Frontend Dependencies

- **axios** (1.6.5) - HTTP client for API calls
- **lucide-react** (0.552.0) - Icon library
- **react-colorful** (5.6.1) - Color picker component
- **luxon** (3.7.2) - Date/time handling
- **loglevel** (1.9.1) - Structured logging
- **@headless-tree/core** (1.5.1) - Tree component library
- **@headless-tree/react** (1.5.1) - React bindings for tree component

## Backend Stack

### Node.js + Express + TypeScript

**Node.js Version**: 18+ (required)

**Express Version**: 4.18.2

**Purpose**: Robust HTTP API server with RESTful endpoints.

**TypeScript Configuration** (`backend/tsconfig.json`):
- Target: ES2022
- Module: CommonJS
- Output: `dist/` directory
- Strict mode with all safety checks enabled

**Express Setup** (`backend/src/app.ts`):
- CORS middleware with configurable origins
- JSON body parsing
- Request logging middleware
- Error handling middleware
- Static file serving in production

### PostgreSQL with Knex.js

**PostgreSQL Version**: 14+ (required)

**Knex.js Version**: 3.1.0

**Purpose**: Relational database with query builder and migration system.

**Key Features**:
- Type-safe query builder
- Migration system for schema versioning
- Connection pooling
- Transaction support

**Database Client**: `pg` (8.11.3) - PostgreSQL client library

**Migration Files**: Located in `backend/src/db/migrations/`:
- 35+ migration files tracking schema evolution
- Each migration has `up()` and `down()` functions

### Redis + BullMQ

**Redis Version**: 6+ (required)

**BullMQ Version**: 5.3.0

**Purpose**: Job queue for asynchronous automation processing.

**Features**:
- Persistent job queue
- Job retry logic
- Priority-based job processing
- Concurrency control (5 concurrent jobs)
- Job progress tracking

**Connection**: Configured via `REDIS_URL` environment variable or `REDIS_HOST`/`REDIS_PORT`

### OpenRouter API Integration

**Purpose**: AI model integration using user-provided API keys.

**Implementation** (`backend/src/services/openrouter/client.ts`):
- Custom client wrapper around OpenRouter API
- Supports any model available on OpenRouter
- User-specific API keys and model preferences
- Error handling and retry logic
- Request/response type safety

**Key Methods**:
- `createChatCompletion()` - Chat completion requests
- `generateText()` - Simple text generation
- `getModels()` - List available models

### JWT Authentication

**Library**: `jsonwebtoken` (9.0.2)

**Purpose**: Secure session management for authenticated API requests.

**Implementation** (`backend/src/middleware/auth.ts`):
- Token validation on protected routes
- User information attached to request object
- Token expiration handling

### Fast JSON Patch

**Library**: `fast-json-patch` (3.1.1)

**Purpose**: JSON Patch (RFC 6902) operations for immutable state changes.

**Note**: While the system now uses transactions instead of JSON Patch, this library remains for potential future use.

### Additional Backend Dependencies

- **cors** (2.8.5) - CORS middleware
- **dotenv** (16.3.1) - Environment variable management
- **uuid** (13.0.0) - UUID generation
- **luxon** (3.7.2) - Date/time handling
- **loglevel** (1.9.1) - Structured logging
- **axios** (1.13.1) - HTTP client for OpenRouter API

## Development Tools

### TypeScript

**Version**: 5.3.3 (all packages)

**Purpose**: Type-safe JavaScript with compile-time error checking.

**Configuration**: Strict mode enabled across all packages with comprehensive type checking.

### Vitest

**Version**: 1.1.0 (all packages)

**Purpose**: Fast unit and integration testing framework.

**Backend Configuration** (`backend/vitest.config.ts`):
- Environment: `node`
- Setup file: `src/test-setup.ts`
- Coverage provider: v8
- Test files: `**/*.test.ts`, `**/*.spec.ts`, `**/*.integration.test.ts`

**Frontend Configuration** (`frontend/vitest.config.ts`):
- Environment: `jsdom` (browser-like)
- Setup file: `src/test/setup.ts`
- Path aliases configured
- Suppresses WebSocket errors from Vite HMR

**Coverage**: `@vitest/coverage-v8` (1.1.0) for coverage reporting

### Playwright

**Version**: 1.40.0 (frontend, mother-theme)

**Purpose**: Component testing and visual regression testing.

**Usage**: Visual testing for React components with snapshot comparison.

### ESLint

**Version**: 8.56.0

**Purpose**: Code linting and style enforcement.

**Plugins**:
- `@typescript-eslint/eslint-plugin` (6.17.0)
- `@typescript-eslint/parser` (6.17.0)
- `eslint-plugin-react-hooks` (4.6.0) - React hooks rules
- `eslint-plugin-react-refresh` (0.4.5) - React refresh rules

### Docker/Podman

**Purpose**: Containerization for development and production environments.

**Support**: Both Docker and Podman are supported via scripts that detect which is available.

**Development**: `docker/docker-compose.dev.yml` - Hot reload enabled
**Production**: `docker/docker-compose.prod.yml` - Optimized production builds

## CI/CD

### GitHub Actions

**Workflows** (`.github/workflows/`):
- **ci.yml** - Runs tests with coverage on every push/PR
- **build.yml** - Builds all packages on main branch or version tags
- **publish.yml** - Publishes packages to NPM and Docker registry

**Features**:
- Parallel test execution
- Coverage reporting
- Automated publishing on version tags
- Docker image building and pushing

## Package Management

### npm Workspaces

**Structure**: Monorepo with three workspaces:
1. `mother-theme` - `@harms-haus/mother`
2. `backend` - `@harms-haus/memoriae-server`
3. `frontend` - `@harms-haus/memoriae`

**Root Scripts**: Execute commands across all workspaces:
- `npm run build` - Build all packages sequentially
- `npm test` - Test all packages sequentially
- `npm run test:watch` - Test all packages in parallel watch mode

## Build Tools

### TypeScript Compiler

**Backend**: `tsc` compiles to `dist/` directory (CommonJS)
**Frontend**: `tsc` for type checking, Vite for bundling
**Mother Theme**: `tsc` compiles to `dist/` with type declarations

### Development Servers

**Backend**: `tsx watch` (4.7.0) - TypeScript execution with hot reload
**Frontend**: `vite` dev server - Fast HMR with instant updates

## Testing Libraries

### Testing Library

**Versions**:
- `@testing-library/react` (16.3.0)
- `@testing-library/jest-dom` (6.1.5)
- `@testing-library/user-event` (14.5.1)

**Purpose**: React component testing utilities with DOM queries and user interaction simulation.

### Supertest

**Version**: 7.1.4

**Purpose**: HTTP assertion library for API integration testing.

**Usage**: Tests Express routes with request/response assertions.

## Type Definitions

All packages include comprehensive TypeScript type definitions:

- `@types/node` (20.10.6) - Node.js types
- `@types/express` (4.17.21) - Express types
- `@types/react` (19.0.0) - React types
- `@types/pg` (8.10.9) - PostgreSQL types
- `@types/uuid` (10.0.0) - UUID types
- `@types/cors` (2.8.19) - CORS types
- `@types/jsonwebtoken` (9.0.5) - JWT types
- `@types/luxon` (3.7.1) - Luxon types

## Environment Requirements

### Runtime Requirements

- **Node.js**: 18+ (required for all packages)
- **PostgreSQL**: 14+ (for database)
- **Redis**: 6+ (for job queue)

### Development Requirements

- **npm**: Comes with Node.js (or use yarn/pnpm)
- **Docker/Podman**: Optional, for containerized development

## Version Management

All packages are versioned together at `0.1.0`. Version bumps are coordinated across all three packages when publishing.

## Related Documentation

- [Architecture Overview](Architecture-Overview) - How these technologies work together
- [Development Workflow](Development-Workflow) - Setting up the development environment
- [Frontend Patterns](Frontend-Patterns) - React patterns and usage
- [Backend Patterns](Backend-Patterns) - Express and service patterns

