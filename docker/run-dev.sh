#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building development container...${NC}"
cd "$(dirname "$0")/.." || exit
podman build -f docker/Dockerfile.dev -t memoriae-dev:latest .

echo -e "${GREEN}Starting development container...${NC}"

# Check if container already exists
if podman ps -a --format "{{.Names}}" | grep -q "^memoriae-dev$"; then
    echo -e "${YELLOW}Removing existing container...${NC}"
    podman rm -f memoriae-dev
fi

# Run the container
podman run -d \
  --name memoriae-dev \
  -p 3000:3000 \
  -p 5173:5173 \
  -p 9229:9229 \
  -v "$(pwd)/backend:/app/backend:rw" \
  -v "$(pwd)/frontend:/app/frontend:rw" \
  -v "$(pwd)/mother-theme:/app/mother-theme:ro" \
  -v memoriae-postgres-data:/var/lib/postgresql/14/main \
  -v memoriae-redis-data:/var/lib/redis \
  -v /app/backend/node_modules \
  -v /app/frontend/node_modules \
  -v /app/mother-theme/node_modules \
  -e NODE_ENV=development \
  -e DATABASE_URL=postgresql://memoriae:memoriae@localhost:5432/memoriae \
  -e REDIS_URL=redis://localhost:6379 \
  -e PORT=3000 \
  -e JWT_SECRET="${JWT_SECRET:-dev-secret-change-in-production}" \
  -e OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}" \
  -e OPENROUTER_API_URL="${OPENROUTER_API_URL:-https://openrouter.ai/api/v1}" \
  -e FRONTEND_URL=http://localhost:5173 \
  memoriae-dev:latest

echo -e "${GREEN}Container started!${NC}"
echo ""
echo "Services available at:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend API: http://localhost:3000"
echo "  - Debugging: localhost:9229"
echo ""
echo "View logs: podman logs -f memoriae-dev"
echo "Stop: podman stop memoriae-dev"
echo "Remove: podman rm -f memoriae-dev"

