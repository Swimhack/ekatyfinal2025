/** Keep adjacent restaurant cards from showing the same photo. */

export const CUISINE_PHOTO_POOLS: Record<string, string[]> = {
  bbq: [
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  ],
  mexican: [
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=1200&q=80',
  ],
  italian: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&w=1200&q=80',
  ],
  japanese: [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=1200&q=80',
  ],
  chinese: [
    'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1200&q=80',
  ],
  thai: [
    'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=1200&q=80',
  ],
  vietnamese: [
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1576577445504-6af96477db52?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=80',
  ],
  indian: [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80',
  ],
  seafood: [
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1615141982883-c7adab2fdf52?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=80',
  ],
  bakery: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
  ],
  pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  ],
  american: [
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
  ],
  breakfast: [
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550963210-6e7baa5c3f8b?auto=format&fit=crop&w=1200&q=80',
  ],
}

export function normalizePhotoKey(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    // Unsplash: identity by photo id path segment
    if (u.hostname.includes('unsplash.com')) {
      const m = u.pathname.match(/photo-[\w-]+/)
      return m ? `unsplash:${m[0]}` : u.origin + u.pathname
    }
    return u.origin + u.pathname
  } catch {
    return String(url).split('?')[0].toLowerCase()
  }
}

function parsePhotos(photos: unknown): string[] {
  if (Array.isArray(photos)) return photos.filter(Boolean).map(String)
  if (typeof photos === 'string' && photos.trim()) {
    return photos.split(',').map((p) => p.trim()).filter(Boolean)
  }
  return []
}

export function cuisineKeyFor(restaurant: {
  categories?: string | string[] | null
  cuisineTypes?: string | string[] | null
  cuisine_types?: string | string[] | null
  name?: string | null
}): string {
  const cats = Array.isArray(restaurant.categories)
    ? restaurant.categories.join(' ')
    : restaurant.categories || ''
  const cuisines = Array.isArray(restaurant.cuisineTypes)
    ? restaurant.cuisineTypes.join(' ')
    : restaurant.cuisineTypes || restaurant.cuisine_types || ''
  const hay = `${cats} ${cuisines} ${restaurant.name || ''}`.toLowerCase()
  const keys = Object.keys(CUISINE_PHOTO_POOLS).filter((k) => k !== 'default')
  for (const key of keys) {
    if (hay.includes(key)) return key
  }
  if (/taco|burrito|tex-mex/.test(hay)) return 'mexican'
  if (/sushi|ramen|hibachi/.test(hay)) return 'japanese'
  if (/burger|steak|grill/.test(hay)) return 'american'
  if (/coffee|espresso/.test(hay)) return 'cafe'
  if (/donut|cookie|cake|bakery|pastry/.test(hay)) return 'bakery'
  if (/bbq|barbecue|brisket/.test(hay)) return 'bbq'
  return 'default'
}

function hashPick(seed: string, pool: string[]): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return pool[h % pool.length]
}

export function pickAlternatePhoto(
  restaurant: { id?: string; name?: string; categories?: any; cuisineTypes?: any; cuisine_types?: any },
  avoidedKeys: Set<string>,
  preferred?: string | null
): string {
  const cuisine = cuisineKeyFor(restaurant)
  const pool = CUISINE_PHOTO_POOLS[cuisine] || CUISINE_PHOTO_POOLS.default
  const seed = String(restaurant.id || restaurant.name || Math.random())

  if (preferred && !avoidedKeys.has(normalizePhotoKey(preferred))) {
    return preferred
  }

  const start = (() => {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    return h % pool.length
  })()
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(start + i) % pool.length]
    if (!avoidedKeys.has(normalizePhotoKey(candidate))) return candidate
  }

  // Exhaust cuisine pool — try default pool
  const def = CUISINE_PHOTO_POOLS.default
  for (const candidate of def) {
    if (!avoidedKeys.has(normalizePhotoKey(candidate))) return candidate
  }

  // Last resort: unique-ish query param so browsers don't look identical when same base
  const base = pool[start] || def[0]
  return `${base}${base.includes('?') ? '&' : '?'}v=${encodeURIComponent(seed.slice(0, 8))}`
}

export type PhotoRestaurant = {
  id?: string
  name?: string
  photos?: string | string[] | null
  heroImage?: string | null
  logoUrl?: string | null
  categories?: any
  cuisineTypes?: any
  cuisine_types?: any
  displayPhoto?: string
  [key: string]: any
}

/**
 * Assign displayPhoto so no two restaurants within `window` of each other
 * share the same photo (covers adjacent cards in up to 4-col grids).
 */
/**
 * Picks which of a restaurant's own photos to show, avoiding a repeat of what
 * the previous few cards used.
 *
 * It deliberately does not substitute a stock image when a restaurant has no
 * photo. Doing so put one Unsplash burger on 81 unrelated listings, including a
 * corporate food distributor and an engineering firm. A card with no photo is
 * honest; a card with someone else's photo is not. The caller renders a designed
 * empty state when `displayPhoto` is null.
 */
export function diversifyAdjacentPhotos<T extends PhotoRestaurant>(
  restaurants: T[],
  options: { window?: number } = {}
): Array<T & { displayPhoto: string | null }> {
  const windowSize = Math.max(1, options.window ?? 4)
  const recent: string[] = []

  return restaurants.map((r) => {
    const photos = parsePhotos(r.photos)
    const own = [r.heroImage, ...photos, r.logoUrl].filter(Boolean) as string[]
    const avoided = new Set(recent)

    // Prefer one of this restaurant's own photos that has not just been shown;
    // if every one of them has, show it anyway rather than inventing something.
    const chosen = own.find((p) => !avoided.has(normalizePhotoKey(p))) || own[0] || null

    if (chosen) {
      recent.push(normalizePhotoKey(chosen))
      if (recent.length > windowSize) recent.shift()
    }

    return { ...r, displayPhoto: chosen }
  })
}
