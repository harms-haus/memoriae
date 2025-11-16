<!-- 0fb6f32a-8527-41ef-aaba-78d20422365a 90f235e3-4f6e-4390-a6e9-cd2c39038600 -->
# Create Unified Script System for All Packages

## Overview

Create a unified script system that allows running type-check, build, unit-tests, and visual-tests with flexible flag combinations across all packages.

## Implementation Plan

### 1. Root Package Scripts (`package.json`)

- Add `"a": "./scripts/for-all.sh"` script that runs for all packages
- Script will parse flags and execute operations in order: type-check/build → unit-test → visual-test

### 2. Individual Package Scripts

- **Backend** (`backend/package.json`): Add `"my": "./scripts/for-me.sh"`
- **Frontend** (`frontend/package.json`): Add `"my": "./scripts/for-me.sh"`  
- **Mother-theme** (`mother-theme/package.json`): Add `"my": "./scripts/for-me.sh"`

### 3. Add Missing Scripts to Package.json Files

#### Backend (`backend/package.json`)

- Add `"type-check": "tsc --noEmit"` (no visual tests for backend)

#### Frontend (`frontend/package.json`)

- Add `"type-check": "tsc --noEmit"` (visual tests already exist)

#### Mother-theme (`mother-theme/package.json`)

- Add `"type-check": "tsc --noEmit"`
- Add `"test:visual": "playwright test --config=playwright-ct.config.ts"` (similar to frontend)

### 4. Create Shell Scripts

#### Root: `./scripts/for-all.sh`

- Parse flags: `--tc`, `--b`, `--u`, `--v`, `--bu`, `--bv`, `--buv`, or combinations
- Execute operations sequentially (one after another, not in parallel)
- Run each operation silently in background worker
- Display real-time progress with status indicators:
- `:green:` for completed successfully
- `:orange:` for in-progress (with animated spinner: `/`, `-`, `\`, `|`)
- `:gray:` for waiting
- Copy error output to main thread when operations fail
- Execute in order:

1. Type-check all packages (if `--tc` present)
2. Build all packages (if `--b` present)
3. Unit-test all packages (if `--u` present)
4. Visual-test all packages except backend (if `--v` present)

- Handle predefined combinations (`--bu`, `--bv`, `--buv`) by expanding to individual flags

#### Individual Packages: `./backend/scripts/for-me.sh`, `./frontend/scripts/for-me.sh`, `./mother-theme/scripts/for-me.sh`

- Parse same flags as root script
- Execute operations sequentially (one after another, not in parallel)
- Run each operation silently in background worker
- Display real-time progress with status indicators (same as root script)
- Copy error output to main thread when operations fail
- Execute operations for current package only
- Each script detects its package directory and runs appropriate commands

### 5. Flag Parsing Logic

- Support individual flags: `--tc`, `--b`, `--u`, `--v`
- Support predefined combinations: `--bu`, `--bv`, `--buv`
- Support arbitrary combinations: `--tc --u --v`, `--tc --b --u`, etc.
- Predefined combinations expand to individual flags before execution
- Execute operations in fixed order: type-check → build → unit-test → visual-test

### 6. Script Structure

- All scripts should:
- Be executable (`chmod +x`)
- Handle errors properly (exit on failure)
- Support both individual and combined flags
- Print clear output for each operation
- Work from any directory (use absolute paths or detect package root)

## Files to Create/Modify

- [ ] `package.json` - Add `"a"` script
- [ ] `backend/package.json` - Add `"my"` script, `"type-check"` script
- [ ] `frontend/package.json` - Add `"my"` script, `"type-check"` script
- [ ] `mother-theme/package.json` - Add `"my"` script, `"type-check"` script, `"test:visual"` script
- [ ] `scripts/for-all.sh` - Root script (NEW)
- [ ] `backend/scripts/for-me.sh` - Backend script (NEW)
- [ ] `frontend/scripts/for-me.sh` - Frontend script (NEW)
- [ ] `mother-theme/scripts/for-me.sh` - Mother-theme script (NEW)

## Testing Examples

- `npm run a --buv` - Build all, unit-test all, visual-test all
- `cd backend; npm run my --bu` - Build backend, unit-test backend
- `cd frontend; npm run my --v` - Visual-test frontend
- `cd mother-theme; npm run my --tc --u --v` - Type-check, unit-test, visual-test mother-theme
- `./scripts/for-all.sh --bu` - Direct script call
- `./backend/scripts/for-me.sh --tc --u` - Direct script call