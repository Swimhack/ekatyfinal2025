import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviews = await prisma.review.findMany({
      where: { restaurantId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    const transformedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      text: review.text,
      title: review.title,
      created_at: review.createdAt.toISOString(),
      user_name: review.user?.name || 'Anonymous'
    }))

    return NextResponse.json({ reviews: transformedReviews })
  } catch (error) {
    console.error('Error in reviews API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
