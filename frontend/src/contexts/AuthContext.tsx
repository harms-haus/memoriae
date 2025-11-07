// Authentication context for managing auth state
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { getBrowserTimezone } from '../utils/timezone'
import type { User } from '../types'

interface UserSettings {
  openrouter_api_key: string | null
  openrouter_model: string | null
  openrouter_model_name: string | null
  timezone: string | null
}

interface AuthContextValue {
  user: User | null
  authenticated: boolean
  loading: boolean
  error: string | null
  login: (provider: 'google' | 'github', redirect?: string) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAuth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await api.getAuthStatus()
      setAuthenticated(status.authenticated)
      setUser(status.user)
      
      // If authenticated and user doesn't have timezone set, detect and set it
      if (status.authenticated && status.user) {
        try {
          const settings = await api.get<UserSettings>('/settings')
          if (!settings.timezone) {
            // User doesn't have timezone set, detect browser timezone and set it
            const browserTimezone = getBrowserTimezone()
            await api.put('/settings', { timezone: browserTimezone })
          }
        } catch (err) {
          // Silently fail - timezone detection is not critical
          console.warn('Failed to set timezone:', err)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication check failed')
      setAuthenticated(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback((provider: 'google' | 'github', redirect?: string) => {
    const url = provider === 'google' 
      ? api.getGoogleAuthUrl(redirect)
      : api.getGithubAuthUrl(redirect)
    window.location.href = url
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
      setAuthenticated(false)
      setUser(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed')
    }
  }, [])

  // Check for token in URL (OAuth callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    
    if (token) {
      api.setToken(token)
      // Remove token from URL
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]token=[^&]*/, '').replace(/^&/, '?')
      window.history.replaceState({}, '', newUrl)
      // Check auth status
      checkAuth()
    } else {
      // Check if we have a stored token
      api.loadToken()
      checkAuth()
    }
  }, [checkAuth])

  // Listen for logout events
  useEffect(() => {
    const handleLogout = () => {
      setAuthenticated(false)
      setUser(null)
    }

    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  const value: AuthContextValue = {
    user,
    authenticated,
    loading,
    error,
    login,
    logout,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

