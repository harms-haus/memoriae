# syntax=docker/dockerfile:1
# Production Dockerfile for Memoriae
# This image only contains the Node.js application
# PostgreSQL and Redis are run as separate services in docker-compose

FROM node:22-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy root package files (for workspace setup)
COPY package*.json ./
COPY mother-theme/package*.json ./mother-theme/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies (including dev dependencies needed for building)
RUN npm ci

# Copy backend source
COPY backend/ ./backend/

# Build backend (needs TypeScript from dev dependencies)
WORKDIR /app/backend
RUN npm run build

# Copy mother-theme (needed by frontend)
WORKDIR /app
COPY mother-theme/ ./mother-theme/

# Copy frontend source
COPY frontend/ ./frontend/

# Build frontend (needs TypeScript and Vite from dev dependencies)
WORKDIR /app/frontend
RUN npm run build

# Remove dev dependencies to reduce image size (optional optimization)
# The built files don't need dev dependencies at runtime
WORKDIR /app
RUN npm prune --omit=dev

# Set working directory to backend for runtime
WORKDIR /app/backend

# Expose backend port
EXPOSE 3123

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3123/api/health || exit 1

# Run the backend server
CMD ["node", "dist/index.js"]
