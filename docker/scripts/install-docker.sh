#!/bin/bash

# Install and start Memoriae production environment with Docker/Podman
# Usage: ./docker/scripts/install-docker.sh [options]
# Options:
#   --rebuild    Force rebuild of containers
#   --stop       Stop all containers
#   --clean      Stop and remove containers and volumes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."

cd "$PROJECT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect docker or podman
if command -v podman &> /dev/null && command -v podman-compose &> /dev/null; then
    DOCKER_CMD="podman"
    COMPOSE_CMD="podman-compose"
    echo -e "${BLUE}Using Podman${NC}"
elif command -v docker &> /dev/null; then
    # Check for docker compose (plugin) first, then docker-compose (standalone)
    if docker compose version &> /dev/null; then
        DOCKER_CMD="docker"
        COMPOSE_CMD="docker compose"
        echo -e "${BLUE}Using Docker (compose plugin)${NC}"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_CMD="docker"
        COMPOSE_CMD="docker-compose"
        echo -e "${BLUE}Using Docker (standalone compose)${NC}"
    else
        echo -e "${RED}Error: Docker found but compose not available${NC}"
        echo "Please install Docker Compose plugin or docker-compose"
        exit 1
    fi
else
    echo -e "${RED}Error: Neither Docker nor Podman with compose found${NC}"
    echo "Please install Docker or Podman with compose support"
    exit 1
fi

COMPOSE_FILES="-f docker/docker-compose.yml -f docker/docker-compose.prod.yml"

# Handle command line arguments
REBUILD=false
STOP=false
CLEAN=false

for arg in "$@"; do
    case "$arg" in
        --rebuild)
            REBUILD=true
            ;;
        --stop)
            STOP=true
            ;;
        --clean)
            CLEAN=true
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $arg${NC}"
            echo "Usage: $0 [--rebuild] [--stop] [--clean]"
            exit 1
            ;;
    esac
done

# Check for .env file (needed for stop/clean too, but we'll handle it gracefully)
ENV_FILE="${PROJECT_DIR}/.env"

# Stop containers if requested
if [ "$STOP" = true ] || [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}Stopping containers...${NC}"
    if [ -f "$ENV_FILE" ]; then
        $COMPOSE_CMD --env-file "$ENV_FILE" $COMPOSE_FILES down
    else
        $COMPOSE_CMD $COMPOSE_FILES down
    fi
    if [ "$CLEAN" = true ]; then
        echo -e "${YELLOW}Removing volumes...${NC}"
        if [ -f "$ENV_FILE" ]; then
            $COMPOSE_CMD --env-file "$ENV_FILE" $COMPOSE_FILES down -v
        else
            $COMPOSE_CMD $COMPOSE_FILES down -v
        fi
        echo -e "${GREEN}Cleanup complete${NC}"
    fi
    exit 0
fi
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}No .env file found.${NC}"
    echo "Creating .env file from .env.example..."
    
    if [ -f "${PROJECT_DIR}/.env.example" ]; then
        cp "${PROJECT_DIR}/.env.example" "$ENV_FILE"
        echo -e "${GREEN}✓ Created .env file from .env.example${NC}"
        echo -e "${YELLOW}IMPORTANT: Please edit .env and set required values before continuing!${NC}"
        echo "  Required: JWT_SECRET, DATABASE_URL (or DB_* variables), REDIS_URL"
        echo ""
        read -p "Press Enter after editing .env to continue, or Ctrl+C to exit..."
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        echo "Please create .env file manually with required environment variables"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Found existing .env file${NC}"
fi

# Validate required environment variables
source "$ENV_FILE" 2>/dev/null || true

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
    echo -e "${RED}Error: JWT_SECRET is not set or is using the default value${NC}"
    echo "Please set JWT_SECRET in .env file"
    echo "You can generate one using: openssl rand -base64 32"
    exit 1
fi

if [ -z "$DATABASE_URL" ] && [ -z "$DB_HOST" ]; then
    echo -e "${RED}Error: DATABASE_URL or DB_HOST must be set in .env file${NC}"
    exit 1
fi

