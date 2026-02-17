import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/outreach/[campaignId]
 * Get campaign details with email statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { campaignId } = params

    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
      include: {
        emails: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const { emails, ...campaignData } = campaign

    return NextResponse.json({
      campaign: campaignData,
      emails,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/outreach/[campaignId]:', error)
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
 * PATCH /api/admin/outreach/[campaignId]
 * Update an outreach campaign
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { campaignId } = params
    const body = await request.json()

    const {
      name,
      subject,
      emailTemplate,
      description,
      targetSegment,
      status,
      scheduledAt,
    } = body

    // Build update object with only provided fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (subject !== undefined) updateData.subject = subject
    if (emailTemplate !== undefined) updateData.emailTemplate = emailTemplate
    if (description !== undefined) updateData.description = description
    if (targetSegment !== undefined)
      updateData.targetSegment = targetSegment ? JSON.stringify(targetSegment) : null
    if (status !== undefined) updateData.status = status
    if (scheduledAt !== undefined)
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null

    const campaign = await prisma.outreachCampaign.update({
      where: { id: campaignId },
      data: updateData,
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/outreach/[campaignId]:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
