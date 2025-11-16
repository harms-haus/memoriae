# Development Workflow

This page provides comprehensive guides for setting up, developing, testing, and deploying Memoriae.

## Prerequisites

### Required Software

- **Node.js**: 18+ (required for all packages)
- **npm**: Comes with Node.js (or use yarn/pnpm)
- **PostgreSQL**: 14+ (for database)
- **Redis**: 6+ (for job queue)
- **Git**: For version control

### Optional Software

- **Docker/Podman**: For containerized development (supports both)
- **GitHub CLI**: For managing GitHub Actions workflows

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/harms-haus/memoriae.git
cd memoriae
```

### 2. Install Dependencies

From project root:

```bash
npm install
```

This installs dependencies for all workspaces (mother-theme, backend, frontend).

### 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

**Required Variables**:
```bash
JWT_SECRET=<generate with: openssl rand -base64 32>
DATABASE_URL=postgresql://user:password@localhost:5432/memoriae
REDIS_URL=redis://localhost:6379
```

**Optional Variables**:
```bash
PORT=3123
FRONTEND_URL=http://localhost:5173
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_CLIENT_SECRET=...
OPENROUTER_API_KEY=...
```

### 4. Database Setup

**Option A: Local PostgreSQL**

Start PostgreSQL service, then:

```bash
cd backend
npm run migrate
```

**Option B: Docker**

```bash
npm run dev
# This starts postgres, redis, and runs migrations
```

### 5. Start Services

**Option A: Local Development**

Terminal 1 - Backend:
```bash
cd backend
npm run dev  # Uses tsx watch for hot reload
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

Terminal 3 - Redis (if not using Docker):
```bash
redis-server
```

**Option B: Docker Development**

