#!/bin/bash

# Install and start Memoriae production environment with Docker/Podman
# Usage: ./docker/scripts/install-docker.sh [options]
# Options:
#   --rebuild    Force rebuild of containers
#   --stop       Stop all containers
#   --clean      Stop and remove containers and volumes
#   --replace    Stop containers before starting (useful for restarting)

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

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}Received interrupt signal. Cleaning up...${NC}"
    if [ -n "$COMPOSE_CMD" ] && [ -n "$COMPOSE_FILES" ]; then
        (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG down 2>/dev/null) || true
    fi
    echo -e "${GREEN}Cleanup complete${NC}"
    exit 130  # Exit code 130 = terminated by Ctrl-C
}

# Detect docker or podman
USE_PODMAN=false
if command -v podman &> /dev/null && command -v podman-compose &> /dev/null; then
    DOCKER_CMD="podman"
    COMPOSE_CMD="podman-compose"
    USE_PODMAN=true
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

# Use absolute paths for compose files to ensure podman-compose can find them
COMPOSE_FILES="-f ${PROJECT_DIR}/docker/docker-compose.yml -f ${PROJECT_DIR}/docker/docker-compose.prod.yml"
# ENV_FILE_FLAG will be set after ENV_FILE is determined
ENV_FILE_FLAG=""

# Trap SIGINT (Ctrl-C) and SIGTERM for graceful shutdown
# Set trap after COMPOSE_FILES is defined so cleanup function can use it
trap cleanup SIGINT SIGTERM

# Handle command line arguments
REBUILD=false
STOP=false
CLEAN=false
REPLACE=false

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
        --replace)
            REPLACE=true
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $arg${NC}"
            echo "Usage: $0 [--rebuild] [--stop] [--clean] [--replace]"
            exit 1
            ;;
    esac
done

# Check for .env file (needed for stop/clean too, but we'll handle it gracefully)
ENV_FILE="${PROJECT_DIR}/.env"

# Load environment variables early (needed for all operations including stop/clean)
# This ensures variables are available for docker-compose file variable substitution
if [ -f "$ENV_FILE" ]; then
    # Export all variables from .env file for docker-compose variable substitution
    set -a  # automatically export all variables
    # Use a safer source that handles errors
    if ! source "$ENV_FILE"; then
        echo -e "${RED}Error: Failed to load .env file${NC}"
        echo "Please check the .env file syntax"
        exit 1
    fi
    set +a  # stop automatically exporting
    # Use relative path for --env-file (relative to project root where compose files are)
    ENV_FILE_FLAG="--env-file .env"
else
    ENV_FILE_FLAG=""
fi

# Stop containers if requested
if [ "$STOP" = true ] || [ "$CLEAN" = true ]; then
    # Disable trap for stop/clean operations (they're quick and don't need cleanup)
    trap - SIGINT SIGTERM
    echo -e "${YELLOW}Stopping containers...${NC}"
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG down)
    if [ "$CLEAN" = true ]; then
        echo -e "${YELLOW}Removing volumes...${NC}"
        (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG down -v)
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
        # Reload .env after user edits it
        set -a
        source "$ENV_FILE"
        set +a
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        echo "Please create .env file manually with required environment variables"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Found existing .env file${NC}"
fi

# Validate required environment variables (they should already be loaded)
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

# Extract postgres variables from DATABASE_URL if not set individually
if [ -z "$POSTGRES_USER" ] && [ -n "$DATABASE_URL" ]; then
    # Parse DATABASE_URL: postgresql://user:password@host:port/database
    if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        export POSTGRES_USER="${BASH_REMATCH[1]}"
        export POSTGRES_PASSWORD="${BASH_REMATCH[2]}"
        export POSTGRES_DB="${BASH_REMATCH[5]}"
        echo -e "${BLUE}Extracted POSTGRES_* variables from DATABASE_URL${NC}"
    fi
fi

# Explicitly export all variables needed for compose file variable substitution
# docker-compose needs these in the shell environment, not just in --env-file
# The --env-file flag is for container environment, not compose file substitution
export POSTGRES_USER="${POSTGRES_USER:-memoriae}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-memoriae}"
export POSTGRES_DB="${POSTGRES_DB:-memoriae}"
export JWT_SECRET="${JWT_SECRET}"  # No default - must be set (validated above)
export PORT="${PORT:-3123}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"
export OPENROUTER_API_URL="${OPENROUTER_API_URL:-https://openrouter.ai/api/v1}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3123}"

# Verify critical variables are actually exported (double-check)
if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}Error: JWT_SECRET is not set after export${NC}"
    echo "This should not happen - JWT_SECRET was validated earlier"
    exit 1
fi

