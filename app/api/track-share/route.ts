import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { restaurantId, shareType, vibe } = await request.json()

    // Persist share click to RestaurantAnalytics
    if (restaurantId) {
      const today = new Date().toISOString().slice(0, 10)
      await prisma.restaurantAnalytics.upsert({
        where: {
          restaurantId_date: {
            restaurantId: String(restaurantId),
            date: today,
          },
        },
        update: {
          shareClicks: { increment: 1 },
        },
        create: {
          restaurantId: String(restaurantId),
          date: today,
          shareClicks: 1,
        },
      }).catch(err => {
        console.error('Analytics upsert failed:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Share tracking error:', error)
    return NextResponse.json({ success: true })
  }
}
