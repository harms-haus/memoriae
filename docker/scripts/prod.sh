#!/bin/bash

# Simple production environment script for Memoriae
# Usage: ./docker/scripts/prod.sh [--docker] [--clean] [--install]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."

cd "$PROJECT_DIR"

# Flag to track if we're being interrupted
INTERRUPTED=false

# Clean exit handler - NO CLEANUP, NO DATA DELETION, JUST EXIT
clean_exit() {
    INTERRUPTED=true
    echo ""
    echo -e "${YELLOW}Interrupted. Exiting cleanly...${NC}"
    exit 130  # Standard exit code for SIGINT
}

# Trap SIGINT (Ctrl+C) and SIGTERM - just exit, no cleanup
trap clean_exit SIGINT SIGTERM

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
USE_DOCKER=false
CLEAN=false
INSTALL=false
BUILD_LOCAL=false
DOWN=false

for arg in "$@"; do
    case "$arg" in
        --docker)
            USE_DOCKER=true
            ;;
        --clean)
            CLEAN=true
            ;;
        --install)
            INSTALL=true
            ;;
        --build)
            BUILD_LOCAL=true
            ;;
        --down)
            DOWN=true
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $arg${NC}"
            echo "Usage: $0 [--docker] [--clean] [--install] [--build] [--down]"
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

# Check for .env file
ENV_FILE="${PROJECT_DIR}/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file with required environment variables"
    exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Validate required variables
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
    echo -e "${RED}Error: JWT_SECRET is not set or is using the default value${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ] && [ -z "$DB_HOST" ]; then
    echo -e "${RED}Error: DATABASE_URL or DB_HOST must be set${NC}"
    exit 1
fi

if [ -z "$REDIS_URL" ]; then
    echo -e "${RED}Error: REDIS_URL must be set${NC}"
    exit 1
fi

ENV_FILE_FLAG="--env-file ${PROJECT_DIR}/.env"

# Handle --down (stop containers without deleting volumes)
if [ "$DOWN" = true ]; then
    echo -e "${BLUE}Stopping production containers...${NC}"
    echo -e "${YELLOW}Note: Containers will be stopped but volumes and data will be preserved${NC}"
    
    # Detect container runtime first
    if [ "$USE_DOCKER" = true ]; then
        if command -v docker &> /dev/null; then
            if docker compose version &> /dev/null; then
                COMPOSE_CMD="docker compose"
            elif command -v docker-compose &> /dev/null; then
                COMPOSE_CMD="docker-compose"
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
            COMPOSE_CMD="podman-compose"
        elif command -v docker &> /dev/null; then
            if docker compose version &> /dev/null; then
                COMPOSE_CMD="docker compose"
            elif command -v docker-compose &> /dev/null; then
                COMPOSE_CMD="docker-compose"
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
    
    # Stop containers (no -v flag, so volumes are preserved)
    set +e
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG down 2>/dev/null)
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

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    if command -v ss &> /dev/null; then
        # Check for :port at end of line or followed by space
        if ss -tlnp 2>/dev/null | grep -qE ":$port[[:space:]]|:$port$"; then
            return 0  # Port is in use
        fi
    elif command -v netstat &> /dev/null; then
        # Check for :port at end of line or followed by space
        if netstat -tlnp 2>/dev/null | grep -qE ":$port[[:space:]]|:$port$"; then
            return 0  # Port is in use
        fi
    fi
    return 1  # Port is free
}

# Function to detect existing containers
detect_existing_containers() {
    # Don't do anything if we're being interrupted
    if [ "$INTERRUPTED" = true ]; then
        return
    fi
    
    echo -e "${YELLOW}Checking for existing containers...${NC}"
    
    CONTAINERS_RUNNING=false
    CONTAINERS_EXIST=false
    
    # Check if production containers exist
    for container in memoriae-app memoriae-postgres memoriae-redis; do
        # Check for interrupt before each operation
        if [ "$INTERRUPTED" = true ]; then
            return
        fi
        
        if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^${container}$"; then
            CONTAINERS_RUNNING=true
            CONTAINERS_EXIST=true
            echo -e "${GREEN}✓ Container ${container} is running${NC}"
        elif $DOCKER_CMD ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            CONTAINERS_EXIST=true
            echo -e "${YELLOW}⚠ Container ${container} exists but is not running${NC}"
        fi
    done
    
    if [ "$CONTAINERS_RUNNING" = true ]; then
        echo -e "${GREEN}✓ Production containers detected - will restart/rebuild as needed${NC}"
    elif [ "$CONTAINERS_EXIST" = true ]; then
        echo -e "${YELLOW}⚠ Some containers exist but are not running - will restart them${NC}"
    else
        echo -e "${BLUE}No existing containers found - will create new ones${NC}"
    fi
}

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
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG down -v)
    echo -e "${GREEN}Cleanup complete${NC}"
    echo -e "${YELLOW}Note: This script does NOT start services after cleanup.${NC}"
    echo -e "${YELLOW}Run '$0' to start services.${NC}"
    exit 0
