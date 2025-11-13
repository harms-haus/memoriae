#!/bin/bash

# Start Memoriae development environment with Docker/Podman
# Usage: ./docker/scripts/dev.sh [options]
# Options:
#   --rebuild    Force rebuild of containers
#   --stop       Stop all containers
#   --logs       Show logs
#   --clean      Stop and remove containers and volumes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."

cd "$PROJECT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}Received interrupt signal. Cleaning up...${NC}"
    if [ -n "$COMPOSE_CMD" ] && [ -n "$COMPOSE_FILE" ]; then
        $COMPOSE_CMD -f "$COMPOSE_FILE" down 2>/dev/null || true
    fi
    echo -e "${GREEN}Cleanup complete${NC}"
    exit 130  # Exit code 130 = terminated by Ctrl-C
}

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
        echo -e "${YELLOW}Error: Docker found but compose not available${NC}"
        echo "Please install Docker Compose plugin or docker-compose"
        exit 1
    fi
else
    echo -e "${YELLOW}Error: Neither Docker nor Podman with compose found${NC}"
    echo "Please install Docker or Podman with compose support"
    exit 1
fi

COMPOSE_FILE="docker/docker-compose.dev.yml"

# Trap SIGINT (Ctrl-C) and SIGTERM for graceful shutdown
# Set trap after COMPOSE_FILE is defined so cleanup function can use it
trap cleanup SIGINT SIGTERM

# Handle command line arguments
REBUILD=false
STOP=false
LOGS=false
CLEAN=false

for arg in "$@"; do
    case "$arg" in
        --rebuild)
            REBUILD=true
            ;;
        --stop)
            STOP=true
            ;;
        --logs)
            LOGS=true
            ;;
        --clean)
            CLEAN=true
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $arg${NC}"
            echo "Usage: $0 [--rebuild] [--stop] [--logs] [--clean]"
            exit 1
            ;;
    esac
done

# Stop containers if requested
if [ "$STOP" = true ] || [ "$CLEAN" = true ]; then
    # Disable trap for stop/clean operations (they're quick and don't need cleanup)
    trap - SIGINT SIGTERM
    echo -e "${YELLOW}Stopping containers...${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" down
    if [ "$CLEAN" = true ]; then
        echo -e "${YELLOW}Removing volumes...${NC}"
        $COMPOSE_CMD -f "$COMPOSE_FILE" down -v
        echo -e "${GREEN}Cleanup complete${NC}"
    fi
    exit 0
fi

# Show logs if requested
if [ "$LOGS" = true ]; then
    # Disable trap for logs (we don't want to stop containers when viewing logs)
    trap - SIGINT SIGTERM
    echo -e "${BLUE}Showing logs (Ctrl+C to exit)...${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs -f
    exit 0
fi

# Check if containers are already running
if $COMPOSE_CMD -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo -e "${YELLOW}Containers are already running${NC}"
    echo ""
    echo "Services available at:"
    echo "  - Frontend: http://localhost:5173"
    echo "  - Backend API: http://localhost:3123"
    echo "  - Debugging: localhost:9229"
    echo ""
    echo "Use --stop to stop containers"
    echo "Use --logs to view logs"
    exit 0
fi

# Build if needed or if --rebuild is specified
if [ "$REBUILD" = true ]; then
    echo -e "${YELLOW}Rebuilding containers...${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache
elif ! $COMPOSE_CMD -f "$COMPOSE_FILE" images | grep -q "memoriae-dev"; then
    echo -e "${YELLOW}Building containers (first time)...${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" build
fi

# Start containers
echo -e "${GREEN}Starting development environment...${NC}"
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check service health
if $COMPOSE_CMD -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Development environment started successfully!${NC}"
    echo ""
    echo -e "${BLUE}Services available at:${NC}"
    echo "  - Frontend: http://localhost:5173"
    echo "  - Backend API: http://localhost:3123"
    echo "  - Debugging: localhost:9229"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  npm run dev -- --logs    - View logs"
    echo "  npm run dev -- --stop    - Stop containers"
    echo "  npm run dev -- --clean   - Stop and remove everything"
    echo "  npm run dev -- --rebuild - Rebuild containers"
    echo ""
    echo -e "${YELLOW}To view logs:${NC}"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
    echo ""
    echo -e "${YELLOW}To attach to container:${NC}"
    echo "  $DOCKER_CMD exec -it memoriae-dev bash"
else
    echo -e "${YELLOW}Some services may not have started. Check logs:${NC}"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE logs"
    exit 1
fi

