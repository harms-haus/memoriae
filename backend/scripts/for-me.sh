#!/bin/bash

# Backend package script for running operations
# Usage: ./backend/scripts/for-me.sh [--tc] [--b] [--u] [--v] [--bu] [--bv] [--buv] or combinations

set -e

# Get the script directory and package root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGE_NAME="backend"

# Parse flags
DO_TYPE_CHECK=false
DO_BUILD=false
DO_UNIT_TEST=false
DO_VISUAL_TEST=false

# Expand predefined combinations first
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --bu)
      ARGS+=(--b --u)
      ;;
    --bv)
      ARGS+=(--b --v)
      ;;
    --buv)
      ARGS+=(--b --u --v)
      ;;
    *)
      ARGS+=("$arg")
      ;;
  esac
done

# Parse individual flags
for arg in "${ARGS[@]}"; do
  case "$arg" in
    --tc)
      DO_TYPE_CHECK=true
      ;;
    --b)
      DO_BUILD=true
      ;;
    --u)
      DO_UNIT_TEST=true
      ;;
    --v)
      DO_VISUAL_TEST=true
      ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 1
      ;;
  esac
done

# If no flags provided, show usage
if [ "$DO_TYPE_CHECK" = false ] && [ "$DO_BUILD" = false ] && [ "$DO_UNIT_TEST" = false ] && [ "$DO_VISUAL_TEST" = false ]; then
  echo "Usage: $0 [--tc] [--b] [--u] [--v] [--bu] [--bv] [--buv] or combinations" >&2
  exit 1
fi

# Note: Backend doesn't have visual tests, so skip if --v is requested
if [ "$DO_VISUAL_TEST" = true ]; then
  echo "Warning: Backend package does not support visual tests. Skipping --v flag." >&2
  DO_VISUAL_TEST=false
fi

# Spinner characters - using Unicode box drawing for smooth animation
SPINNER=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
SPINNER_INDEX=0

# Status tracking: operation -> status (waiting, in-progress, complete, error)
declare -A STATUS_MAP
# Timing tracking: operation -> start timestamp
declare -A START_TIME
# Completion time tracking: operation -> completion timestamp
declare -A COMPLETE_TIME
LAST_LINE_COUNT=0

# Function to format time duration
format_time() {
  local seconds=$1
  # Use awk for floating point arithmetic if available, otherwise use bash arithmetic
  if command -v awk >/dev/null 2>&1; then
    local mins=$(awk "BEGIN {printf \"%.0f\", $seconds / 60}")
    local secs=$(awk "BEGIN {printf \"%.1f\", $seconds % 60}")
    if [ "$mins" -gt 0 ]; then
      printf "%dm %.1fs" "$mins" "$secs"
    else
      printf "%.1fs" "$seconds"
    fi
  else
    # Fallback: simple formatting (assumes seconds < 60)
    printf "%.1fs" "$seconds"
  fi
}

# Function to get current time in seconds (with decimals)
get_time() {
  date +%s.%N 2>/dev/null || date +%s
}

