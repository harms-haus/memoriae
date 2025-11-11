#!/bin/bash

# Build Docker/Podman image for Memoriae
# Usage: ./docker/scripts/docker-build.sh [tag]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."

TAG="${1:-latest}"
IMAGE_NAME="ghcr.io/harms-haus/memoriae"

cd "$PROJECT_DIR"

# Detect docker or podman
USE_PODMAN=false
if command -v podman &> /dev/null; then
    DOCKER_CMD="podman"
    USE_PODMAN=true
    echo "Using Podman"
elif command -v docker &> /dev/null; then
    DOCKER_CMD="docker"
    echo "Using Docker"
else
    echo "Error: Neither Docker nor Podman found"
    exit 1
fi

echo "Building image: $IMAGE_NAME:$TAG"

# Build the image
if [ "$USE_PODMAN" = true ]; then
    # Use host network for Podman builds to avoid pasta networking issues
    # This works when running as root and avoids /dev/net/tun requirements
    $DOCKER_CMD build --network=host -t "$IMAGE_NAME:$TAG" -f docker/Dockerfile .
else
    $DOCKER_CMD build -t "$IMAGE_NAME:$TAG" -f docker/Dockerfile .
fi

# Also tag as latest if not already
if [ "$TAG" != "latest" ]; then
  $DOCKER_CMD tag "$IMAGE_NAME:$TAG" "$IMAGE_NAME:latest"
fi

echo "✅ Image built successfully: $IMAGE_NAME:$TAG"

