# Memoriae - Home

Welcome to the Memoriae documentation wiki. This comprehensive guide covers all aspects of the Memoriae project, from high-level architecture to detailed algorithm implementations.

## What is Memoriae?

Memoriae is a powerful, AI-enhanced memory and note-taking web application that helps users capture, organize, and evolve their thoughts over time. The application uses an immutable timeline system to track changes to memories, with intelligent automation that suggests tags and categories using AI.

## Core Concepts

- **Seed**: A memory/note with base content that evolves over time
- **Transaction**: Immutable change record that modifies seed state
- **Timeline**: Chronological sequence of transactions that can be toggled on/off
- **Automation**: Background process that analyzes seeds and creates transactions
- **Pressure**: Metric that triggers re-evaluation when categories change
- **Sprout**: AI-generated content attached to seeds (followups, musings, references)

## Quick Navigation

### Getting Started
- **[Tech Stack Deep Dive](Tech-Stack-Deep-Dive)** - Complete technology overview
- **[Architecture Overview](Architecture-Overview)** - System design and patterns
- **[Development Workflow](Development-Workflow)** - Setup and development guide

### Core Systems
- **[Timeline System](Timeline-System)** - Immutable event sourcing
- **[Automation System](Automation-System)** - AI-powered automation framework
- **[Data Structures](Data-Structures)** - Database tables and TypeScript interfaces

### Algorithms
- **[State Computation](Algorithms-State-Computation)** - How state is computed from transactions
- **[Pressure System](Algorithms-Pressure-System)** - Automation re-evaluation system
- **[Category Hierarchy](Algorithms-Category-Hierarchy)** - Path-based tree structure
- **[Slug Generation](Algorithms-Slug-Generation)** - Unique URL generation
- **[Search and Filtering](Algorithms-Search-and-Filtering)** - Search implementation

### Implementation Details
- **[Frontend Patterns](Frontend-Patterns)** - React patterns and component architecture
- **[Backend Patterns](Backend-Patterns)** - Service and route patterns
- **[Database Schema](Database-Schema)** - Complete schema documentation
- **[API Documentation](API-Documentation)** - All endpoints and formats

## High-Level Architecture

```
┌─────────────┐
│   Frontend  │  React 19 + TypeScript + Vite
│  (Browser)  │  React Context + Hooks
└──────┬──────┘
       │ HTTP/REST
       │
┌──────▼──────────────────────────────────────┐
│           Backend API (Express)             │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │   Routes     │  │    Services         │  │
│  │  (REST API)  │→ │  (Business Logic)   │  │
│  └──────────────┘  └─────────────────────┘  │
│         │                    │               │
│         ▼                    ▼               │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL  │  │  Redis + BullMQ     │  │
│  │  (Database)  │  │  (Job Queue)        │  │
│  └──────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│   OpenRouter API    │  AI Model Integration
│  (User API Keys)    │
└─────────────────────┘
```

## Tech Stack Summary

### Frontend
- **React 19** with TypeScript (strict mode)
- **Vite** for build tooling and dev server
- **React Router** for client-side routing
- **React Context + Hooks** for state management
- **CSS Custom Properties** for theming

### Backend
- **Node.js + Express + TypeScript**
- **PostgreSQL** with Knex.js migrations
- **Redis + BullMQ** for job queue
- **OpenRouter API** for AI integration
- **JWT** for authentication

### Development
- **Vitest** for testing
- **Docker/Podman** for containerization
- **GitHub Actions** for CI/CD

## Key Features

### Immutable Timeline System
Every change to memories is recorded as an immutable transaction. The current state is computed by replaying all transactions chronologically. This creates a complete history that can be navigated and explored.

### AI-Powered Automation
Automations analyze seeds and automatically:
- Extract and generate tags
- Assign hierarchical categories
- Generate followup questions
- Create idea musings
- Add Wikipedia references

### Dynamic Editor
The seed editor automatically adapts to content:
- **Small**: Simple textarea for quick notes
- **Medium**: Markdown toolbar with formatting
- **Large**: Full-screen zen mode

### Rich Visualizations
- Category tree with hierarchical navigation
- Tag cloud with color-coded visualization
- Timeline view of all memories
- Full-text search across content, tags, and categories

## Project Structure

This is a **monorepo** using npm workspaces with three packages:

1. **`mother-theme`** - Theme library and React components (`@harms-haus/mother`)
2. **`backend`** - Backend API server (`@harms-haus/memoriae-server`)
3. **`frontend`** - Frontend web application (`@harms-haus/memoriae`)

## Documentation Organization

This wiki is organized to serve both technical developers and high-level readers:

- **Overview pages** provide high-level understanding
- **Algorithm pages** explain step-by-step how systems work
- **Pattern pages** document architectural decisions
- **Reference pages** provide complete API and schema documentation

Each page includes:
- Implementation details with code references
- Algorithm explanations with step-by-step processes
- Real examples from the codebase
- Cross-references to related pages

## Getting Started

1. Read the **[Architecture Overview](Architecture-Overview)** for system design
2. Review **[Tech Stack Deep Dive](Tech-Stack-Deep-Dive)** for technology details
3. Follow **[Development Workflow](Development-Workflow)** to set up your environment
4. Explore specific systems using the navigation links above

## Contributing

This documentation is maintained alongside the codebase. When making changes:

1. Update relevant wiki pages
2. Include code references with file paths
3. Maintain cross-references between pages
4. Keep examples current with the codebase

---

**Memoriae** - Remember, evolve, discover.

