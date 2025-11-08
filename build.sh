#!/bin/bash

# Memoriae Build Script
# Builds and tests frontend, backend, and mother-theme

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
MOTHER_THEME_DIR="$SCRIPT_DIR/mother-theme"

echo -e "${GREEN}=== Memoriae Build Script ===${NC}"
echo ""

echo -e "${GREEN}[1/6] Building backend...${NC}"
cd "$BACKEND_DIR"
if ! npm run build; then
  echo -e "${RED}Backend build failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Backend built successfully${NC}"
echo ""

echo -e "${GREEN}[2/6] Building frontend...${NC}"
cd "$FRONTEND_DIR"
if ! npm run build; then
  echo -e "${RED}Frontend build failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

echo -e "${GREEN}[3/6] Building mother-theme...${NC}"
cd "$MOTHER_THEME_DIR"
if ! npm run build; then
  echo -e "${RED}Mother-theme build failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Mother-theme built successfully${NC}"
echo ""

echo -e "${GREEN}[4/6] Running backend tests...${NC}"
cd "$BACKEND_DIR"
if ! npm run test; then
  echo -e "${RED}Backend tests failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Backend tests passed${NC}"
echo ""

echo -e "${GREEN}[5/6] Running frontend tests...${NC}"
cd "$FRONTEND_DIR"
if ! npm run test; then
  echo -e "${RED}Frontend tests failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Frontend tests passed${NC}"
echo ""

echo -e "${GREEN}[6/6] Running mother-theme tests...${NC}"
cd "$MOTHER_THEME_DIR"
if ! npm run test; then
  echo -e "${RED}Mother-theme tests failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Mother-theme tests passed${NC}"
echo ""

echo -e "${GREEN}=== All builds and tests completed successfully! ===${NC}"





