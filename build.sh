#!/bin/bash

# Memoriae Build Script
# Builds and tests (with coverage) mother-theme, backend, and frontend (continuing on failure)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
MOTHER_THEME_DIR="$SCRIPT_DIR/mother-theme"

# Track results
BUILD_FAILURES=()
TEST_FAILURES=()

echo -e "${GREEN}=== Memoriae Build Script ===${NC}"
echo ""

# Build phase
echo -e "${BLUE}=== BUILD PHASE ===${NC}"
echo ""

echo -e "${GREEN}[1/3] Building mother-theme...${NC}"
cd "$MOTHER_THEME_DIR"
if npm run build; then
  echo -e "${GREEN}✓ Mother-theme built successfully${NC}"
else
  echo -e "${RED}✗ Mother-theme build failed!${NC}"
  BUILD_FAILURES+=("mother-theme")
fi
echo ""

echo -e "${GREEN}[2/3] Building backend...${NC}"
cd "$BACKEND_DIR"
if npm run build; then
  echo -e "${GREEN}✓ Backend built successfully${NC}"
else
  echo -e "${RED}✗ Backend build failed!${NC}"
  BUILD_FAILURES+=("backend")
fi
echo ""

echo -e "${GREEN}[3/3] Building frontend...${NC}"
cd "$FRONTEND_DIR"
if npm run build; then
  echo -e "${GREEN}✓ Frontend built successfully${NC}"
else
  echo -e "${RED}✗ Frontend build failed!${NC}"
  BUILD_FAILURES+=("frontend")
fi
echo ""

# Test phase (with coverage)
echo -e "${BLUE}=== TEST PHASE (with coverage) ===${NC}"
echo ""

echo -e "${GREEN}[1/3] Running mother-theme tests with coverage...${NC}"
cd "$MOTHER_THEME_DIR"
if npm run test:coverage; then
  echo -e "${GREEN}✓ Mother-theme tests and coverage passed${NC}"
else
  echo -e "${RED}✗ Mother-theme tests/coverage failed!${NC}"
  TEST_FAILURES+=("mother-theme")
fi
echo ""

echo -e "${GREEN}[2/3] Running backend tests with coverage...${NC}"
cd "$BACKEND_DIR"
if npm run test:coverage; then
  echo -e "${GREEN}✓ Backend tests and coverage passed${NC}"
else
  echo -e "${RED}✗ Backend tests/coverage failed!${NC}"
  TEST_FAILURES+=("backend")
fi
echo ""

echo -e "${GREEN}[3/3] Running frontend tests with coverage...${NC}"
cd "$FRONTEND_DIR"
if npm run test:coverage; then
  echo -e "${GREEN}✓ Frontend tests and coverage passed${NC}"
else
  echo -e "${RED}✗ Frontend tests/coverage failed!${NC}"
  TEST_FAILURES+=("frontend")
fi
echo ""

# Summary
echo -e "${BLUE}=== SUMMARY ===${NC}"
echo ""

# Check if there were any failures
if [ ${#BUILD_FAILURES[@]} -gt 0 ] || [ ${#TEST_FAILURES[@]} -gt 0 ]; then
  echo -e "${RED}✗ Failures detected:${NC}"
  if [ ${#BUILD_FAILURES[@]} -gt 0 ]; then
    echo -e "${RED}  Build failures:${NC}"
    for failure in "${BUILD_FAILURES[@]}"; do
      echo -e "${RED}    - ${failure}${NC}"
    done
  fi
  if [ ${#TEST_FAILURES[@]} -gt 0 ]; then
    echo -e "${RED}  Test/coverage failures:${NC}"
    for failure in "${TEST_FAILURES[@]}"; do
      echo -e "${RED}    - ${failure}${NC}"
    done
  fi
  exit 1
fi

# All builds and tests passed
echo -e "${GREEN}✓ All builds, tests, and coverage completed successfully!${NC}"
exit 0
