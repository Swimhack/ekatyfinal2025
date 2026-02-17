import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/tiers
 * List all partnership tiers ordered by display_order
 */
export async function GET(request: NextRequest) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'

    const tiers = await prisma.partnershipTier.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json({
      tiers: tiers || [],
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/tiers:', error)
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
 * POST /api/admin/tiers
 * Create a new partnership tier
 */
export async function POST(request: NextRequest) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json()
    const {
      name,
      slug,
      monthlyPrice,
      features,
      displayOrder = 0,
      isActive = true,
    } = body

    // Validation
    if (!name || !slug || monthlyPrice === undefined || !features) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'name, slug, monthlyPrice, and features are required',
        },
        { status: 400 }
      )
    }

    // Validate monthlyPrice is positive
    if (typeof monthlyPrice !== 'number' || monthlyPrice <= 0) {
      return NextResponse.json(
        {
          error: 'Invalid monthlyPrice',
          details: 'monthlyPrice must be a positive number',
        },
        { status: 400 }
      )
    }

    // Validate features is an array
    if (!Array.isArray(features)) {
      return NextResponse.json(
        {
          error: 'Invalid features',
          details: 'features must be an array',
        },
        { status: 400 }
      )
    }

    const tier = await prisma.partnershipTier.create({
      data: {
        name,
        slug,
        monthlyPrice,
        features: JSON.stringify(features),
        displayOrder,
        isActive,
      },
    })

    return NextResponse.json({ tier }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/tiers:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
