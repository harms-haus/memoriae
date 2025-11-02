// REST API client with authentication
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'
import type { AuthStatus } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Load token from localStorage on initialization
    this.loadToken()

    // Add request interceptor to include token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Add response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken()
          // Dispatch custom event for auth context to handle
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'))
          }
        }
        return Promise.reject(error)
      }
    )
  }

  setToken(token: string): void {
    this.token = token
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem('auth_token', token)
    }
  }

  getToken(): string | null {
    return this.token
  }

  clearToken(): void {
    this.token = null
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      localStorage.removeItem('auth_token')
    }
  }

  loadToken(): void {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      const stored = localStorage.getItem('auth_token')
      if (stored) {
        this.token = stored
      }
    }
  }

  // Auth endpoints
  async getAuthStatus(): Promise<AuthStatus> {
    try {
      const response = await this.client.get<AuthStatus>('/auth/status')
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return {
          authenticated: false,
          user: null,
        }
      }
      throw error
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout')
    } catch (error) {
      // Continue with logout even if request fails
      console.error('Logout error:', error)
    } finally {
      this.clearToken()
    }
  }

  // Helper to get OAuth URLs
  getGoogleAuthUrl(redirect?: string): string {
    const params = new URLSearchParams()
    if (redirect) {
      params.set('redirect', redirect)
    }
    // Use relative path to go through Vite proxy (better for development)
    // The proxy will forward to the backend which redirects to Google
    return `/api/auth/google?${params.toString()}`
  }

  getGithubAuthUrl(redirect?: string): string {
    const params = new URLSearchParams()
    if (redirect) {
      params.set('redirect', redirect)
    }
    // Use relative path to go through Vite proxy (better for development)
    // The proxy will forward to the backend which redirects to GitHub
    return `/api/auth/github?${params.toString()}`
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
}

// Export singleton instance
export const api = new ApiClient()

