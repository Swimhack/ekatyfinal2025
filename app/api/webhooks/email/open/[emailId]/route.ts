import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Tracking pixel endpoint for email opens
 * Returns a 1x1 transparent GIF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { emailId: string } }
) {
  const { emailId } = params

  try {
    // Update the email record with opened_at timestamp (only if not already opened)
    await prisma.outreachEmail.updateMany({
      where: {
        id: emailId,
        openedAt: null
      },
      data: {
        openedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Tracking pixel error:', error)
  }

  // Return a 1x1 transparent GIF
  const transparentGif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )

  return new NextResponse(transparentGif, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

export const dynamic = 'force-dynamic'
