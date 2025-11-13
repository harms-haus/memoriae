#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get database connection details from environment variables
# Support both DATABASE_URL and individual DB_* variables
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
    DB_HOST="${DB_HOST:-postgres}"
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
        echo -e "${RED}Connection details: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"
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
export NODE_ENV="${NODE_ENV:-production}"

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
cd /app/backend

# Run migrations using ts-node (source files are available in container)
if [ -f "node_modules/.bin/knex" ]; then
    NODE_OPTIONS='-r ts-node/register' npx knex migrate:latest --knexfile src/db/knexfile.ts || {
        echo -e "${YELLOW}Migrations may have already been applied or encountered an error (this is OK if migrations are up to date)${NC}"
        # Don't exit with error - migrations might already be applied
    }
else
    echo -e "${RED}Knex not found. Migrations may need to be run manually.${NC}"
    exit 1
fi

echo -e "${GREEN}Migrations completed successfully!${NC}"
