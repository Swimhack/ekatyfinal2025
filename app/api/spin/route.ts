import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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
    
    // Category filter
    if (categories.length > 0) {
      where.OR = categories.map((cat: string) => ({
        categories: { contains: cat }
      }))
    }
    
    // Price level filter
    if (priceLevel) {
      where.priceLevel = priceLevel
    }
    
    let candidates = []
    let relaxationLevel = 0
    const relaxationSteps = [
      { price: true, categories: true, radius: radius },
      { price: false, categories: true, radius: radius },
      { price: false, categories: false, radius: radius },
      { price: false, categories: false, radius: radius * 2 },
      { price: false, categories: false, radius: radius * 4 }
    ]

    while (candidates.length === 0 && relaxationLevel < relaxationSteps.length) {
      const step = relaxationSteps[relaxationLevel]
      
      const currentWhere = { ...where }
      if (!step.price) delete currentWhere.priceLevel
      if (!step.categories) delete currentWhere.OR
      
      let potentialCandidates = await prisma.restaurant.findMany({
        where: currentWhere,
        include: {
          _count: {
            select: {
              reviews: true,
              favorites: true
            }
          }
        }
      })

      // Filter by distance
      if (lat && lng) {
        const userLat = parseFloat(lat)
        const userLng = parseFloat(lng)
        potentialCandidates = potentialCandidates.filter(r =>
          calculateDistance(userLat, userLng, r.latitude, r.longitude) <= step.radius
        )
      }

      candidates = potentialCandidates
      relaxationLevel++
    }
    
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No restaurants found, even after expanding search.' },
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