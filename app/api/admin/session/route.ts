import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['ADMIN', 'EDITOR']

/**
 * Admin-side session probe. Like `/api/auth/session`, this exists so admin
 * pages get JSON instead of a 404 HTML page, which the client then failed to
 * parse as JSON. It reports on the caller's own session only.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ authenticated: false, isAdmin: false, user: null })
    }

    return NextResponse.json({
      authenticated: true,
      isAdmin: ADMIN_ROLES.includes(user.role),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Error reading admin session:', error)
    return NextResponse.json(
      { authenticated: false, isAdmin: false, user: null, error: 'Failed to read session' },
      { status: 500 }
    )
  }
}
