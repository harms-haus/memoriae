<!-- bfb02fef-0f4c-4595-8ca9-2a4dd792a3a3 ab368898-a43f-44da-82ba-2a9f3eae5d94 -->
# GitHub Actions CI/CD Integration Plan

## Overview

Set up comprehensive GitHub Actions workflows for testing, building, and publishing the three main packages in the Memoriae monorepo. Create an About page to display test results prominently.

## Implementation Steps

### 1. GitHub Actions Workflows

#### 1.1 Main CI Workflow (`.github/workflows/ci.yml`)

- **Triggers**: Push to main/develop, pull requests
- **Jobs**:
- **test-mother**: Run tests with coverage for mother-theme
- **test-backend**: Run tests with coverage for backend (requires PostgreSQL/Redis services)
- **test-frontend**: Run tests with coverage for frontend
- **Artifacts**: Upload test coverage reports and results as JSON
- **Badge**: Generate status badge for README

#### 1.2 Build Workflow (`.github/workflows/build.yml`)

- **Triggers**: Push to main, tags matching version pattern
- **Jobs**:
- **build-mother**: Build mother-theme package, prepare for npm publish as `@harms-haus/mother`
- **build-backend**: Build backend, prepare as `@harms-haus/memoriae-server`
- **build-frontend**: Build frontend webapp, prepare as `@harms-haus/memoriae`
- **Artifacts**: Upload built packages

#### 1.3 Publish Workflow (`.github/workflows/publish.yml`) - Optional

- **Triggers**: Manual workflow_dispatch, tags matching `v*`
- **Jobs**:
- **publish-mother-npm**: Publish `@harms-haus/mother` to npm
- **publish-backend-npm**: Publish `@harms-haus/memoriae-server` to npm
- **publish-frontend-npm**: Publish `@harms-haus/memoriae` to npm
- **publish-docker**: Build and push Docker images to registry

### 2. Package Configuration Updates

#### 2.1 Mother Theme (`mother-theme/package.json`)

- Update `name` to `@harms-haus/mother`
- Add `publishConfig` with registry settings
- Add `files` field to specify what gets published
- Add `repository`, `keywords`, `license` fields
- Update build script to output proper package structure

#### 2.2 Backend (`backend/package.json`)

- Update `name` to `@harms-haus/memoriae-server`
- Add `publishConfig` with registry settings
- Add `files` field for dist output
- Add `bin` field if CLI commands exist
- Add `repository`, `keywords`, `license` fields

#### 2.3 Frontend (`frontend/package.json`)

- Update `name` to `@harms-haus/memoriae`
- Add `publishConfig` with registry settings
- Add `files` field for dist output
- Add `repository`, `keywords`, `license` fields
- Consider adding `homepage` field for GitHub Pages

### 3. About Page Component

#### 3.1 Create AboutView Component (`frontend/src/components/views/AboutView.tsx`)

- Display test results from GitHub Actions API
- Show build status badges
- Display coverage percentages
- Show last updated timestamp
- Include project information and links

#### 3.2 Add Route (`frontend/src/App.tsx`)

- Add "About" tab to navigation
- Add route `/about` that renders AboutView
- Add About icon to tab navigation

#### 3.3 GitHub Actions API Integration (`frontend/src/services/githubActions.ts`)

- Create service to fetch workflow run status
- Fetch test results and coverage data
- Cache results with appropriate TTL
- Handle API rate limiting

### 4. GitHub Actions API Access

#### 4.1 GitHub Token Setup

- Use `GITHUB_TOKEN` (automatically provided) for public repos
- For private repos, may need PAT with `actions:read` permission
- Store as repository secret if needed

#### 4.2 API Endpoints

- `GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs` - Get workflow runs
- `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs` - Get job details
- `GET /repos/{owner}/{repo}/actions/artifacts` - Get artifacts (coverage reports)

### 5. Docker Configuration (Optional)

#### 5.1 Multi-Container Architecture

- **Separate containers** for each service:
- `postgres`: PostgreSQL 16 database (use official postgres image)
- `redis`: Redis 7 cache/queue (use official redis image)
- `memoriae`: Single container with both backend API and frontend webapp (`@harms-haus/memoriae`)
- **Mother theme** will be built into the memoriae container

#### 5.2 Production Dockerfile

- **Update `Dockerfile`** for production:
- Multi-stage build: dependencies → build → runtime
- Build mother-theme package (`@harms-haus/mother`) or install from npm
- Build backend (`@harms-haus/memoriae-server`)
- Build frontend (`@harms-haus/memoriae`) static assets
- Serve frontend with backend (Express static or nginx)
- Expose port 3123 (backend API and frontend)
- Tag as `ghcr.io/harms-haus/memoriae:$VERSION`

