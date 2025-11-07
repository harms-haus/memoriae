#!/bin/bash

# Memoriae Production Docker Installation Script
# Sets up and runs Memoriae in a production Docker container

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
IMAGE_NAME="memoriae"
CONTAINER_NAME="memoriae-prod"
NETWORK_NAME="memoriae-network"

# Ports
BACKEND_PORT="${BACKEND_PORT:-3000}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Volume names
POSTGRES_VOLUME="memoriae-postgres-data"
REDIS_VOLUME="memoriae-redis-data"

echo -e "${GREEN}=== Memoriae Production Docker Installation ===${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Docker
if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Error: Docker daemon is not running.${NC}"
    echo "Please start Docker and try again."
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed and running${NC}"

# Check for existing container
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}Warning: Container '${CONTAINER_NAME}' already exists.${NC}"
    read -p "Do you want to remove it and create a new one? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Stopping and removing existing container...${NC}"
        docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
        docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
        echo -e "${GREEN}✓ Existing container removed${NC}"
    else
        echo -e "${YELLOW}Keeping existing container. Exiting.${NC}"
        exit 0
    fi
fi

# Check for .env file or prompt for environment variables
ENV_FILE="${SCRIPT_DIR}/.env.production"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}No .env.production file found.${NC}"
    echo "Creating .env.production file..."
    
    # Prompt for required environment variables
    echo ""
    echo -e "${BLUE}Please provide the following configuration:${NC}"
    
    read -p "JWT_SECRET (required, for token signing): " JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        echo -e "${RED}Error: JWT_SECRET is required${NC}"
        exit 1
    fi
    
    read -p "OPENROUTER_API_KEY (optional, press Enter to skip): " OPENROUTER_API_KEY
    
    read -p "FRONTEND_URL (default: http://localhost:${BACKEND_PORT}): " FRONTEND_URL
    FRONTEND_URL="${FRONTEND_URL:-http://localhost:${BACKEND_PORT}}"
    
    read -p "OAUTH_GOOGLE_CLIENT_ID (optional, press Enter to skip): " OAUTH_GOOGLE_CLIENT_ID
    read -p "OAUTH_GOOGLE_CLIENT_SECRET (optional, press Enter to skip): " OAUTH_GOOGLE_CLIENT_SECRET
    read -p "OAUTH_GITHUB_CLIENT_ID (optional, press Enter to skip): " OAUTH_GITHUB_CLIENT_ID
    read -p "OAUTH_GITHUB_CLIENT_SECRET (optional, press Enter to skip): " OAUTH_GITHUB_CLIENT_SECRET
    
    # Create .env.production file
    cat > "$ENV_FILE" <<EOF
# Memoriae Production Environment Variables
NODE_ENV=production
PORT=${BACKEND_PORT}
DATABASE_URL=postgresql://memoriae:memoriae@localhost:5432/memoriae
REDIS_URL=redis://localhost:6379
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
FRONTEND_URL=${FRONTEND_URL}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
OPENROUTER_API_URL=https://openrouter.ai/api/v1
QUEUE_CHECK_INTERVAL=30000
EOF

    if [ -n "$OAUTH_GOOGLE_CLIENT_ID" ]; then
        echo "OAUTH_GOOGLE_CLIENT_ID=${OAUTH_GOOGLE_CLIENT_ID}" >> "$ENV_FILE"
    fi
    if [ -n "$OAUTH_GOOGLE_CLIENT_SECRET" ]; then
        echo "OAUTH_GOOGLE_CLIENT_SECRET=${OAUTH_GOOGLE_CLIENT_SECRET}" >> "$ENV_FILE"
    fi
    if [ -n "$OAUTH_GITHUB_CLIENT_ID" ]; then
        echo "OAUTH_GITHUB_CLIENT_ID=${OAUTH_GITHUB_CLIENT_ID}" >> "$ENV_FILE"
    fi
    if [ -n "$OAUTH_GITHUB_CLIENT_SECRET" ]; then
        echo "OAUTH_GITHUB_CLIENT_SECRET=${OAUTH_GITHUB_CLIENT_SECRET}" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✓ Created .env.production file${NC}"
else
    echo -e "${GREEN}✓ Found existing .env.production file${NC}"
fi

# Build Docker image
echo ""
echo -e "${GREEN}[1/5] Building Docker image...${NC}"
if docker build -t "$IMAGE_NAME:latest" -f Dockerfile .; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}Error: Docker image build failed${NC}"
    exit 1
fi

