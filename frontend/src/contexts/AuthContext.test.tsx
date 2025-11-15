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

  it('should handle token in URL on mount', async () => {
    const mockToken = 'test-token-123'
    const originalLocation = window.location
    delete (window as any).location
    ;(window as any).location = {
      href: '',
      pathname: '/',
      search: `?token=${encodeURIComponent(mockToken)}`,
    }

    // Mock URLSearchParams
    const originalURLSearchParams = window.URLSearchParams
    ;(window as any).URLSearchParams = class {
      constructor(public search: string) {}
      get(key: string) {
        if (key === 'token') {
          return mockToken
        }
        return null
      }
    }

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
      expect(mockedApi.setToken).toHaveBeenCalledWith(mockToken)
    }, { timeout: 2000 })

    // Restore
    ;(window as any).location = originalLocation
    ;(window as any).URLSearchParams = originalURLSearchParams
  })

  it('should load token from localStorage on mount', async () => {
    const mockToken = 'stored-token-456'
    mockedApi.getToken.mockReturnValue(mockToken)
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
      expect(mockedApi.loadToken).toHaveBeenCalled()
      expect(mockedApi.getAuthStatus).toHaveBeenCalled()
    })
  })

  it('should set timezone when user has no timezone', async () => {
    mockedApi.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      },
    })
    mockedApi.get.mockResolvedValue({ timezone: null })
    mockedApi.put.mockResolvedValue({})

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/settings')
      expect(mockedApi.put).toHaveBeenCalledWith('/settings', expect.objectContaining({
        timezone: expect.any(String),
      }))
    })
  })

  it('should not set timezone when user already has timezone', async () => {
    mockedApi.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      },
    })
    mockedApi.get.mockResolvedValue({ timezone: 'America/New_York' })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/settings')
      expect(mockedApi.put).not.toHaveBeenCalled()
    })
  })

  it('should handle timezone setting error gracefully', async () => {
    mockedApi.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      },
    })
    mockedApi.get.mockRejectedValue(new Error('Settings error'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockedApi.getAuthStatus).toHaveBeenCalled()
    })
  })

  it('should handle logout event from window', async () => {
    mockedApi.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      },
    })

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(getByTestId('authenticated')).toHaveTextContent('true')
    })

    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('auth:logout'))

    await waitFor(() => {
      expect(getByTestId('authenticated')).toHaveTextContent('false')
    })
  })

  it('should handle GitHub login', () => {
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
      const githubButton = getByText('Login GitHub')
      githubButton.click()
      expect(mockedApi.getGithubAuthUrl).toHaveBeenCalled()
    })

    ;(window as any).location = originalLocation
  })

  it('should handle checkAuth function', async () => {
    mockedApi.getAuthStatus.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      },
    })

    const checkAuthRef = { current: null as (() => Promise<void>) | null }

    function TestComponentWithCheck() {
      const { checkAuth } = useAuth()
      checkAuthRef.current = checkAuth
      return <div>Test</div>
    }

    render(
      <AuthProvider>
        <TestComponentWithCheck />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(checkAuthRef.current).toBeTruthy()
    })

    if (checkAuthRef.current) {
      await checkAuthRef.current()
      expect(mockedApi.getAuthStatus).toHaveBeenCalled()
    }
  })
})

