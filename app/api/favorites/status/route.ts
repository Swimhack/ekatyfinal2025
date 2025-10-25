import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get('restaurantId')
    const userId = req.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
    })

    return NextResponse.json({ isFavorite: !!favorite })
  } catch (error) {
    console.error('Error checking favorite status:', error)
    return NextResponse.json(
      { error: 'Failed to check favorite status' },
      { status: 500 }
    )
  }
}