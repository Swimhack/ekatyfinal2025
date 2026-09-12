import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'
import { runPhotoAudit } from '@/lib/photos/audit-photos'

/**
 * POST — run bounded photo audit.
 * Body: { commit?: boolean, limit?: number, skipNetwork?: boolean }
 * Dry-run by default.
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))
    const commit = !!body.commit
    const limit =
      typeof body.limit === 'number' && body.limit > 0
        ? Math.min(body.limit, 5000)
        : 0
    const skipNetwork = !!body.skipNetwork

    const summary = await runPhotoAudit({
      commit,
      limit,
      checkReachability: !skipNetwork,
      prisma,
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Photo audit API failed:', error)
    return NextResponse.json({ error: 'Photo audit failed' }, { status: 500 })
  }
}
