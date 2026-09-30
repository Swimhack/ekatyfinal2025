import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { matchesCategory } from '@/lib/search'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      categories = [],
      priceLevel,
      openNow = false,
      radius = 5,
      lat,
      lng,
      excludeIds = [],
      userId = null,
      sessionId = null
    } = body
    
    // Build query filters
    const where: Prisma.RestaurantWhereInput = {
      active: true,
      id: {
        notIn: excludeIds
      }
    }
    
    // Category filter — broad case-insensitive DB prefilter; precise
    // whole-word matching applied after the query
    if (categories.length > 0) {
      where.OR = categories.flatMap((cat: string) => [
        { categories: { contains: cat, mode: 'insensitive' as const } },
        { cuisineTypes: { contains: cat, mode: 'insensitive' as const } }
      ])
    }
    
    // Price level filter
    if (priceLevel) {
      where.priceLevel = priceLevel
    }
    
    // Get candidate restaurants
    let candidates = await prisma.restaurant.findMany({
      where,
      include: {
        _count: {
          select: {
            reviews: true,
            favorites: true
          }
        }
      }
    })
    
    // Precise category matching ("Bar" must not match "Barbecue")
    if (categories.length > 0) {
      candidates = candidates.filter(restaurant =>
        categories.some((cat: string) =>
          matchesCategory([restaurant.categories, restaurant.cuisineTypes], cat)
        )
      )
    }

    // Filter by distance if coordinates provided
    if (lat && lng) {
      const userLat = parseFloat(lat)
      const userLng = parseFloat(lng)
      const maxDistance = parseFloat(radius)
      
      candidates = candidates.filter(restaurant => {
        const distance = calculateDistance(
          userLat,
          userLng,
          restaurant.latitude,
          restaurant.longitude
        )
        return distance <= maxDistance
      })
    }
    
    // Filter by open now (simplified - would need real hours checking)
    if (openNow) {
      const now = new Date()
      const currentHour = now.getHours()
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const currentDay = days[now.getDay()] // 'mon', 'tue', etc.
      
      candidates = candidates.filter(restaurant => {
        // This is simplified - real implementation would parse hours JSON
        // For now, assume restaurants open 11am-10pm
        return currentHour >= 11 && currentHour < 22
      })
    }
    
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No restaurants match your criteria' },
        { status: 404 }
      )
    }
    
    // Weighted random selection (favor featured and high-rated)
    const weights = candidates.map(r => {
      let weight = 1
      if (r.featured) weight += 2
      if (r.rating && r.rating >= 4.5) weight += 1
      if (r._count.reviews > 100) weight += 1
      return weight
    })
    
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight
    let selectedIndex = 0
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        selectedIndex = i
        break
      }
    }
    
    const selected = candidates[selectedIndex]
    
    // Parse string fields back to arrays
    const formattedSelected = {
      ...selected,
      categories: selected.categories ? selected.categories.split(',').map((c: string) => c.trim()) : [],
      cuisineTypes: selected.cuisineTypes ? selected.cuisineTypes.split(',').map((c: string) => c.trim()) : [],
      photos: selected.photos ? selected.photos.split(',').map((p: string) => p.trim()) : [],
      hours: selected.hours ? JSON.parse(selected.hours) : {}
    }
    
    // Generate seed for reproducibility
    const seed = Math.random().toString(36).substring(7)
    
    // Save spin to database
    await prisma.spin.create({
      data: {
        userId,
        restaurantId: selected.id,
        spinParams: JSON.stringify({
          categories,
          priceLevel,
          openNow,
          radius,
          lat,
          lng
        }),
        seed,
        sessionId: sessionId || (userId ? null : `anon-${Date.now()}`)
      }
    })
    
    return NextResponse.json({
      restaurant: formattedSelected,
      seed,
      candidatesCount: candidates.length
    })
    
  } catch (error) {
    console.error('Error processing spin:', error)
    return NextResponse.json(
      { error: 'Failed to process spin' },
      { status: 500 }
    )
  }
}

// Helper function to calculate distance
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