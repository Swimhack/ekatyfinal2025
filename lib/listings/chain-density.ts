/**
 * Stops one chain from taking over a listing grid.
 *
 * Each location of a chain is its own row with its own Google Place id, which is
 * correct — they have different addresses and hours. Sorted by rating with no
 * further rules, though, fifteen Starbucks rows landed above most of Katy's
 * independent coffee shops on /categories/cafe, all carrying the same corporate
 * tile. The page advertised a chain instead of listing a town.
 *
 * So a grid shows a limited number of cards per chain and says how many
 * locations there are, rather than spending a row on each one.
 */

/**
 * Location qualifiers a chain appends to the brand: "Fajita Pete's - Firethorne",
 * "McDonald's (To Go only)", "Taco Bell - Live Más Café", "Starbucks #1234".
 * Splitting on these leaves the brand itself.
 */
const BRANCH_SEPARATOR = /\s[-–—|@/]\s|\s{2,}|[(#[]/

/** Trailing place names that distinguish branches rather than brands. */
const TRAILING_PLACE =
  /\s+(katy|houston|fulshear|cinco ranch|cinco|richmond|sugar land|texas|tx|mason rd|mason road|grand pkwy|grand parkway|i-?10|westheimer|fry rd|fry road)$/

/**
 * The brand a listing belongs to, or '' when the name is too short to group on.
 *
 * Only ever used to compare two names to each other, so the output is not meant
 * to be displayed.
 */
export function normalizeChainName(name: unknown): string {
  if (typeof name !== 'string') return ''

  let key = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  key = key.split(BRANCH_SEPARATOR)[0]
  // Apostrophes and dots are inconsistent across imports: "Wendy's" / "Wendys",
  // "Crust Pizza Co." / "Crust Pizza Co".
  key = key.replace(/['’`´.,]/g, '')
  key = key.replace(/[^a-z0-9]+/g, ' ').trim()
  // A bare store number is a branch, not part of the brand.
  key = key.replace(/\s+\d+$/, '')
  while (TRAILING_PLACE.test(key)) {
    key = key.replace(TRAILING_PLACE, '').trim()
  }

  // Single characters and empties would group unrelated listings together.
  return key.length < 2 ? '' : key
}

export interface ChainDensityOptions {
  /** Cards one chain may occupy in a single grid. Defaults to 1. */
  maxPerChain?: number
}

export type WithChainDensity<T> = T & {
  /** How many locations of this chain the result set held. 1 when not a chain. */
  chainLocationCount: number
  /** Grouping key, exposed so a caller can link to the full set. */
  chainKey: string
}

/**
 * Trims a sorted result set to at most `maxPerChain` cards per brand, keeping
 * the highest-placed ones and the original ordering.
 *
 * `chainLocationCount` is counted over everything passed in, so it is only as
 * complete as the caller's candidate pool — pass the pool, not one page of it.
 */
export function collapseChainListings<T extends { name?: unknown }>(
  restaurants: T[],
  options: ChainDensityOptions = {}
): Array<WithChainDensity<T>> {
  const maxPerChain = Math.max(1, options.maxPerChain ?? 1)

  const totals = new Map<string, number>()
  for (const restaurant of restaurants) {
    const key = normalizeChainName(restaurant?.name)
    if (key) totals.set(key, (totals.get(key) || 0) + 1)
  }

  const shown = new Map<string, number>()
  const kept: Array<WithChainDensity<T>> = []

  for (const restaurant of restaurants) {
    const key = normalizeChainName(restaurant?.name)

    // An unnameable row is never grouped; dropping it would lose a listing.
    if (!key) {
      kept.push({ ...restaurant, chainLocationCount: 1, chainKey: '' })
      continue
    }

    const alreadyShown = shown.get(key) || 0
    if (alreadyShown >= maxPerChain) continue
    shown.set(key, alreadyShown + 1)

    kept.push({
      ...restaurant,
      chainLocationCount: totals.get(key) || 1,
      chainKey: key,
    })
  }

  return kept
}
