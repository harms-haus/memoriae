#!/bin/bash

# Push Docker image to registry
# Usage: ./docker/scripts/docker-push.sh [tag] [registry]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TAG="${1:-latest}"
REGISTRY="${2:-ghcr.io}"
IMAGE_NAME="$REGISTRY/harms-haus/memoriae"

echo "Pushing Docker image: $IMAGE_NAME:$TAG"

# Push the image
docker push "$IMAGE_NAME:$TAG"

# Also push latest tag if not already
if [ "$TAG" != "latest" ]; then
  docker push "$IMAGE_NAME:latest"
fi

echo "✅ Docker image pushed successfully: $IMAGE_NAME:$TAG"

