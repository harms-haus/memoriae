# Pre-commit Hook Timeout Fix - Testing Guide

## Problem Diagnosis
Your original pre-commit hook was timing out due to lack of timeout limits on long-running operations like `npm install` and test commands.

## Solutions Provided

### 1. Diagnostic Version (`.husky/pre-commit.debug`)
**Purpose**: Identify exactly where timeouts occur
**Features**:
- Detailed logging with timestamps
- Timeout limits: npm install (5 min), type-check (2 min), tests (3 min)
- Clear error messages showing which operation timed out
- Overall execution time tracking

**How to use for diagnosis**:
```bash
# Backup your current hook
cp .husky/pre-commit .husky/pre-commit.backup

# Temporarily use diagnostic version
cp .husky/pre-commit.debug .husky/pre-commit

# Test with a normal commit
git add .
git commit -m "test commit"

# Check the output - it will show exactly which operation timed out
```

### 2. Production Version (`.husky/pre-commit.fixed`)
**Purpose**: Production-ready hook with timeout protection
**Features**:
- Clean, maintainable code
- Built-in timeout protection
- Better error handling
- Same functionality as original but with timeouts

**How to use in production**:
```bash
# Use the fixed version
cp .husky/pre-commit.fixed .husky/pre-commit
```

## Expected Results

### Before Fix
- Hook hangs indefinitely
- No visibility into where it's stuck
- Requires manual process killing

### After Fix
- Operations timeout gracefully after set limits
- Clear error messages identify problematic operations
- Hook completes (either success or graceful failure)

## Most Likely Timeout Sources (Based on Code Analysis)

1. **`npm install`** - No timeout limit (most common cause)
   - Network issues downloading packages
   - Large dependency trees
   - Slow package registry responses

2. **Test execution** - No timeout limit
   - Integration tests hanging
   - Database connection issues
   - Infinite test loops

3. **Type checking** - No timeout limit
   - Large TypeScript projects
   - Complex type inference
   - Circular dependencies

## Timeout Values Explained

- **npm install: 300s (5 min)** - Accounts for slow networks, large packages
- **Type-check: 120s (2 min)** - Reasonable for most TypeScript projects
- **Tests: 180s (3 min)** - Should cover most test suites

## Quick Test Commands

```bash
# Test individual modules manually first
cd backend && npm install --dry-run
cd frontend && npm run test:unit -- --run
cd mother-theme && npm run type-check

# If individual modules work, test the hook
git add .
git commit -m "test: pre-commit hook timeout fix"

# Monitor with a timeout if needed (Linux/Mac)
timeout 300s git commit -m "test with overall timeout"
```

## Performance Optimization Recommendations

### Immediate Fixes (Implemented)
✅ Add timeout limits to all long-running operations
✅ Better npm configuration for CI environments
✅ Improved error handling and user feedback

### Long-term Optimizations

1. **Dependency Management**:
   ```bash
   # Use faster package managers
   npm install --prefer-offline  # Avoid network calls
   npm ci  # Faster, stricter install
   
   # Or consider pnpm/yarn for faster installs
   # pnpm install  # Typically 2-3x faster
   ```

2. **Test Optimization**:
   ```bash
   # Run only affected tests
   npm run test:unit -- --watch=false --bail
   
   # Parallel test execution
   npm run test:unit -- --parallel
   
   # Skip slow integration tests in pre-commit
   npm run test:unit -- --testPathPattern=unit
   ```

3. **Build Caching**:
   ```bash
   # Enable build cache
   npm run build -- --cache
   
   # Use Docker layer caching for CI
   ```

4. **Conditional Execution**:
   - Only run tests when relevant files change
   - Skip tests for documentation-only changes
   - Use fast TypeScript checking instead of full builds

## If Problems Persist

If the diagnostic version still shows timeouts:

1. **Check network connectivity**
2. **Verify npm registry access**
3. **Review test configuration** for infinite loops
4. **Consider running tests outside the hook**
5. **Use `git commit --no-verify` as temporary workaround**

## Rollback Plan

If issues occur:
```bash
# Restore original hook
cp .husky/pre-commit.backup .husky/pre-commit

# Or disable hook temporarily
chmod -x .husky/pre-commit
```

## Success Indicators

- ✅ Hook completes within reasonable time
- ✅ Clear timeout messages if operations take too long
- ✅ Tests run successfully when dependencies are available
- ✅ No hanging processes requiring manual intervention