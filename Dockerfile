# syntax=docker/dockerfile:1
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and build tools
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg2 \
    ca-certificates \
    lsb-release \
    software-properties-common \
    build-essential \
    python3 \
    python3-pip \
    supervisor \
    postgresql-14 \
    postgresql-contrib-14 \
    redis-server \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22+ from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs

# Install supervisord
RUN pip3 install supervisor

# Set up PostgreSQL
RUN service postgresql stop || true
RUN mkdir -p /var/lib/postgresql/14/main
RUN chown -R postgres:postgres /var/lib/postgresql/14/main

# Set up Redis
RUN mkdir -p /var/lib/redis
RUN chown -R redis:redis /var/lib/redis

# Create application directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend dependencies (including dev dependencies for build)
WORKDIR /app/backend
RUN npm ci

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm ci

# Copy backend source
WORKDIR /app
COPY backend/ ./backend/

# Build backend
WORKDIR /app/backend
RUN npm run build

# Copy mother-theme source (needed for frontend build)
WORKDIR /app
COPY mother-theme/package*.json ./mother-theme/

# Install mother-theme dependencies (needed for TypeScript type checking)
# Install React explicitly for TypeScript type resolution (even though it's a peer dependency)
WORKDIR /app/mother-theme
RUN npm ci --legacy-peer-deps && \
    npm install react@^19.0.0 react-dom@^19.0.0 --legacy-peer-deps --no-save || true

# Copy mother-theme source files
WORKDIR /app
COPY mother-theme/ ./mother-theme/

# Copy frontend source
WORKDIR /app
COPY frontend/ ./frontend/

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Copy supervisord configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy initialization script
COPY init.sh /init.sh
RUN chmod +x /init.sh

# Copy migration runner script
COPY run-migrations.sh /run-migrations.sh
RUN chmod +x /run-migrations.sh

# Create necessary directories
RUN mkdir -p /var/log/supervisor \
    && mkdir -p /var/run/postgresql \
    && mkdir -p /var/lib/postgresql/14/main \
    && mkdir -p /var/lib/redis

# Set up PostgreSQL data directory permissions
RUN chown -R postgres:postgres /var/lib/postgresql/14/main \
    && chown -R postgres:postgres /var/run/postgresql

# Set up Redis data directory permissions
RUN chown -R redis:redis /var/lib/redis

# Expose ports
EXPOSE 3000 5432 6379

# Set entrypoint
ENTRYPOINT ["/init.sh"]

# Default command (supervisord will be started by init.sh)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]

