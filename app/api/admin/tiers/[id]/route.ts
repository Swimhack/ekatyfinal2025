import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/tiers/[id]
 * Get a single partnership tier by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { id } = params

    const tier = await prisma.partnershipTier.findUnique({
      where: { id },
    })

    if (!tier) {
      return NextResponse.json(
        { error: 'Partnership tier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ tier })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/tiers/[id]:', error)
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
 * PATCH /api/admin/tiers/[id]
 * Update a partnership tier
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
    const { name, slug, monthlyPrice, features, displayOrder, isActive } = body

    // Build update object with only provided fields
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (slug !== undefined) updates.slug = slug
    if (monthlyPrice !== undefined) {
      if (typeof monthlyPrice !== 'number' || monthlyPrice <= 0) {
        return NextResponse.json(
          {
            error: 'Invalid monthlyPrice',
            details: 'monthlyPrice must be a positive number',
          },
          { status: 400 }
        )
      }
      updates.monthlyPrice = monthlyPrice
    }
    if (features !== undefined) {
      if (!Array.isArray(features)) {
        return NextResponse.json(
          {
            error: 'Invalid features',
            details: 'features must be an array',
          },
          { status: 400 }
        )
      }
      updates.features = JSON.stringify(features)
    }
    if (displayOrder !== undefined) updates.displayOrder = displayOrder
    if (isActive !== undefined) updates.isActive = isActive

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: 'No fields to update',
          details: 'At least one field must be provided',
        },
        { status: 400 }
      )
    }

    const tier = await prisma.partnershipTier.update({
      where: { id },
      data: updates,
    })

    if (!tier) {
      return NextResponse.json(
        { error: 'Partnership tier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ tier })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/tiers/[id]:', error)
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
 * DELETE /api/admin/tiers/[id]
 * Soft delete a partnership tier (set isActive = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { id } = params

    const tier = await prisma.partnershipTier.update({
      where: { id },
      data: { isActive: false },
    })

    if (!tier) {
      return NextResponse.json(
        { error: 'Partnership tier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Partnership tier deactivated successfully',
      tier,
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/tiers/[id]:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
