# Suggested Commands for Memoriae Development

## Root Level Commands

### Development
- `npm run dev` - Start Docker development environment (postgres, redis, memoriae with hot reload)
- `npm run install-docker` - Install/setup production Docker environment

### Building
- `npm run build` - Build all packages (mother-theme → backend → frontend)
- `npm run bt` - Build and test with coverage for all packages
- `npm run bt:watch` - Build and test in watch mode (parallel)

### Testing
- `npm test` - Run tests for all packages
- `npm run test:coverage` - Run tests with coverage for all packages
- `npm run test:watch` - Run tests in watch mode for all packages (parallel)

### Publishing
- `npm run publish-npm:mother` - Publish mother-theme to NPM
- `npm run publish-npm:memoriae-server` - Publish backend to NPM
- `npm run publish-npm:memoriae` - Publish frontend to NPM
- `npm run publish-docker` - Build and push Docker image

## Backend Commands (`cd backend`)

### Development
- `npm run dev` - Start dev server with hot reload (`tsx watch src/index.ts`)
- `npm start` - Start production server (`node dist/index.js`)

### Building
- `npm run build` - Compile TypeScript (`tsc`)
- `npm run type-check` - Type check without building

### Testing
- `npm test` - Run tests (`vitest run`)
- `npm run test:coverage` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run bt` - Build then test with coverage
- `npm run bt:watch` - Build then test in watch mode

### Database
- `npm run migrate` - Run pending migrations
- `npm run migrate:rollback` - Rollback last migration
- `npm run migrate:make <name>` - Create new migration

## Frontend Commands (`cd frontend`)

### Development
- `npm run dev` - Start Vite dev server with HMR
- `npm run preview` - Preview production build

### Building
- `npm run build` - Build for production (`tsc && vite build`)
- `npm run type-check` - Type check without building

### Testing
- `npm test` - Run tests (`vitest run`)
- `npm run test:coverage` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run test:visual` - Run Playwright component tests
- `npm run test:visual:update` - Update Playwright snapshots
- `npm run bt` - Build then test with coverage
- `npm run bt:watch` - Build then test in watch mode

## Mother Theme Commands (`cd mother-theme`)

### Building
- `npm run build` - Compile TypeScript (`tsc`)
- `npm run type-check` - Type check without building

### Testing
- `npm test` - Run tests (`vitest run --no-watch`)
- `npm run test:coverage` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run bt` - Build then test with coverage
- `npm run bt:watch` - Build then test in watch mode

## System Utilities (Linux)

- `git` - Version control
- `ls` - List directory contents
- `cd` - Change directory
- `grep` - Search text patterns
- `find` - Find files
- `cat` - Display file contents
- `head` / `tail` - View file head/tail
- `ps` - Process status
- `docker` / `podman` - Container management
- `npm` - Node package manager
- `node` - Node.js runtime

## Docker Commands

### Development
- `docker-compose -f docker/docker-compose.dev.yml up -d` - Start dev services
- `docker-compose -f docker/docker-compose.dev.yml down` - Stop dev services
- `docker exec -it memoriae-dev bash` - Access dev container
- `docker logs memoriae-dev` - View dev logs

### Production
- `./docker/scripts/install-docker.sh` - Install production environment
- `./docker/scripts/install-docker.sh --rebuild` - Force rebuild
- `./docker/scripts/install-docker.sh --stop` - Stop containers
- `./docker/scripts/install-docker.sh --clean` - Stop and remove everything

## Database Access

- `docker exec -it memoriae-postgres-dev psql -U memoriae -d memoriae` - Access PostgreSQL
- `docker exec -it memoriae-redis-dev redis-cli` - Access Redis
