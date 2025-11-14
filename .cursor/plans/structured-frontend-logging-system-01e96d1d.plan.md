<!-- 01e96d1d-432b-4fb9-8b86-0d0fde6b2ab7 db5e252a-a9ae-4631-b973-5ce2a4adbc33 -->
# Structured Frontend Logging System

## Overview

Create a structured logging utility that wraps console methods to preserve line numbers while providing consistent formatting, log levels, and filtering capabilities. Replace all existing console.log/error/warn calls throughout the frontend with the new logger.

## Implementation Plan

### 1. Create Logger Utility (`frontend/src/utils/logger.ts`)

Create a logger class that:

- Uses native console methods directly (to preserve line numbers)
- Supports log levels: DEBUG, INFO, WARN, ERROR, FATAL
- Provides structured format: `[LEVEL] [SCOPE] message` with optional context object
- Allows filtering by level via environment variable or localStorage
- Defaults to hiding DEBUG in production, showing all in development
- Provides convenience methods: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`, `logger.fatal()`
- Supports scoped loggers: `logger.scope('AuthContext')` returns a scoped logger instance

**Key features:**

- Format: `[LEVEL] [SCOPE] message` followed by optional context object
- Context object logged separately for better readability
- Line numbers preserved by calling console methods directly (not through wrapper functions)
- Filtering via `VITE_LOG_LEVEL` env var or `localStorage.getItem('logLevel')`
- DEBUG logs prefixed with `[DEBUG]` for easy filtering in browser console

### 2. Log Level Definitions

- **DEBUG**: Detailed diagnostic information (token values, API request details, state changes)
  - Format: `[DEBUG] [SCOPE] message`
  - Hidden by default in production, visible in development
  - Can be toggled via localStorage: `localStorage.setItem('logLevel', 'DEBUG')`

- **INFO**: General informational messages (user actions, successful operations)
  - Format: `[INFO] [SCOPE] message`
  - Always visible unless explicitly filtered

- **WARN**: Warning messages (non-critical errors, fallbacks, deprecated usage)
  - Format: `[WARN] [SCOPE] message`
  - Always visible unless explicitly filtered

- **ERROR**: Error messages (failed operations, API errors, caught exceptions)
  - Format: `[ERROR] [SCOPE] message`
  - Always visible, includes error object and context

- **FATAL**: Critical errors (unrecoverable failures, app-breaking issues)
  - Format: `[FATAL] [SCOPE] message`
  - Always visible, includes full error stack and context

### 3. Replace Existing Logging

Replace console calls throughout the codebase with structured logging:

**Files to update:**

- `frontend/src/services/api.ts` - API request/response logging
- `frontend/src/contexts/AuthContext.tsx` - Auth flow logging (convert verbose logs to DEBUG)
- `frontend/src/components/views/SeedDetailView.tsx` - Seed operations
- `frontend/src/components/views/TagDetailView.tsx` - Tag operations
- `frontend/src/components/views/CategoriesView.tsx` - Category operations
- `frontend/src/components/views/MusingsView.tsx` - Musings operations
- `frontend/src/components/SeedEditor/SeedEditor.tsx` - Editor operations
- `frontend/src/components/SeedComposer/SeedComposer.tsx` - Composer operations
- `frontend/src/components/FollowupsPanel/*.tsx` - Followup operations
- `frontend/src/components/MusingsView/*.tsx` - Musing operations
- `frontend/src/components/views/SettingsView.tsx` - Settings operations
- `frontend/src/services/notifications.ts` - Notification operations
- `frontend/src/hooks/useFollowupNotifications.ts` - Notification hook
- `frontend/src/main.tsx` - Service worker registration

**Replacement patterns:**

- `console.log()` → `logger.debug()` or `logger.info()` (based on verbosity)
- `console.error()` → `logger.error()` or `logger.fatal()` (based on severity)
- `console.warn()` → `logger.warn()`

**Context to include:**

- API calls: method, URL, status, response data (truncated if large)
- Errors: error message, stack (if available), relevant IDs (seedId, tagId, etc.)
- User actions: action type, target resource
- State changes: previous value → new value (for DEBUG only)

### 4. Logging Guidelines

**What to log:**

- **DEBUG**: Token operations, API request details, state transitions, polling operations
- **INFO**: Successful operations (seed created, tag added, settings saved), navigation events
- **WARN**: Non-critical failures (timezone detection failed, optional feature unavailable)
- **ERROR**: Failed API calls, caught exceptions, validation errors
- **FATAL**: Unrecoverable errors (auth failures, critical service unavailability)

**What NOT to log:**

- Sensitive data (full tokens, passwords) - only log truncated/hashed versions
- Excessive detail in production (use DEBUG level)
- Redundant information (don't log the same thing multiple times)

**Format examples:**

```typescript
// DEBUG - Detailed diagnostic
logger.debug('Token found in URL', { tokenLength: token.length, firstChars: token.substring(0, 20) })

// INFO - User action
logger.info('Seed created', { seedId, contentLength: content.length })

// WARN - Non-critical issue
logger.warn('Timezone detection failed', { error: err.message })

// ERROR - Failed operation
logger.error('Failed to load seed', { seedId, error: err.message, status: err.response?.status })

// FATAL - Critical failure
logger.fatal('Authentication failed', { error: err.message, stack: err.stack })
```

### 5. Testing Considerations

Update `frontend/src/test/setup.ts` to:

- Mock the logger utility instead of console methods
- Allow tests to verify logging behavior
- Suppress DEBUG logs in test output by default

### 6. Documentation

Add JSDoc comments to logger utility explaining:

- Log levels and when to use each
- How to filter logs (environment variable, localStorage)
- Best practices for structured logging
- Examples of good vs bad logging

## Files to Create/Modify

**New files:**

- `frontend/src/utils/logger.ts` - Logger utility

**Modified files:**

- All files with console.log/error/warn calls (58+ instances across ~30 files)
- `frontend/src/test/setup.ts` - Update test setup for logger mocking

## Implementation Order

1. Create logger utility with all features
2. Update test setup to mock logger
3. Replace logging in core services (api.ts, AuthContext.tsx)
4. Replace logging in view components
5. Replace logging in remaining components
6. Test logging in development and production modes
7. Verify line numbers are preserved in browser console

### To-dos

- [ ] Create logger utility in frontend/src/utils/logger.ts with DEBUG, INFO, WARN, ERROR, FATAL levels, scoped loggers, and filtering support
- [ ] Update frontend/src/test/setup.ts to mock logger utility instead of console methods
- [ ] Replace console calls in frontend/src/services/api.ts with structured logger (API requests, auth operations)
- [ ] Replace console calls in frontend/src/contexts/AuthContext.tsx with structured logger (convert verbose logs to DEBUG)
- [ ] Replace console calls in all view components (SeedDetailView, TagDetailView, CategoriesView, MusingsView, SettingsView, etc.) with structured logger
- [ ] Replace console calls in all component files (SeedEditor, SeedComposer, FollowupsPanel, MusingsView components, etc.) with structured logger
- [ ] Replace console calls in services and hooks (notifications.ts, useFollowupNotifications.ts, main.tsx) with structured logger
- [ ] Test logging in development and production modes, verify line numbers preserved, verify DEBUG filtering works