# Create Docker network if it doesn't exist
echo ""
echo -e "${GREEN}[2/5] Setting up Docker network...${NC}"
if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
    docker network create "$NETWORK_NAME" >/dev/null 2>&1
    echo -e "${GREEN}✓ Created Docker network '${NETWORK_NAME}'${NC}"
else
    echo -e "${GREEN}✓ Docker network '${NETWORK_NAME}' already exists${NC}"
fi

# Create volumes if they don't exist
echo ""
echo -e "${GREEN}[3/5] Setting up data volumes...${NC}"
if ! docker volume ls --format '{{.Name}}' | grep -q "^${POSTGRES_VOLUME}$"; then
    docker volume create "$POSTGRES_VOLUME" >/dev/null 2>&1
    echo -e "${GREEN}✓ Created PostgreSQL volume '${POSTGRES_VOLUME}'${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL volume '${POSTGRES_VOLUME}' already exists${NC}"
fi

if ! docker volume ls --format '{{.Name}}' | grep -q "^${REDIS_VOLUME}$"; then
    docker volume create "$REDIS_VOLUME" >/dev/null 2>&1
    echo -e "${GREEN}✓ Created Redis volume '${REDIS_VOLUME}'${NC}"
else
    echo -e "${GREEN}✓ Redis volume '${REDIS_VOLUME}' already exists${NC}"
fi

# Run the container
echo ""
echo -e "${GREEN}[4/5] Starting Docker container...${NC}"

# Execute docker run with env file
if docker run -d \
    --name "${CONTAINER_NAME}" \
    --network "${NETWORK_NAME}" \
    --restart unless-stopped \
    -p "${BACKEND_PORT}:3000" \
    -p "${POSTGRES_PORT}:5432" \
    -p "${REDIS_PORT}:6379" \
    -v "${POSTGRES_VOLUME}:/var/lib/postgresql/16/main" \
    -v "${REDIS_VOLUME}:/var/lib/redis" \
    --env-file "${ENV_FILE}" \
    "${IMAGE_NAME}:latest"; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
else
    echo -e "${RED}Error: Failed to start container${NC}"
    exit 1
fi

# Wait for services to be ready
echo ""
echo -e "${GREEN}[5/5] Waiting for services to be ready...${NC}"
echo -e "${YELLOW}This may take a minute while PostgreSQL initializes and migrations run...${NC}"

MAX_WAIT=120
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker exec "$CONTAINER_NAME" pg_isready -U memoriae -d memoriae >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    if [ $WAIT_COUNT -eq 0 ]; then
        echo -n "Waiting"
    fi
    echo -n "."
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    echo ""
    echo -e "${YELLOW}Warning: Timeout waiting for PostgreSQL. Check container logs:${NC}"
    echo "  docker logs ${CONTAINER_NAME}"
else
    echo ""
fi

# Check if backend is responding (if curl is available)
if command_exists curl; then
    echo -e "${YELLOW}Checking backend health...${NC}"
    sleep 5
    if curl -f -s "http://localhost:${BACKEND_PORT}/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is responding${NC}"
    else
        echo -e "${YELLOW}Backend may still be starting. Check logs with: docker logs ${CONTAINER_NAME}${NC}"
    fi
else
    echo -e "${YELLOW}Note: curl not found, skipping health check.${NC}"
    echo -e "${YELLOW}You can check if the backend is ready with: curl http://localhost:${BACKEND_PORT}/health${NC}"
fi

# Print summary
echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo -e "${BLUE}Container Information:${NC}"
echo "  Name: ${CONTAINER_NAME}"
echo "  Image: ${IMAGE_NAME}:latest"
echo "  Network: ${NETWORK_NAME}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo "  Backend API: http://localhost:${BACKEND_PORT}"
echo "  PostgreSQL: localhost:${POSTGRES_PORT}"
echo "  Redis: localhost:${REDIS_PORT}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:        docker logs -f ${CONTAINER_NAME}"
echo "  Stop container:   docker stop ${CONTAINER_NAME}"
echo "  Start container:  docker start ${CONTAINER_NAME}"
echo "  Restart container: docker restart ${CONTAINER_NAME}"
echo "  Remove container: docker rm -f ${CONTAINER_NAME}"
echo "  Shell access:     docker exec -it ${CONTAINER_NAME} /bin/bash"
echo ""
echo -e "${BLUE}Data Volumes:${NC}"
echo "  PostgreSQL data: ${POSTGRES_VOLUME}"
echo "  Redis data: ${REDIS_VOLUME}"
echo ""
echo -e "${GREEN}Memoriae is now running in production mode!${NC}"