```bash
npm run dev
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend API on port 3123
- Frontend dev server on port 5173

## Development Modes

### Local Development

**Backend** (`backend/`):
- Entry: `npm run dev` → `tsx watch src/index.ts`
- Hot reload: Automatic on file changes
- Port: 3123 (configurable via `PORT`)

**Frontend** (`frontend/`):
- Entry: `npm run dev` → Vite dev server
- Hot reload: Automatic HMR
- Port: 5173 (configurable)

**Mother Theme** (`mother-theme/`):
- Build: `npm run build` → TypeScript compilation
- Used by: Frontend via workspace dependency

### Docker Development

**Start Services**:
```bash
npm run dev
```

**Options**:
- `npm run dev -- --rebuild` - Force rebuild containers
- `npm run dev -- --stop` - Stop all containers
- `npm run dev -- --logs` - View logs
- `npm run dev -- --clean` - Stop and remove everything

**Accessing Containers**:
```bash
docker exec -it memoriae-dev bash
# Or with podman:
podman exec -it memoriae-dev bash
```

## Building

### Build All Packages

From project root:

```bash
npm run build
```

This builds packages sequentially:
1. `mother-theme` → `dist/`
2. `backend` → `dist/`
3. `frontend` → `dist/`

### Build Individual Packages

**Backend**:
```bash
cd backend
npm run build  # TypeScript compilation
```

**Frontend**:
```bash
cd frontend
npm run build  # TypeScript + Vite bundling
```

**Mother Theme**:
```bash
cd mother-theme
npm run build  # TypeScript compilation with declarations
```

## Testing

### Run All Tests

From project root:

```bash
npm test  # Sequential execution
npm run test:watch  # Parallel watch mode
npm run test:coverage  # With coverage
```

### Run Package Tests

**Backend**:
```bash
cd backend
npm test  # vitest run
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage
```

**Frontend**:
```bash
cd frontend
npm test  # vitest run
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage
```

**Mother Theme**:
```bash
cd mother-theme
npm test  # vitest run --no-watch
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage
```

### Build and Test

**All Packages**:
```bash
npm run bt  # Build then test with coverage
npm run bt:watch  # Build then test in watch mode
```

**Individual Package**:
```bash
cd backend && npm run bt
cd frontend && npm run bt
```

### Test Types

**Unit Tests**:
- Test individual functions/utilities
- Location: `**/*.test.ts`, `**/*.spec.ts`
- Environment: `node` (backend) or `jsdom` (frontend)

**Integration Tests**:
- Test API endpoints with database
- Location: `**/*.integration.test.ts`
- Environment: `node`
- Uses: `supertest` for HTTP testing

**Component Tests**:
- Test React components
- Location: `**/*.test.tsx`, `**/*.spec.tsx`
- Environment: `jsdom`
- Uses: `@testing-library/react`

## Database Migrations

### Run Migrations

```bash
cd backend
npm run migrate
```

### Rollback Last Migration

```bash
cd backend
npm run migrate:rollback
```

### Create New Migration

```bash
cd backend
npm run migrate:make <migration_name>
```

This creates a new file in `backend/src/db/migrations/` with template:

```typescript
export async function up(knex: Knex): Promise<void> {
  // Migration code
}

export async function down(knex: Knex): Promise<void> {
  // Rollback code
}
```

### Migration Best Practices

1. **Always provide rollback**: Implement `down()` function
2. **Test migrations**: Run `up()` and `down()` to verify
3. **Index foreign keys**: Add indexes for performance
4. **Use transactions**: Wrap changes in transaction if possible
5. **Version control**: Commit migration files

## Code Quality

### TypeScript

**Type Checking**:
```bash
cd backend && npm run type-check
cd frontend && npm run type-check
```

**Strict Mode**: All packages use strict TypeScript:
- `noImplicitAny: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

### Linting

ESLint is configured for all packages. Run linter (if configured):
```bash
npm run lint  # If available
```

### Code Style

- **Indentation**: 2 spaces
- **Trailing commas**: Yes
- **Semicolons**: Yes
- **Quotes**: Single quotes (TypeScript/JavaScript)
- **Line length**: No strict limit (use common sense)

## Debugging

### Backend Debugging

**Node.js Debugger**:
- Port: 9229 (in Docker)
- Add `debugger;` statements
- Attach debugger in VS Code/IDE

**Logging**:
- Uses `loglevel` for structured logging
- Log levels: TRACE, DEBUG, INFO, WARN, ERROR
- Set via `LOG_LEVEL` environment variable

**Database Debugging**:
```bash
# Connect to PostgreSQL
docker exec -it memoriae-postgres-dev psql -U memoriae -d memoriae

# Or locally
psql -U postgres -d memoriae
```

**Redis Debugging**:
```bash
# Connect to Redis
docker exec -it memoriae-redis-dev redis-cli

# Or locally
redis-cli
```

### Frontend Debugging

**Browser DevTools**:
- React DevTools extension recommended
- Network tab for API calls
- Console for errors
- Sources for debugging

**Vite HMR**:
- Errors shown in browser console
- Hot reload preserves component state
- Fast refresh for React components

## CI/CD Pipeline

### GitHub Actions Workflows

**CI Workflow** (`.github/workflows/ci.yml`):
- Triggers: Push, Pull Request
- Runs: Tests with coverage for all packages
- Reports: Coverage to GitHub Actions

**Build Workflow** (`.github/workflows/build.yml`):
- Triggers: Push to main, version tags (v*)
- Runs: Build all packages
- Verifies: Builds succeed

**Publish Workflow** (`.github/workflows/publish.yml`):
- Triggers: Manual, version tags (v*)
- Runs: Publish to NPM and Docker registry
- Requires: `NPM_TOKEN` secret

### Local CI Simulation

```bash
# Run tests (same as CI)
npm test

# Build (same as CI)
npm run build

# Type check
cd backend && npm run type-check
cd frontend && npm run type-check
```

## Publishing

### Publishing to NPM

**Prerequisites**:
- NPM account with access to `@harms-haus` scope
- `NPM_TOKEN` configured in GitHub secrets

**Manual Publishing**:
```bash
# Individual packages
cd backend && npm run publish
cd frontend && npm run publish
cd mother-theme && npm run publish
```

**Automatic Publishing**:
- Create version tag: `git tag v1.0.0`
- Push tag: `git push origin v1.0.0`
- GitHub Actions publishes automatically

### Publishing Docker Images

**Prerequisites**:
- Docker Hub or GitHub Container Registry access
- `DOCKER_USERNAME` and `DOCKER_PASSWORD` (optional, for Docker Hub)

**Manual Publishing**:
```bash
./docker/scripts/docker-build.sh [tag]
./docker/scripts/docker-push.sh [tag] [registry]
```

**Automatic Publishing**:
- Create version tag: `git tag v1.0.0`
- Push tag: `git push origin v1.0.0`
- GitHub Actions builds and pushes automatically

## Production Deployment

### Docker Production Setup

**Install and Start**:
```bash
npm run install-docker
```

**Options**:
- `npm run install-docker -- --rebuild` - Force rebuild
- `npm run install-docker -- --stop` - Stop containers
- `npm run install-docker -- --clean` - Stop and remove everything

**Environment Variables**:
- Must be set in `.env` file
- Required: `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`
- Optional: OAuth credentials, OpenRouter API key

### Production Considerations

**Database**:
- Use managed PostgreSQL (AWS RDS, etc.)
- Enable SSL for remote connections
- Configure connection pooling
- Set up backups

**Redis**:
- Use managed Redis (AWS ElastiCache, etc.)
- Enable persistence if needed
- Configure memory limits

**Backend**:
- Set `NODE_ENV=production`
- Use process manager (PM2, systemd)
- Configure logging level
- Set up monitoring

**Frontend**:
- Serve static files from CDN
- Enable gzip compression
- Set up caching headers
- Configure HTTPS

## Common Tasks

### Adding a New Feature

1. **Create feature branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes**:
   - Follow patterns in this guide
   - Update relevant wiki pages
   - Add tests

3. **Run tests**:
   ```bash
   npm run bt  # Build and test
   ```

4. **Commit changes**:
   ```bash
   git commit -m "feat: add my feature"
   git push origin feature/my-feature
   ```

5. **Create Pull Request**

### Adding a New Database Migration

1. **Create migration**:
   ```bash
   cd backend
   npm run migrate:make add_new_table
   ```

2. **Edit migration file**:
   - Implement `up()` function
   - Implement `down()` function
   - Add indexes for foreign keys

3. **Test migration**:
   ```bash
   npm run migrate        # Apply
   npm run migrate:rollback  # Rollback
   npm run migrate        # Apply again
   ```

4. **Commit migration file**

### Adding a New API Endpoint

1. **Create route handler** in `backend/src/routes/`
2. **Add service method** in `backend/src/services/` if needed
3. **Add authentication** middleware
4. **Register route** in `backend/src/app.ts`
5. **Update API client** in `frontend/src/services/api.ts`
6. **Add TypeScript types** if needed
7. **Add tests**

### Creating a New Component

1. **Create component directory** in `frontend/src/components/`
2. **Follow naming**: PascalCase file names
3. **Use style guide classes**: Reference `theme.css`
4. **Add TypeScript interface** for props
5. **Handle loading/error states**
6. **Use Context hooks** for data
7. **Export from index.ts**
8. **Add tests**

## Troubleshooting

### Common Issues

**Database Connection Failed**:
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Check network/firewall settings
- For AWS RDS: Verify security group allows your IP

**Redis Connection Failed**:
- Check Redis is running
- Verify `REDIS_URL` in `.env`
- Check network/firewall settings

**Build Failures**:
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run type-check`
- Verify all dependencies installed

**Migration Failures**:
- Check database connection
- Verify migration files are valid
- Check for existing migrations that need to run first

**Port Already in Use**:
- Kill process using port: `lsof -ti:3123 | xargs kill`
- Change port in `.env` file
- Check for other instances running

### Getting Help

1. **Check logs**: Backend logs show detailed error messages
2. **Check GitHub Issues**: Search existing issues
3. **Read documentation**: This wiki, README.md, AGENTS.md
4. **Check code**: Review relevant source files

## Related Documentation

- [Tech Stack Deep Dive](Tech-Stack-Deep-Dive) - Technologies and tools
- [Architecture Overview](Architecture-Overview) - System design
- [Backend Patterns](Backend-Patterns) - Backend patterns
- [Frontend Patterns](Frontend-Patterns) - Frontend patterns
- [Database Schema](Database-Schema) - Database structure

