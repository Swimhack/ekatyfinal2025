import type { Prisma } from '@prisma/client'

export interface CandidateFilters {
  /** Cuisine / category labels chosen explicitly by the user. */
  categories?: string[]
  /** Free-form terms contributed by mood chips. */
  terms?: string[]
  /** Single price level (legacy contract) or a list. */
  priceLevel?: string | null
  priceLevels?: string[]
  excludeIds?: string[]
  /** Restricts the draw to the restaurants currently painted on the wheel. */
  includeIds?: string[]
}

export interface GeoFilters {
  lat?: number | null
  lng?: number | null
  radius?: number | null
}

const OPEN_HOUR_START = 11
const OPEN_HOUR_END = 22

/**
 * Matches a term against everything a restaurant might be labelled with.
 *
 * Google-sourced rows store "Food,Restaurant" in `categories` and the real
 * cuisine in `cuisineTypes` (e.g. "mexican_restaurant"), while seeded rows do the
 * opposite. Matching both columns plus the name is what makes cuisine filters and
 * mood chips work against either shape of data.
 */
function termMatch(term: string): Prisma.RestaurantWhereInput {
  const contains = { contains: term, mode: 'insensitive' as const }
  return {
    OR: [
      { categories: contains },
      { cuisineTypes: contains },
      { name: contains },
    ],
  }
}

export function buildCandidateWhere(filters: CandidateFilters): Prisma.RestaurantWhereInput {
  const {
    categories = [],
    terms = [],
    priceLevel,
    priceLevels = [],
    excludeIds = [],
    includeIds = [],
  } = filters

  const and: Prisma.RestaurantWhereInput[] = []

  // Categories and mood terms are two independent groups: a restaurant needs to
  // match at least one entry in each group that is actually in use.
  if (categories.length > 0) {
    and.push({ OR: categories.map(termMatch) })
  }

  if (terms.length > 0) {
    and.push({ OR: terms.map(termMatch) })
  }

  const levels = priceLevels.length > 0 ? priceLevels : priceLevel ? [priceLevel] : []
  if (levels.length > 0) {
    and.push({ priceLevel: { in: levels } })
  }

  const where: Prisma.RestaurantWhereInput = { active: true }

  // Both can apply at once: a "Spin Similar" draw is restricted to the painted
  // wedges *and* has to keep excluding the listing the user came from.
  const idFilter: Prisma.StringFilter = {}
  if (includeIds.length > 0) idFilter.in = includeIds
  if (excludeIds.length > 0) idFilter.notIn = excludeIds
  if (idFilter.in || idFilter.notIn) {
    where.id = idFilter
  }

  if (and.length > 0) {
    where.AND = and
  }

  return where
}

export function distanceInMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

export function applyGeoFilter<T extends { latitude: number; longitude: number }>(
  candidates: T[],
  geo: GeoFilters
): Array<T & { distance?: number }> {
  const { lat, lng, radius } = geo
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return candidates

  const maxDistance = radius && radius > 0 ? radius : 5

  return candidates
    .map(candidate => ({
      ...candidate,
      distance: distanceInMiles(lat, lng, candidate.latitude, candidate.longitude),
    }))
    .filter(candidate => candidate.distance <= maxDistance)
}

/** Placeholder open-now heuristic retained from the original endpoint. */
export function isProbablyOpenNow(now = new Date()): boolean {
  const hour = now.getHours()
  return hour >= OPEN_HOUR_START && hour < OPEN_HOUR_END
}

/** Favours featured, well-reviewed and highly-rated listings without excluding anyone. */
export function weightFor(restaurant: {
  featured?: boolean
  rating?: number | null
  _count?: { reviews?: number }
}): number {
  let weight = 1
  if (restaurant.featured) weight += 2
  if (restaurant.rating && restaurant.rating >= 4.5) weight += 1
  if ((restaurant._count?.reviews ?? 0) > 100) weight += 1
  return weight
}

export function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let random = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) return items[i]
  }
  return items[items.length - 1]
}

function splitList(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split(',').map(part => part.trim()).filter(Boolean)
}

/**
 * Shrinks a Prisma row down to what the wheel and the reveal card actually need,
 * expanding the comma-separated columns into arrays.
 */
export function serializeRestaurant(restaurant: any) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description ?? null,
    address: restaurant.address,
    city: restaurant.city,
    state: restaurant.state,
    zipCode: restaurant.zipCode,
    phone: restaurant.phone ?? null,
    website: restaurant.website ?? null,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    priceLevel: restaurant.priceLevel,
    rating: restaurant.rating ?? null,
    reviewCount: restaurant.reviewCount ?? 0,
    featured: restaurant.featured ?? false,
    verified: restaurant.verified ?? false,
    categories: splitList(restaurant.categories),
    cuisineTypes: splitList(restaurant.cuisineTypes),
    photos: splitList(restaurant.photos),
    logoUrl: restaurant.logoUrl ?? null,
    distance: typeof restaurant.distance === 'number' ? restaurant.distance : undefined,
  }
}

export type SpinnerRestaurant = ReturnType<typeof serializeRestaurant>

/** Tolerant list parsing for query strings and JSON bodies alike. */
export function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean)
  return []
}

export function parseNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}
