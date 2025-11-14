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
      console.error('GitHub OAuth callback: Missing code parameter')
      return res.redirect(`${config.frontend.url}/login?error=no_code`)
    }

    console.log('GitHub OAuth callback: Exchanging code for token...')

    // Exchange code for token
    let tokenResponse
    try {
      tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: config.oauth.github.clientId,
          client_secret: config.oauth.github.clientSecret,
          code,
          redirect_uri: config.oauth.github.redirectUri,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )
    } catch (tokenError: any) {
      console.error('GitHub token exchange error:', tokenError.response?.data || tokenError.message)
      return res.redirect(`${config.frontend.url}/login?error=token_exchange_failed`)
    }

    const { access_token, error: tokenError } = tokenResponse.data

    if (tokenError) {
      console.error('GitHub token exchange returned error:', tokenError)
      return res.redirect(`${config.frontend.url}/login?error=token_error`)
    }

    if (!access_token) {
      console.error('GitHub token exchange: No access token in response')
      return res.redirect(`${config.frontend.url}/login?error=no_token`)
    }

    console.log('GitHub OAuth: Token received, fetching user profile...')

    // Get user profile
    let profile
    try {
      const profileResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })
      profile = profileResponse.data
    } catch (profileError: any) {
      console.error('GitHub profile fetch error:', profileError.response?.data || profileError.message)
      return res.redirect(`${config.frontend.url}/login?error=profile_fetch_failed`)
    }

    // Get user email (may need to fetch from emails endpoint)
    let email = profile.email
    if (!email) {
      try {
        const emailsResponse = await axios.get('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        })
        const primaryEmail = emailsResponse.data.find((e: any) => e.primary)
        email = primaryEmail ? primaryEmail.email : emailsResponse.data[0]?.email || `${profile.id}@users.noreply.github.com`
      } catch (emailError: any) {
        console.error('GitHub email fetch error:', emailError.response?.data || emailError.message)
        // Continue with fallback email
        email = `${profile.id}@users.noreply.github.com`
      }
    }

    console.log('GitHub OAuth: Finding or creating user...')

    // Find or create user
    let user
    try {
      user = await findOrCreateUser('github', {
        id: String(profile.id),
        email,
        name: profile.name || profile.login || email,
      })
    } catch (userError: any) {
      console.error('User creation error:', userError)
      return res.redirect(`${config.frontend.url}/login?error=user_creation_failed`)
    }

    console.log('GitHub OAuth: Generating JWT token...')

    // Generate JWT token
    let token
    try {
      token = generateToken(user)
    } catch (tokenGenError: any) {
      console.error('JWT generation error:', tokenGenError)
      return res.redirect(`${config.frontend.url}/login?error=token_generation_failed`)
    }

    // Parse redirect from state
    let redirect = '/'
    try {
      if (state && typeof state === 'string') {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        redirect = stateData.redirect || '/'
      }
    } catch {
      // Invalid state, use default
    }

    console.log('GitHub OAuth: Success! Redirecting to frontend...')

    // Redirect to frontend with token
    res.redirect(`${config.frontend.url}${redirect}?token=${token}`)
  } catch (error: any) {
    console.error('GitHub OAuth error:', error)
    console.error('Error stack:', error.stack)
    // Ensure we always send a response
    if (!res.headersSent) {
      res.redirect(`${config.frontend.url}/login?error=oauth_failed`)
    }
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

