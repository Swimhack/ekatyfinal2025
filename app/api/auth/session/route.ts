import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Session probe for the cookie-based auth in `lib/auth.ts`.
 *
 * `AuthProvider` and other clients poll this on every page load. Without the
 * route, Next answers with a 404 HTML page and any `response.json()` on the
 * client throws "Unexpected token '<'", which took down admin pages. It always
 * answers 200 with JSON: an absent session is a normal answer, not an error.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        // Shape expected by lib/auth-context.tsx
        user_metadata: { full_name: user.name ?? undefined },
      },
    })
  } catch (error) {
    console.error('Error reading session:', error)
    return NextResponse.json(
      { authenticated: false, user: null, error: 'Failed to read session' },
      { status: 500 }
    )
  }
}
