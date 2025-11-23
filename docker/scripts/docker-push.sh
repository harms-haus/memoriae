#!/bin/bash

# Push Docker image to registry
# Usage: ./docker/scripts/docker-push.sh [tag] [registry]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TAG="${1:-latest}"
REGISTRY="${2:-ghcr.io}"
IMAGE_NAME="$REGISTRY/harms-haus/memoriae"

# Detect docker or podman
if command -v podman &> /dev/null; then
    DOCKER_CMD="podman"
    echo "Using Podman"
elif command -v docker &> /dev/null; then
    DOCKER_CMD="docker"
    echo "Using Docker"
else
    echo "Error: Neither Docker nor Podman found"
    exit 1
fi

echo "Pushing Docker image: $IMAGE_NAME:$TAG"

# Push the image
$DOCKER_CMD push "$IMAGE_NAME:$TAG"

# Also push latest tag if not already
if [ "$TAG" != "latest" ]; then
  $DOCKER_CMD push "$IMAGE_NAME:latest"
fi

echo "✅ Docker image pushed successfully: $IMAGE_NAME:$TAG"

