import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/admin/outreach
 * List outreach campaigns with optional status filter
 */
export async function GET(request: NextRequest) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const campaigns = await prisma.outreachCampaign.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { emails: true },
        },
      },
    })

    return NextResponse.json({
      campaigns: campaigns || [],
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/outreach:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/outreach
 * Create a new outreach campaign
 */
export async function POST(request: NextRequest) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json()
    const {
      name,
      subject,
      emailTemplate,
      description,
      targetSegment,
      status = 'draft',
      scheduledAt,
    } = body

    // Validation
    if (!name || !subject || !emailTemplate) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'name, subject, and emailTemplate are required',
        },
        { status: 400 }
      )
    }

    // Get the current user
    const user = await getCurrentUser()

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - session required' },
        { status: 401 }
      )
    }

    const campaign = await prisma.outreachCampaign.create({
      data: {
        name,
        subject,
        emailTemplate,
        description: description || null,
        targetSegment: targetSegment ? JSON.stringify(targetSegment) : null,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/outreach:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
