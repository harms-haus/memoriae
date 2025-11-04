# Git Hooks Documentation

## Overview

The project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks. The pre-commit hook is configured to automatically run tests only for modules that have changed files.

## How It Works

### Pre-commit Hook

The pre-commit hook (`.husky/pre-commit`) automatically:

1. **Detects staged files** - Checks which files are staged for commit
2. **Identifies affected modules** - Determines which modules (mother-theme, frontend, backend) have changes
3. **Runs selective tests** - Only runs type-check and tests for modules with changes
4. **Blocks commit on failure** - Prevents commit if any tests fail

### Module Detection

The hook identifies modules based on file paths:

- `mother-theme/*` → Runs mother-theme tests
- `frontend/*` → Runs frontend tests  
- `backend/*` → Runs backend tests

### Type-Check Detection

Type-checks are **selectively run** based on file types:

**Type-checks run when:**
- `.ts`, `.tsx`, `.d.ts` files change
- `tsconfig.json` changes
- `package.json` changes (affects dependencies/types)
- `vite.config.ts` changes (frontend only)

**Type-checks skipped when:**
- Only `.css`, `.md`, `.json` (non-tsconfig), `.html` files change
- Only test files change (unless they're TypeScript)

### What Gets Tested

For each affected module:

1. **Type-check** (`npm run type-check`) - **Only if TypeScript files changed**
2. **Unit tests** (`npm test` or `npm run test:unit`) - Always runs if module changed

## Usage

### Automatic (Git Commit)

The hook runs automatically when you commit:

```bash
git add mother-theme/src/components/Tabs/Tabs.tsx
git commit -m "Update Tabs component"
# Only mother-theme tests will run
```

```bash
git add frontend/src/App.tsx backend/src/routes/auth.ts
git commit -m "Update frontend and backend"
# Both frontend and backend tests will run
```

### Manual Testing

You can manually test changed modules using the helper script:

```bash
# Test only changed modules
./scripts/test-changed.sh

# Force test all modules
./scripts/test-changed.sh --all

# Force test specific modules
./scripts/test-changed.sh --mother --frontend
```

### Skip Hooks (Emergency Only)

If you need to skip the hook (not recommended):

```bash
git commit --no-verify -m "Emergency commit"
```

⚠️ **Warning**: Only use `--no-verify` in emergencies. It bypasses all checks.

## Behavior Examples

### Example 1: Only Frontend Changes

```bash
git add frontend/src/components/SeedList.tsx
git commit -m "Update SeedList"
```

**Output:**
```
🧪 Testing frontend (files changed)
Running type-check...
Running unit tests...
✅ frontend tests passed
✅ All tests passed!
```

### Example 2: Multiple Modules

```bash
git add mother-theme/src/components/Dialog/Dialog.tsx frontend/src/App.tsx
git commit -m "Update Dialog and App"
```

**Output:**
```
🧪 Testing mother-theme (files changed)
✅ mother-theme tests passed

🧪 Testing frontend (files changed)
✅ frontend tests passed

✅ All tests passed!
```

### Example 3: Only CSS Files Changed

```bash
git add frontend/src/styles/theme.css
git commit -m "Update theme styles"
```

**Output:**
```
🧪 Testing frontend (files changed)
⏭️  Skipping type-check (no TypeScript files changed)
Running unit tests...
✅ frontend tests passed
```

### Example 4: No Testable Files

```bash
git add README.md .gitignore
git commit -m "Update docs"
```

**Output:**
```
⚠️  No testable files changed (staged files don't match known modules)
   Skipping tests.
```

### Example 5: Test Failure

```bash
git add frontend/src/components/Broken.tsx
git commit -m "Add broken component"
```

**Output:**
```
🧪 Testing frontend (files changed)
Running type-check...
❌ frontend tests failed

❌ Pre-commit hook failed: Tests failed
```

Commit is **blocked** until tests pass.

## Configuration

### Adding New Modules

To add a new module to the hook:

1. Edit `.husky/pre-commit`
2. Add detection logic:
   ```bash
   NEW_MODULE_CHANGED=false
   
   for file in $STAGED_FILES; do
     case "$file" in
       new-module/*)
         NEW_MODULE_CHANGED=true
         ;;
     esac
   done
   ```
3. Add test execution:
   ```bash
   if [ "$NEW_MODULE_CHANGED" = true ]; then
     cd new-module && npm test && cd ..
   fi
   ```

### Changing Test Commands

Edit the test commands in `.husky/pre-commit`:

```bash
# Current: runs type-check and test:unit
npm run type-check && npm run test:unit

# Alternative: run all tests
npm test

# Alternative: run with coverage
npm run test:coverage
```

## Troubleshooting

### Hook Not Running

1. **Check Husky installation:**
   ```bash
   npm run prepare
   ```

2. **Check hook permissions:**
   ```bash
   ls -la .husky/pre-commit
   # Should show executable permissions
   ```

3. **Reinstall Husky:**
   ```bash
   rm -rf .husky
   npm run prepare
   ```

### Tests Running for Wrong Module

- Check file paths match module structure
- Verify staged files: `git diff --cached --name-only`
- Check hook logic in `.husky/pre-commit`

### Slow Hook Execution

- Tests only run for changed modules (fast)
- Consider using `--no-verify` only if absolutely necessary
- Optimize test suites (parallel execution, faster setup)

### False Positives

If tests fail but code is correct:

1. **Check test output** - Review error messages
2. **Run tests manually** - `./scripts/test-changed.sh`
3. **Fix issues** - Don't bypass with `--no-verify`
4. **Update tests** - If behavior changed intentionally

## Best Practices

1. **Commit small changes** - Easier to identify what broke
2. **Run tests locally first** - Catch issues before committing
3. **Don't bypass hooks** - Use `--no-verify` only in emergencies
4. **Keep tests fast** - Optimize slow tests
5. **Update tests with code** - Keep tests in sync with code changes

## Related Scripts

- `scripts/test-changed.sh` - Manual test script for changed modules
- `mother-theme/TESTING.md` - Mother theme testing guide
- `frontend/package.json` - Frontend test scripts
- `backend/package.json` - Backend test scripts