if [ -z "$REDIS_URL" ]; then
    echo -e "${RED}Error: REDIS_URL must be set in .env file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables validated${NC}"

# Build if needed or if --rebuild is specified
if [ "$REBUILD" = true ]; then
    echo -e "${YELLOW}Rebuilding containers...${NC}"
    # Build the memoriae image locally
    echo -e "${YELLOW}Building memoriae image locally...${NC}"
    $DOCKER_CMD build -t ghcr.io/harms-haus/memoriae:latest -f docker/Dockerfile .
else
    # Try to pull the image first, if it fails, build locally
    echo -e "${YELLOW}Checking for memoriae image...${NC}"
    if ! $DOCKER_CMD pull ghcr.io/harms-haus/memoriae:latest 2>/dev/null; then
        echo -e "${YELLOW}Image not available in registry. Building locally...${NC}"
        $DOCKER_CMD build -t ghcr.io/harms-haus/memoriae:latest -f docker/Dockerfile .
    else
        echo -e "${GREEN}✓ Pulled memoriae image from registry${NC}"
    fi
fi

# Pull latest images for postgres and redis
echo -e "${YELLOW}Pulling latest base images...${NC}"
if [ -f "$ENV_FILE" ]; then
    $COMPOSE_CMD --env-file "$ENV_FILE" $COMPOSE_FILES pull postgres redis || true
else
    $COMPOSE_CMD $COMPOSE_FILES pull postgres redis || true
fi

# Start containers
echo -e "${GREEN}Starting production environment...${NC}"
if [ -f "$ENV_FILE" ]; then
    $COMPOSE_CMD --env-file "$ENV_FILE" $COMPOSE_FILES up -d
else
    $COMPOSE_CMD $COMPOSE_FILES up -d
fi

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check service health
if [ -f "$ENV_FILE" ]; then
    COMPOSE_PS_CMD="$COMPOSE_CMD --env-file \"$ENV_FILE\" $COMPOSE_FILES ps"
else
    COMPOSE_PS_CMD="$COMPOSE_CMD $COMPOSE_FILES ps"
fi
if eval "$COMPOSE_PS_CMD" | grep -q "Up"; then
    echo -e "${GREEN}✓ Production environment started successfully!${NC}"
    echo ""
    echo -e "${BLUE}Services available at:${NC}"
    echo "  - Application: http://localhost:${PORT:-3123}"
    echo "  - PostgreSQL: localhost:${POSTGRES_PORT:-5432}"
    echo "  - Redis: localhost:${REDIS_PORT:-6379}"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  npm run install-docker -- --stop    - Stop containers"
    echo "  npm run install-docker -- --clean  - Stop and remove everything"
    echo "  npm run install-docker -- --rebuild - Rebuild containers"
    echo ""
    echo -e "${YELLOW}To view logs:${NC}"
    if [ -f "$ENV_FILE" ]; then
        echo "  $COMPOSE_CMD --env-file $ENV_FILE $COMPOSE_FILES logs -f"
    else
        echo "  $COMPOSE_CMD $COMPOSE_FILES logs -f"
    fi
    echo ""
    echo -e "${YELLOW}To check status:${NC}"
    if [ -f "$ENV_FILE" ]; then
        echo "  $COMPOSE_CMD --env-file $ENV_FILE $COMPOSE_FILES ps"
    else
        echo "  $COMPOSE_CMD $COMPOSE_FILES ps"
    fi
    echo ""
    echo -e "${YELLOW}To restart:${NC}"
    if [ -f "$ENV_FILE" ]; then
        echo "  $COMPOSE_CMD --env-file $ENV_FILE $COMPOSE_FILES restart"
    else
        echo "  $COMPOSE_CMD $COMPOSE_FILES restart"
    fi
    echo ""
    echo -e "${GREEN}Memoriae is now running in production mode!${NC}"
else
    echo -e "${YELLOW}Some services may not have started. Check logs:${NC}"
    if [ -f "$ENV_FILE" ]; then
        echo "  $COMPOSE_CMD --env-file $ENV_FILE $COMPOSE_FILES logs"
    else
        echo "  $COMPOSE_CMD $COMPOSE_FILES logs"
    fi
    exit 1
fi

