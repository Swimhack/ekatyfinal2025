import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
    })

    if (existingFavorite) {
      await prisma.favorite.delete({
        where: {
          id: existingFavorite.id,
        },
      })
      return NextResponse.json({ message: 'Favorite removed' })
    }

    await prisma.favorite.create({
      data: {
        userId,
        restaurantId,
      },
    })

    return NextResponse.json({ message: 'Favorite created' })
  } catch (error) {
    console.error('Error handling favorite:', error)
    return NextResponse.json(
      { error: 'Failed to handle favorite' },
      { status: 500 }
    )
  }
}