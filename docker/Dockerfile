# syntax=docker/dockerfile:1
FROM ubuntu:24.04

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
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install PostgreSQL 16 from official PostgreSQL repository
RUN curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y postgresql-16 postgresql-contrib-16 \
    && rm -rf /var/lib/apt/lists/*

# Install Redis 7.x from official Redis repository
RUN curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" > /etc/apt/sources.list.d/redis.list \
    && apt-get update \
    && apt-get install -y redis \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 LTS from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs

# Set up PostgreSQL
RUN service postgresql stop || true
RUN mkdir -p /var/lib/postgresql/16/main
RUN chown -R postgres:postgres /var/lib/postgresql/16/main

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

# Copy mother-theme (needed by frontend)
WORKDIR /app
COPY mother-theme/ ./mother-theme/

# Copy frontend source
WORKDIR /app
COPY frontend/ ./frontend/

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Copy supervisord configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy initialization script
COPY docker/init.sh /init.sh
RUN chmod +x /init.sh

# Copy migration runner script
COPY docker/run-migrations.sh /run-migrations.sh
RUN chmod +x /run-migrations.sh

# Create necessary directories
RUN mkdir -p /var/log/supervisor \
    && mkdir -p /var/run/postgresql \
    && mkdir -p /var/lib/postgresql/16/main \
    && mkdir -p /var/lib/redis

# Set up PostgreSQL data directory permissions
RUN chown -R postgres:postgres /var/lib/postgresql/16/main \
    && chown -R postgres:postgres /var/run/postgresql

# Set up Redis data directory permissions
RUN chown -R redis:redis /var/lib/redis

# Expose ports
EXPOSE 3123 5432 6379

# Set entrypoint
ENTRYPOINT ["/init.sh"]

# Default command (supervisord will be started by init.sh)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]

