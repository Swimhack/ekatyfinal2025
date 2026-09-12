import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeRestaurantAccess } from '@/lib/auth/restaurant-access'

// POST - Respond to a review (restaurant owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; reviewId: string } }
) {
  try {
    const access = await authorizeRestaurantAccess(params.id)
    if (!access.authorized) {
      return access.response
    }

    const body = await request.json()
    const { response } = body

    if (!response || response.trim().length === 0) {
      return NextResponse.json(
        { error: 'Response text is required' },
        { status: 400 }
      )
    }

    // The review must belong to the restaurant the session is authorized for
    const target = await prisma.review.findFirst({
      where: { id: params.reviewId, restaurantId: params.id },
      select: { id: true }
    })

    if (!target) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Update the review with owner response
    const review = await prisma.review.update({
      where: { id: params.reviewId },
      data: {
        ownerResponse: response,
        ownerResponseDate: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      review
    })

  } catch (error: any) {
    console.error('Failed to respond to review:', error)
    return NextResponse.json(
      { error: 'Failed to post response', message: error.message },
      { status: 500 }
    )
  }
}
