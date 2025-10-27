import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug
    const restaurant = await prisma.restaurant.findUnique({
      where: {
        slug: slug,
      },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Parse string fields back to arrays/JSON for response
    const formattedRestaurant = {
      ...restaurant,
      categories: restaurant.categories ? restaurant.categories.split(',').map((c: string) => c.trim()) : [],
      cuisineTypes: restaurant.cuisineTypes ? restaurant.cuisineTypes.split(',').map((c: string) => c.trim()) : [],
      photos: restaurant.photos ? restaurant.photos.split(',').map((p: string) => p.trim()) : [],
      hours: restaurant.hours ? JSON.parse(restaurant.hours) : {}
    }

    return NextResponse.json(formattedRestaurant)
  } catch (error) {
    console.error('Error fetching restaurant:', error)
    return NextResponse.json(
      { error: 'Failed to fetch restaurant' },
      { status: 500 }
    )
  }
}