fi

# Handle --install (systemd service setup)
if [ "$INSTALL" = true ]; then
    echo -e "${BLUE}Step 2: Setting up systemd service...${NC}"
    
    SERVICE_NAME="memoriae-prod"
    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
    SCRIPT_PATH="$(realpath "$0")"
    
    # Determine which runtime to use
    if [ "$USE_DOCKER" = true ]; then
        RUNTIME_CMD="docker"
    else
        RUNTIME_CMD="podman"
    fi
    
    # Determine compose command for ExecStop
    if [ "$USE_DOCKER" = true ]; then
        if docker compose version &> /dev/null; then
            COMPOSE_CMD_FULL="docker compose"
        else
            COMPOSE_CMD_FULL="docker-compose"
        fi
    else
        COMPOSE_CMD_FULL="podman-compose"
    fi
    
    # Build ExecStart command with correct flag
    if [ "$USE_DOCKER" = true ]; then
        EXEC_START="${SCRIPT_PATH} --docker"
    else
        EXEC_START="${SCRIPT_PATH}"
    fi
    
    # Create systemd service file
    sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Memoriae Production Environment
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${PROJECT_DIR}
ExecStart=${EXEC_START}
ExecStop=/usr/bin/${COMPOSE_CMD_FULL} -f ${PROJECT_DIR}/docker/docker-compose.yml -f ${PROJECT_DIR}/docker/docker-compose.prod.yml --env-file ${PROJECT_DIR}/.env down
User=$(whoami)
Group=$(id -gn)

[Install]
WantedBy=multi-user.target
EOF
    
    echo -e "${GREEN}✓ Systemd service created${NC}"
    echo -e "${YELLOW}To enable and start the service:${NC}"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable ${SERVICE_NAME}"
    echo "  sudo systemctl start ${SERVICE_NAME}"
    echo ""
    echo -e "${YELLOW}To check status:${NC}"
    echo "  sudo systemctl status ${SERVICE_NAME}"
    exit 0
fi

# Step 2: Detect existing containers
echo -e "${BLUE}Step 2: Detecting existing containers...${NC}"
detect_existing_containers

# Step 3: Check and prepare Docker image
echo -e "${BLUE}Step 3: Checking Docker image...${NC}"
IMAGE_NAME="ghcr.io/harms-haus/memoriae:latest"
LOCAL_IMAGE="localhost/memoriae:latest"

# Check if local image exists
if $DOCKER_CMD images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${LOCAL_IMAGE}$"; then
    echo -e "${GREEN}✓ Found local image: ${LOCAL_IMAGE}${NC}"
    # Tag local image as the one we need
    $DOCKER_CMD tag "$LOCAL_IMAGE" "$IMAGE_NAME" 2>/dev/null || true
elif $DOCKER_CMD images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}$"; then
    echo -e "${GREEN}✓ Found image: ${IMAGE_NAME}${NC}"
