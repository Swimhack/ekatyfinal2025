/**
 * Policy helpers for restaurant imagery.
 *
 * Safe default: a branded PhotoPlaceholder beats an unrelated stock photo or a
 * broken image icon. Scraped / Google Places photos are not auto-cached here.
 */

import { parsePhotos } from './parse-photos'

export type PhotoRejectReason =
  | 'empty'
  | 'invalid_url'
  | 'stock_unsplash'
  | 'stock_picsum'
  | 'logo_or_favicon'
  | 'brand_marketing'
  | 'unreachable'
  | 'non_image'

export interface PhotoAssessment {
  url: string
  ok: boolean
  reason?: PhotoRejectReason
}

const STOCK_HOSTS = [
  'images.unsplash.com',
  'plus.unsplash.com',
  'source.unsplash.com',
  'picsum.photos',
  'loremflickr.com',
  'placehold.co',
  'placekitten.com',
  'via.placeholder.com',
]

const LOGO_HINTS = [
  '/favicon',
  'favicon.ico',
  'favicon.png',
  '/logo.',
  '/logos/',
  'apple-touch-icon',
  'android-chrome',
  'mstile-',
  'site-icon',
]

/**
 * Filenames and directories that mark an image as social/marketing collateral
 * rather than a photograph of a venue: Open Graph cards, Twitter summary
 * squares, share images, press kits and brand asset folders.
 *
 * A national chain publishes one of these per brand, so every location inherits
 * the identical tile. On /categories/cafe that put the same Starbucks square on
 * thirteen cards while independents showed a placeholder, which read as an
 * advert for Starbucks rather than a directory of Katy coffee shops.
 */
const BRAND_MARKETING_HINTS = [
  'summary_square',
  'summary-square',
  'summary_large_image',
  'summary-large-image',
  'opengraph',
  'open-graph',
  'open_graph',
  'og-image',
  'og_image',
  'ogimage',
  'twitter-card',
  'twitter_card',
  'social-share',
  'social_share',
  'share-card',
  'share_card',
  '/social/',
  '/social-media/',
  '/socialmedia/',
  '/brand/',
  '/branding/',
  '/brand-assets/',
  '/press/',
  '/press-kit/',
  '/media-kit/',
  '/newsroom/',
  'wordmark',
]

/**
 * Corporate domains that serve brand marketing only, so no image from them is a
 * photograph of an individual location. Restricted to hosts actually observed
 * in the `photos` column — extend it when an audit surfaces another.
 */
const NATIONAL_BRAND_HOSTS = [
  'starbucks.com',
  'cfacdn.com',
  'jackinthebox.com',
  'portillos.com',
]

export function isStockPhotoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return STOCK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}

export function isLogoOrFaviconUrl(url: string): boolean {
  const lower = url.toLowerCase()
  if (LOGO_HINTS.some((hint) => lower.includes(hint))) return true
  // Tiny dimension hints often used for icons
  if (/[?&](w|width)=(16|32|48|64)\b/i.test(url)) return true
  if (/\/(16|32|48|64)x(16|32|48|64)\//i.test(url)) return true
  return false
}

/**
 * True for brand marketing artwork: a chain's corporate host, or any URL whose
 * path names it as a social/Open Graph/press asset.
 *
 * Deliberately blind to whose listing it is about to appear on. A corporate
 * square is not a photograph of a specific store even on that chain's own row,
 * and letting it through is what made a category page look like a chain advert.
 */
export function isBrandMarketingImageUrl(url: string): boolean {
  const trimmed = (url || '').trim()
  if (!trimmed) return false

  let host = ''
  let pathAndQuery = trimmed.toLowerCase()
  try {
    const parsed = new URL(trimmed, trimmed.startsWith('/') ? 'https://ekaty.com' : undefined)
    host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase()
  } catch {
    // Fall back to matching the raw string below.
  }

  if (host && NATIONAL_BRAND_HOSTS.some((brand) => host === brand || host.endsWith(`.${brand}`))) {
    return true
  }

  return BRAND_MARKETING_HINTS.some((hint) => pathAndQuery.includes(hint))
}

export function assessPhotoUrl(url: string): PhotoAssessment {
  const trimmed = (url || '').trim()
  if (!trimmed) return { url: trimmed, ok: false, reason: 'empty' }

  if (isStockPhotoUrl(trimmed)) {
    return { url: trimmed, ok: false, reason: 'stock_unsplash' }
  }
  if (trimmed.includes('picsum.photos')) {
    return { url: trimmed, ok: false, reason: 'stock_picsum' }
  }
  if (isLogoOrFaviconUrl(trimmed)) {
    return { url: trimmed, ok: false, reason: 'logo_or_favicon' }
  }
  if (isBrandMarketingImageUrl(trimmed)) {
    return { url: trimmed, ok: false, reason: 'brand_marketing' }
  }

  try {
    const parsed = new URL(trimmed, trimmed.startsWith('/') ? 'https://ekaty.com' : undefined)
    if (!['http:', 'https:'].includes(parsed.protocol) && !trimmed.startsWith('/')) {
      return { url: trimmed, ok: false, reason: 'invalid_url' }
    }
  } catch {
    return { url: trimmed, ok: false, reason: 'invalid_url' }
  }

  return { url: trimmed, ok: true }
}

export function filterDisplayPhotos(photos: unknown): string[] {
  return parsePhotos(photos).filter((url) => assessPhotoUrl(url).ok)
}

export function pickDisplayPhoto(
  restaurant: {
    photos?: unknown
    displayPhoto?: string | null
    heroImage?: string | null
    logoUrl?: string | null
  }
): string | null {
  const candidates = [
    restaurant.displayPhoto,
    restaurant.heroImage,
    ...filterDisplayPhotos(restaurant.photos),
    // logoUrl is intentionally last and still policy-checked
    restaurant.logoUrl,
  ].filter(Boolean) as string[]

  for (const url of candidates) {
    if (assessPhotoUrl(url).ok) return url
  }
  return null
}

export interface PhotoRightsRecord {
  url: string
  origin: 'owner_upload' | 'admin_upload' | 'manual' | 'website' | 'unknown'
  sourceUrl?: string
  rightsBasis: 'owner_attestation' | 'admin_license' | 'unknown'
  credit?: string
  license?: string
  obtainedAt: string
  verifiedAt?: string
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'removed'
  submittedBy?: string
}

export function readPhotoRights(metadata: unknown): PhotoRightsRecord[] {
  let meta: any = metadata
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta)
    } catch {
      return []
    }
  }
  if (!meta || typeof meta !== 'object') return []
  const list = meta.photoRights
  return Array.isArray(list) ? list : []
}

export function writePhotoRights(
  metadata: unknown,
  rights: PhotoRightsRecord[]
): string {
  let meta: Record<string, unknown> = {}
  if (typeof metadata === 'string' && metadata.trim()) {
    try {
      meta = JSON.parse(metadata)
    } catch {
      meta = {}
    }
  } else if (metadata && typeof metadata === 'object') {
    meta = { ...(metadata as Record<string, unknown>) }
  }
  meta.photoRights = rights
  return JSON.stringify(meta)
}
