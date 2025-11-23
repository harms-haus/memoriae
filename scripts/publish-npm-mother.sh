#!/bin/bash

# Publish mother-theme package to NPM
# Usage: ./scripts/publish-npm-mother.sh [version]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR/../mother-theme"

cd "$PACKAGE_DIR"

# Run the package's publish script
./scripts/publish.sh "$@"

