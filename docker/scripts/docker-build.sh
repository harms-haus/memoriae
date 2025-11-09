#!/bin/bash

# Build Docker image for Memoriae
# Usage: ./docker/scripts/docker-build.sh [tag]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."

TAG="${1:-latest}"
IMAGE_NAME="ghcr.io/harms-haus/memoriae"

cd "$PROJECT_DIR"

echo "Building Docker image: $IMAGE_NAME:$TAG"

# Build the image
docker build -t "$IMAGE_NAME:$TAG" -f docker/Dockerfile .

# Also tag as latest if not already
if [ "$TAG" != "latest" ]; then
  docker tag "$IMAGE_NAME:$TAG" "$IMAGE_NAME:latest"
fi

echo "✅ Docker image built successfully: $IMAGE_NAME:$TAG"

