import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const spins = await prisma.spin.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        restaurant: {
          select: { name: true }
        }
      }
    })

    const transformedSpins = spins.map(spin => ({
      id: spin.id,
      restaurant_name: spin.restaurant?.name || 'Unknown Restaurant',
      created_at: spin.createdAt.toISOString()
    }))

    return NextResponse.json({ spins: transformedSpins })
  } catch (error) {
    console.error('Error in spins API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
