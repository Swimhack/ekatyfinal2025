import { Prisma } from '@prisma/client'
import {
  haversineMiles,
  isOpenAt,
  termVariants,
  ZIP_CENTROIDS,
  type ParsedQuery,
} from './parse-query'

/**
 * Shared query construction for restaurant search.
 *
 * Both the list view (/api/restaurants) and the map view (/map) have to resolve a
 * query to the same rows, so the filtering, ZIP resolution and proximity ranking
 * live here rather than being written twice and drifting apart.
 */

/** Listings the imports picked up that are not places to eat. */
export const JUNK_NAME_FILTER: Prisma.RestaurantWhereInput = {
  NOT: {
    OR: [
      'Insurance', 'Chiropractic', 'Rebate', 'Plumber', 'Attorney', 'Lawyer',
      'Law Firm', 'Dentist', 'Auto Repair', 'Advance America', 'Mortgage',
      'Real Estate', 'Pharmacy', 'I Fix Phones', 'Sun & Ski', 'Jiu Jitsu',
      'Remodel', 'Exteriors',
      // Non-food listings the import tagged as restaurants anyway — a photographer
      // carrying cuisineTypes "Pho" is why these need excluding by name. Only terms
      // with no restaurant collisions: "Church", "School", "Law" and "Spa" all
      // appear inside real names here (Church's Chicken, Old School Burger,
      // Malawis Pizza, Raspados El Oasis).
      'Photography', 'Photo &', 'Wealth', 'Financial', 'Edward Jones',
      'Veterinary', 'Animal Hospital', 'Driving Academy', 'Medical, Inc',
    ].map((name) => ({ name: { contains: name, mode: 'insensitive' as const } })),
  },
}

export interface FilterOptions {
  category?: string | null
  categoryTags?: string[] | null
  priceLevel?: string | null
  featured?: boolean
}

/**
 * Tags live in one comma-separated column ("Bakery, Food, Cafe"), so a plain
 * `contains` bleeds across tag boundaries: "Deli" also matches "Delivery" and
 * "Tea" also matches "Steakhouse". Search tolerates that because a human typing
 * "tea" is being offered guesses; a category page cannot, so match the tag as a
 * whole list item. The separator is written both as "," and ", ".
 */
function wholeTagMatch(
  column: 'categories' | 'cuisineTypes',
  tag: string
): Prisma.RestaurantWhereInput[] {
  const mode = 'insensitive' as const
  return [
    { [column]: { equals: tag, mode } },
    { [column]: { startsWith: `${tag},`, mode } },
    { [column]: { endsWith: `,${tag}`, mode } },
    { [column]: { endsWith: `, ${tag}`, mode } },
    { [column]: { contains: `,${tag},`, mode } },
    { [column]: { contains: `, ${tag},`, mode } },
  ] as Prisma.RestaurantWhereInput[]
}

/**
 * Every clause narrows the result set, so they are AND-ed into one list. Building
 * a single array also avoids the old bug where the category filter reassigned
 * `where.AND` and silently dropped the junk-name exclusion.
 */
