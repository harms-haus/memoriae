#!/usr/bin/env bash
# Script to test only changed modules
# Usage: ./scripts/test-changed.sh [--all] [--mother] [--frontend] [--backend]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FORCE_MOTHER=false
FORCE_FRONTEND=false
FORCE_BACKEND=false
FORCE_ALL=false

for arg in "$@"; do
  case $arg in
    --all)
      FORCE_ALL=true
      ;;
    --mother)
      FORCE_MOTHER=true
      ;;
    --frontend)
      FORCE_FRONTEND=true
      ;;
    --backend)
      FORCE_BACKEND=true
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --all       Run all tests regardless of changes"
      echo "  --mother    Force test mother-theme"
      echo "  --frontend  Force test frontend"
      echo "  --backend   Force test backend"
      echo "  --help      Show this help message"
      echo ""
      echo "By default, only tests modules with changed files."
      exit 0
      ;;
  esac
done

# Get list of changed files (from git diff or git status)
if [ "$FORCE_ALL" = true ]; then
  MOTHER_CHANGED=true
  FRONTEND_CHANGED=true
  BACKEND_CHANGED=true
else
  # Check for uncommitted changes
  CHANGED_FILES=$(git diff --name-only --diff-filter=ACM)
  CHANGED_FILES="$CHANGED_FILES $(git diff --cached --name-only --diff-filter=ACM)"
  
  MOTHER_CHANGED=$FORCE_MOTHER
  FRONTEND_CHANGED=$FORCE_FRONTEND
  BACKEND_CHANGED=$FORCE_BACKEND
  
  # Check for changes in each module
  for file in $CHANGED_FILES; do
    case "$file" in
      mother-theme/*)
        MOTHER_CHANGED=true
        ;;
      frontend/*)
        FRONTEND_CHANGED=true
        ;;
      backend/*)
        BACKEND_CHANGED=true
        ;;
    esac
  done
fi

# Track if any tests failed
TESTS_FAILED=0

# Run tests for mother-theme if changed
if [ "$MOTHER_CHANGED" = true ]; then
  echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${BLUE}🧪 Testing mother-theme${NC}"
  echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  if [ -d "mother-theme" ]; then
    cd mother-theme || exit 1
    
    # Only run type-check if TypeScript files changed
    if [ "$MOTHER_NEEDS_TYPECHECK" = true ]; then
      echo "Running type-check (TypeScript files changed)..."
      npm run type-check || TESTS_FAILED=1
    else
      echo "${YELLOW}⏭️  Skipping type-check (no TypeScript files changed)${NC}"
    fi
    
    if [ $TESTS_FAILED -eq 0 ]; then
      echo "Running unit tests..."
      npm test || TESTS_FAILED=1
    fi
    
    cd .. || exit 1
    
    if [ $TESTS_FAILED -eq 1 ]; then
      echo "${RED}❌ mother-theme tests failed${NC}"
    else
      echo "${GREEN}✅ mother-theme tests passed${NC}"
    fi
  else
    echo "${YELLOW}⚠️  mother-theme directory not found${NC}"
  fi
fi

# Run tests for backend if changed
if [ "$BACKEND_CHANGED" = true ]; then
  echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${BLUE}🧪 Testing backend${NC}"
  echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  if [ -d "backend" ]; then
    cd backend || exit 1
    
    # Only run type-check if TypeScript files changed
    if [ "$BACKEND_NEEDS_TYPECHECK" = true ]; then
      echo "Running type-check (TypeScript files changed)..."
      npm run type-check || TESTS_FAILED=1
    else
      echo "${YELLOW}⏭️  Skipping type-check (no TypeScript files changed)${NC}"
    fi
    
    if [ $TESTS_FAILED -eq 0 ]; then
      echo "Running unit tests..."
      npm run test:unit || TESTS_FAILED=1
    fi
    
    cd .. || exit 1
    
    if [ $TESTS_FAILED -eq 1 ]; then
      echo "${RED}❌ backend tests failed${NC}"
    else
      echo "${GREEN}✅ backend tests passed${NC}"
    fi
  else
    echo "${YELLOW}⚠️  backend directory not found${NC}"
  fi
fi

# Run tests for frontend if changed
if [ "$FRONTEND_CHANGED" = true ]; then
  echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${BLUE}🧪 Testing frontend${NC}"
  echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  if [ -d "frontend" ]; then
    cd frontend || exit 1
    
    # Only run type-check if TypeScript files changed
    if [ "$FRONTEND_NEEDS_TYPECHECK" = true ]; then
      echo "Running type-check (TypeScript files changed)..."
      npm run type-check || TESTS_FAILED=1
    else
      echo "${YELLOW}⏭️  Skipping type-check (no TypeScript files changed)${NC}"
    fi
    
    if [ $TESTS_FAILED -eq 0 ]; then
      echo "Running unit tests..."
      npm run test:unit || TESTS_FAILED=1
    fi
    
    cd .. || exit 1
    
    if [ $TESTS_FAILED -eq 1 ]; then
      echo "${RED}❌ frontend tests failed${NC}"
    else
      echo "${GREEN}✅ frontend tests passed${NC}"
    fi
  else
    echo "${YELLOW}⚠️  frontend directory not found${NC}"
  fi
fi

# Exit with error if any tests failed
if [ $TESTS_FAILED -eq 1 ]; then
  echo ""
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${RED}❌ Some tests failed${NC}"
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi

# Success message
if [ "$MOTHER_CHANGED" = true ] || [ "$FRONTEND_CHANGED" = true ] || [ "$BACKEND_CHANGED" = true ]; then
  echo ""
  echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${GREEN}✅ All tests passed!${NC}"
  echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo "${YELLOW}No modules to test${NC}"
fi

exit 0