#### 5.3 Docker Compose Configuration

- **Create `docker-compose.yml`** for production:
- Define all services (postgres, redis, memoriae)
- Configure networking between services
- Set up health checks
- Configure volumes for persistent data (postgres, redis)
- Environment variable management
- Support both docker-compose and podman-compose formats

- **Create `docker-compose.prod.yml`** (optional):
- Production-specific overrides
- Resource limits
- Production environment variables
- SSL/TLS configuration

#### 5.4 Docker Build and Push Scripts

- **Update `scripts/docker-build.sh`**:
- Build memoriae image: `ghcr.io/harms-haus/memoriae:$VERSION`
- Support building with docker-compose or direct docker build
- Use build cache efficiently

- **Update `scripts/docker-push.sh`**:
- Push memoriae image to registry
- Tag with version and `latest`
- Support GitHub Container Registry (ghcr.io) or Docker Hub

- **Create `scripts/docker-compose-build.sh`**:
- Build all services using docker-compose
- Support podman-compose as alternative
- Handle environment-specific builds

#### 5.5 GitHub Actions Docker Workflow

- **Update publish workflow** to build and push single image:
- Build memoriae container (includes backend + frontend)
- Push to registry with proper tags (`latest` and version)
- Optionally build and push docker-compose stack

### 6. NPM Publish Scripts (Optional)

#### 6.1 Version Management

- Use `npm version` to bump versions
- Create git tags automatically
- Update CHANGELOG if it exists

#### 6.2 Publish Scripts

- `scripts/publish-mother.sh`: Build and publish mother package
- `scripts/publish-backend.sh`: Build and publish backend package
- `scripts/publish-frontend.sh`: Build and publish frontend package
- `scripts/publish-all.sh`: Publish all packages

### 7. Documentation Updates

#### 7.1 README Updates

- Add CI/CD badges
- Document GitHub Actions workflows
- Add publishing instructions
- Add Docker deployment instructions

#### 7.2 GitHub Secrets Documentation

- Document required secrets:
- `NPM_TOKEN` (for npm publishing)
- `DOCKER_USERNAME` and `DOCKER_PASSWORD` (for Docker registry)
- `GITHUB_TOKEN` (if needed for private repos)

## File Changes Summary

### New Files

- `.github/workflows/ci.yml` - Main CI workflow
- `.github/workflows/build.yml` - Build workflow
- `.github/workflows/publish.yml` - Publish workflow (optional)
- `frontend/src/components/views/AboutView.tsx` - About page component
- `frontend/src/services/githubActions.ts` - GitHub Actions API client
- `scripts/publish-mother.sh` - NPM publish script for mother
- `scripts/publish-backend.sh` - NPM publish script for backend
- `scripts/publish-frontend.sh` - NPM publish script for frontend
- `scripts/publish-all.sh` - Publish all packages script
- `scripts/docker-build.sh` - Docker build script
- `scripts/docker-push.sh` - Docker push script

### Modified Files

- `mother-theme/package.json` - Update name, add publishConfig
- `backend/package.json` - Update name, add publishConfig
- `frontend/package.json` - Update name, add publishConfig
- `frontend/src/App.tsx` - Add About route and tab
- `README.md` - Add CI/CD badges and documentation

## Considerations

1. **GitHub Actions Free Tier Limits**:

- 2,000 minutes/month for private repos
- Unlimited for public repos
- 500MB storage for artifacts
- 1GB bandwidth/month

2. **NPM Publishing**:

- Requires npm account with `@harms-haus` scope access
- Need to authenticate with `npm login` or use automation token
- Consider using `npm publish --dry-run` first

3. **Docker Registry**:

- GitHub Container Registry (ghcr.io) is free and integrated
- Docker Hub free tier has rate limits
- Consider image size optimization

4. **Test Results Display**:

- GitHub Actions API has rate limits (5,000 requests/hour for authenticated)
- Consider caching results client-side
- May need to use GitHub's GraphQL API for better efficiency

5. **Package Structure**:

- Mother theme needs proper build output (dist/ directory)
- Backend needs compiled JS in dist/
- Frontend needs built static assets

## Testing Strategy

1. Test workflows on feature branch first
2. Verify test results appear correctly
3. Test package builds produce correct output
4. Verify About page displays data correctly
5. Test npm publish with `--dry-run` first
6. Test Docker builds locally before CI