elif [ "$BUILD_LOCAL" = true ]; then
    # Check for interrupt before building
    if [ "$INTERRUPTED" = true ]; then
        exit 130
    fi
    
    echo -e "${YELLOW}Building image locally...${NC}"
    if [ -f "$PROJECT_DIR/docker/scripts/docker-build.sh" ]; then
        # Temporarily disable exit on error for build
        set +e
        "$PROJECT_DIR/docker/scripts/docker-build.sh" latest
        BUILD_EXIT_CODE=$?
        set -e
        
        # If interrupted during build, exit cleanly
        if [ "$INTERRUPTED" = true ] || [ $BUILD_EXIT_CODE -eq 130 ]; then
            exit 130
        fi
        
        if [ $BUILD_EXIT_CODE -ne 0 ]; then
            echo -e "${RED}Error: Failed to build image${NC}"
            exit $BUILD_EXIT_CODE
        fi
    else
        echo -e "${RED}Error: docker-build.sh not found${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Image not found locally. Attempting to pull...${NC}"
    if $DOCKER_CMD pull "$IMAGE_NAME" 2>/dev/null; then
        echo -e "${GREEN}✓ Successfully pulled image${NC}"
    else
        echo -e "${YELLOW}⚠ Failed to pull image from registry${NC}"
        echo -e "${YELLOW}This might mean:${NC}"
        echo -e "${YELLOW}  - The image doesn't exist yet (needs to be built and pushed)${NC}"
        echo -e "${YELLOW}  - Authentication is required for the registry${NC}"
        echo ""
        echo -e "${YELLOW}Options:${NC}"
        echo -e "${YELLOW}  1. Build locally: $0 --build${NC}"
        echo -e "${YELLOW}  2. Pull manually: $DOCKER_CMD pull $IMAGE_NAME${NC}"
        echo ""
        read -p "Build image locally now? (y/N): " build_now
        # Check for interrupt after read
        if [ "$INTERRUPTED" = true ]; then
            exit 130
        fi
        
        if [[ "$build_now" =~ ^[Yy]$ ]]; then
            if [ -f "$PROJECT_DIR/docker/scripts/docker-build.sh" ]; then
                # Temporarily disable exit on error for build
                set +e
                "$PROJECT_DIR/docker/scripts/docker-build.sh" latest
                BUILD_EXIT_CODE=$?
                set -e
                
                # If interrupted during build, exit cleanly
                if [ "$INTERRUPTED" = true ] || [ $BUILD_EXIT_CODE -eq 130 ]; then
                    exit 130
                fi
                
                if [ $BUILD_EXIT_CODE -ne 0 ]; then
                    echo -e "${RED}Error: Failed to build image${NC}"
                    exit $BUILD_EXIT_CODE
                fi
            else
                echo -e "${RED}Error: docker-build.sh not found${NC}"
                exit 1
            fi
        else
            echo -e "${RED}Cannot proceed without image. Exiting.${NC}"
            exit 1
        fi
    fi
fi

# Step 4: Start/restart compose services
echo -e "${BLUE}Step 4: Starting/restarting services...${NC}"
echo -e "${YELLOW}Note: Existing containers will be restarted (not stopped/deleted)${NC}"
# Temporarily disable exit on error for this command so we can handle interrupts
set +e

# Check if containers exist first
CONTAINERS_EXIST=false
for container in memoriae-postgres memoriae-redis memoriae-app; do
    if $DOCKER_CMD ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        CONTAINERS_EXIST=true
        break
    fi
done

# For Podman, we need to handle container replacement differently
if [ "$DOCKER_CMD" = "podman" ]; then
    # Podman requires containers to be removed before recreating with same name
    # Stop and remove existing containers if they exist
    for container in memoriae-postgres memoriae-redis memoriae-app; do
        if $DOCKER_CMD ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            echo -e "${YELLOW}Stopping and removing existing container: ${container}...${NC}"
            $DOCKER_CMD stop "$container" 2>/dev/null || true
            $DOCKER_CMD rm "$container" 2>/dev/null || true
        fi
    done
fi

if [ "$CONTAINERS_EXIST" = true ]; then
    # Restart postgres and redis if they exist (for Docker, this works)
    if [ "$DOCKER_CMD" != "podman" ]; then
        echo -e "${YELLOW}Restarting postgres and redis...${NC}"
        (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG restart postgres redis 2>&1)
        RESTART_EXIT=$?
        
        # If restart failed, try starting them
        if [ $RESTART_EXIT -ne 0 ]; then
            echo -e "${YELLOW}Restart failed, starting postgres and redis...${NC}"
            (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG up -d postgres redis 2>&1)
            RESTART_EXIT=$?
        fi
    else
        # For Podman, containers were already removed, so just start them
        echo -e "${YELLOW}Starting postgres and redis...${NC}"
        (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG up -d postgres redis 2>&1)
        RESTART_EXIT=$?
    fi
else
    # Containers don't exist, start them
    echo -e "${YELLOW}Starting postgres and redis...${NC}"
    (cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG up -d postgres redis 2>&1)
    RESTART_EXIT=$?
fi

# Rebuild/recreate memoriae app (force recreate to use new image if built)
echo -e "${YELLOW}Starting/restarting memoriae app...${NC}"
(cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG up -d --force-recreate --no-deps memoriae 2>&1)
MEMORIAE_EXIT=$?

# Make sure all services are up (this will start any that aren't running)
echo -e "${YELLOW}Ensuring all services are up...${NC}"
(cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG up -d 2>&1)
UP_EXIT=$?

set -e

# If we were interrupted, exit immediately without any cleanup
if [ "$INTERRUPTED" = true ]; then
    exit 130
