import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { restaurant_id, rating, comment } = body

    // Validation
    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json(
        { error: 'comment is required' },
        { status: 400 }
      )
    }

    if (comment.length > 500) {
      return NextResponse.json(
        { error: 'comment must be 500 characters or less' },
        { status: 400 }
      )
    }

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurant_id },
      select: { id: true },
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Check if user already reviewed this restaurant
    const existing = await prisma.review.findUnique({
      where: {
        restaurantId_userId: {
          restaurantId: restaurant_id,
          userId: user.id,
        },
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this restaurant' },
        { status: 409 }
      )
    }

    // Create review
    const data = await prisma.review.create({
      data: {
        userId: user.id,
        restaurantId: restaurant_id,
        rating,
        text: comment.trim(),
        photos: '',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Reviews API Error:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
