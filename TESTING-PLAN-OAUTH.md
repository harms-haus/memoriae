# OAuth Testing Plan

## Overview
Comprehensive test suite for OAuth authentication implementation covering backend services, middleware, routes, and frontend components.

## Test Categories

### 1. Backend Auth Service Tests
**File**: `backend/src/services/auth.test.ts`

#### Test Cases:
- ✅ `findOrCreateUser()` - Create new user when none exists
- ✅ `findOrCreateUser()` - Return existing user by provider+provider_id
- ✅ `findOrCreateUser()` - Update user info when email/name changes
- ✅ `findOrCreateUser()` - Link account when same email with different provider
- ✅ `generateToken()` - Generate valid JWT token with correct payload
- ✅ `generateToken()` - Token includes all required user fields
- ✅ `getUserById()` - Return user when exists
- ✅ `getUserById()` - Return null when user doesn't exist

### 2. Backend Auth Middleware Tests
**File**: `backend/src/middleware/auth.test.ts`

#### Test Cases:
- ✅ `authenticate()` - Allow request with valid token
- ✅ `authenticate()` - Reject request with missing token
- ✅ `authenticate()` - Reject request with invalid token
- ✅ `authenticate()` - Reject request with expired token
- ✅ `authenticate()` - Set req.user with correct payload
- ✅ `optionalAuth()` - Allow request with valid token
- ✅ `optionalAuth()` - Allow request without token (doesn't fail)
- ✅ `optionalAuth()` - Set req.user when token valid
- ✅ `optionalAuth()` - Don't set req.user when token invalid (silent)

### 3. Backend Auth Routes Tests
**File**: `backend/src/routes/auth.test.ts`

#### Test Cases:
- ✅ `GET /api/auth/status` - Return user info with valid token
- ✅ `GET /api/auth/status` - Return 401 without token
- ✅ `GET /api/auth/google` - Redirect to Google OAuth
- ✅ `GET /api/auth/google` - Include state parameter with redirect
- ✅ `GET /api/auth/google/callback` - Handle successful OAuth callback
- ✅ `GET /api/auth/google/callback` - Handle OAuth error (no code)
- ✅ `GET /api/auth/google/callback` - Exchange code for token
- ✅ `GET /api/auth/google/callback` - Fetch user profile from Google
- ✅ `GET /api/auth/google/callback` - Create user if doesn't exist
- ✅ `GET /api/auth/google/callback` - Redirect to frontend with token
- ✅ `GET /api/auth/github` - Redirect to GitHub OAuth
- ✅ `GET /api/auth/github/callback` - Handle successful OAuth callback
- ✅ `GET /api/auth/github/callback` - Fetch user profile from GitHub
- ✅ `GET /api/auth/github/callback` - Handle missing email (use API endpoint)
- ✅ `POST /api/auth/logout` - Return success with valid token
- ✅ `POST /api/auth/logout` - Return 401 without token

### 4. Frontend API Client Tests
**File**: `frontend/src/services/api.test.ts`

#### Test Cases:
- ✅ Token Management
  - `setToken()` - Store token in localStorage
  - `getToken()` - Retrieve stored token
  - `clearToken()` - Remove token from localStorage
  - `loadToken()` - Load token from localStorage on init
  - Handle missing localStorage gracefully
- ✅ Auth Methods
  - `getAuthStatus()` - Return auth status when authenticated
  - `getAuthStatus()` - Return unauthenticated on 401
  - `getAuthStatus()` - Handle network errors
  - `logout()` - Clear token and call endpoint
  - `getGoogleAuthUrl()` - Generate correct URL with redirect
  - `getGithubAuthUrl()` - Generate correct URL with redirect
- ✅ Request Interceptors
  - Automatically add Bearer token to requests
  - Handle 401 responses and dispatch logout event
- ✅ Generic Methods
  - `get()`, `post()`, `put()`, `delete()` - Forward to axios with auth

### 5. Frontend AuthContext Tests
**File**: `frontend/src/contexts/AuthContext.test.tsx`

#### Test Cases:
- ✅ Context Provider
  - Provide default unauthenticated state
  - Load token from URL on mount
  - Load token from localStorage on mount
  - Check auth status on mount
- ✅ Authentication Flow
  - `login()` - Redirect to OAuth provider
  - `logout()` - Clear token and update state
  - `checkAuth()` - Fetch and update auth status
- ✅ State Management
  - Update user state on successful auth
  - Clear user state on logout
  - Handle loading states
  - Handle error states
- ✅ Event Listeners
  - Listen for auth:logout events
  - Clean up event listeners

### 6. Integration Tests
**File**: `backend/src/routes/auth.integration.test.ts`

#### Test Cases:
- ✅ Full OAuth Flow
  - Google OAuth end-to-end flow
  - GitHub OAuth end-to-end flow
  - Token persistence and reuse
- ✅ Error Scenarios
  - Invalid OAuth code
  - Network failures
  - Provider API errors

## Test Utilities

### Backend Test Helpers:
- Mock database connection
- Mock OAuth provider APIs
- Generate test JWT tokens
- Test user fixtures

### Frontend Test Helpers:
- Mock axios requests
- Mock localStorage
- Mock window.location
- Mock OAuth redirects

## Coverage Goals
- **Backend**: >90% coverage for auth modules
- **Frontend**: >85% coverage for auth modules
- All critical paths tested
- All error scenarios covered

## Execution Order
1. Backend service tests (unit)
2. Backend middleware tests (unit)
3. Backend routes tests (integration)
4. Frontend API client tests (unit)
5. Frontend context tests (component)
6. Full integration tests (e2e)

