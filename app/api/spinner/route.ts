import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categories, priceLevel } = body

    // Build filter conditions
    const where: any = { active: true }

    if (categories && categories.length > 0) {
      where.OR = categories.map((cat: string) => ({
        categories: { contains: cat }
      }))
    }

    if (priceLevel && priceLevel.length > 0) {
      const priceLevelMap: Record<number, string> = {
        1: 'BUDGET', 2: 'MODERATE', 3: 'UPSCALE', 4: 'PREMIUM'
      }
      where.priceLevel = {
        in: priceLevel.map((p: number) => priceLevelMap[p] || 'MODERATE')
      }
    }

    const restaurants = await prisma.restaurant.findMany({
      where,
      take: 100,
    })

    if (restaurants.length === 0) {
      return NextResponse.json(
        { error: 'No restaurants found matching criteria' },
        { status: 404 }
      )
    }

    const randomIndex = Math.floor(Math.random() * restaurants.length)
    const restaurant = restaurants[randomIndex]

    // Log the spin
    try {
      await prisma.spin.create({
        data: {
          restaurantId: restaurant.id,
          spinParams: JSON.stringify({ categories, priceLevel }),
        }
      })
    } catch (e) {
      // Non-critical, don't fail the request
    }

    return NextResponse.json({ restaurant })
  } catch (error) {
    console.error('Error spinning restaurant:', error)
    return NextResponse.json(
      { error: 'Failed to spin restaurant' },
      { status: 500 }
    )
  }
}
