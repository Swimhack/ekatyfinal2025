// Ask eKaty — which stored photo, if any, represents a pick.
//
// Ask never fetches, scrapes or generates imagery. This only chooses among URLs
// the listing row already carries, and it defers to the site-wide photo policy
// so a national chain's Open Graph tile is declined here for exactly the same
// reason it is declined on the listing grids.

import { pickDisplayPhoto } from '@/lib/photos/photo-policy'

/** The photo-bearing columns of a `restaurants` row, plus parsed metadata. */
export interface CandidatePhotoSource {
  /** `restaurants.photos` — historically comma-separated, sometimes JSON. */
  photos?: string | string[] | null
  /** `restaurants.logo_url`. */
  logoUrl?: string | null
  /** Parsed `restaurants.metadata`, where admin hero saves land. */
  metadata?: Record<string, unknown> | null
}

function metadataUrl(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * The photo a pick should show, or null when the row carries none we can stand
 * behind.
 *
 * An explicitly saved hero outranks imported photos, which outrank the logo.
 * The hero has been written under three metadata keys over time — production
 * rows carry `profileImageUrl` while the admin save writes `heroImage` — so all
 * of them are read rather than assuming one won. Returning null is a real
 * answer: the card shows a placeholder instead of a stock photo of someone
 * else's dining room.
 */
export function resolveCandidatePhoto(source: CandidatePhotoSource): string | null {
  return pickDisplayPhoto({
    heroImage: metadataUrl(source.metadata, 'heroImage'),
    heroImageUrl: metadataUrl(source.metadata, 'heroImageUrl'),
    profileImageUrl: metadataUrl(source.metadata, 'profileImageUrl'),
    photos: source.photos,
    logoUrl: source.logoUrl,
  })
}
