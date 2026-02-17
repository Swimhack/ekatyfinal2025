import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/partnerships
 * List active partnerships with tier and restaurant details
 */
export async function GET(request: NextRequest) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const data = await prisma.partnership.findMany({
      where: { status: 'active' },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            cuisineTypes: true,
          },
        },
        tier: {
          select: {
            id: true,
            name: true,
            monthlyPrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform data to include flattened tier and restaurant details
    const partnerships = (data || []).map((partnership) => ({
      id: partnership.id,
      restaurant_id: partnership.restaurantId,
      restaurant_name: partnership.restaurant?.name || 'Unknown',
      tier_id: partnership.tierId,
      tier_name: partnership.tier?.name || 'Unknown',
      monthly_price: partnership.tier?.monthlyPrice || 0,
      status: partnership.status,
      start_date: partnership.startDate,
      end_date: partnership.endDate,
      billing_cycle: partnership.billingCycle,
      created_at: partnership.createdAt,
      updated_at: partnership.updatedAt,
    }))

    return NextResponse.json({
      partnerships,
      total: partnerships.length,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/partnerships:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
