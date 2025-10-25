import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, userId, rating, title, text } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const review = await prisma.review.create({
      data: {
        rating,
        title,
        text,
        restaurantId,
        userId,
      },
    })

    return NextResponse.json(review)
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}