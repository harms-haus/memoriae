#!/bin/bash

# Simple production environment script for Memoriae
# Usage: ./docker/scripts/prod.sh [--docker] [--clean] [--down]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."

cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
USE_DOCKER=false
CLEAN=false
DOWN=false

for arg in "$@"; do
    case "$arg" in
        --docker)
            USE_DOCKER=true
            ;;
        --clean)
            CLEAN=true
            ;;
        --down)
            DOWN=true
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $arg${NC}"
            echo "Usage: $0 [--docker] [--clean] [--down]"
            exit 1
            ;;
    esac
done

# Step 1: Detect podman/docker
echo -e "${BLUE}Step 1: Detecting container runtime...${NC}"
if [ "$USE_DOCKER" = true ]; then
    if command -v docker &> /dev/null; then
        if docker compose version &> /dev/null; then
            DOCKER_CMD="docker"
            COMPOSE_CMD="docker compose"
            echo -e "${GREEN}Using Docker (compose plugin)${NC}"
        elif command -v docker-compose &> /dev/null; then
            DOCKER_CMD="docker"
            COMPOSE_CMD="docker-compose"
            echo -e "${GREEN}Using Docker (standalone compose)${NC}"
        else
            echo -e "${RED}Error: Docker found but compose not available${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Error: Docker not found${NC}"
        exit 1
    fi
else
    if command -v podman &> /dev/null && command -v podman-compose &> /dev/null; then
        DOCKER_CMD="podman"
        COMPOSE_CMD="podman-compose"
        echo -e "${GREEN}Using Podman${NC}"
    elif command -v docker &> /dev/null; then
        if docker compose version &> /dev/null; then
            DOCKER_CMD="docker"
            COMPOSE_CMD="docker compose"
            echo -e "${GREEN}Using Docker (compose plugin)${NC}"
        elif command -v docker-compose &> /dev/null; then
            DOCKER_CMD="docker"
            COMPOSE_CMD="docker-compose"
            echo -e "${GREEN}Using Docker (standalone compose)${NC}"
        else
            echo -e "${RED}Error: Docker found but compose not available${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Error: Neither Podman nor Docker found${NC}"
        exit 1
    fi
fi

COMPOSE_FILES="-f ${PROJECT_DIR}/docker/docker-compose.yml -f ${PROJECT_DIR}/docker/docker-compose.prod.yml"
ENV_FILE="--env-file ${PROJECT_DIR}/.env"

# Check for .env file
if [ ! -f "${PROJECT_DIR}/.env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file with required environment variables"
    exit 1
fi

# Handle --down (stop containers without deleting volumes)
if [ "$DOWN" = true ]; then
    echo -e "${BLUE}Stopping production containers...${NC}"
    echo -e "${YELLOW}Note: Containers will be stopped but volumes and data will be preserved${NC}"
    
    set +e
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE down 2>/dev/null)
    DOWN_EXIT_CODE=$?
    set -e
    
    if [ $DOWN_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ Containers stopped successfully${NC}"
        echo -e "${GREEN}Data and volumes are preserved${NC}"
    else
        echo -e "${YELLOW}⚠ Some containers may not have been stopped${NC}"
    fi
    
    exit 0
fi

# Handle --clean
if [ "$CLEAN" = true ]; then
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  WARNING: This will DELETE ALL DATABASE DATA!${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Volumes memoriae-postgres-data and memoriae-redis-data will be removed.${NC}"
    echo -e "${YELLOW}This action cannot be undone.${NC}"
    echo ""
    read -p "Type 'DELETE ALL DATA' to confirm: " confirmation
    if [ "$confirmation" != "DELETE ALL DATA" ]; then
        echo -e "${GREEN}Cleanup cancelled. Data is safe.${NC}"
        exit 0
    fi
    echo -e "${YELLOW}Stopping containers and removing volumes...${NC}"
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE down -v)
    echo -e "${GREEN}Cleanup complete${NC}"
    echo -e "${YELLOW}Note: This script does NOT start services after cleanup.${NC}"
    echo -e "${YELLOW}Run '$0' to start services.${NC}"
    exit 0
fi

# Step 2: Start compose
echo -e "${BLUE}Step 2: Starting services...${NC}"
(cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE up -d)

# Step 3: Wait for services to be healthy
echo -e "${BLUE}Step 3: Waiting for services to be healthy...${NC}"

# Wait for postgres
echo -e "${YELLOW}Waiting for postgres...${NC}"
for i in {1..30}; do
    if $DOCKER_CMD exec memoriae-postgres pg_isready -U memoriae > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Postgres is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Postgres failed to become ready${NC}"
        exit 1
    fi
    sleep 1
done

# Wait for redis
echo -e "${YELLOW}Waiting for redis...${NC}"
for i in {1..30}; do
    if $DOCKER_CMD exec memoriae-redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Redis failed to become ready${NC}"
        exit 1
    fi
    sleep 1
done

# Wait for memoriae app (just check if container is running)
echo -e "${YELLOW}Waiting for memoriae app...${NC}"
for i in {1..60}; do
    if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^memoriae-app$"; then
        echo -e "${GREEN}✓ Memoriae app container is running${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${YELLOW}⚠ Memoriae app container may not be running (check logs)${NC}"
        break
    fi
    sleep 1
done

# Step 4: Display helpful info
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Production environment is ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo "  • Application: http://localhost:${PORT:-3123}"
echo "  • PostgreSQL: localhost:${POSTGRES_PORT:-5432}"
echo "  • Redis: localhost:${REDIS_PORT:-6379}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  • View logs:    cd $PROJECT_DIR && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE logs -f"
echo "  • Stop:         cd $PROJECT_DIR && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE down"
echo "  • Clean (⚠):    $0 --clean"
echo "  • Status:       cd $PROJECT_DIR && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE ps"
echo ""
echo -e "${GREEN}Memoriae is running in production mode!${NC}"
echo ""
echo -e "${YELLOW}Following logs (Ctrl+C to exit)...${NC}"
echo ""

# Step 5: Follow logs
(cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE logs -f)
