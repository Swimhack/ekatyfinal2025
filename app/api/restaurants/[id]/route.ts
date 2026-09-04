import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orderPhotosWithHeroFirst, resolveHeroImage } from '@/lib/restaurant-images'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Try to find by ID or slug
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ],
        active: true
      },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            reviews: true,
            favorites: true
          }
        }
      }
    })
    
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }
    
    // Hero image can live under either metadata key, or fall back to photos/logo
    const heroImage = resolveHeroImage(restaurant)

    console.log('Public API - Restaurant:', restaurant.name)
    console.log('Public API - Metadata:', restaurant.metadata)
    console.log('Public API - HeroImage:', heroImage)

    // Parse string fields back to arrays for response
    const formattedRestaurant = {
      ...restaurant,
      categories: restaurant.categories ? restaurant.categories.split(',').map((c: string) => c.trim()) : [],
      cuisineTypes: restaurant.cuisineTypes ? restaurant.cuisineTypes.split(',').map((c: string) => c.trim()) : [],
      photos: orderPhotosWithHeroFirst(restaurant.photos, heroImage),
      hours: restaurant.hours ? JSON.parse(restaurant.hours) : {},
      heroImage,
      reviews: restaurant.reviews.map((review: any) => ({
        ...review,
        photos: review.photos ? review.photos.split(',').map((p: string) => p.trim()) : []
      }))
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