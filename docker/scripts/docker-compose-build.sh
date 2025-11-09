#!/bin/bash

# Build all services using docker-compose
# Usage: ./docker/scripts/docker-compose-build.sh [env]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."

ENV="${1:-dev}"

cd "$PROJECT_DIR"

echo "Building Docker Compose stack for environment: $ENV"

if [ "$ENV" = "prod" ]; then
  echo "Using production configuration..."
  docker-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml build
else
  echo "Using development configuration..."
  docker-compose -f docker/docker-compose.dev.yml build
fi

echo "✅ Docker Compose stack built successfully"

# Check if podman-compose is available as alternative
if command -v podman-compose &> /dev/null; then
  echo ""
  echo "Note: podman-compose is available. You can use it instead:"
  echo "  podman-compose -f docker/docker-compose.yml build"
fi