export function buildSearchConditions(
  parsed: ParsedQuery,
  opts: FilterOptions = {}
): Prisma.RestaurantWhereInput[] {
  const conditions: Prisma.RestaurantWhereInput[] = [JUNK_NAME_FILTER]

  // A cuisine is one idea to a human but several tags in the data ("Mexican",
  // "Taqueria", "Taco", "Tex-Mex"), so match any of the expanded set.
  if (parsed.cuisines.length) {
    conditions.push({
      OR: parsed.cuisines.flatMap((c) => [
        { cuisineTypes: { contains: c, mode: 'insensitive' as const } },
        { categories: { contains: c, mode: 'insensitive' as const } },
      ]),
    })
  }

  // Leftover words each have to land somewhere. AND-ing per token is what makes
  // multi-word queries work; the original code matched the whole raw string as one
  // literal substring and so failed on anything but a single cuisine word.
  for (const term of parsed.terms) {
    conditions.push({
      OR: termVariants(term).flatMap((v) => [
        { name: { contains: v, mode: 'insensitive' as const } },
        { description: { contains: v, mode: 'insensitive' as const } },
        { categories: { contains: v, mode: 'insensitive' as const } },
        { cuisineTypes: { contains: v, mode: 'insensitive' as const } },
        { address: { contains: v, mode: 'insensitive' as const } },
      ]),
    })
  }

  if (opts.category) {
    conditions.push({
      OR: [
        { categories: { contains: opts.category, mode: 'insensitive' as const } },
        { cuisineTypes: { contains: opts.category, mode: 'insensitive' as const } },
      ],
    })
  }

  if (opts.categoryTags?.length) {
    conditions.push({
      OR: opts.categoryTags.flatMap((tag) => [
        ...wholeTagMatch('categories', tag),
        ...wholeTagMatch('cuisineTypes', tag),
      ]),
    })
  }

  const price = opts.priceLevel || parsed.priceLevel
  if (price) conditions.push({ priceLevel: price as any })

  if (opts.featured) conditions.push({ featured: true })

  return conditions
}

export interface Origin {
  lat: number
  lng: number
}

/**
 * Resolve a searched ZIP to a point on the map.
 *
 * A ZIP is treated as a location hint rather than a filter: 77493 holds 13 rows
 * against 77494's 1,545, 206 rows carry no ZIP at all and some are stored ZIP+4,
 * so filtering on the string returns a near-empty page for an area that plainly
 * has options and misses anything whose ZIP is simply dirty. Ranking by real
 * distance survives all three problems.
 */
export async function resolveOrigin(
  prisma: any,
  parsed: ParsedQuery
): Promise<{ origin: Origin | null; originZip: string | null }> {
  if (!parsed.zips.length) return { origin: null, originZip: null }

  const originZip = parsed.zips[0]
  const known = ZIP_CENTROIDS[originZip]
  if (known) return { origin: known, originZip }

  // Unknown ZIP: derive a centroid from whatever rows claim it.
  const rows = await prisma.restaurant.findMany({
    where: { active: true, zipCode: { startsWith: originZip } },
    select: { latitude: true, longitude: true },
    take: 200,
  })
  const pts = rows.filter((r: any) => r.latitude && r.longitude)
  if (!pts.length) return { origin: null, originZip }

  return {
    origin: {
      lat: pts.reduce((s: number, r: any) => s + r.latitude, 0) / pts.length,
      lng: pts.reduce((s: number, r: any) => s + r.longitude, 0) / pts.length,
    },
    originZip,
  }
}

/**
 * Annotate rows with distance from the searched location and sort by relevance.
 *
 * Lower score is better. Distance leads, then a ZIP match is worth three quarters
 * of a mile of credit and rating a quarter mile per star above average — enough to
 * lift a well-reviewed place one street over above a mediocre one that merely has
 * the right ZIP on file.
 */
export function rankByProximity<T extends Record<string, any>>(
  rows: T[],
  origin: Origin,
  originZip: string | null
): (T & { distance: number | null; inSearchedZip: boolean; score: number })[] {
  return rows
    .map((r) => {
      const distance =
        r.latitude && r.longitude
          ? haversineMiles(origin.lat, origin.lng, r.latitude, r.longitude)
          : null
      const inSearchedZip = Boolean(originZip && (r.zipCode || '').startsWith(originZip))
      const score =
        (distance ?? 25) - (inSearchedZip ? 0.75 : 0) - ((r.rating || 3.5) - 3.5) * 0.25
      return { ...r, distance, inSearchedZip, score }
    })
    .sort((a, b) => a.score - b.score)
}

/** Drop rows whose hours say they're shut. Unknown or unparseable hours stay in. */
export function filterOpenNow<T extends { hours?: string | null }>(rows: T[], now = new Date()): T[] {
  return rows.filter((r) => isOpenAt(r.hours, now) !== false)
}
