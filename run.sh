#!/bin/bash

# Memoriae Run Script
# Builds, tests, and starts both frontend and backend

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ports
BACKEND_PORT=3000
FRONTEND_PORT=5173

# Project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""
TAIL_BACKEND_PID=""
TAIL_FRONTEND_PID=""
REDIS_CONTAINER_ID=""

# Cleanup function
cleanup() {
  if [ -n "$TAIL_BACKEND_PID" ] && ps -p $TAIL_BACKEND_PID > /dev/null 2>&1; then
    kill $TAIL_BACKEND_PID 2>/dev/null || true
  fi
  if [ -n "$TAIL_FRONTEND_PID" ] && ps -p $TAIL_FRONTEND_PID > /dev/null 2>&1; then
    kill $TAIL_FRONTEND_PID 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo -e "\n${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ] && ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo -e "${YELLOW}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  if [ -n "$REDIS_CONTAINER_ID" ]; then
    echo -e "${YELLOW}Stopping Redis container (memoriae-redis)...${NC}"
    podman stop memoriae-redis >/dev/null 2>&1 || true
    # Don't remove container, just stop it (allows reuse on next run)
  fi
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

echo -e "${GREEN}=== Memoriae Run Script ===${NC}"
echo ""

# Function to kill processes on a port if they're from our project
kill_port_if_ours() {
  local port=$1
  local processes=$(lsof -ti:$port 2>/dev/null || true)
  
  if [ -z "$processes" ]; then
    return 0
  fi
  
  for pid in $processes; do
    # Get process command and working directory info
    local cmd=$(ps -p $pid -o command= 2>/dev/null | head -1 || echo "")
    local cwd=$(lsof -p $pid 2>/dev/null | grep cwd | awk '{print $9}' | head -1 || echo "")
    
    # Check if process is likely ours (node/vite/tsx commands or in our project directory)
    local is_ours=false
    
    if [[ "$cmd" == *"node"* ]] || [[ "$cmd" == *"vite"* ]] || [[ "$cmd" == *"tsx"* ]] || \
       [[ "$cmd" == *"npm"* ]] || [[ "$cmd" == *"memoriae"* ]]; then
      is_ours=true
    fi
    
    if [[ "$cwd" == "$SCRIPT_DIR"* ]] || [[ "$cwd" == "$BACKEND_DIR"* ]] || [[ "$cwd" == "$FRONTEND_DIR"* ]]; then
      is_ours=true
    fi
    
    if [ "$is_ours" = true ]; then
      echo -e "${YELLOW}Killing process $pid on port $port (ours)${NC}"
      echo "  Command: $cmd"
      echo "  CWD: $cwd"
      kill -9 $pid 2>/dev/null || true
    else
      echo -e "${YELLOW}Port $port is in use by process $pid (not ours, skipping)${NC}"
      echo "  Command: $cmd"
      echo "  CWD: $cwd"
    fi
  done
}

# Function to check if port is free
check_port_free() {
  local port=$1
  if lsof -ti:$port >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

echo -e "${GREEN}[1/4] Running build and tests...${NC}"
"$SCRIPT_DIR/build.sh"
echo ""

echo -e "${GREEN}[2/4] Killing processes on our ports...${NC}"
kill_port_if_ours $BACKEND_PORT
kill_port_if_ours $FRONTEND_PORT

# Wait a moment for ports to be released
sleep 1

# Verify ports are free
if ! check_port_free $BACKEND_PORT; then
  echo -e "${RED}Port $BACKEND_PORT is still in use!${NC}"
  exit 1
fi

if ! check_port_free $FRONTEND_PORT; then
  echo -e "${RED}Port $FRONTEND_PORT is still in use!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Ports are free${NC}"
echo ""

echo -e "${GREEN}[3/4] Checking environment...${NC}"

# Check for backend .env file
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo -e "${RED}Error: backend/.env file is missing!${NC}"
  echo -e "${YELLOW}The backend requires a .env file with at least:${NC}"
  echo "  - JWT_SECRET"
  echo "  - DATABASE_URL (or DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)"
  echo ""
  echo -e "${YELLOW}Create backend/.env with the required variables before running.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Backend .env file found${NC}"
echo ""

# Check for Redis and start Podman container if needed
echo -e "${GREEN}[4/4] Checking Redis...${NC}"
REDIS_PORT=6379

# Function to check if Redis is accessible
check_redis_connection() {
  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli -h localhost -p $REDIS_PORT ping >/dev/null 2>&1
  else
    # Fallback: check if port is open and responding
    timeout 1 bash -c "echo > /dev/tcp/localhost/$REDIS_PORT" >/dev/null 2>&1
  fi
}

# Check if Redis is already running locally
if check_redis_connection; then
  echo -e "${GREEN}✓ Redis is already running on port $REDIS_PORT${NC}"
else
  echo -e "${YELLOW}Redis not found on port $REDIS_PORT, checking for Podman Redis container...${NC}"
  
  # Check if Podman is available
  if ! command -v podman >/dev/null 2>&1; then
    echo -e "${RED}Error: Podman is not installed!${NC}"
    echo -e "${YELLOW}Please install Podman or start Redis manually:${NC}"
    echo "  - Install: sudo pacman -S podman (or your distro's package manager)"
    echo "  - Or start Redis: redis-server"
    exit 1
  fi
  
  # Check for existing Redis container
  EXISTING_CONTAINER=$(podman ps -a --filter "name=memoriae-redis" --format "{{.ID}}" | head -1)
  
  if [ -n "$EXISTING_CONTAINER" ]; then
    # Check if container is running
    if podman ps --filter "id=$EXISTING_CONTAINER" --format "{{.ID}}" | grep -q .; then
      echo -e "${GREEN}✓ Redis container already running: $EXISTING_CONTAINER${NC}"
      REDIS_CONTAINER_ID="$EXISTING_CONTAINER"
    else
      echo -e "${YELLOW}Starting existing Redis container...${NC}"
      podman start "$EXISTING_CONTAINER" >/dev/null 2>&1
      REDIS_CONTAINER_ID="$EXISTING_CONTAINER"
      sleep 2
      if check_redis_connection; then
        echo -e "${GREEN}✓ Redis container started successfully${NC}"
      else
        echo -e "${RED}Error: Redis container failed to start${NC}"
        exit 1
      fi
    fi
  else
    # Create and start new Redis container
    echo -e "${YELLOW}Starting new Redis container with Podman...${NC}"
    REDIS_CONTAINER_ID=$(podman run -d \
      --name memoriae-redis \
      -p $REDIS_PORT:6379 \
      redis:latest \
      2>&1) || {
      echo -e "${RED}Error: Failed to start Redis container${NC}"
      echo "$REDIS_CONTAINER_ID"
      exit 1
    }
    
    # Wait for Redis to be ready
    echo -e "${YELLOW}Waiting for Redis to be ready...${NC}"
    for i in {1..10}; do
      if check_redis_connection; then
        echo -e "${GREEN}✓ Redis container started and ready${NC}"
        break
      fi
      if [ $i -eq 10 ]; then
        echo -e "${RED}Error: Redis failed to become ready after 10 seconds${NC}"
        podman logs "$REDIS_CONTAINER_ID"
        exit 1
      fi
      sleep 1
    done
  fi
fi
echo ""

# Create log files if they don't exist
touch "$SCRIPT_DIR/backend.log" "$SCRIPT_DIR/frontend.log"

echo -e "${GREEN}Starting services...${NC}"

# Start backend in background
echo -e "${YELLOW}Starting backend on port $BACKEND_PORT...${NC}"
cd "$BACKEND_DIR"
npm run dev > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Start frontend in background
echo -e "${YELLOW}Starting frontend on port $FRONTEND_PORT...${NC}"
cd "$FRONTEND_DIR"
npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait a moment for services to start
sleep 3

# Check if processes are still running
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
  echo -e "${RED}Backend process died! Check backend.log${NC}"
  tail -n 20 "$SCRIPT_DIR/backend.log"
  exit 1
fi

if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
  echo -e "${RED}Frontend process died! Check frontend.log${NC}"
  tail -n 20 "$SCRIPT_DIR/frontend.log"
  exit 1
fi

echo ""
echo -e "${GREEN}=== Services started successfully! ===${NC}"
echo -e "${GREEN}Backend: http://localhost:$BACKEND_PORT${NC}"
echo -e "${GREEN}Frontend: http://localhost:$FRONTEND_PORT${NC}"
echo ""
echo -e "${YELLOW}=== Live Logs (Ctrl+C to stop) ===${NC}"
echo ""

# Function to prefix lines with colored labels
prefix_backend() {
  local GREEN_CODE='\033[0;32m'
  local NC_CODE='\033[0m'
  while IFS= read -r line; do
    printf "${GREEN_CODE}[BACKEND]${NC_CODE} %s\n" "$line"
  done
}

prefix_frontend() {
  local YELLOW_CODE='\033[1;33m'
  local NC_CODE='\033[0m'
  while IFS= read -r line; do
    printf "${YELLOW_CODE}[FRONTEND]${NC_CODE} %s\n" "$line"
  done
}

# Start tailing both logs with color-coded labels
tail -f "$SCRIPT_DIR/backend.log" 2>/dev/null | prefix_backend &
TAIL_BACKEND_PID=$!
tail -f "$SCRIPT_DIR/frontend.log" 2>/dev/null | prefix_frontend &
TAIL_FRONTEND_PID=$!

# Wait for either tail process to exit (or user interrupt)
wait

