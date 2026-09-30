import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { matchesCategory, distanceMiles } from '@/lib/search'

const PRICE_LEVELS = ['BUDGET', 'MODERATE', 'UPSCALE', 'PREMIUM']

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const q = (searchParams.get('q') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const priceLevel = (searchParams.get('priceLevel') || '').trim().toUpperCase()
    const featured = searchParams.get('featured')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseFloat(searchParams.get('radius') || '5') // miles
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)
    const sortBy = searchParams.get('sortBy') || 'rating' // rating, distance, name, reviews

    // Build where clause. Filters are combined with AND so a text search
    // and a category filter can't clobber each other.
    const and: Prisma.RestaurantWhereInput[] = []

    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { categories: { contains: q, mode: 'insensitive' } },
          { cuisineTypes: { contains: q, mode: 'insensitive' } },
        ],
      })
    }

    if (category) {
      // Broad DB prefilter; precise whole-word matching happens below
      // ("Bar" must not match "Barbecue")
      and.push({
        OR: [
          { categories: { contains: category, mode: 'insensitive' } },
          { cuisineTypes: { contains: category, mode: 'insensitive' } },
        ],
      })
    }

    if (PRICE_LEVELS.includes(priceLevel)) {
      and.push({ priceLevel })
    }

    if (featured === 'true') {
      and.push({ featured: true })
    }

    const where: Prisma.RestaurantWhereInput = { active: true, AND: and }

    // Fetch all matches, then filter/sort/paginate in memory so distance
    // filtering can't drop or duplicate rows across pages. The directory is
    // bounded to the Katy area (hundreds of rows), so this stays cheap.
    let restaurants: any[] = await prisma.restaurant.findMany({
      where,
      include: {
        _count: {
          select: {
            reviews: true,
            favorites: true,
          },
        },
      },
    })

    // Precise category matching on the comma-separated tag fields
    if (category) {
      restaurants = restaurants.filter((r) =>
        matchesCategory([r.categories, r.cuisineTypes], category)
      )
    }

    // Distance filtering (if coordinates provided)
    if (lat && lng) {
      const userLat = parseFloat(lat)
      const userLng = parseFloat(lng)
      if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
        restaurants = restaurants
          .map((r) => ({
            ...r,
            distance: distanceMiles(userLat, userLng, r.latitude, r.longitude),
          }))
          .filter((r) => r.distance <= radius)
      }
    }

    // Sort
    if (sortBy === 'distance' && restaurants.length > 0 && restaurants[0].distance !== undefined) {
      restaurants.sort((a, b) => a.distance - b.distance)
    } else if (sortBy === 'name') {
      restaurants.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'reviews') {
      restaurants.sort((a, b) => b._count.reviews - a._count.reviews)
    } else {
      restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    }

    // Paginate after filtering so total/hasMore reflect what's returned
    const total = restaurants.length
    restaurants = restaurants.slice(offset, offset + limit)

    // Parse string fields and normalize for client consumption
    const priceLevelMap: Record<string, number> = {
      BUDGET: 1,
      MODERATE: 2,
      UPSCALE: 3,
      PREMIUM: 4,
    }

    restaurants = restaurants.map((r) => ({
      ...r,
      lat: r.latitude,
      lng: r.longitude,
      categories: r.categories ? r.categories.split(',').map((c: string) => c.trim()) : [],
      cuisineTypes: r.cuisineTypes ? r.cuisineTypes.split(',').map((c: string) => c.trim()) : [],
      photos: r.photos ? r.photos.split(',').map((p: string) => p.trim()).filter(Boolean) : [],
      hours: safeParseJson(r.hours),
      priceLevel: priceLevelMap[r.priceLevel] || 2,
    }))

    return NextResponse.json({
      restaurants,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    )
  }
}

function safeParseJson(value?: string | null): any {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}
