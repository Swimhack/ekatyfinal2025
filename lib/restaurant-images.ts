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

/**
 * Metadata flag recording that the hero URL was added to `photos` by
 * `applyHeroImage` rather than being a gallery photo in its own right. Clearing
 * the hero then knows whether removing it from `photos` would lose a photo the
 * restaurant had independently.
 */
const HERO_IN_PHOTOS_FLAG = 'heroImageAddedToPhotos'

/**
 * Where the hero URL sat in `photos` before it was promoted to the front, so
 * clearing the hero can put a gallery photo back where the admin had it instead
 * of leaving it pinned first.
 */
const HERO_PHOTO_INDEX_KEY = 'heroImagePreviousPhotoIndex'

export interface HeroImageWrite {
  metadata: Record<string, any>
  photos: string[]
  photosCsv: string
}

/**
 * Rewinds a previous `applyHeroImage` promotion, returning the gallery order the
 * admin actually curated.
 *
 * Both writers start from this: measuring against the already-promoted list is
 * what let a re-save record index 0 for a photo that was originally further down,
 * and what let a replaced hero linger in `photos`.
 */
function restoreGalleryOrder(metadata: Record<string, any>, photos: string[]): string[] {
  const previousHero = resolveExplicitHeroImage(metadata)

  if (!previousHero || !photos.includes(previousHero)) return photos

  const without = photos.filter((photo) => photo !== previousHero)

  // This module injected it, so rewinding takes it back out.
  if (metadata[HERO_IN_PHOTOS_FLAG] === true) return without

  const previousIndex = metadata[HERO_PHOTO_INDEX_KEY]
  if (typeof previousIndex === 'number' && previousIndex >= 0) {
    const target = Math.min(previousIndex, without.length)
    return [...without.slice(0, target), previousHero, ...without.slice(target)]
  }

  // Legacy row with no bookkeeping: leave the list untouched rather than guess.
  return photos
}

/** Writes the hero to every key consumers read, and promotes it to `photos[0]`. */
export function applyHeroImage(options: {
  metadata: MetadataInput
  photos: PhotosInput
  heroImage: string
}): HeroImageWrite {
  const metadata = parseRestaurantMetadata(options.metadata)
  const hero = normalizeUrl(options.heroImage)

  if (!hero) {
    throw new Error('applyHeroImage requires a non-empty hero image URL')
  }

  // Rewind the previous hero first: a hero this module injected is dropped when
  // it is replaced, and a gallery photo goes back to its curated position, so
  // the bookkeeping below describes the real gallery rather than a promoted list.
  const gallery = restoreGalleryOrder(metadata, parsePhotos(options.photos))
  const wasGalleryPhoto = gallery.includes(hero)

  metadata.heroImage = hero
  metadata.profileImageUrl = hero
  metadata[HERO_IN_PHOTOS_FLAG] = !wasGalleryPhoto

  if (wasGalleryPhoto) {
    metadata[HERO_PHOTO_INDEX_KEY] = gallery.indexOf(hero)
  } else {
    delete metadata[HERO_PHOTO_INDEX_KEY]
  }

  const photos = orderPhotosWithHeroFirst(gallery, hero)

  return { metadata, photos, photosCsv: serializePhotos(photos) }
}

/**
 * Clears every hero key and undoes the `photos[0]` promotion.
 *
 * Deleting the metadata keys alone was not enough: `resolveHeroImage` falls back
 * to `photos[0]`, so the image that was just cleared kept showing on public
 * pages. The URL is dropped from `photos` only when this module put it there.
 */
export function clearHeroImage(options: {
  metadata: MetadataInput
  photos?: PhotosInput
}): HeroImageWrite {
  const metadata = parseRestaurantMetadata(options.metadata)
  const photos = restoreGalleryOrder(metadata, parsePhotos(options.photos))

  delete metadata.heroImage
  delete metadata.profileImageUrl
  delete metadata[HERO_IN_PHOTOS_FLAG]
  delete metadata[HERO_PHOTO_INDEX_KEY]

  return { metadata, photos, photosCsv: serializePhotos(photos) }
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
