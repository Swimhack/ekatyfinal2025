import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { parseSearchQuery } from '@/lib/search/parse-query'
import {
  buildSearchConditions,
  resolveOrigin,
  rankByProximity,
  filterOpenNow,
} from '@/lib/search/restaurant-query'
import { isLlmSearchEnabled, llmInterpret } from '@/lib/search/llm-fallback'
import { parsePhotos } from '@/lib/photos/parse-photos'
import { filterDisplayPhotos } from '@/lib/photos/photo-policy'
import { collapseChainListings } from '@/lib/listings/chain-density'

export interface SearchRestaurantsParams {
  q?: string | null
  category?: string | null
  /** Exact tag names for a curated category page, matched as whole list items. */
  categoryTags?: string[] | null
  priceLevel?: string | null
  featured?: boolean
  lat?: string | null
  lng?: string | null
  radius?: string | null
  limit?: number
  offset?: number
  sortBy?: string | null
  /**
   * Cards a single chain may occupy, for grids that would otherwise be taken
   * over by one brand. Omit it to return every location, which is what the map
   * and any brand-specific query need.
   */
  maxPerChain?: number | null
}

const PRICE_LEVEL_RANK: Record<string, number> = {
  BUDGET: 1,
  MODERATE: 2,
  UPSCALE: 3,
  PREMIUM: 4,
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Distance between two coordinates, in miles.
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function contentPhotoScore(row: { metadata?: string | null }): number {
  try {
    const discovery = row.metadata
      ? JSON.parse(row.metadata).officialPhotoDiscovery
      : null
    return discovery?.method === 'semantic_content' &&
      typeof discovery.score === 'number'
      ? discovery.score
      : 0
  } catch {
    return 0
  }
}

/**
 * The one implementation of restaurant search. /api/restaurants and the
 * server-rendered /discover page both call this so a crawler and a browser
 * are guaranteed to be looking at the same result set.
 */
export async function searchRestaurants(params: SearchRestaurantsParams) {
  const q = (params.q || '').toLowerCase()
  const { category = null, priceLevel = null, lat = null, lng = null } = params
  const radius = params.radius || '5'
  const limit = params.limit ?? 20
  const offset = params.offset ?? 0
  const sortBy = params.sortBy || 'rating'

  const parsed = parseSearchQuery(q)
  const filters = {
    category,
    categoryTags: params.categoryTags ?? null,
    priceLevel,
    featured: params.featured === true,
  }

  let conditions = buildSearchConditions(parsed, filters)
  let where: Prisma.RestaurantWhereInput = { active: true, AND: conditions }

  const { origin, originZip } = await resolveOrigin(prisma, parsed)
  // Proximity and opening hours can only be resolved once rows are loaded — the
  // first needs coordinates, the second a JSON column — so both page in memory.
  let rankInMemory = Boolean(origin) || parsed.openNow

  const maxPerChain = params.maxPerChain ?? 0
  // Typing a brand into the search box is a request for its locations, so only
  // browse-style result sets get thinned.
  const collapseChains = maxPerChain > 0 && !q
  const prioritizeOfficialPhotos =
    !rankInMemory &&
    !q &&
    !category &&
    !priceLevel &&
    !params.featured &&
    !lat &&
    !lng &&
    (!params.sortBy || params.sortBy === 'rating')

  /**
   * Thinning chains removes rows from the middle of the ordering, so the whole
   * candidate pool has to be in hand before paging — otherwise a page loses the
   * cards that were dropped instead of backfilling from further down.
   */
  let pageInMemory = rankInMemory || collapseChains

  const select = {
    include: { _count: { select: { reviews: true, favorites: true } } },
    orderBy: { rating: 'desc' as const },
  }

  let restaurants: any[]
  if (prioritizeOfficialPhotos) {
    const officialPhotoFilter: Prisma.RestaurantWhereInput = {
      source: { not: 'google_places' },
      photos: { not: '' },
    }
    const photoWhere: Prisma.RestaurantWhereInput = {
      ...where,
      AND: [...conditions, officialPhotoFilter],
    }
    const photoCount = await prisma.restaurant.count({ where: photoWhere })
    const photoCandidates = await prisma.restaurant.findMany({
      where: photoWhere,
      ...select,
      take: Math.min(photoCount, 500),
    })
    photoCandidates.sort(
      (a, b) => contentPhotoScore(b) - contentPhotoScore(a)
    )
    const seenPhotos = new Set<string>()
    const uniquePhotoRows: typeof photoCandidates = []
    const repeatedPhotoRows: typeof photoCandidates = []
    for (const row of photoCandidates) {
      const photo = filterDisplayPhotos(parsePhotos(row.photos))[0]
      if (contentPhotoScore(row) > 0 && photo && !seenPhotos.has(photo)) {
        seenPhotos.add(photo)
        uniquePhotoRows.push(row)
      } else {
        repeatedPhotoRows.push(row)
      }
    }
    const orderedPhotoRows = [...uniquePhotoRows, ...repeatedPhotoRows]
    const photoRows = pageInMemory
      ? orderedPhotoRows
      : orderedPhotoRows.slice(offset, offset + limit)
    // Collapsing can drop most of a page, so ask for a page's worth beyond the
    // requested window and let the slice at the end trim it back.
    const remaining = pageInMemory ? offset + limit * 2 : limit - photoRows.length
    const fallbackRows =
      remaining > 0
        ? await prisma.restaurant.findMany({
            where: {
              ...where,
              AND: [...conditions, { NOT: officialPhotoFilter }],
            },
            ...select,
            take: remaining,
            skip: pageInMemory ? 0 : Math.max(0, offset - photoCount),
          })
        : []
    restaurants = [...photoRows, ...fallbackRows]
  } else {
    restaurants = await prisma.restaurant.findMany({
      where,
      ...select,
      take: pageInMemory ? 500 : limit + 20,
      skip: pageInMemory ? 0 : offset,
    })
  }

  /**
   * Nothing matched, so ask the model what the phrase meant.
   *
   * Only reached on a dead end, which keeps the common path free and instant and
   * means a slow or missing provider costs nothing. The interpretation replaces
   * the cuisine and price guesses but never the ZIP, which stays whatever the
   * digits in the query said.
   */
  let interpretedBy: 'rules' | 'model' = 'rules'
  if (!restaurants.length && q && isLlmSearchEnabled()) {
    const hint = await llmInterpret(q)
    if (hint?.cuisines?.length || hint?.priceLevel) {
      const widened = {
        ...parsed,
        cuisines: hint.cuisines?.length ? hint.cuisines : parsed.cuisines,
        priceLevel: hint.priceLevel ?? parsed.priceLevel,
        openNow: parsed.openNow || Boolean(hint.openNow),
        terms: [], // the free text is what failed; the model's reading replaces it
      }
      conditions = buildSearchConditions(widened, filters)
      where = { active: true, AND: conditions }
      rankInMemory = Boolean(origin) || widened.openNow
      pageInMemory = rankInMemory || collapseChains
      restaurants = await prisma.restaurant.findMany({
        where,
        ...select,
        take: pageInMemory ? 500 : limit + 20,
        skip: pageInMemory ? 0 : offset,
      })
      if (restaurants.length) {
        interpretedBy = 'model'
        parsed.cuisines = widened.cuisines
        parsed.priceLevel = widened.priceLevel
        parsed.openNow = widened.openNow
      }
    }
  }

  // Rows with missing or unparseable hours stay in rather than being hidden by a
  // filter they can't answer for.
  let openNowCount: number | null = null
  if (parsed.openNow) {
    restaurants = filterOpenNow(restaurants)
    openNowCount = restaurants.length
  }

  if (origin) {
    restaurants = rankByProximity(restaurants, origin, originZip)
  }

  if (lat && lng) {
    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    const maxDistance = parseFloat(radius)

    restaurants = restaurants
      .map((restaurant) => ({
        ...restaurant,
        distance: calculateDistance(userLat, userLng, restaurant.latitude, restaurant.longitude),
      }))
      .filter((r) => r.distance <= maxDistance)

    if (sortBy === 'distance') {
      restaurants.sort((a, b) => a.distance - b.distance)
    }
  }

  // A proximity ranking is already in place when the query named a location, so
  // only re-sort on an explicit non-default choice.
  if (sortBy === 'rating' && !origin) {
    restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  } else if (sortBy === 'name') {
    restaurants.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy === 'reviews') {
    restaurants.sort((a, b) => b._count.reviews - a._count.reviews)
  }

  // After ordering, so the location a chain keeps is its best-placed one, and
  // before paging, so the freed slots go to independents further down.
  if (collapseChains) {
    restaurants = collapseChainListings(restaurants, { maxPerChain })
  }

  restaurants = pageInMemory
    ? restaurants.slice(offset, offset + limit)
    : restaurants.slice(0, limit)

  restaurants = restaurants.map((r) => {
    let hours: Record<string, string> = {}
    try {
      hours = r.hours ? JSON.parse(r.hours) : {}
    } catch {
      hours = {}
    }
    return {
      ...r,
      lat: r.latitude,
      lng: r.longitude,
      categories: r.categories ? r.categories.split(',').map((c: string) => c.trim()) : [],
      cuisineTypes: r.cuisineTypes ? r.cuisineTypes.split(',').map((c: string) => c.trim()) : [],
      photos: filterDisplayPhotos(parsePhotos(r.photos)),
      hours,
      priceLevel: PRICE_LEVEL_RANK[r.priceLevel] || 2,
    }
  })

  // When "open now" trimmed the set in memory, that trimmed size is the honest total.
  const total = openNowCount ?? (await prisma.restaurant.count({ where }))

  // How many matches sit literally inside the searched ZIP, so the page can say
  // "2 here, the rest nearby" instead of implying they're all in that ZIP.
  const inZipCount = originZip
    ? await prisma.restaurant.count({
        where: { AND: [...conditions, { zipCode: { startsWith: originZip } }], active: true },
      })
    : null

  const mappable = restaurants.filter((r) => r.lat && r.lng).length

  return {
    restaurants,
    search: {
      query: parsed.raw,
      cuisines: parsed.cuisines,
      zip: originZip,
      priceLevel: priceLevel || parsed.priceLevel || null,
      terms: parsed.terms,
      labels: parsed.labels,
      geoRanked: Boolean(origin),
      openNow: parsed.openNow,
      interpretedBy,
      inZipCount,
      mappable,
      origin,
    },
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  }
}
