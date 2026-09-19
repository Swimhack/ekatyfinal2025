import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  buildCandidateWhere,
  parseList,
  serializeRestaurant,
  type CandidateFilters,
} from '@/lib/spinner/candidates'

const NUMERIC_PRICE_LEVELS: Record<string, string> = {
  '1': 'BUDGET',
  '2': 'MODERATE',
  '3': 'UPSCALE',
  '4': 'PREMIUM',
}

/**
 * Price levels arrive either as enum names ("BUDGET") from JSON bodies or as the
 * numeric 1-4 scale from query strings, so normalise both into enum names.
 */
function normalizePriceLevels(values: string[]): string[] {
  return values
    .map(value => NUMERIC_PRICE_LEVELS[value] || value.toUpperCase())
    .filter(value => Object.values(NUMERIC_PRICE_LEVELS).includes(value))
}

/**
 * Callers historically disagreed about where the filters live: the wheel sends
 * them as a query string on a POST with no body, while other clients send a JSON
 * body. Reading both keeps every caller working instead of throwing on an empty
 * body.
 */
async function readFilters(request: NextRequest): Promise<CandidateFilters> {
  const params = request.nextUrl.searchParams
  let body: any = {}

  if (request.method !== 'GET') {
    body = await request.json().catch(() => ({}))
  }

  return {
    categories: [...parseList(params.get('categories')), ...parseList(body.categories)],
    terms: [...parseList(params.get('terms')), ...parseList(body.terms)],
    priceLevels: normalizePriceLevels([
      ...parseList(params.get('priceLevel')),
      ...parseList(params.get('priceLevels')),
      ...parseList(body.priceLevel),
      ...parseList(body.priceLevels),
    ]),
    excludeIds: [...parseList(params.get('excludeIds')), ...parseList(body.excludeIds)],
  }
}

async function spin(request: NextRequest) {
  try {
    const filters = await readFilters(request)

    const restaurants = await prisma.restaurant.findMany({
      where: buildCandidateWhere(filters),
      take: 100,
    })

    if (restaurants.length === 0) {
      return NextResponse.json({ error: 'No restaurants found matching criteria' }, { status: 404 })
    }

    const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)]

    try {
      await prisma.spin.create({
        data: {
          restaurantId: restaurant.id,
          spinParams: JSON.stringify(filters),
        },
      })
    } catch (error) {
      console.error('Failed to record spin:', error)
    }

    return NextResponse.json({
      restaurant: { ...restaurant, ...serializeRestaurant(restaurant) },
      candidatesCount: restaurants.length,
    })
  } catch (error) {
    console.error('Error spinning restaurant:', error)
    return NextResponse.json({ error: 'Failed to spin restaurant' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return spin(request)
}

export async function POST(request: NextRequest) {
  return spin(request)
}
