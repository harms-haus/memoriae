# Memoriae

A powerful, AI-enhanced memory and note-taking web application that helps you capture, organize, and evolve your thoughts over time. Memoriae uses an immutable timeline system to track changes to your memories, with intelligent automation that suggests tags and categories using AI.

## Build Status

| Component | Status | Coverage |
|-----------|--------|----------|
| **CI Tests** | [![CI](https://github.com/harms-haus/memoriae/workflows/CI/badge.svg)](https://github.com/harms-haus/memoriae/actions/workflows/ci.yml) | [View Coverage](https://github.com/harms-haus/memoriae/actions/workflows/ci.yml) |
| **Build** | [![Build](https://github.com/harms-haus/memoriae/workflows/Build/badge.svg)](https://github.com/harms-haus/memoriae/actions/workflows/build.yml) | [View Builds](https://github.com/harms-haus/memoriae/actions/workflows/build.yml) |
| **Publish** | [![Publish](https://github.com/harms-haus/memoriae/workflows/Publish/badge.svg)](https://github.com/harms-haus/memoriae/actions/workflows/publish.yml) | [View Releases](https://github.com/harms-haus/memoriae/actions/workflows/publish.yml) |

**Test Results:**
- ✅ **Mother Theme**: [View Tests](https://github.com/harms-haus/memoriae/actions/workflows/ci.yml)
- ✅ **Backend**: [View Tests](https://github.com/harms-haus/memoriae/actions/workflows/ci.yml)
- ✅ **Frontend**: [View Tests](https://github.com/harms-haus/memoriae/actions/workflows/ci.yml)

**Packages:**
- 📦 [@harms-haus/mother](https://www.npmjs.com/package/@harms-haus/mother) - Theme library and React components
- 📦 [@harms-haus/memoriae-server](https://www.npmjs.com/package/@harms-haus/memoriae-server) - Backend API server
- 📦 [@harms-haus/memoriae](https://www.npmjs.com/package/@harms-haus/memoriae) - Frontend web application

![Memoriae](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### 🧠 Immutable Timeline System
Every change to your memories is recorded as an immutable event in the timeline. Toggle events on and off to see how your memories evolved over time. This creates a complete history that you can navigate and explore.

### ✏️ Dynamic 3-Stage Editor
The seed editor automatically adapts to your content:
- **Small**: Simple textarea for quick notes (~250 chars visible)
- **Medium**: Markdown toolbar with formatting options (~1000 chars visible)
- **Large**: Full-screen zen mode with complete markdown support

### 🤖 AI-Powered Automation
Automations analyze your memories and automatically:
- **Tag Generation**: Suggest relevant tags based on content
- **Category Assignment**: Organize memories into hierarchical categories
- **Re-evaluation**: Automatically update tags and categories when related memories change

### 📊 Rich Visualizations
- **Category Tree**: Navigate hierarchical categories with expand/collapse
- **Tag Cloud**: Visualize tag frequency with color-coded, clickable tags
- **Timeline View**: See all memories chronologically on an interactive timeline
- **Search**: Full-text search across content, tags, and categories

### 🎨 Beautiful Dark Mode UI
Inspired by MotherDuck's playful aesthetic, featuring:
- High-contrast dark theme
- Vibrant accent colors
- Smooth animations
- Responsive design (mobile, tablet, desktop)

### 🔐 Secure Authentication
OAuth integration with Google and GitHub for easy, secure login.

## Tech Stack

### Frontend
- **React** + **TypeScript** - Modern UI framework with type safety
- **React Context + Hooks** - State management
- **Vite** - Fast build tool and dev server
- **CSS Custom Properties** - Themeable design system

### Backend
- **Node.js** + **Express** + **TypeScript** - Robust API server
- **PostgreSQL** - Relational database
- **Redis** + **BullMQ** - Job queue for async processing
- **OpenRouter API** - AI model integration (user-provided API keys)

### Authentication
- **OAuth 2.0** - Google and GitHub providers
- **JWT** - Secure session management

## Architecture

### Database Schema

The application uses a PostgreSQL database with the following key tables:

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

## Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 6+ (for job queue)
- OAuth credentials from Google and GitHub

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/memoriae.git
   cd memoriae
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration. Required variables:
   - `JWT_SECRET` - Generate a strong secret: `openssl rand -base64 32`
   - `DATABASE_URL` - PostgreSQL connection string
   - `REDIS_URL` - Redis connection string
   
   Optional variables:
   - `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET`
   - `OAUTH_GITHUB_CLIENT_ID` / `OAUTH_GITHUB_CLIENT_SECRET`
   - `OPENROUTER_API_KEY` - For AI features
   - `VITE_API_URL` - Frontend API URL (defaults to http://localhost:3123/api)

4. **Set up the database**
   ```bash
   cd backend
   npm run migrate
   ```

5. **Start Redis**
   ```bash
   redis-server
   ```

6. **Start the development servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173 (or your Vite port)
   - Backend API: http://localhost:3123/api

### Docker Setup

#### Development Environment

For local development with hot reload, use the development docker-compose configuration:

```bash
# Start all services (postgres, redis, memoriae with hot reload)
docker-compose -f docker/docker-compose.dev.yml up -d

# Or use the build script
./scripts/docker-compose-build.sh dev
docker-compose -f docker/docker-compose.dev.yml up -d
```

The application will be available at:
- Frontend: http://localhost:5173 (Vite dev server with hot reload)
- Backend API: http://localhost:3123/api

#### Production Docker Deployment

For production deployment, use the install script:

```bash
# Install and start production environment
npm run install-docker

# Or use the script directly
./docker/scripts/install-docker.sh
```

The script will:
- Check for `.env` file (creates from `.env.example` if missing)
- Validate required environment variables
- Pull or build the memoriae Docker image
- Start all services (PostgreSQL, Redis, Memoriae)

**Options:**
- `npm run install-docker -- --rebuild` - Force rebuild of containers
- `npm run install-docker -- --stop` - Stop all containers
- `npm run install-docker -- --clean` - Stop and remove containers and volumes

The application will be available at `http://localhost:3123` (or your configured port).

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

### Workflows

- **CI** (`.github/workflows/ci.yml`): Runs tests with coverage for all packages on every push and pull request
- **Build** (`.github/workflows/build.yml`): Builds all packages when pushing to main or creating version tags
- **Publish** (`.github/workflows/publish.yml`): Publishes packages to NPM and Docker registry (manual or on version tags)

### Test Results

View test results and build status in the [GitHub Actions tab](https://github.com/harms-haus/memoriae/actions) or check the build status badges at the top of this README.

### Publishing Packages

The project consists of three npm packages:

- **@harms-haus/mother**: Theme library and React components
- **@harms-haus/memoriae-server**: Backend API server
- **@harms-haus/memoriae**: Frontend web application

#### Publishing to NPM

**Prerequisites:**
- NPM account with access to `@harms-haus` scope
- `NPM_TOKEN` secret configured in GitHub repository settings

**Manual Publishing:**

```bash
# Publish individual packages
./scripts/publish-mother.sh [version]
./scripts/publish-backend.sh [version]
./scripts/publish-frontend.sh [version]

# Publish all packages
./scripts/publish-all.sh [version]
```

**Automatic Publishing:**

- Create a git tag starting with `v` (e.g., `v1.0.0`)
- Push the tag: `git push origin v1.0.0`
- The publish workflow will automatically build and publish all packages

#### Publishing Docker Images

**Prerequisites:**
- GitHub Container Registry access (automatic for public repos)
- Or Docker Hub credentials configured as `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets

**Manual Publishing:**

```bash
# Build the image
./scripts/docker-build.sh [tag]

# Push to registry
./scripts/docker-push.sh [tag] [registry]
```

**Automatic Publishing:**

- Create a git tag starting with `v` (e.g., `v1.0.0`)
- Push the tag: `git push origin v1.0.0`
- The publish workflow will automatically build and push the Docker image to `ghcr.io/harms-haus/memoriae`

### GitHub Secrets

The following secrets need to be configured in GitHub repository settings:

- `NPM_TOKEN`: NPM authentication token for publishing packages
- `DOCKER_USERNAME`: Docker registry username (optional, for Docker Hub)
- `DOCKER_PASSWORD`: Docker registry password (optional, for Docker Hub)

For public repositories, `GITHUB_TOKEN` is automatically provided for GitHub Container Registry.

## Usage

### Creating a Memory (Seed)

1. Click the "New Memory" button
2. Start typing in the editor - it will automatically expand as you add content
3. Save your memory
4. Automations will process it in the background and suggest tags/categories

### Exploring the Timeline

1. Open any memory to see its detail view
2. Scroll through the timeline to see all events
3. Toggle events on/off to see how the memory changed over time
4. Each event shows what changed using JSON Patch operations

### Managing Categories

1. Use the Category Tree to navigate your hierarchical categories
2. Create new categories or subcategories
3. Move categories to reorganize your structure
4. Category changes automatically trigger re-evaluation of related memories

### Using Tags

1. View tags in the Tag Cloud visualization
2. Click tags to filter memories
3. Tags are automatically suggested by AI, but you can add your own
4. Tags have colors for visual organization

### Search

Use the search bar to find memories by:
- Content (full-text search)
- Tags
- Categories
- Any combination of the above

### Settings

Configure your OpenRouter settings:
- Select an AI model
- Provide your OpenRouter API key
- Manage OAuth accounts

## API Documentation

### Authentication

```
GET    /api/auth/status       - Get current auth status
GET    /api/auth/google       - Initiate Google OAuth
GET    /api/auth/github       - Initiate GitHub OAuth
POST   /api/auth/logout       - Log out current user
```

### Seeds (Memories)

```
GET    /api/seeds             - List all seeds (with filters)
POST   /api/seeds             - Create a new seed
GET    /api/seeds/:id         - Get seed details
PUT    /api/seeds/:id         - Update seed (creates event)
DELETE /api/seeds/:id         - Delete seed
GET    /api/seeds/:id/timeline - Get seed timeline with events
POST   /api/seeds/:id/events/:eventId/toggle - Toggle event enabled state
```

### Categories

```
GET    /api/categories        - List all categories (hierarchical)
POST   /api/categories        - Create category
PUT    /api/categories/:id    - Update category
DELETE /api/categories/:id    - Delete category
```

### Tags

```
GET    /api/tags              - List all tags
POST   /api/tags              - Create tag
```

### Search

```
GET    /api/search?q=query&category=&tags= - Full-text search
```

### Settings

```
GET    /api/settings          - Get user settings
PUT    /api/settings          - Update settings (openrouter_model, openrouter_api_key)
```

## Development

### Project Structure

```
memoriae/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── app.ts            # Express app setup
│   │   ├── config.ts         # Configuration
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   │   ├── automation/   # Automation handlers
│   │   │   ├── queue/        # Queue processors
│   │   │   └── openrouter/   # AI client
│   │   ├── middleware/       # Auth, validation, etc.
│   │   ├── utils/            # Utilities (JSON Patch, pressure)
│   │   └── db/               # Database models & migrations
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Root component
│   │   ├── main.tsx          # Entry point
│   │   ├── components/       # React components
│   │   │   ├── SeedEditor/   # Dynamic 3-stage editor
│   │   │   ├── SeedList/     # List view
│   │   │   ├── SeedDetail/   # Detail view with timeline
│   │   │   ├── TimelineView/ # Timeline visualization
│   │   │   ├── CategoryTree/ # Category browser
│   │   │   ├── TagCloud/     # Tag visualization
│   │   │   ├── SearchBar/    # Search interface
│   │   │   └── Settings/     # Settings page
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API client
│   │   └── styles/           # CSS and theme
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── STYLE-GUIDE.md            # Design system documentation
└── README.md                 # This file
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

The production build outputs will be in `backend/dist` and `frontend/dist` respectively.

### Code Style

This project follows the style guide defined in `STYLE-GUIDE.md`. Key principles:
- Dark mode first design
- High contrast for accessibility
- Playful but professional aesthetic
- Mobile-first responsive design

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Performance Considerations

- Database queries are indexed for optimal performance
- Computed seed states are cached to reduce computation
- Lists are paginated to handle large datasets
- Queue system allows horizontal scaling
- Database connection pooling for efficient resource usage

## Security

- JSON patches are validated to prevent malicious operations
- User input is sanitized
- API calls are rate-limited
- OAuth tokens are securely stored
- JWT tokens use secure secrets

## Error Handling

- Graceful degradation when OpenRouter API fails
- Retry logic for queue jobs
- Comprehensive error messages for users
- Detailed logging for debugging

## Browser Support

Targets modern browsers that support:
- CSS Custom Properties
- CSS Grid and Flexbox
- ES2020+ JavaScript features
- Fetch API

Tested on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Design aesthetic inspired by [MotherDuck](https://motherduck.com)'s playful and caring visual identity
- AI capabilities powered by [OpenRouter](https://openrouter.ai)

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Memoriae** - Remember, evolve, discover.

