import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse query parameters
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category')
    const priceLevel = searchParams.get('priceLevel')
    const featured = searchParams.get('featured')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = searchParams.get('radius') || '5' // Default 5 miles
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'rating' // rating, distance, name
    
    // Build where clause
    const where: Prisma.RestaurantWhereInput = {
      active: true
    }
    
    // Text search (SQLite doesn't support mode)
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
        { categories: { contains: q } },
        { cuisineTypes: { contains: q } }
      ]
    }
    
    // Category filter
    if (category) {
      where.categories = { contains: category }
    }
    
    // Price level filter
    if (priceLevel) {
      where.priceLevel = priceLevel as any
    }
    
    // Featured filter
    if (featured === 'true') {
      where.featured = true
    }
    
    // Get restaurants
    let restaurants: any[] = await prisma.restaurant.findMany({
      where,
      include: {
        _count: {
          select: {
            reviews: true,
            favorites: true
          }
        }
      },
      take: limit + 20, // Get extra for distance filtering
      skip: offset
    })
    
    // Distance filtering (if coordinates provided)
    if (lat && lng) {
      const userLat = parseFloat(lat)
      const userLng = parseFloat(lng)
      const maxDistance = parseFloat(radius)
      
      // Calculate distance for each restaurant
      restaurants = restaurants.map(restaurant => {
        const distance = calculateDistance(
          userLat, 
          userLng, 
          restaurant.latitude, 
          restaurant.longitude
        )
        return { ...restaurant, distance }
      })
      
      // Filter by distance
      restaurants = restaurants.filter(r => r.distance <= maxDistance)
      
      // Sort by distance if requested
      if (sortBy === 'distance') {
        restaurants.sort((a, b) => a.distance - b.distance)
      }
    }
    
    // Sort restaurants
    if (sortBy === 'rating') {
      restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (sortBy === 'name') {
      restaurants.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'reviews') {
      restaurants.sort((a, b) => b._count.reviews - a._count.reviews)
    }
    
    // Apply final limit
    restaurants = restaurants.slice(0, limit)
    
    // Parse string fields back to arrays for response
    restaurants = restaurants.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      rating: r.rating,
      reviewCount: r.reviewCount,
      priceLevel: r.priceLevel,
      photos: r.photos ? r.photos.split(',').map((p: string) => p.trim()) : [],
      categories: r.categories ? r.categories.split(',').map((c: string) => c.trim()) : [],
      cuisineTypes: r.cuisineTypes ? r.cuisineTypes.split(',').map((c: string) => c.trim()) : [],
      photos: r.photos ? r.photos.split(',').map((p: string) => p.trim()) : [],
      hours: r.hours ? JSON.parse(r.hours) : {}
    }))
    
    // Get total count for pagination
    const total = await prisma.restaurant.count({ where })
    
    return NextResponse.json({
      restaurants,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
    
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    )
  }
}

// Helper function to calculate distance between two coordinates (in miles)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI/180)
}