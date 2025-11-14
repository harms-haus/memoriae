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

echo -e "${YELLOW}Waiting for database migrations to complete...${NC}"

# Wait for migrations to complete by checking if the automations table exists
# This table is created by migrations, so if it exists, migrations have run
for i in {1..120}; do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM automations LIMIT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}Migrations completed! Starting backend...${NC}"
        break
    fi
    if [ $i -eq 120 ]; then
        echo -e "${RED}Migrations did not complete after 120 attempts (2 minutes)${NC}"
        echo -e "${YELLOW}Starting backend anyway - it will retry on errors${NC}"
        break
    fi
    sleep 1
done

# Start the backend
cd /app/backend
exec npm run dev


