/**
 * Single source of truth for "which image represents this restaurant".
 *
 * Hero images have historically been written to two different metadata keys
 * (`heroImage` in this codebase, `profileImageUrl` in production data), while
 * cards and grids read `photos[0]`. Reading one key and writing another is why
 * an admin upload could succeed and still leave the old photo on screen, so
 * every read and write goes through the helpers below.
 */

export type MetadataInput = string | Record<string, any> | null | undefined
export type PhotosInput = string | string[] | null | undefined

export interface RestaurantImageSource {
  metadata?: MetadataInput
  photos?: PhotosInput
  logoUrl?: string | null
}

export function parseRestaurantMetadata(metadata: MetadataInput): Record<string, any> {
  if (!metadata) return {}
  if (typeof metadata === 'object') return { ...metadata }

  try {
    const parsed = JSON.parse(metadata)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.error('Error parsing restaurant metadata:', error)
    return {}
  }
}

export function parsePhotos(photos: PhotosInput): string[] {
  if (!photos) return []
  const list = Array.isArray(photos) ? photos : photos.split(',')
  return list.map((photo) => (photo || '').trim()).filter(Boolean)
}

export function serializePhotos(photos: string[]): string {
  return parsePhotos(photos).join(',')
}

function normalizeUrl(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * The hero an admin actually saved, under either metadata key. No photo/logo
 * fallback: callers that edit the record must be able to tell "no hero set"
 * from "falling back to an imported photo".
 */
export function resolveExplicitHeroImage(metadata: MetadataInput): string | null {
  const parsed = parseRestaurantMetadata(metadata)
  return normalizeUrl(parsed.heroImage) || normalizeUrl(parsed.profileImageUrl) || null
}

/**
 * Resolution order: an explicitly uploaded hero wins over imported photos, so a
 * brand/OG image never takes the primary slot back from an admin upload.
 */
export function resolveHeroImage(source: RestaurantImageSource): string | null {
  const photos = parsePhotos(source.photos)

  return (
    resolveExplicitHeroImage(source.metadata) ||
    normalizeUrl(photos[0]) ||
    normalizeUrl(source.logoUrl) ||
    null
  )
}

/** Puts the hero first (deduped) so `photos[0]` consumers agree with the hero. */
export function orderPhotosWithHeroFirst(photos: PhotosInput, heroImage: string | null): string[] {
  const list = parsePhotos(photos)
  const hero = normalizeUrl(heroImage)
  const deduped = list.filter((photo, index) => list.indexOf(photo) === index)

  if (!hero) return deduped

  return [hero, ...deduped.filter((photo) => photo !== hero)]
}

/** Writes the hero to every key consumers read, and promotes it to `photos[0]`. */
export function applyHeroImage(options: {
  metadata: MetadataInput
  photos: PhotosInput
  heroImage: string
}): { metadata: Record<string, any>; photos: string[]; photosCsv: string } {
  const metadata = parseRestaurantMetadata(options.metadata)
  const hero = normalizeUrl(options.heroImage)

  if (!hero) {
    throw new Error('applyHeroImage requires a non-empty hero image URL')
  }

  metadata.heroImage = hero
  metadata.profileImageUrl = hero

  const photos = orderPhotosWithHeroFirst(options.photos, hero)

  return { metadata, photos, photosCsv: serializePhotos(photos) }
}

/** Clears every hero key, leaving `photos` to provide the fallback. */
export function clearHeroImage(metadata: MetadataInput): Record<string, any> {
  const next = parseRestaurantMetadata(metadata)
  delete next.heroImage
  delete next.profileImageUrl
  return next
}

/**
 * Shapes a restaurant row for any client that renders an image, so cards,
 * grids, map popups and the detail page all agree on the primary photo.
 */
export function withResolvedImages<T extends RestaurantImageSource>(
  restaurant: T
): T & { heroImage: string | null; photos: string[] } {
  const heroImage = resolveHeroImage(restaurant)

  return {
    ...restaurant,
    heroImage,
    photos: orderPhotosWithHeroFirst(restaurant.photos, heroImage),
  }
}
