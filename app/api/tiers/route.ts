import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tiers = await prisma.partnershipTier.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    })

    return NextResponse.json({ tiers: tiers || [] })
  } catch (error) {
    console.error('Error fetching tiers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
