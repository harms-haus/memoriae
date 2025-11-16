# Project Structure

## Monorepo Layout

```
memoriae/
├── backend/          # Backend API server (@harms-haus/memoriae-server)
├── frontend/         # Frontend web app (@harms-haus/memoriae)
├── mother-theme/     # Theme library (@harms-haus/mother)
├── shared/           # Shared utilities
├── docker/           # Docker configuration
├── scripts/          # Root-level scripts
└── .github/          # GitHub Actions workflows
```

## Backend Structure

```
backend/
├── src/
│   ├── index.ts              # Entry point, server startup
│   ├── app.ts                # Express app configuration
│   ├── config.ts             # Environment config
│   ├── routes/               # API route handlers
│   │   ├── auth.ts          # OAuth endpoints
│   │   ├── seeds.ts         # Seed CRUD
│   │   ├── events.ts        # Event operations
│   │   ├── categories.ts    # Category management
│   │   ├── tags.ts          # Tag operations
│   │   └── search.ts        # Search endpoint
│   ├── services/            # Business logic
│   │   ├── automation/      # Automation handlers
│   │   │   ├── base.ts     # Automation interface
│   │   │   ├── tag.ts      # Tag automation
│   │   │   ├── categorize.ts # Categorize automation
│   │   │   └── registry.ts # Automation registry
│   │   ├── queue/           # Queue processing
│   │   │   ├── processor.ts # Job processor
│   │   │   └── scheduler.ts # Pressure evaluation timer
│   │   └── openrouter/      # OpenRouter API client
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts         # JWT validation
│   │   ├── errorHandler.ts # Error handling
│   │   └── validator.ts    # Request validation
│   ├── utils/               # Utilities
│   │   ├── jsonpatch.ts    # JSON Patch application
│   │   └── pressure.ts     # Pressure calculations
│   ├── db/                  # Database
│   │   ├── migrations/     # Knex migrations
│   │   ├── models/         # Database models
│   │   └── connection.ts   # DB connection
│   ├── types/              # TypeScript types
│   └── __tests__/          # Test files
├── dist/                   # Compiled output
├── package.json
└── tsconfig.json
```

## Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx            # Entry point, React root
│   ├── App.tsx             # Root component, routing setup
│   ├── components/         # React components
│   │   ├── SeedEditor/    # Dynamic 3-stage editor
│   │   ├── SeedList/      # List view with filters
│   │   ├── SeedDetail/    # Detail view with timeline
│   │   ├── TimelineView/  # Timeline visualization
│   │   ├── CategoryTree/  # Hierarchical category browser
│   │   ├── TagCloud/      # Tag visualization
│   │   ├── SearchBar/     # Search interface
│   │   └── Settings/      # User settings page
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx    # OAuth state management
│   │   ├── SeedContext.tsx    # Seed data & operations
│   │   └── ThemeContext.tsx   # Style guide CSS variables
│   ├── hooks/             # Custom hooks
│   │   ├── useSeedTimeline.ts      # Compute seed state from events
│   │   ├── useCategoryPressure.ts  # Monitor category changes
│   │   └── useApi.ts              # API call wrapper
│   ├── services/          # API client
│   │   └── api.ts         # REST API client (axios/fetch)
│   ├── styles/            # CSS
│   │   └── theme.css      # Style guide CSS variables
│   ├── types/             # TypeScript types
│   │   └── index.ts       # Shared types
│   └── test/              # Test setup
├── dist/                  # Production build
├── public/                # Static assets
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Mother Theme Structure

```
mother-theme/
├── src/
│   ├── components/        # React components
│   ├── examples/          # Component examples
│   ├── styles/            # CSS files
│   ├── utils/             # Utilities
│   └── index.ts           # Main export
├── dist/                  # Compiled output
├── package.json
└── tsconfig.json
```

## Docker Structure

```
docker/
├── docker-compose.yml         # Base compose file
├── docker-compose.dev.yml    # Development configuration
├── docker-compose.prod.yml   # Production configuration
├── Dockerfile                # Production Dockerfile
├── Dockerfile.dev           # Development Dockerfile
├── scripts/
│   ├── dev.sh              # Development environment script
│   ├── prod.sh             # Production environment script
│   ├── docker-build.sh     # Build Docker image
│   └── docker-push.sh      # Push Docker image
└── run-migrations.sh        # Run migrations in container
```

## Key Files

### Configuration
- `package.json` (root) - Workspace configuration
- `backend/package.json` - Backend dependencies and scripts
- `frontend/package.json` - Frontend dependencies and scripts
- `mother-theme/package.json` - Theme library dependencies
- `.env` - Environment variables (not in git)
- `.env.example` - Environment variable template

### Documentation
- `README.md` - User-facing documentation
- `AGENTS.md` - Comprehensive agent guide (implementation patterns)
- `STYLE-GUIDE.md` - Design system documentation

### CI/CD
- `.github/workflows/ci.yml` - Continuous integration
- `.github/workflows/build.yml` - Build workflow
- `.github/workflows/publish.yml` - Publish workflow

## Build Outputs

- `backend/dist/` - Compiled backend TypeScript
- `frontend/dist/` - Production frontend build (static files)
- `mother-theme/dist/` - Compiled theme library

## Test Files

- `backend/src/__tests__/` - Backend tests
- `frontend/src/**/*.test.tsx` - Frontend component tests
- `mother-theme/src/**/*.test.tsx` - Theme component tests

## Database

- `backend/src/db/migrations/` - Knex migration files
- Migrations are version controlled
- Run with: `cd backend && npm run migrate`