# Function to render all statuses
render_statuses() {
  # Clear previous lines (move cursor up and clear each line)
  if [ $LAST_LINE_COUNT -gt 0 ]; then
    for ((i=0; i<LAST_LINE_COUNT; i++)); do
      printf "\033[1A\033[K"
    done
  fi
  
  # Sort keys for consistent display order
  IFS=$'\n' sorted_keys=($(sort <<<"${!STATUS_MAP[*]}"))
  unset IFS
  
  # Count and render all statuses
  LAST_LINE_COUNT=0
  local current_time=$(get_time)
  
  for key in "${sorted_keys[@]}"; do
    local status="${STATUS_MAP[$key]}"
    local spinner_char=${SPINNER[$SPINNER_INDEX]}
    local indicator=""
    local status_text=""
    local time_text=""
    local color=""
    
    case "$status" in
      waiting)
        indicator="  "
        status_text="waiting"
        time_text=""
        color="\033[90m"
        ;;
      in-progress)
        indicator="$spinner_char "
        status_text="in progress"
        if [ -n "${START_TIME[$key]}" ]; then
          local elapsed=0
          if command -v awk >/dev/null 2>&1; then
            elapsed=$(awk "BEGIN {printf \"%.1f\", $current_time - ${START_TIME[$key]}}")
          else
            elapsed=$(echo "$current_time - ${START_TIME[$key]}" | bc -l 2>/dev/null || echo "0")
          fi
          time_text=$(format_time "$elapsed")
        else
          time_text="0.0s"
        fi
        color="\033[33m"
        ;;
      complete)
        indicator="✓ "
        status_text="complete"
        if [ -n "${COMPLETE_TIME[$key]}" ]; then
          time_text="${COMPLETE_TIME[$key]}"
        elif [ -n "${START_TIME[$key]}" ]; then
          local elapsed=0
          if command -v awk >/dev/null 2>&1; then
            elapsed=$(awk "BEGIN {printf \"%.1f\", $current_time - ${START_TIME[$key]}}")
          else
            elapsed=$(echo "$current_time - ${START_TIME[$key]}" | bc -l 2>/dev/null || echo "0")
          fi
          time_text=$(format_time "$elapsed")
        else
          time_text="0.0s"
        fi
        color="\033[32m"
        ;;
      error)
        indicator="✗ "
        status_text="failed"
        if [ -n "${START_TIME[$key]}" ]; then
          local elapsed=0
          if command -v awk >/dev/null 2>&1; then
            elapsed=$(awk "BEGIN {printf \"%.1f\", $current_time - ${START_TIME[$key]}}")
          else
            elapsed=$(echo "$current_time - ${START_TIME[$key]}" | bc -l 2>/dev/null || echo "0")
          fi
          time_text=$(format_time "$elapsed")
        else
          time_text="0.0s"
        fi
        color="\033[31m"
        ;;
    esac
    
    # Format: indicator (2) | script-name (30) | status (15) | time (10, right-aligned)
    printf "${color}%s\033[0m %-30s %-15s %10s\n" "$indicator" "$key" "$status_text" "$time_text"
    LAST_LINE_COUNT=$((LAST_LINE_COUNT + 1))
  done
  
  SPINNER_INDEX=$(((SPINNER_INDEX + 1) % ${#SPINNER[@]}))
}

# Function to run command silently with progress indicator
run_with_progress() {
  local operation=$1
  local command=$2
  local temp_file=$(mktemp)
  local exit_code_file=$(mktemp)
  
  # Mark as in-progress, record start time, and render
  STATUS_MAP["$operation"]="in-progress"
  START_TIME["$operation"]=$(get_time)
  render_statuses
  
  # Run command in background, redirect output to temp file
  (
    cd "$PACKAGE_ROOT"
    if eval "$command" > "$temp_file" 2>&1; then
      echo "0" > "$exit_code_file"
    else
      echo "$?" > "$exit_code_file"
    fi
  ) &
  local bg_pid=$!
  
  # Show spinner while running - update display periodically
  while kill -0 "$bg_pid" 2>/dev/null; do
    sleep 0.2
    render_statuses
  done
  
  # Wait for background process to fully complete
  wait "$bg_pid" || true
  local exit_code=$(cat "$exit_code_file")
  
  # Update status, calculate completion time, and render final state
  local end_time=$(get_time)
  local elapsed=0
  if [ -n "${START_TIME[$operation]}" ]; then
    if command -v awk >/dev/null 2>&1; then
      elapsed=$(awk "BEGIN {printf \"%.1f\", $end_time - ${START_TIME[$operation]}}")
    else
      elapsed=$(echo "$end_time - ${START_TIME[$operation]}" | bc -l 2>/dev/null || echo "0")
    fi
  fi
  
  if [ "$exit_code" -eq 0 ]; then
    STATUS_MAP["$operation"]="complete"
    COMPLETE_TIME["$operation"]=$(format_time "$elapsed")
    render_statuses
  else
    STATUS_MAP["$operation"]="error"
    render_statuses
    echo "Error output for ${operation}:" >&2
    cat "$temp_file" >&2
    echo "" >&2
    rm -f "$temp_file" "$exit_code_file"
    return 1
  fi
  
  rm -f "$temp_file" "$exit_code_file"
  return 0
}

# Initialize status map for all operations
if [ "$DO_TYPE_CHECK" = true ]; then
  STATUS_MAP["type-check"]="waiting"
fi

if [ "$DO_BUILD" = true ]; then
  STATUS_MAP["build"]="waiting"
fi

if [ "$DO_UNIT_TEST" = true ]; then
  STATUS_MAP["unit-test"]="waiting"
fi

if [ "$DO_VISUAL_TEST" = true ]; then
  STATUS_MAP["visual-test"]="waiting"
fi

# Initial render
if [ ${#STATUS_MAP[@]} -gt 0 ]; then
  render_statuses
fi

# Execute operations in order: type-check → build → unit-test → visual-test

# Type-check phase
if [ "$DO_TYPE_CHECK" = true ]; then
  if ! run_with_progress "type-check" "npm run type-check"; then
    exit 1
  fi
fi

# Build phase
if [ "$DO_BUILD" = true ]; then
  if ! run_with_progress "build" "npm run build"; then
    exit 1
  fi
fi

# Unit-test phase
if [ "$DO_UNIT_TEST" = true ]; then
  if ! run_with_progress "unit-test" "npm test"; then
    exit 1
  fi
fi

# Visual-test phase (skipped for backend)
if [ "$DO_VISUAL_TEST" = true ]; then
  echo "Visual tests are not supported for backend package." >&2
fi

echo "All operations completed successfully!"
