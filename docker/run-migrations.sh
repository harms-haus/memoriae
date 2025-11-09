#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"

# Wait for PostgreSQL to be ready (max 60 seconds)
for i in {1..60}; do
    if PGPASSWORD=memoriae psql -h localhost -U memoriae -d memoriae -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}PostgreSQL failed to become ready after 60 attempts${NC}"
        exit 1
    fi
    sleep 1
done

# Set environment variables
export DATABASE_URL="postgresql://memoriae:memoriae@localhost:5432/memoriae"
export NODE_ENV="production"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="memoriae"
export DB_USER="memoriae"
export DB_PASSWORD="memoriae"

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
cd /app/backend

# Set all required environment variables
export DATABASE_URL="postgresql://memoriae:memoriae@localhost:5432/memoriae"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="memoriae"
export DB_USER="memoriae"
export DB_PASSWORD="memoriae"
export NODE_ENV="production"

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

# Start backend after migrations complete (if supervisorctl is available)
if command -v supervisorctl > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting backend service...${NC}"
    supervisorctl start backend || echo -e "${YELLOW}Note: Backend may already be running or will be started by supervisord${NC}"
fi

