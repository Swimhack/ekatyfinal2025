import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ekaty.fly.dev'
    
    if (!code) {
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=oauth_failed`)
    }

    const { redirectTo } = state ? JSON.parse(decodeURIComponent(state)) : { redirectTo: '/admin/dashboard' }
    
    const githubClientId = process.env.GITHUB_CLIENT_ID
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = `${baseUrl}/api/auth/github/callback`

    if (!githubClientId || !githubClientSecret) {
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=oauth_not_configured`)
    }

    // Exchange code for access token
    // Add timeout to prevent 502 errors
    const tokenController = new AbortController()
    const tokenTimeoutId = setTimeout(() => tokenController.abort(), 30000) // 30 second timeout

    let tokenResponse: Response
    try {
      tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: githubClientId,
          client_secret: githubClientSecret,
          code,
          redirect_uri: redirectUri,
        }),
        signal: tokenController.signal
      })
      clearTimeout(tokenTimeoutId)
    } catch (error) {
      clearTimeout(tokenTimeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.redirect(`${baseUrl}/auth/signin?error=oauth_timeout`)
      }
      throw error
    }

    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()
    const accessToken = tokens.access_token

    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=no_access_token`)
    }

    // Get user info from GitHub
    const userInfoController = new AbortController()
    const userInfoTimeoutId = setTimeout(() => userInfoController.abort(), 30000) // 30 second timeout

    let userInfoResponse: Response
    try {
      userInfoResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        signal: userInfoController.signal
      })
      clearTimeout(userInfoTimeoutId)
    } catch (error) {
      clearTimeout(userInfoTimeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.redirect(`${baseUrl}/auth/signin?error=oauth_timeout`)
      }
      throw error
    }

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=user_info_failed`)
    }

    const githubUser = await userInfoResponse.json()

    // Get user email (may need separate API call)
    let email = githubUser.email
    if (!email) {
      const emailController = new AbortController()
      const emailTimeoutId = setTimeout(() => emailController.abort(), 30000) // 30 second timeout

      try {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
          signal: emailController.signal
        })
        clearTimeout(emailTimeoutId)
        if (emailResponse.ok) {
          const emails = await emailResponse.json()
          const primaryEmail = emails.find((e: any) => e.primary) || emails[0]
          email = primaryEmail?.email
        }
      } catch (error) {
        clearTimeout(emailTimeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          return NextResponse.redirect(`${baseUrl}/auth/signin?error=oauth_timeout`)
        }
        throw error
      }
    }

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=no_email`)
    }

    // Find or create user in our database
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      // Create new user with social auth
      const bcrypt = require('bcrypt')
      const randomPassword = Math.random().toString(36)
      const passwordHash = await bcrypt.hash(randomPassword, 10)
      
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: githubUser.name || githubUser.login || email.split('@')[0],
          passwordHash,
          role: 'USER', // Default role
        }
      })
    }

    // Check if user has admin/editor role for admin access
    if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=insufficient_permissions`)
    }

    // Create session
    const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')
    const cookieStore = await cookies()
    
    cookieStore.set('ekaty_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    cookieStore.set('ekaty_user_id', user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    cookieStore.set('ekaty_user_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    const finalRedirect = redirectTo.startsWith('http') ? redirectTo : `${baseUrl}${redirectTo}`
    return NextResponse.redirect(finalRedirect)
  } catch (error) {
    console.error('GitHub OAuth callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ekaty.fly.dev'
    return NextResponse.redirect(`${baseUrl}/auth/signin?error=oauth_error`)
  }
}

