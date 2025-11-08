// AuthContext tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { api } from '../services/api'

// Mock the API
vi.mock('../services/api', () => {
  const mockApi = {
    getAuthStatus: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    getGoogleAuthUrl: vi.fn((redirect) => `http://test.com/auth/google?redirect=${redirect}`),
    getGithubAuthUrl: vi.fn((redirect) => `http://test.com/auth/github?redirect=${redirect}`),
    setToken: vi.fn(),
    loadToken: vi.fn(),
    getToken: vi.fn().mockReturnValue(null),
    get: vi.fn().mockResolvedValue({ timezone: null }), // Mock for settings endpoint
    put: vi.fn().mockResolvedValue({}), // Mock for settings update
  }
  return {
    api: mockApi,
  }
})

const mockedApi = api as any

// Test component that uses auth
function TestComponent() {
  const { user, authenticated, loading, error, login, logout } = useAuth()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <div data-testid="authenticated">{authenticated ? 'true' : 'false'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <button onClick={() => login('google')}>Login Google</button>
      <button onClick={() => login('github')}>Login GitHub</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window location
    delete (window as any).location
    ;(window as any).location = { href: '', pathname: '/', search: '' }
    // Clear URL params
    delete (window as any).URLSearchParams
    ;(window as any).URLSearchParams = class {
      constructor(public search: string) {}
      get(key: string) {
        return key === 'token' ? null : null
      }
    }
  })

  it('should provide default unauthenticated state', async () => {
    mockedApi.getAuthStatus.mockResolvedValue({
      authenticated: false,
      user: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('user-email')).toHaveTextContent('none')
    })
  })

  it('should update state on successful authentication', async () => {
    mockedApi.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })
  })

  it('should redirect to OAuth provider on login', () => {
    const originalLocation = window.location
    delete (window as any).location
    ;(window as any).location = { href: '' }

    mockedApi.getAuthStatus.mockResolvedValue({
      authenticated: false,
      user: null,
    })

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    waitFor(() => {
      const googleButton = getByText('Login Google')
      googleButton.click()
      expect(mockedApi.getGoogleAuthUrl).toHaveBeenCalled()
    })

    // Restore original location
    ;(window as any).location = originalLocation
  })

  it('should clear state on logout', async () => {
    mockedApi.getAuthStatus
      .mockResolvedValueOnce({
        authenticated: true,
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google',
        },
      })
      .mockResolvedValueOnce({
        authenticated: false,
        user: null,
      })

    const { getByText, getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(getByTestId('authenticated')).toHaveTextContent('true')
    })

    const logoutButton = getByText('Logout')
    logoutButton.click()

    await waitFor(() => {
      expect(mockedApi.logout).toHaveBeenCalled()
    })
  })

  it('should handle errors gracefully', async () => {
    mockedApi.getAuthStatus.mockRejectedValue(new Error('Network error'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for loading to complete and check error is handled
    await waitFor(() => {
      expect(mockedApi.getAuthStatus).toHaveBeenCalled()
    }, { timeout: 2000 })
  })
})

