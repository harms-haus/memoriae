#!/bin/bash

# Publish package to NPM
# Usage: ./scripts/publish.sh [version] [--skip-tests] [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR/.."

cd "$PACKAGE_DIR"

# Parse arguments
SKIP_TESTS=false
DRY_RUN=false
VERSION_ARG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      if [ -z "$VERSION_ARG" ] && [[ ! "$1" =~ ^-- ]]; then
        VERSION_ARG="$1"
      fi
      shift
      ;;
  esac
done

# Check npm authentication
echo "Checking npm authentication..."
if ! npm whoami &> /dev/null; then
  echo "❌ Error: Not logged into npm. Run 'npm login' first."
  exit 1
fi
echo "✅ Authenticated as $(npm whoami)"

# Check git status (warn but don't fail)
if [ -d "$PACKAGE_DIR/../.git" ] && command -v git &> /dev/null; then
  cd "$PACKAGE_DIR/.."
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo "⚠️  Warning: Uncommitted changes detected"
    echo "   Consider committing changes before publishing"
    if [ -t 0 ]; then
      # Interactive terminal - prompt user
      read -p "   Continue anyway? (y/N) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
      fi
    else
      # Non-interactive - just warn
      echo "   Continuing in non-interactive mode..."
    fi
  fi
  cd "$PACKAGE_DIR"
fi

# Check if version argument is provided
if [ -n "$VERSION_ARG" ]; then
  echo "Bumping version: $VERSION_ARG"
  npm version "$VERSION_ARG"
fi

# Run tests unless skipped
if [ "$SKIP_TESTS" = false ]; then
  echo "Running tests..."
  npm test || {
    echo "❌ Tests failed. Use --skip-tests to bypass."
    exit 1
  }
  echo "✅ Tests passed"
fi

# Build the package
echo "Building package..."
npm run build || {
  echo "❌ Build failed"
  exit 1
}

# Verify build output exists
if [ ! -d "dist" ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then
  echo "❌ Error: Build output directory 'dist' is empty or missing"
  exit 1
fi
echo "✅ Build successful"

# Publish to NPM
if [ "$DRY_RUN" = true ]; then
  echo "🔍 DRY RUN: Would publish to NPM (skipping actual publish)"
  echo "   Package: $(npm pkg get name | tr -d '"')"
  echo "   Version: $(npm pkg get version | tr -d '"')"
else
  echo "Publishing to NPM..."
  npm publish --access public || {
    echo "❌ Publish failed"
    exit 1
  }
  echo "✅ Successfully published"
fi

