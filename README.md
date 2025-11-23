# Memoriae

A powerful, AI-enhanced memory and note-taking web application that helps you capture, organize, and evolve your thoughts over time.

## Build & Test Status

| Component | Status | Coverage |
|-----------|--------|----------|
| **CI Tests** | [![CI](https://github.com/harms-haus/memoriae/workflows/CI/badge.svg)](https://github.com/harms-haus/memoriae/actions/workflows/ci.yml) | [View Coverage](https://github.com/harms-haus/memoriae/actions/workflows/ci.yml) |
| **Build** | [![Build](https://github.com/harms-haus/memoriae/workflows/Build/badge.svg)](https://github.com/harms-haus/memoriae/actions/workflows/build.yml) | [View Builds](https://github.com/harms-haus/memoriae/actions/workflows/build.yml) |

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

## About Memoriae

**Remember, evolve, discover.**

Memoriae is an AI-enhanced memory and note-taking application that helps you capture, organize, and evolve your thoughts over time. Unlike traditional note-taking apps, Memoriae uses an immutable timeline system to track every change, creating a complete history of how your ideas develop.

### Seeds: Your Thoughts, Memories, and Ideas

**Seeds** are the foundation of Memoriae - they're your thoughts, memories, ideas, and notes. When you create a seed, you're planting a thought that can grow and evolve over time. Seeds contain your content and serve as the base for all the rich, AI-generated enhancements that follow.

### Sprouts: Generative Content for Your Seeds

**Sprouts** are AI-generated content that enriches your seeds. Each sprout type serves a different purpose:

- **Follow-ups**: Reminders and tasks related to your seed, helping you stay on top of important actions
- **Musings**: AI-generated expansions on your ideas, helping you explore new angles and connections
- **Wikipedia References**: Relevant Wikipedia articles that provide context and background information
- **Fact-checking**: Verification and validation of claims in your seeds
- **Extra Context**: Additional information that enhances understanding

Sprouts appear in your seed's timeline alongside all other changes, creating a rich, evolving record of your thoughts and their related content.

### Automations: Intelligent Background Processing

Memoriae uses intelligent automations to enhance your seeds automatically. These automations run in the background and generate sprouts based on your content:

**Triggered Automations** (run when a seed is created):
- **Tag Generation**: Automatically suggests relevant tags based on content analysis
- **Categorization**: Organizes seeds into hierarchical categories
- **Follow-up Detection**: Identifies action items and creates follow-up reminders
- **Wikipedia References**: Finds and links relevant Wikipedia articles

**Scheduled Automations** (run on a schedule):
- **Idea Musings**: Runs daily at a configured time (default: 2 AM UTC) to generate musings for creative idea seeds, helping you rediscover and expand on older thoughts

All automations are designed to enhance your seeds without getting in your way - they work silently in the background, and you can always review, modify, or remove their suggestions.

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

## Intriguing Technical Details

### Immutable Transactions Technology

Memoriae uses a transaction-based event sourcing system where **all changes are stored as immutable transactions**. Unlike traditional databases that modify data in place, Memoriae never modifies existing data - instead, every change creates a new transaction record.

**How it works:**
- When you create or modify a seed, a new transaction is created
- The current state of a seed is **computed** by replaying all transactions chronologically
- This provides a complete audit trail - you can see exactly when and how your thoughts evolved
- Time-travel capability: reconstruct the state of any seed at any point in time

The state computation algorithm (implemented in `backend/src/utils/seed-state.ts`) sorts transactions by creation time and applies them sequentially, ensuring consistency and providing a complete history of all changes. This approach guarantees data integrity and enables powerful features like timeline exploration and "what-if" scenarios.

### Agentic Automation with Tools

Memoriae's automations are powered by an **agentic system** that allows AI models to use tools - TypeScript-like function APIs with built-in guardrails for safe code execution.

**Tool System Architecture:**
- **Tool Definitions**: Tools are defined with TypeScript signatures, JSDoc descriptions, and implementation functions
- **Tool Registry**: A global registry manages available tools (see `backend/src/services/automation/tools/`)
- **Safe Execution**: All tool calls are validated before execution, with guardrails preventing unsafe operations
- **Feedback Loop**: The system implements a sophisticated feedback loop where:
  1. The AI receives a prompt with available tools described in natural language
  2. The AI can call tools by writing TypeScript-like function calls
  3. Tool results are fed back to the AI
  4. The process continues until the AI provides a final response

**Example Use Case:**
When generating Wikipedia references, the automation can use a `wget` tool to fetch article content, then analyze it and create a sprout. The tool system ensures that only safe, validated operations are executed, while giving the AI the flexibility to use external resources when needed.

This agentic approach enables automations to be more intelligent and context-aware, going beyond simple prompt engineering to create truly useful enhancements for your seeds.

## Features

### 🧠 Immutable Timeline System
Every change to your seeds is recorded as an immutable transaction. Navigate the timeline to see how your thoughts evolved over time, with a complete history you can explore.

### ✏️ Dynamic 3-Stage Editor
The seed editor automatically adapts to your content:
- **Small**: Simple textarea for quick notes (~250 chars visible)
- **Medium**: Markdown toolbar with formatting options (~1000 chars visible)
- **Large**: Full-screen zen mode with complete markdown support

### 🤖 AI-Powered Automation
Automations work in the background to enhance your seeds with tags, categories, follow-ups, Wikipedia references, and more. See the [About Memoriae](#about-memoriae) section for details on triggered and scheduled automations.

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

## Architecture

### Database Schema

The application uses a PostgreSQL database with the following key tables:

- **users** - OAuth user data
- **seeds** - Base memory/note data
- **seed_transactions** - Immutable transaction records for seeds
- **sprouts** - AI-generated content (follow-ups, musings, Wikipedia references, etc.)
- **automations** - Automation definitions and handlers
- **categories** - Hierarchical category structure with path-based queries
- **tags** - Tag definitions with colors
- **pressure_points** - Tracks when automations need re-evaluation
- **automation_queue** - Queue of pending automation jobs

### Timeline System

The timeline system uses transaction-based event sourcing. All changes are stored as immutable transactions, and the current state of a seed is computed by replaying all transactions chronologically. See the [Intriguing Technical Details](#intriguing-technical-details) section for a deeper explanation of how this works.

### Automation System

Automations process new seeds and calculate "pressure" - a metric that determines when re-evaluation is needed. When categories change (rename, add, remove, move), pressure increases for related seeds. Once pressure crosses a threshold, the automation is queued for re-evaluation. See the [About Memoriae](#about-memoriae) section for details on available automations.

## Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 6+ (for job queue)
- OAuth credentials from Google and GitHub

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/harms-haus/memoriae.git
   cd memoriae
   ```

2. **Install dependencies**
   ```bash
   # Install all workspace dependencies from root
   npm install
   ```

   This installs dependencies for all packages (mother-theme, backend, frontend) using npm workspaces.

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

# Or use docker-compose directly
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
# Publish individual packages using npm scripts
npm run publish-npm:mother
npm run publish-npm:memoriae-server
npm run publish-npm:memoriae

# Or use the scripts directly
./scripts/publish-npm-mother.sh [version]
./scripts/publish-npm-memoriae-server.sh [version]
./scripts/publish-npm-memoriae.sh [version]
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
# Build and push using npm script
npm run publish-docker

# Or use the scripts directly
./docker/scripts/docker-build.sh [tag]
./docker/scripts/docker-push.sh [tag] [registry]
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

### Creating a Seed

1. Click the "New Memory" button
2. Start typing in the editor - it will automatically expand as you add content
3. Save your seed
4. Automations will process it in the background and generate sprouts (tags, categories, follow-ups, etc.)

### Exploring the Timeline

1. Open any seed to see its detail view
2. Scroll through the timeline to see all transactions and sprouts
3. View the complete history of how your seed evolved over time

### Managing Categories

1. Use the Category Tree to navigate your hierarchical categories
2. Create new categories or subcategories
3. Move categories to reorganize your structure
4. Category changes automatically trigger re-evaluation of related seeds

### Using Tags

1. View tags in the Tag Cloud visualization
2. Click tags to filter seeds
3. Tags are automatically suggested by AI, but you can add your own
4. Tags have colors for visual organization

### Search

Use the search bar to find seeds by:
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

### Seeds

```
GET    /api/seeds             - List all seeds (with filters)
POST   /api/seeds             - Create a new seed
GET    /api/seeds/:id         - Get seed details
PUT    /api/seeds/:id         - Update seed (creates transaction)
DELETE /api/seeds/:id         - Delete seed
GET    /api/seeds/:id/timeline - Get seed timeline with transactions and sprouts
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

This is a monorepo using npm workspaces with three main packages:

```
memoriae/
├── backend/                   # Backend API server (@harms-haus/memoriae-server)
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── app.ts            # Express app setup
│   │   ├── config.ts         # Configuration
│   │   ├── __tests__/        # Integration tests
│   │   ├── routes/           # API routes (auth, seeds, categories, tags, etc.)
│   │   ├── services/         # Business logic
│   │   │   ├── automation/   # Automation handlers (tag, categorize, followup, etc.)
│   │   │   ├── queue/        # Queue processors and schedulers
│   │   │   ├── openrouter/   # AI client
│   │   │   └── sprouts/      # Sprout service implementations
│   │   ├── middleware/       # Auth, validation, request logging
│   │   ├── utils/            # Utilities (seed-state, tag-state, slug, timezone)
│   │   ├── types/            # TypeScript type definitions
│   │   └── db/               # Database connection, migrations, knex config
│   ├── scripts/              # Build and publish scripts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── frontend/                  # Frontend web application (@harms-haus/memoriae)
│   ├── src/
│   │   ├── App.tsx           # Root component with routing
│   │   ├── main.tsx          # Entry point
│   │   ├── components/       # React components
│   │   │   ├── SeedEditor/   # Dynamic 3-stage editor
│   │   │   ├── SeedView/     # Seed detail view
│   │   │   ├── SeedComposer/ # Seed creation interface
│   │   │   ├── SeedTimeline/ # Timeline visualization
│   │   │   ├── CategoryTree/ # Category browser
│   │   │   ├── TagCloud/     # Tag visualization
│   │   │   ├── TagList/      # Tag list component
│   │   │   ├── MusingsView/  # Idea musings interface
│   │   │   ├── SproutDetail/ # Sprout detail views
│   │   │   ├── LandingPage/  # Landing page
│   │   │   └── views/        # View components (SeedsView, CategoriesView, etc.)
│   │   ├── contexts/         # React contexts (Auth, Theme)
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API client and notifications
│   │   ├── utils/            # Utilities (seed-state, timezone, tag colors)
│   │   ├── types/            # TypeScript type definitions
│   │   ├── styles/           # CSS (theme.css, responsive.css)
│   │   └── test/             # Test setup files
│   ├── public/               # Static assets
│   ├── scripts/              # Build and publish scripts
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── tsconfig.json
├── mother-theme/              # Theme library and React components (@harms-haus/mother)
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── styles/          # Component styles
│   │   ├── examples/        # Component examples
│   │   └── utils/           # Utility functions
│   ├── examples/            # Example applications
│   ├── scripts/             # Build and publish scripts
│   ├── package.json
│   └── tsconfig.json
├── docker/                   # Docker configuration
│   ├── scripts/              # Docker management scripts
│   ├── Dockerfile            # Production Dockerfile
│   ├── Dockerfile.dev        # Development Dockerfile
│   └── docker-compose.*.yml  # Docker Compose configurations
├── scripts/                  # Root-level scripts
│   └── proxmox/             # Proxmox deployment scripts
├── .github/
│   └── workflows/           # GitHub Actions workflows
├── AGENTS.md                 # AI agent guide for this project
├── STYLE-GUIDE.md           # Design system documentation
├── README.md                 # This file
└── package.json             # Root workspace configuration
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

- Transactions are validated to prevent malicious operations
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

## Development Note

This application was generated almost entirely with [Cursor](https://cursor.sh), an AI-powered code editor. Very few lines of code were edited by hand - the vast majority of the codebase, including the architecture, implementation, tests, and documentation, was created through AI-assisted development. This demonstrates the power of modern AI coding assistants to help build complex, production-ready applications.

## Acknowledgments

- Design aesthetic inspired by [MotherDuck](https://motherduck.com)'s playful and caring visual identity
- AI capabilities powered by [OpenRouter](https://openrouter.ai)

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Memoriae** - Remember, evolve, discover.

