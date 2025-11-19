#!/bin/bash

# Root script for running operations across all packages
# Usage: ./scripts/for-all.sh [--tc] [--b] [--u] [--v] [--bu] [--bv] [--buv] or combinations

set -e

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# Packages to process
PACKAGES=("mother-theme" "backend" "frontend")

# Spinner characters - using Unicode box drawing for smooth animation
SPINNER=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
SPINNER_INDEX=0

# Status tracking: operation-package -> status (waiting, in-progress, complete, error)
declare -A STATUS_MAP
# Timing tracking: operation-package -> start timestamp
declare -A START_TIME
# Completion time tracking: operation-package -> completion timestamp
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
  
  # Display in execution order, not alphabetical
  # Order: type-check → build → unit-test → visual-test
  # Within each phase: mother-theme → backend → frontend (except visual-test skips backend)
  LAST_LINE_COUNT=0
  local current_time=$(get_time)
  
  # Helper function to render a single status line
  render_status_line() {
    local key=$1
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
  }
  
  # Type-check phase
  if [ "$DO_TYPE_CHECK" = true ]; then
    for package in "${PACKAGES[@]}"; do
      local key="type-check-${package}"
      if [ -n "${STATUS_MAP[$key]}" ]; then
        render_status_line "$key"
      fi
    done
  fi
  
  # Build phase
  if [ "$DO_BUILD" = true ]; then
    for package in "${PACKAGES[@]}"; do
      local key="build-${package}"
      if [ -n "${STATUS_MAP[$key]}" ]; then
        render_status_line "$key"
      fi
    done
  fi
  
  # Unit-test phase
  if [ "$DO_UNIT_TEST" = true ]; then
    for package in "${PACKAGES[@]}"; do
      local key="unit-test-${package}"
      if [ -n "${STATUS_MAP[$key]}" ]; then
        render_status_line "$key"
      fi
    done
  fi
  
  # Visual-test phase (skip backend)
  if [ "$DO_VISUAL_TEST" = true ]; then
    for package in "${PACKAGES[@]}"; do
      if [ "$package" = "backend" ]; then
        continue
      fi
      local key="visual-test-${package}"
      if [ -n "${STATUS_MAP[$key]}" ]; then
        render_status_line "$key"
      fi
    done
  fi
  
  SPINNER_INDEX=$(((SPINNER_INDEX + 1) % ${#SPINNER[@]}))
}

# Coverage storage: package -> coverage output file
declare -A COVERAGE_FILES
# Coverage summary storage
declare -A COVERAGE_SUMMARY

# Function to extract coverage summary from vitest output
extract_coverage_summary() {
  local package=$1
  local output_file=$2
  
  if [ ! -f "$output_file" ]; then
    return 1
  fi
  
  # Look for coverage table in vitest output
  # Vitest coverage output typically looks like:
  # % Coverage report from v8
  # File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
  # ----------|---------|---------|---------|---------|-------------------
  # All files |    XX.X |     XX.X |     XX.X |    XX.X |
  
  # Try to find coverage section - look for the header first
  local coverage_section=$(grep -A 100 "% Coverage report from v8" "$output_file" 2>/dev/null | head -30)
  
  # If not found, try looking for "All files" line directly (coverage might still be output even if header format differs)
  if [ -z "$coverage_section" ]; then
    # Look for "All files" line with pipe separators and percentage values
    local summary_line=$(grep -E "^All files[[:space:]]+\|" "$output_file" 2>/dev/null | head -1)
    if [ -n "$summary_line" ]; then
      coverage_section="$summary_line"
    fi
  fi
  
  if [ -z "$coverage_section" ]; then
    return 1
  fi
  
  # Extract the "All files" line which has the summary
  local summary_line=$(echo "$coverage_section" | grep -E "^All files[[:space:]]+\|" | head -1)
  
  if [ -z "$summary_line" ]; then
    return 1
  fi
  
  # Parse the summary line (format: "All files          |   79.62 |    77.34 |   82.15 |   79.62 |")
  # Extract percentages using awk - handle variable spacing
  local stmts=$(echo "$summary_line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}' | sed 's/%//' | tr -d ' ')
  local branch=$(echo "$summary_line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}' | sed 's/%//' | tr -d ' ')
  local funcs=$(echo "$summary_line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); print $4}' | sed 's/%//' | tr -d ' ')
  local lines=$(echo "$summary_line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $5); print $5}' | sed 's/%//' | tr -d ' ')
  
  # Validate that we got numeric values
  if [ -z "$stmts" ] || [ -z "$branch" ] || [ -z "$funcs" ] || [ -z "$lines" ]; then
    return 1
  fi
  
  # Store in associative array for later display
  COVERAGE_SUMMARY["${package}-stmts"]="$stmts"
  COVERAGE_SUMMARY["${package}-branch"]="$branch"
  COVERAGE_SUMMARY["${package}-funcs"]="$funcs"
  COVERAGE_SUMMARY["${package}-lines"]="$lines"
  
  return 0
}

# Function to display coverage summaries
display_coverage_summaries() {
  if [ ${#COVERAGE_SUMMARY[@]} -eq 0 ]; then
    return 0
  fi
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Code Coverage Summary"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "%-15s %10s %10s %10s %10s\n" "Package" "Statements" "Branches" "Functions" "Lines"
  echo "──────────────────────────────────────────────────────────────────────────────"
  
  for package in "${PACKAGES[@]}"; do
    local stmts="${COVERAGE_SUMMARY[${package}-stmts]:-N/A}"
    local branch="${COVERAGE_SUMMARY[${package}-branch]:-N/A}"
    local funcs="${COVERAGE_SUMMARY[${package}-funcs]:-N/A}"
    local lines="${COVERAGE_SUMMARY[${package}-lines]:-N/A}"
    
    if [ "$stmts" != "N/A" ]; then
      printf "%-15s %9s%% %9s%% %9s%% %9s%%\n" "$package" "$stmts" "$branch" "$funcs" "$lines"
    else
      printf "%-15s %10s %10s %10s %10s\n" "$package" "$stmts" "$branch" "$funcs" "$lines"
    fi
  done
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to run command silently with progress indicator
run_with_progress() {
  local package=$1
  local operation=$2
  local command=$3
  local package_dir="$PROJECT_ROOT/$package"
  local key="${operation}-${package}"
  local temp_file=$(mktemp)
  local exit_code_file=$(mktemp)
  
  # Mark as in-progress, record start time, and render
  STATUS_MAP["$key"]="in-progress"
  START_TIME["$key"]=$(get_time)
  render_statuses
  
  # Run command in background, redirect output to temp file
  (
    cd "$package_dir"
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
  if [ -n "${START_TIME[$key]}" ]; then
    if command -v awk >/dev/null 2>&1; then
      elapsed=$(awk "BEGIN {printf \"%.1f\", $end_time - ${START_TIME[$key]}}")
    else
      elapsed=$(echo "$end_time - ${START_TIME[$key]}" | bc -l 2>/dev/null || echo "0")
    fi
  fi
  
  if [ "$exit_code" -eq 0 ]; then
    STATUS_MAP["$key"]="complete"
    COMPLETE_TIME["$key"]=$(format_time "$elapsed")
    
    # Extract coverage if this is a unit-test operation
    if [ "$operation" = "unit-test" ]; then
      COVERAGE_FILES["$package"]="$temp_file"
      extract_coverage_summary "$package" "$temp_file" || true
    fi
    
    render_statuses
    
    # Only keep temp file if we need it for coverage extraction
    if [ "$operation" != "unit-test" ]; then
      rm -f "$temp_file"
    fi
  else
    STATUS_MAP["$key"]="error"
    render_statuses
    echo "Error output for ${key}:" >&2
    cat "$temp_file" >&2
    echo "" >&2
    rm -f "$temp_file"
  fi
  
  rm -f "$exit_code_file"
  return 0
}

# Function to run multiple packages in parallel
run_parallel() {
  local operation=$1
  local command=$2
  shift 2
  local packages=("$@")
  local pids=()
  local temp_files=()
  local exit_code_files=()
  local failed=false
  
  # Start all operations in parallel
  for package in "${packages[@]}"; do
    local package_dir="$PROJECT_ROOT/$package"
    local key="${operation}-${package}"
    local temp_file=$(mktemp)
    local exit_code_file=$(mktemp)
    
    temp_files+=("$temp_file")
    exit_code_files+=("$exit_code_file")
    
    # Mark as in-progress and record start time
    STATUS_MAP["$key"]="in-progress"
    START_TIME["$key"]=$(get_time)
    
    # Run command in background
    (
      cd "$package_dir"
      if eval "$command" > "$temp_file" 2>&1; then
        echo "0" > "$exit_code_file"
      else
        echo "$?" > "$exit_code_file"
      fi
    ) &
    pids+=($!)
  done
  
  # Initial render after marking all as in-progress
  render_statuses
  
  # Update display while running
  while true; do
    local all_done=true
    for pid in "${pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        all_done=false
        break
      fi
    done
    
    if [ "$all_done" = true ]; then
      break
    fi
    
    sleep 0.2
    render_statuses
  done
  
  # Wait for all processes and check results
  local i=0
  for pid in "${pids[@]}"; do
    wait "$pid" || true
    local exit_code=$(cat "${exit_code_files[$i]}")
    local package="${packages[$i]}"
    local key="${operation}-${package}"
    
    local end_time=$(get_time)
    local elapsed=0
    if [ -n "${START_TIME[$key]}" ]; then
      if command -v awk >/dev/null 2>&1; then
        elapsed=$(awk "BEGIN {printf \"%.1f\", $end_time - ${START_TIME[$key]}}")
      else
        elapsed=$(echo "$end_time - ${START_TIME[$key]}" | bc -l 2>/dev/null || echo "0")
      fi
    fi
    
    if [ "$exit_code" -eq 0 ]; then
      STATUS_MAP["$key"]="complete"
      COMPLETE_TIME["$key"]=$(format_time "$elapsed")
    else
      STATUS_MAP["$key"]="error"
      failed=true
      echo "Error output for ${key}:" >&2
      cat "${temp_files[$i]}" >&2
      echo "" >&2
    fi
    
    # Extract coverage if this is a unit-test operation (even if tests failed, coverage may still be available)
    if [ "$operation" = "unit-test" ]; then
      COVERAGE_FILES["$package"]="${temp_files[$i]}"
      extract_coverage_summary "$package" "${temp_files[$i]}" || true
    fi
    
    i=$((i + 1))
  done
  
  render_statuses
  
  # Cleanup temp files (but keep coverage files for unit-test operations)
  local i=0
  for temp_file in "${temp_files[@]}"; do
    local package="${packages[$i]}"
    if [ "$operation" != "unit-test" ] || [ -z "${COVERAGE_FILES[$package]}" ] || [ "${COVERAGE_FILES[$package]}" != "$temp_file" ]; then
      rm -f "$temp_file"
    fi
    i=$((i + 1))
  done
  for exit_code_file in "${exit_code_files[@]}"; do
    rm -f "$exit_code_file"
  done
  
  if [ "$failed" = true ]; then
    return 1
  fi
  return 0
}

# Initialize status map for all operations
if [ "$DO_TYPE_CHECK" = true ]; then
  for package in "${PACKAGES[@]}"; do
    STATUS_MAP["type-check-${package}"]="waiting"
  done
fi

if [ "$DO_BUILD" = true ]; then
  for package in "${PACKAGES[@]}"; do
    STATUS_MAP["build-${package}"]="waiting"
  done
fi

if [ "$DO_UNIT_TEST" = true ]; then
  for package in "${PACKAGES[@]}"; do
    STATUS_MAP["unit-test-${package}"]="waiting"
  done
fi

if [ "$DO_VISUAL_TEST" = true ]; then
  for package in "${PACKAGES[@]}"; do
    if [ "$package" != "backend" ]; then
      STATUS_MAP["visual-test-${package}"]="waiting"
    fi
  done
fi

# Initial render
if [ ${#STATUS_MAP[@]} -gt 0 ]; then
  render_statuses
fi

# Execute operations in order: type-check → build → unit-test → visual-test

# Type-check phase
# mother-theme and backend can type-check in parallel (no dependencies)
# frontend depends on both, so it must wait
if [ "$DO_TYPE_CHECK" = true ]; then
  # Run mother-theme and backend in parallel
  if ! run_parallel "type-check" "npm run type-check" "mother-theme" "backend"; then
    exit 1
  fi
  
  # Then run frontend (depends on both mother-theme and backend)
  if ! run_with_progress "frontend" "type-check" "npm run type-check"; then
    exit 1
  fi
fi

# Build phase
# mother-theme and backend can build in parallel (no dependencies)
# frontend depends on both, so it must wait
if [ "$DO_BUILD" = true ]; then
  # Run mother-theme and backend in parallel
  if ! run_parallel "build" "npm run build" "mother-theme" "backend"; then
    exit 1
  fi
  
  # Then run frontend (depends on both mother-theme and backend)
  if ! run_with_progress "frontend" "build" "npm run build"; then
    exit 1
  fi
fi

# Unit-test phase
# All packages can unit-test in parallel (frontend uses @mother alias to source, not built package)
if [ "$DO_UNIT_TEST" = true ]; then
  test_failed=false
  if ! run_parallel "unit-test" "npm run test:coverage" "mother-theme" "backend" "frontend"; then
    test_failed=true
  fi
  
  # Display coverage summaries after all unit tests complete (even if some failed)
  display_coverage_summaries
  
  # Cleanup coverage temp files
  for package in "${PACKAGES[@]}"; do
    if [ -n "${COVERAGE_FILES[$package]}" ]; then
      rm -f "${COVERAGE_FILES[$package]}"
    fi
  done
  
  # Exit with error if tests failed
  if [ "$test_failed" = true ]; then
    exit 1
  fi
fi

# Visual-test phase (skip backend)
# mother-theme and frontend can visual-test in parallel (backend skipped)
if [ "$DO_VISUAL_TEST" = true ]; then
  if ! run_parallel "visual-test" "npm run test:visual" "mother-theme" "frontend"; then
    exit 1
  fi
fi

echo "All operations completed successfully!"