# Build if needed or if --rebuild is specified
if [ "$REBUILD" = true ]; then
    echo -e "${YELLOW}Rebuilding containers...${NC}"
    # Build the memoriae image locally
    echo -e "${YELLOW}Building memoriae image locally...${NC}"
    if [ "$USE_PODMAN" = true ]; then
        # Use host network for Podman builds to avoid pasta networking issues
        # This works when running as root and avoids /dev/net/tun requirements
        $DOCKER_CMD build --network=host -t ghcr.io/harms-haus/memoriae:latest -f docker/Dockerfile .
    else
        $DOCKER_CMD build -t ghcr.io/harms-haus/memoriae:latest -f docker/Dockerfile .
    fi
else
    # Try to pull the image first, if it fails, build locally
    echo -e "${YELLOW}Checking for memoriae image...${NC}"
    if ! $DOCKER_CMD pull ghcr.io/harms-haus/memoriae:latest 2>/dev/null; then
        echo -e "${YELLOW}Image not available in registry. Building locally...${NC}"
        if [ "$USE_PODMAN" = true ]; then
            # Use host network for Podman builds to avoid pasta networking issues
            $DOCKER_CMD build --network=host -t ghcr.io/harms-haus/memoriae:latest -f docker/Dockerfile .
        else
            $DOCKER_CMD build -t ghcr.io/harms-haus/memoriae:latest -f docker/Dockerfile .
        fi
    else
        echo -e "${GREEN}✓ Pulled memoriae image from registry${NC}"
    fi
fi

# Pull latest images for postgres and redis
echo -e "${YELLOW}Pulling latest base images...${NC}"
# Ensure we're in the project directory for podman-compose
# Variables are already exported via set -a earlier
(cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG pull postgres redis) || true

# Always stop and remove memoriae, redis, and postgres containers before starting
echo -e "${YELLOW}Stopping and removing existing containers (memoriae, redis, postgres)...${NC}"
(cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG down --remove-orphans 2>/dev/null) || true

# Also remove containers individually if they still exist (safety check)
# Check for both dev and prod container name patterns
for container_name in "memoriae-app" "memoriae-redis" "memoriae-postgres" "memoriae-dev" "memoriae-redis-dev" "memoriae-postgres-dev"; do
    if $DOCKER_CMD ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo -e "${YELLOW}Removing ${container_name} container...${NC}"
        $DOCKER_CMD rm -f "${container_name}" 2>/dev/null || true
    fi
done

# Start containers
echo -e "${GREEN}Starting production environment...${NC}"
# Workaround for Podman sysctl permission issue
if [ "$USE_PODMAN" = true ]; then
    # Try to set sysctl on host to allow unprivileged ports (if not already set)
    # This helps avoid the "permission denied" error when Podman tries to set it
    if [ -w /proc/sys/net/ipv4/ip_unprivileged_port_start ] 2>/dev/null; then
        CURRENT_VALUE=$(cat /proc/sys/net/ipv4/ip_unprivileged_port_start 2>/dev/null || echo "0")
        if [ "$CURRENT_VALUE" != "0" ]; then
            echo -e "${YELLOW}Note: ip_unprivileged_port_start is set to $CURRENT_VALUE${NC}"
        fi
    fi
fi
# Ensure we're in the project directory for podman-compose
# Suppress stderr to avoid Python traceback on interrupt (we handle cleanup ourselves)
# Real errors will be visible in subsequent health checks
# Variables are already exported via set -a earlier, so they're available for compose file substitution
# Don't use env with limited vars - let docker-compose inherit all exported variables
echo -e "${YELLOW}Starting containers...${NC}"
if ! (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG up -d); then
    echo -e "${RED}Failed to start containers${NC}"
    echo -e "${YELLOW}Checking container status...${NC}"
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG ps)
    echo -e "${YELLOW}Container logs:${NC}"
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG logs --tail=50)
    exit 1
fi

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check service health
if (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG ps | grep -q "Up"); then
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
    echo "  npm run install-docker -- --replace - Stop and restart containers"
    echo ""
    echo -e "${YELLOW}To view logs:${NC}"
    echo "  $COMPOSE_CMD $COMPOSE_FILES logs -f"
    echo ""
    echo -e "${YELLOW}To check status:${NC}"
    echo "  $COMPOSE_CMD $COMPOSE_FILES ps"
    echo ""
    echo -e "${YELLOW}To restart:${NC}"
    echo "  $COMPOSE_CMD $COMPOSE_FILES restart"
    echo ""
    echo -e "${GREEN}Memoriae is now running in production mode!${NC}"
else
    echo -e "${RED}Some services failed to start${NC}"
    echo -e "${YELLOW}Container status:${NC}"
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG ps)
    echo -e "${YELLOW}Container logs:${NC}"
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG logs --tail=50)
    echo ""
    echo -e "${YELLOW}To view full logs:${NC}"
    echo "  cd $PROJECT_DIR && $COMPOSE_CMD $COMPOSE_FILES logs"
    exit 1
fi

