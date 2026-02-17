import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/partnerships/[id]
 * Get single partnership detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Partnership ID is required' },
        { status: 400 }
      )
    }

    const partnership = await prisma.partnership.findUnique({
      where: { id },
      include: {
        tier: true,
        restaurant: true,
      },
    })

    if (!partnership) {
      return NextResponse.json(
        { error: 'Partnership not found' },
        { status: 404 }
      )
    }

    // Format the response
    const formattedPartnership = {
      id: partnership.id,
      restaurant_id: partnership.restaurantId,
      restaurant_name: partnership.restaurant?.name || 'Unknown',
      restaurant_address: partnership.restaurant?.address || '',
      restaurant_city: partnership.restaurant?.city || '',
      restaurant_cuisine: partnership.restaurant?.cuisineTypes || '',
      tier_id: partnership.tierId,
      tier_name: partnership.tier?.name || 'Unknown',
      tier_description: partnership.tier?.description || '',
      monthly_price: partnership.tier?.monthlyPrice || 0,
      features: partnership.tier?.features || '[]',
      status: partnership.status,
      start_date: partnership.startDate,
      end_date: partnership.endDate,
      billing_cycle: partnership.billingCycle,
      notes: partnership.notes,
      created_at: partnership.createdAt,
      updated_at: partnership.updatedAt,
    }

    return NextResponse.json({ partnership: formattedPartnership })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/partnerships/[id]:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
