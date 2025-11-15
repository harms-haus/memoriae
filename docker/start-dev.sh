#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get database connection details from environment variables
if [ -n "$DATABASE_URL" ]; then
    # Parse DATABASE_URL: postgresql://user:password@host:port/database
    if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    else
        echo -e "${RED}Error: Invalid DATABASE_URL format${NC}"
        exit 1
    fi
else
    # Use individual DB_* variables with defaults
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-memoriae}"
    DB_USER="${DB_USER:-memoriae}"
    DB_PASSWORD="${DB_PASSWORD:-memoriae}"
fi

echo -e "${YELLOW}Waiting for PostgreSQL to be ready at ${DB_HOST}:${DB_PORT}...${NC}"

# Wait for PostgreSQL to be ready (max 60 seconds)
for i in {1..60}; do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}PostgreSQL failed to become ready after 60 attempts${NC}"
        exit 1
    fi
    sleep 1
done

# Set environment variables for migrations
export DATABASE_URL="${DATABASE_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}}"
export DB_HOST="$DB_HOST"
export DB_PORT="$DB_PORT"
export DB_NAME="$DB_NAME"
export DB_USER="$DB_USER"
export DB_PASSWORD="$DB_PASSWORD"
export NODE_ENV="${NODE_ENV:-development}"

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
cd /app/backend

# Run migrations using knex
if [ -f "node_modules/.bin/knex" ]; then
    NODE_OPTIONS='-r ts-node/register' npx knex migrate:latest --knexfile src/db/knexfile.ts || {
        echo -e "${YELLOW}Migrations may have already been applied or encountered an error${NC}"
        echo -e "${YELLOW}Checking if migrations are up to date...${NC}"
    }
else
    echo -e "${RED}Knex not found. Cannot run migrations.${NC}"
    exit 1
fi

# Verify migrations completed by checking if the automations table exists
echo -e "${YELLOW}Verifying migrations completed...${NC}"
for i in {1..30}; do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM automations LIMIT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}Migrations verified!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Migrations verification failed after 30 attempts${NC}"
        echo -e "${YELLOW}Continuing anyway - backend will retry on errors${NC}"
        break
    fi
    sleep 1
done

# Function to handle shutdown
cleanup() {
    echo -e "${YELLOW}Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    # Wait a moment for processes to exit gracefully
    sleep 1
    # Force kill if still running
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill -9 $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill -9 $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start backend in background
echo -e "${YELLOW}Starting backend server...${NC}"
cd /app/backend
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend in background
echo -e "${YELLOW}Starting frontend dev server...${NC}"
cd /app/frontend
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}Both services started!${NC}"
echo -e "${GREEN}Backend PID: $BACKEND_PID${NC}"
echo -e "${GREEN}Frontend PID: $FRONTEND_PID${NC}"
echo -e "${GREEN}Backend API: http://localhost:3123/api${NC}"
echo -e "${GREEN}Frontend: http://localhost:5173${NC}"

# Wait for both processes (monitor until both exit)
while true; do
    # Check if processes are still running
    BACKEND_RUNNING=0
    FRONTEND_RUNNING=0
    
    if kill -0 $BACKEND_PID 2>/dev/null; then
        BACKEND_RUNNING=1
    fi
    
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        FRONTEND_RUNNING=1
    fi
    
    # If both processes have exited, break
    if [ $BACKEND_RUNNING -eq 0 ] && [ $FRONTEND_RUNNING -eq 0 ]; then
        echo -e "${YELLOW}Both processes have exited${NC}"
        break
    fi
    
    sleep 1
done

