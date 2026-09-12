import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Get restaurants owned by the current user
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with their subscriptions and owned restaurants
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        subscriptions: {
          where: {
            status: 'active',
            tier: 'owner'
          }
        },
        ownedRestaurants: {
          where: { verified: true },
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                phone: true,
                website: true,
                rating: true,
                reviewCount: true,
                active: true,
                verified: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has active owner subscription
    const hasSubscription = user.subscriptions.length > 0

    return NextResponse.json({
      hasSubscription,
      restaurants: user.ownedRestaurants.map(ro => ro.restaurant)
    })
  } catch (error) {
    console.error('Failed to fetch owned restaurants:', error)
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 })
  }
}
