import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withResolvedImages } from '@/lib/restaurant-images'

// GET - List user's favorites
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authUser = await requireAuth()
    const userId = authUser.id

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        restaurant: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      favorites: favorites.map(fav => ({
        id: fav.id,
        notes: fav.notes,
        createdAt: fav.createdAt,
        restaurant: withResolvedImages(fav.restaurant)
      }))
    })

  } catch (error: any) {
    console.error('Failed to fetch favorites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch favorites', message: error.message },
      { status: 500 }
    )
  }
}

// POST - Add to favorites
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, notes } = body
    const authUser = await requireAuth()
    const userId = authUser.id

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Restaurant already in favorites' },
        { status: 400 }
      )
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId,
        restaurantId,
        notes: notes || null
      },
      include: {
        restaurant: true
      }
    })

    return NextResponse.json({ favorite })

  } catch (error: any) {
    console.error('Failed to add favorite:', error)
    return NextResponse.json(
      { error: 'Failed to add favorite', message: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Remove from favorites
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authUser = await requireAuth()
    const userId = authUser.id
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    await prisma.favorite.delete({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Failed to remove favorite:', error)
    return NextResponse.json(
      { error: 'Failed to remove favorite', message: error.message },
      { status: 500 }
    )
  }
}
