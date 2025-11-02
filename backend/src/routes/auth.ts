// OAuth authentication routes
import { Router, Request, Response } from 'express'
import axios from 'axios'
import { findOrCreateUser, generateToken } from '../services/auth'
import { authenticate } from '../middleware/auth'
import { config } from '../config'

const router = Router()

/**
 * GET /api/auth/status
 * Get current authentication status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    res.json({
      authenticated: true,
      user: {
        id: req.user!.id,
        email: req.user!.email,
        name: req.user!.name,
        provider: req.user!.provider,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow - redirects to Google
 */
router.get('/google', (req: Request, res: Response) => {
  const state = Buffer.from(JSON.stringify({ redirect: req.query.redirect || '/' })).toString('base64')
  
  const params = new URLSearchParams({
    client_id: config.oauth.google.clientId,
    redirect_uri: config.oauth.google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  res.redirect(googleAuthUrl)
})

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query

    if (!code || typeof code !== 'string') {
      return res.redirect(`${config.frontend.url}/login?error=no_code`)
    }

    // Exchange code for token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: config.oauth.google.clientId,
      client_secret: config.oauth.google.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.oauth.google.redirectUri,
    })

    const { access_token } = tokenResponse.data

    // Get user profile
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    const profile = profileResponse.data

    // Find or create user
    const user = await findOrCreateUser('google', {
      id: profile.id,
      email: profile.email,
      name: profile.name || profile.given_name || profile.email,
    })

    // Generate JWT token
    const token = generateToken(user)

    // Parse redirect from state
    let redirect = '/'
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString())
      redirect = stateData.redirect || '/'
    } catch {
      // Invalid state, use default
    }

    // Redirect to frontend with token
    res.redirect(`${config.frontend.url}${redirect}?token=${token}`)
  } catch (error) {
    console.error('Google OAuth error:', error)
    res.redirect(`${config.frontend.url}/login?error=oauth_failed`)
  }
})

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth flow - redirects to GitHub
 */
router.get('/github', (req: Request, res: Response) => {
  const state = Buffer.from(JSON.stringify({ redirect: req.query.redirect || '/' })).toString('base64')
  
  const params = new URLSearchParams({
    client_id: config.oauth.github.clientId,
    redirect_uri: config.oauth.github.redirectUri,
    scope: 'user:email',
    state,
  })

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`
  res.redirect(githubAuthUrl)
})

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query

    if (!code || typeof code !== 'string') {
      return res.redirect(`${config.frontend.url}/login?error=no_code`)
    }

    // Exchange code for token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: config.oauth.github.clientId,
        client_secret: config.oauth.github.clientSecret,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )

    const { access_token } = tokenResponse.data

    if (!access_token) {
      return res.redirect(`${config.frontend.url}/login?error=no_token`)
    }

    // Get user profile
    const profileResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    const profile = profileResponse.data

    // Get user email (may need to fetch from emails endpoint)
    let email = profile.email
    if (!email) {
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })
      const primaryEmail = emailsResponse.data.find((e: any) => e.primary)
      email = primaryEmail ? primaryEmail.email : emailsResponse.data[0]?.email || `${profile.id}@users.noreply.github.com`
    }

    // Find or create user
    const user = await findOrCreateUser('github', {
      id: String(profile.id),
      email,
      name: profile.name || profile.login || email,
    })

    // Generate JWT token
    const token = generateToken(user)

    // Parse redirect from state
    let redirect = '/'
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString())
      redirect = stateData.redirect || '/'
    } catch {
      // Invalid state, use default
    }

    // Redirect to frontend with token
    res.redirect(`${config.frontend.url}${redirect}?token=${token}`)
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    res.redirect(`${config.frontend.url}/login?error=oauth_failed`)
  }
})

/**
 * POST /api/auth/logout
 * Log out current user (client-side token removal)
 */
router.post('/logout', authenticate, (req: Request, res: Response) => {
  // Since we use JWT, logout is handled client-side by removing the token
  // This endpoint exists for consistency and can be used for logging
  res.json({ message: 'Logged out successfully' })
})

export default router

