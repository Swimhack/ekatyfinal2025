import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Tracking endpoint for email link clicks
 * Records the click and redirects to the destination URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { emailId: string } }
) {
  const { emailId } = params
  const { searchParams } = new URL(request.url)
  const destination = searchParams.get('url')

  if (!destination) {
    return NextResponse.json(
      { error: 'Missing destination URL' },
      { status: 400 }
    )
  }

  try {
    // Update the email record with clicked_at timestamp (only if not already clicked)
    await prisma.outreachEmail.updateMany({
      where: {
        id: emailId,
        clickedAt: null
      },
      data: {
        clickedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Click tracking error:', error)
  }

  // Redirect to the destination URL
  return NextResponse.redirect(destination, { status: 302 })
}

export const dynamic = 'force-dynamic'
