#!/bin/bash

# Publish package to NPM
# Usage: ./scripts/publish.sh [version]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR/.."
MOTHER_DIR="$SCRIPT_DIR/../../mother-theme"

# Build mother-theme first (needed for frontend)
echo "Building mother-theme..."
cd "$MOTHER_DIR"
npm run build

# Build and publish frontend
cd "$PACKAGE_DIR"

# Check if version argument is provided
if [ -n "$1" ]; then
  npm version "$1"
fi

# Build the package
echo "Building package..."
npm run build

# Publish to NPM
echo "Publishing to NPM..."
npm publish --access public

echo "✅ Successfully published"

