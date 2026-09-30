/**
 * Shared search/filter helpers for restaurant queries.
 *
 * Categories and cuisines are stored as comma-separated strings, so
 * database `contains` filters can only act as a broad prefilter — they are
 * case-sensitive on PostgreSQL and match substrings ("Bar" would match
 * "Barbecue"). These helpers provide the precise, case-insensitive
 * whole-word matching applied after the database query.
 */

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * True when `category` appears as a whole word in any of the given
 * comma-separated tag fields (case-insensitive).
 *
 *   matchesCategory(["BBQ,Barbecue"], "Bar")          -> false
 *   matchesCategory(["Sports Bar,American"], "Bar")   -> true
 *   matchesCategory(["Asian Fusion"], "Asian")        -> true
 *   matchesCategory(["Mexican"], "mexican")           -> true
 */
export function matchesCategory(
  csvFields: (string | null | undefined)[],
  category: string
): boolean {
  const target = category.trim()
  if (!target) return true
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(target)}([^a-z0-9]|$)`, 'i')
  return csvFields.some((field) => !!field && pattern.test(field))
}

/** Haversine distance between two coordinates, in miles */
export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => deg * (Math.PI / 180)
  const R = 3959
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
