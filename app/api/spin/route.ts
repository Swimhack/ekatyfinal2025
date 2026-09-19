import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  applyGeoFilter,
  buildCandidateWhere,
  isProbablyOpenNow,
  parseList,
  parseNumber,
  serializeRestaurant,
  weightFor,
  weightedPick,
  type CandidateFilters,
  type GeoFilters,
} from '@/lib/spinner/candidates'

/** Upper bound on how many rows the wheel pool endpoint will hand back. */
const MAX_POOL = 60

const CANDIDATE_INCLUDE = {
  _count: {
    select: {
      reviews: true,
      favorites: true,
    },
  },
} as const

interface SpinRequest extends CandidateFilters, GeoFilters {
  openNow?: boolean
  userId?: string | null
  sessionId?: string | null
}

async function loadCandidates(filters: CandidateFilters, geo: GeoFilters, openNow: boolean) {
  const candidates = await prisma.restaurant.findMany({
    where: buildCandidateWhere(filters),
    include: CANDIDATE_INCLUDE,
  })

  let filtered: any[] = applyGeoFilter(candidates, geo)

  if (openNow && !isProbablyOpenNow()) {
    filtered = []
  }

  return filtered
}

/**
 * Wheel pool. The spinner needs real names to paint on the wedges before it can
 * ask for a winner, so this returns the candidate set for the current filters.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams

    const filters: CandidateFilters = {
      categories: parseList(params.get('categories')),
      terms: parseList(params.get('terms')),
      priceLevels: parseList(params.get('priceLevels') || params.get('priceLevel')),
      excludeIds: parseList(params.get('excludeIds')),
    }

    const geo: GeoFilters = {
      lat: parseNumber(params.get('lat')),
      lng: parseNumber(params.get('lng')),
      radius: parseNumber(params.get('radius')),
    }

    const limit = Math.min(parseNumber(params.get('limit')) ?? 24, MAX_POOL)
    const candidates = await loadCandidates(filters, geo, params.get('openNow') === 'true')

    // Shuffle so repeated visits do not always paint the same wedges, but keep
    // the total so the UI can tell the user how deep the pool really is.
    const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, limit)

    return NextResponse.json({
      restaurants: shuffled.map(serializeRestaurant),
      total: candidates.length,
    })
  } catch (error) {
    console.error('Error loading spin pool:', error)
    return NextResponse.json({ error: 'Failed to load spin pool' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SpinRequest = await request.json().catch(() => ({} as SpinRequest))

    const {
      categories = [],
      terms = [],
      priceLevel,
      priceLevels = [],
      openNow = false,
      radius = 5,
      lat,
      lng,
      excludeIds = [],
      includeIds = [],
      userId = null,
      sessionId = null,
    } = body

    const filters: CandidateFilters = {
      categories: parseList(categories),
      terms: parseList(terms),
      priceLevel: priceLevel ?? null,
      priceLevels: parseList(priceLevels),
      excludeIds: parseList(excludeIds),
      includeIds: parseList(includeIds),
    }

    const geo: GeoFilters = {
      lat: parseNumber(lat),
      lng: parseNumber(lng),
      radius: parseNumber(radius),
    }

    const candidates = await loadCandidates(filters, geo, openNow)

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No restaurants match your criteria' }, { status: 404 })
    }

    const selected = weightedPick(candidates, candidates.map(weightFor))
    const seed = Math.random().toString(36).substring(7)

    // A failed analytics write should never cost the user their spin.
    try {
      await prisma.spin.create({
        data: {
          userId,
          restaurantId: selected.id,
          spinParams: JSON.stringify({ categories, terms, priceLevel, priceLevels, openNow, radius, lat, lng }),
          seed,
          sessionId: sessionId || (userId ? null : `anon-${Date.now()}`),
        },
      })
    } catch (error) {
      console.error('Failed to record spin:', error)
    }

    return NextResponse.json({
      restaurant: {
        ...selected,
        ...serializeRestaurant(selected),
        hours: selected.hours ? safeParseHours(selected.hours) : {},
      },
      seed,
      candidatesCount: candidates.length,
    })
  } catch (error) {
    console.error('Error processing spin:', error)
    return NextResponse.json({ error: 'Failed to process spin' }, { status: 500 })
  }
}

function safeParseHours(hours: string): Record<string, unknown> {
  try {
    return JSON.parse(hours)
  } catch {
    return {}
  }
}
