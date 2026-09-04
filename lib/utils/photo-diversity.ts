/** Keep adjacent restaurant cards from showing the same photo. */

import { parsePhotos } from '@/lib/photos/parse-photos'
import { assessPhotoUrl } from '@/lib/photos/photo-policy'

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

export type PhotoRestaurant = {
  id?: string
  name?: string
  photos?: string | string[] | null
  heroImage?: string | null
  heroImageUrl?: string | null
  profileImageUrl?: string | null
  logoUrl?: string | null
  categories?: any
  cuisineTypes?: any
  cuisine_types?: any
  displayPhoto?: string
  [key: string]: any
}

/**
 * Picks which of a restaurant's own photos to show, avoiding a repeat of what
 * the previous few cards used.
 *
 * It deliberately does not substitute a stock image when a restaurant has no
 * photo. Doing so put one Unsplash burger on 81 unrelated listings, including a
 * corporate food distributor and an engineering firm. A card with no photo is
 * honest; a card with someone else's photo is not. The caller renders a designed
 * empty state when `displayPhoto` is null.
 *
 * Every candidate goes through the photo policy first, so a stock image, a
 * favicon or a chain's Open Graph tile can never reach a card even when it is
 * the only thing stored against the row.
 */
export function diversifyAdjacentPhotos<T extends PhotoRestaurant>(
  restaurants: T[],
  options: { window?: number } = {}
): Array<T & { displayPhoto: string | null }> {
  const windowSize = Math.max(1, options.window ?? 4)
  const recent: string[] = []

  return restaurants.map((r) => {
    const own = [
      r.heroImage,
      r.heroImageUrl,
      r.profileImageUrl,
      ...parsePhotos(r.photos),
      r.logoUrl,
    ]
      .filter(Boolean)
      .filter((url) => assessPhotoUrl(String(url)).ok) as string[]
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