fi

# Check if containers are actually running (more reliable than exit codes)
echo -e "${YELLOW}Verifying containers are running...${NC}"
ALL_RUNNING=true
for container in memoriae-postgres memoriae-redis memoriae-app; do
    if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${GREEN}✓ ${container} is running${NC}"
    else
        echo -e "${RED}✗ ${container} is not running${NC}"
        ALL_RUNNING=false
    fi
done

# If containers aren't running, show error and exit
if [ "$ALL_RUNNING" != true ]; then
    echo -e "${RED}Error: Some containers failed to start${NC}"
    echo -e "${YELLOW}Check logs with: $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG logs${NC}"
    echo -e "${YELLOW}Last compose command exit codes: RESTART=$RESTART_EXIT MEMORIAE=$MEMORIAE_EXIT UP=$UP_EXIT${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All containers are running${NC}"

# Step 5: Wait for services to be healthy
echo -e "${BLUE}Step 5: Waiting for services to be healthy...${NC}"

# Wait for postgres
echo -e "${YELLOW}Waiting for postgres...${NC}"
for i in {1..30}; do
    # Check if interrupted
    if [ "$INTERRUPTED" = true ]; then
        exit 130
    fi
    
    if $DOCKER_CMD exec memoriae-postgres pg_isready -U memoriae > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Postgres is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Postgres failed to become ready${NC}"
        exit 1
    fi
    # Sleep with interrupt check - sleep will be interrupted by SIGINT
    sleep 1 || {
        if [ "$INTERRUPTED" = true ]; then
            exit 130
        fi
    }
    # Check again after sleep in case interrupt happened during sleep
    if [ "$INTERRUPTED" = true ]; then
        exit 130
    fi
done

# Wait for redis
echo -e "${YELLOW}Waiting for redis...${NC}"
for i in {1..30}; do
    # Check if interrupted
    if [ "$INTERRUPTED" = true ]; then
        exit 130
    fi
    
    if $DOCKER_CMD exec memoriae-redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Redis failed to become ready${NC}"
        exit 1
    fi
    # Sleep with interrupt check - sleep will be interrupted by SIGINT
    sleep 1 || {
        if [ "$INTERRUPTED" = true ]; then
            exit 130
        fi
    }
    # Check again after sleep in case interrupt happened during sleep
    if [ "$INTERRUPTED" = true ]; then
        exit 130
    fi
done

# Wait for memoriae app (just check if container is running)
echo -e "${YELLOW}Waiting for memoriae app...${NC}"
for i in {1..60}; do
    # Check if interrupted
    if [ "$INTERRUPTED" = true ]; then
        exit 130
    fi
    
    if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^memoriae-app$"; then
        echo -e "${GREEN}✓ Memoriae app container is running${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${YELLOW}⚠ Memoriae app container may not be running (check logs)${NC}"
        break
    fi
    # Sleep with interrupt check - sleep will be interrupted by SIGINT
    sleep 1 || {
        if [ "$INTERRUPTED" = true ]; then
            exit 130
        fi
    }
    # Check again after sleep in case interrupt happened during sleep
    if [ "$INTERRUPTED" = true ]; then
        exit 130
    fi
done

# Step 6: Display helpful info
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
echo "  • Stop:         $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG down"
echo "  • Clean (⚠):    $0 --clean"
echo "  • Status:       $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG ps"
echo "  • Install:      $0 --install"
echo "  • Build image:  $0 --build"
echo ""
echo -e "${GREEN}Memoriae is running in production mode!${NC}"
echo ""
echo -e "${YELLOW}Following logs (Ctrl+C to exit)...${NC}"
echo ""

# Step 7: Follow logs
# Temporarily disable exit on error for log following
set +e
# Suppress stderr to hide KeyboardInterrupt tracebacks from podman-compose
# Logs output goes to stdout, so we only suppress stderr
(cd "$PROJECT_DIR" && $COMPOSE_CMD $COMPOSE_FILES $ENV_FILE_FLAG logs -f 2>/dev/null)
LOGS_EXIT_CODE=$?
set -e

# If we were interrupted, exit immediately without any cleanup
if [ "$INTERRUPTED" = true ] || [ $LOGS_EXIT_CODE -eq 130 ] || [ $LOGS_EXIT_CODE -eq 0 ]; then
    # Exit code 130 is SIGINT, 0 is normal exit (shouldn't happen with -f, but handle it)
    exit 130
fi

# If logs failed for other reasons, just exit
exit $LOGS_EXIT_CODE

