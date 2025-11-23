#!/bin/bash

# Publish frontend package to NPM
# Usage: ./scripts/publish-npm-memoriae.sh [version]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR/../frontend"

cd "$PACKAGE_DIR"

# Run the package's publish script
./scripts/publish.sh "$@"

