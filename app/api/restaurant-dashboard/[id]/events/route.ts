import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeRestaurantAccess } from '@/lib/auth/restaurant-access'

// POST - Create a new event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await authorizeRestaurantAccess(params.id)
    if (!access.authorized) {
      return access.response
    }

    const body = await request.json()
    const { title, description, startDate, endDate, imageUrl } = body

    if (!title || !description || !startDate) {
      return NextResponse.json(
        { error: 'Title, description, and start date are required' },
        { status: 400 }
      )
    }

    const event = await prisma.event.create({
      data: {
        restaurantId: params.id,
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : new Date(startDate),
        imageUrl,
        active: true
      }
    })

    return NextResponse.json({
      success: true,
      event
    })

  } catch (error: any) {
    console.error('Failed to create event:', error)
    return NextResponse.json(
      { error: 'Failed to create event', message: error.message },
      { status: 500 }
    )
  }
}
