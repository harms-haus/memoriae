// Auth routes integration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import authRoutes from '../../routes/auth'
import { authenticate } from '../../middleware/auth'
import { generateTestToken } from '../../test-helpers'
import * as authService from '../../services/auth'

// Mock auth service
vi.mock('../../services/auth', () => ({
  findOrCreateUser: vi.fn(),
  generateToken: vi.fn((user) => `mock-token-${user.id}`),
  getUserById: vi.fn(),
}))

// Mock axios for OAuth provider calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/auth/status', () => {
    it('should return user info with valid token', async () => {
      const userPayload = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      }
      const token = generateTestToken(userPayload)

      // Mock getUserById to return the user
      vi.mocked(authService.getUserById).mockResolvedValue({
        ...userPayload,
        provider: 'google',
        provider_id: 'provider-123',
        created_at: new Date(),
      })

      const response = await request(app)
        .get('/api/auth/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('authenticated', true)
      expect(response.body.user).toMatchObject({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      })
    })

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/auth/status')
        .expect(401)
    })
  })

  describe('GET /api/auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(302)

      expect(response.headers.location).toContain('accounts.google.com')
      expect(response.headers.location).toContain('oauth2')
      expect(response.headers.location).toContain('client_id=test-google-client-id')
    })

    it('should include state parameter with redirect', async () => {
      const response = await request(app)
        .get('/api/auth/google?redirect=/dashboard')
        .expect(302)

      expect(response.headers.location).toContain('state=')
    })
  })

  describe('GET /api/auth/github', () => {
    it('should redirect to GitHub OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/github')
        .expect(302)

      expect(response.headers.location).toContain('github.com')
      expect(response.headers.location).toContain('login/oauth/authorize')
      expect(response.headers.location).toContain('client_id=test-github-client-id')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should return success with valid token', async () => {
      const userPayload = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      }
      const token = generateTestToken(userPayload)

      // Mock getUserById to return the user
      vi.mocked(authService.getUserById).mockResolvedValue({
        ...userPayload,
        provider: 'google',
        provider_id: 'provider-123',
        created_at: new Date(),
      })

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Logged out successfully')
    })

    it('should return 401 without token', async () => {
      await request(app)
        .post('/api/auth/logout')
        .expect(401)
    })
  })

  describe('GET /api/auth/google/callback', () => {
    it('should handle successful Google OAuth callback', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'google-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 'google-user-123',
          email: 'user@gmail.com',
          name: 'Test User',
        },
      }
      const mockUser = {
        id: 'user-123',
        email: 'user@gmail.com',
        name: 'Test User',
        provider: 'google',
        provider_id: 'google-user-123',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)

      const state = Buffer.from(JSON.stringify({ redirect: '/dashboard' })).toString('base64')
      const response = await request(app)
        .get(`/api/auth/google/callback?code=auth-code&state=${state}`)
        .expect(302)

      expect(response.headers.location).toContain('token=')
      expect(response.headers.location).toContain('/dashboard')
      expect(axios.default.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          code: 'auth-code',
        })
      )
    })

    it('should redirect with error when code is missing', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=no_code')
    })

    it('should redirect with error when code is not a string', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback?code[]=invalid')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=no_code')
    })

    it('should handle token exchange failure', async () => {
      const axios = await import('axios')
      vi.mocked(axios.default.post).mockRejectedValueOnce(new Error('Token exchange failed'))

      const response = await request(app)
        .get('/api/auth/google/callback?code=auth-code')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=oauth_failed')
    })

    it('should handle profile fetch failure', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'google-access-token',
        },
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockRejectedValueOnce(new Error('Profile fetch failed'))

      const response = await request(app)
        .get('/api/auth/google/callback?code=auth-code')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=oauth_failed')
    })

    it('should handle user creation failure', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'google-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 'google-user-123',
          email: 'user@gmail.com',
          name: 'Test User',
        },
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockRejectedValueOnce(new Error('User creation failed'))

      const response = await request(app)
        .get('/api/auth/google/callback?code=auth-code')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=oauth_failed')
    })

    it('should handle invalid state gracefully', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'google-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 'google-user-123',
          email: 'user@gmail.com',
          name: 'Test User',
        },
      }
      const mockUser = {
        id: 'user-123',
        email: 'user@gmail.com',
        name: 'Test User',
        provider: 'google',
        provider_id: 'google-user-123',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)

      // Invalid base64 state
      const response = await request(app)
        .get('/api/auth/google/callback?code=auth-code&state=invalid-state')
        .expect(302)

      expect(response.headers.location).toContain('token=')
      expect(response.headers.location).toContain('/?token=') // Default redirect
    })

    it('should use profile.given_name when name is missing', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'google-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 'google-user-123',
          email: 'user@gmail.com',
          given_name: 'Given Name',
        },
      }
      const mockUser = {
        id: 'user-123',
        email: 'user@gmail.com',
        name: 'Given Name',
        provider: 'google',
        provider_id: 'google-user-123',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .get('/api/auth/google/callback?code=auth-code')
        .expect(302)

      expect(authService.findOrCreateUser).toHaveBeenCalledWith('google', {
        id: 'google-user-123',
        email: 'user@gmail.com',
        name: 'Given Name',
      })
    })

    it('should use email when name and given_name are missing', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'google-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 'google-user-123',
          email: 'user@gmail.com',
        },
      }
      const mockUser = {
        id: 'user-123',
        email: 'user@gmail.com',
        name: 'user@gmail.com',
        provider: 'google',
        provider_id: 'google-user-123',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .get('/api/auth/google/callback?code=auth-code')
        .expect(302)

      expect(authService.findOrCreateUser).toHaveBeenCalledWith('google', {
        id: 'google-user-123',
        email: 'user@gmail.com',
        name: 'user@gmail.com',
      })
    })
  })

  describe('GET /api/auth/github/callback', () => {
    it('should handle successful GitHub OAuth callback', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'github-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 12345,
          login: 'testuser',
          name: 'Test User',
          email: 'user@github.com',
        },
      }
      const mockUser = {
        id: 'user-123',
        email: 'user@github.com',
        name: 'Test User',
        provider: 'github',
        provider_id: '12345',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)

      const state = Buffer.from(JSON.stringify({ redirect: '/dashboard' })).toString('base64')
      const response = await request(app)
        .get(`/api/auth/github/callback?code=auth-code&state=${state}`)
        .expect(302)

      expect(response.headers.location).toContain('token=')
      expect(response.headers.location).toContain('/dashboard')
    })

    it('should redirect with error when code is missing', async () => {
      const response = await request(app)
        .get('/api/auth/github/callback')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=no_code')
    })

    it('should handle token exchange failure', async () => {
      const axios = await import('axios')
      const tokenError = new Error('Token exchange failed')
      ;(tokenError as any).response = { data: { error: 'invalid_code' } }
      vi.mocked(axios.default.post).mockRejectedValueOnce(tokenError)

      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=token_exchange_failed')
    })

    it('should handle token error in response', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          error: 'invalid_code',
          error_description: 'The code is invalid',
        },
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)

      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=token_error')
    })

    it('should handle missing access token in response', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {},
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)

      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=no_token')
    })

    it('should handle profile fetch failure', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'github-access-token',
        },
      }
      const profileError = new Error('Profile fetch failed')
      ;(profileError as any).response = { data: { message: 'Not found' } }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockRejectedValueOnce(profileError)

      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=profile_fetch_failed')
    })

    it('should fetch email from emails endpoint when missing', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'github-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 12345,
          login: 'testuser',
          name: 'Test User',
        },
      }
      const mockEmailsResponse = {
        data: [
          { email: 'primary@github.com', primary: true },
          { email: 'secondary@github.com', primary: false },
        ],
      }
      const mockUser = {
        id: 'user-123',
        email: 'primary@github.com',
        name: 'Test User',
        provider: 'github',
        provider_id: '12345',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get)
        .mockResolvedValueOnce(mockProfileResponse as any)
        .mockResolvedValueOnce(mockEmailsResponse as any)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      expect(axios.default.get).toHaveBeenCalledWith(
        'https://api.github.com/user/emails',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer github-access-token',
          }),
        })
      )
      expect(authService.findOrCreateUser).toHaveBeenCalledWith('github', {
        id: '12345',
        email: 'primary@github.com',
        name: 'Test User',
      })
    })

    it('should use first email when no primary email found', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'github-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 12345,
          login: 'testuser',
        },
      }
      const mockEmailsResponse = {
        data: [
          { email: 'first@github.com', primary: false },
          { email: 'second@github.com', primary: false },
        ],
      }
      const mockUser = {
        id: 'user-123',
        email: 'first@github.com',
        name: 'testuser',
        provider: 'github',
        provider_id: '12345',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get)
        .mockResolvedValueOnce(mockProfileResponse as any)
        .mockResolvedValueOnce(mockEmailsResponse as any)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      expect(authService.findOrCreateUser).toHaveBeenCalledWith('github', {
        id: '12345',
        email: 'first@github.com',
        name: 'testuser',
      })
    })

    it('should use fallback email when emails endpoint fails', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'github-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 12345,
          login: 'testuser',
        },
      }
      const emailError = new Error('Emails fetch failed')
      ;(emailError as any).response = { data: { message: 'Forbidden' } }
      const mockUser = {
        id: 'user-123',
        email: '12345@users.noreply.github.com',
        name: 'testuser',
        provider: 'github',
        provider_id: '12345',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get)
        .mockResolvedValueOnce(mockProfileResponse as any)
        .mockRejectedValueOnce(emailError)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      expect(authService.findOrCreateUser).toHaveBeenCalledWith('github', {
        id: '12345',
        email: '12345@users.noreply.github.com',
        name: 'testuser',
      })
    })

    it('should handle user creation failure', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'github-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 12345,
          login: 'testuser',
          email: 'user@github.com',
        },
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockRejectedValueOnce(new Error('User creation failed'))

      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=user_creation_failed')
    })

    it('should handle JWT generation failure', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'github-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 12345,
          login: 'testuser',
          email: 'user@github.com',
        },
      }
      const mockUser = {
        id: 'user-123',
        email: 'user@github.com',
        name: 'Test User',
        provider: 'github',
        provider_id: '12345',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)
      vi.mocked(authService.generateToken).mockImplementationOnce(() => {
        throw new Error('JWT generation failed')
      })

      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      expect(response.headers.location).toContain('/login?error=token_generation_failed')
    })

    it('should handle invalid state gracefully', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'github-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 12345,
          login: 'testuser',
          email: 'user@github.com',
        },
      }
      const mockUser = {
        id: 'user-123',
        email: 'user@github.com',
        name: 'Test User',
        provider: 'github',
        provider_id: '12345',
        created_at: new Date(),
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockResolvedValue(mockUser as any)

      // Invalid base64 state
      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code&state=invalid-state')
        .expect(302)

      expect(response.headers.location).toContain('token=')
      expect(response.headers.location).toContain('/?token=') // Default redirect
    })

    it('should handle response already sent error', async () => {
      const axios = await import('axios')
      const mockTokenResponse = {
        data: {
          access_token: 'github-access-token',
        },
      }
      const mockProfileResponse = {
        data: {
          id: 12345,
          login: 'testuser',
          email: 'user@github.com',
        },
      }

      vi.mocked(axios.default.post).mockResolvedValueOnce(mockTokenResponse as any)
      vi.mocked(axios.default.get).mockResolvedValueOnce(mockProfileResponse as any)
      vi.mocked(authService.findOrCreateUser).mockImplementationOnce(() => {
        const error: any = new Error('User creation failed')
        error.headersSent = true
        throw error
      })

      // Should not throw, should handle gracefully
      const response = await request(app)
        .get('/api/auth/github/callback?code=auth-code')
        .expect(302)

      // Should still redirect even if error occurred
      expect(response.headers.location).toBeDefined()
    })
  })
})

