import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/leads/[id]
 * Get lead details with outreach history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { id } = params

    const lead = await prisma.monetizationLead.findUnique({
      where: { id },
      include: {
        outreachEmails: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { outreachEmails, ...leadData } = lead

    return NextResponse.json({
      lead: leadData,
      emails: outreachEmails,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/leads/[id]:', error)
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
 * PATCH /api/admin/leads/[id]
 * Update a restaurant lead
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { id } = params
    const body = await request.json()

    const {
      contactName,
      contactEmail,
      contactPhone,
      restaurantName,
      tier,
      status,
      assignedToId,
      notes,
      source,
    } = body

    // Build update object with only provided fields
    const updateData: any = {}
    if (contactName !== undefined) updateData.contactName = contactName
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone
    if (restaurantName !== undefined) updateData.restaurantName = restaurantName
    if (tier !== undefined) updateData.tier = tier
    if (status !== undefined) updateData.status = status
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId
    if (notes !== undefined) updateData.notes = notes
    if (source !== undefined) updateData.source = source

    const data = await prisma.monetizationLead.update({
      where: { id },
      data: updateData,
    })

    if (!data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead: data })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/leads/[id]:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
