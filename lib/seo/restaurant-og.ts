/**
 * Per-listing title, description and Open Graph image for /restaurants/[slug].
 *
 * Without this every detail page inherited the root layout's homepage metadata,
 * so ekaty.com/restaurants/raspados-el-oasis shared its <title>, og:title and
 * og:image with the homepage and with all 1,800 other listings. Search engines
 * saw one page duplicated 1,800 times and a share of any listing rendered the
 * generic "Best Restaurants in Katy TX" card.
 *
 * Kept free of `@/lib/photos` on purpose: the display-photo policy that grids
 * use is still in review, and the OG card has a different bar anyway (one
 * image, fetched by a scraper, that must not be a chain's corporate artwork).
 * When that policy lands, `pickOgImage` can delegate to `pickDisplayPhoto`.
 */

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

export interface RestaurantOgInput {
  name: string
  slug: string
  description?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  categories?: unknown
  cuisineTypes?: unknown
  photos?: unknown
  heroImage?: string | null
  heroImageUrl?: string | null
  profileImageUrl?: string | null
}

/** Cuisine tags the importer writes when it knows nothing, so they say nothing. */
const EMPTY_CUISINE = /^(restaurants?|food|other|point of interest|establishment)$/i

/** Hosts that only ever serve stock photography, never a Katy storefront. */
const STOCK_IMAGE_HOSTS = [
  'images.unsplash.com',
  'plus.unsplash.com',
  'source.unsplash.com',
  'picsum.photos',
  'loremflickr.com',
  'placehold.co',
  'placekitten.com',
  'via.placeholder.com',
]

/**
 * Corporate hosts that serve brand collateral and no per-store photography.
 *
 * This is the bug in the ticket: a chain publishes exactly one Open Graph tile,
 * so scraping it makes every Katy location of that chain share a card, and the
 * card advertises the brand rather than the listing.
 */
const NATIONAL_BRAND_HOSTS = ['starbucks.com', 'mcdonalds.com', 'portillos.com', 'bk.com', 'burgerking.com']

/** Path fragments that name an image as an icon rather than a photograph. */
const LOGO_PATH_HINTS = [
  '/favicon',
  'favicon.ico',
  'favicon.png',
  '/logo.',
  '/logo-',
  '/logo_',
  '/logos/',
  'apple-touch',
  'android-chrome',
  'mstile-',
  'site-icon',
  'wordmark',
]

/** Path fragments that name an image as social/press collateral for a brand. */
const BRAND_MARKETING_PATH_HINTS = [
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
  '/brand/',
  '/branding/',
  '/brand-assets/',
  '/press/',
  '/press-kit/',
  '/media-kit/',
  '/newsroom/',
  'googleplay',
  'google-play',
  'app-store',
  'appstore',
  'play-store',
  'app-icon',
]

/** Formats a scraper will not render as a share card. */
const UNSUPPORTED_IMAGE_EXTENSIONS = ['.svg', '.svgz', '.ico', '.tif', '.tiff', '.avif', '.pdf']

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://ekaty.com').replace(/\/+$/, '')
}

export function restaurantUrl(slug: string): string {
  return `${siteUrl()}/restaurants/${slug}`
}

/** Address of the generated card for a listing with no usable photograph. */
export function generatedOgCardUrl(slug: string): string {
  return `${restaurantUrl(slug)}/og`
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim()).filter(Boolean)
  }
  return []
}

/**
 * `Restaurant.photos` is a comma-joined string, but many CDN URLs carry commas
 * inside the path (`.../width=250,height=505`) and some rows hold a JSON array
 * that an earlier comma split already tore into fragments. Splitting only where
 * a comma is followed by the start of another URL keeps both intact, and the
 * URLs are then read out of whatever JSON punctuation is left around them.
 */
export function parsePhotoCandidates(photos: unknown): string[] {
  const joined = Array.isArray(photos)
    ? photos.map((p) => String(p)).join(',')
    : typeof photos === 'string'
      ? photos
      : ''
  if (!joined.trim()) return []

  const normalized = joined
    // Leftover JSON punctuation from rows stored as an array.
    .replace(/["'[\]]/g, ' ')
    .replace(/\s*\|\s*/g, '\n')
    // Only a comma that introduces the next URL is a separator.
    .replace(/,(?=\s*(?:https?:\/\/|\/[^/\s]))/g, '\n')

  const out: string[] = []
  const seen = new Set<string>()

  for (const part of normalized.split('\n')) {
    const url = part.trim().replace(/,+$/, '')
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) continue
    if (seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }

  return out
}

function hostOf(url: string): string {
  try {
    const parsed = new URL(url, url.startsWith('/') ? siteUrl() : undefined)
    return parsed.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function pathAndQueryOf(url: string): string {
  try {
    const parsed = new URL(url, url.startsWith('/') ? siteUrl() : undefined)
    return `${parsed.pathname}${parsed.search}`.toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

function matchesHost(host: string, list: string[]): boolean {
  return Boolean(host) && list.some((h) => host === h || host.endsWith(`.${h}`))
}

/**
 * True when the URL is a photograph of this specific listing, as far as the URL
 * can tell us. Anything ambiguous is rejected: the generated card below is an
 * honest fallback, whereas a chain's brand tile is actively misleading.
 */
export function isUsableOgImage(url: string): boolean {
  const trimmed = (url || '').trim()
  if (!trimmed) return false
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) return false

  const host = hostOf(trimmed)
  if (!host) return false
  if (matchesHost(host, STOCK_IMAGE_HOSTS)) return false
  if (matchesHost(host, NATIONAL_BRAND_HOSTS)) return false

  const pathAndQuery = pathAndQueryOf(trimmed)
  if (UNSUPPORTED_IMAGE_EXTENSIONS.some((ext) => pathAndQuery.split('?')[0].endsWith(ext))) return false
  if (LOGO_PATH_HINTS.some((hint) => pathAndQuery.includes(hint))) return false
  if (BRAND_MARKETING_PATH_HINTS.some((hint) => pathAndQuery.includes(hint))) return false

  return true
}

/**
 * The listing's own photograph, or null.
 *
 * `logoUrl` is deliberately not a candidate. A logo is the same artwork on every
 * location of a chain, which is the failure this change exists to stop, and the
 * generated card already carries the restaurant's name in readable type.
 */
export function pickOgImage(restaurant: RestaurantOgInput): string | null {
  const candidates = [
    // An admin or owner chose these, so they outrank anything an importer found.
    // The field has moved around between metadata.profileImageUrl and
    // metadata.heroImage, so every spelling is read.
    restaurant.heroImage,
    restaurant.heroImageUrl,
    restaurant.profileImageUrl,
    ...parsePhotoCandidates(restaurant.photos),
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    if (isUsableOgImage(candidate)) return candidate
  }
  return null
}

/** Absolute OG image for the listing: its own photo, else its generated card. */
export function resolveOgImage(restaurant: RestaurantOgInput): { url: string; isGeneratedCard: boolean } {
  const photo = pickOgImage(restaurant)
  if (photo) {
    return { url: photo.startsWith('/') ? `${siteUrl()}${photo}` : photo, isGeneratedCard: false }
  }
  return { url: generatedOgCardUrl(restaurant.slug), isGeneratedCard: true }
}

export function primaryCuisine(restaurant: RestaurantOgInput): string | null {
  const candidates = [...toList(restaurant.cuisineTypes), ...toList(restaurant.categories)]
  const named = candidates.find((c) => !EMPTY_CUISINE.test(c))
  return named ?? null
}

export function buildRestaurantTitle(restaurant: RestaurantOgInput): string {
  const cuisine = primaryCuisine(restaurant)
  const zip = restaurant.zipCode ? ` ${restaurant.zipCode}` : ''
  return `${restaurant.name} | ${cuisine ? `${cuisine} ` : ''}Restaurant in Katy, TX${zip}`
}

export function buildRestaurantDescription(restaurant: RestaurantOgInput): string {
  const own = restaurant.description?.replace(/\s+/g, ' ').trim()
  if (own) {
    const prefixed = own.toLowerCase().startsWith(restaurant.name.toLowerCase())
      ? own
      : `${restaurant.name}: ${own}`
    return prefixed.slice(0, 158)
  }

  const cuisine = primaryCuisine(restaurant)
  const kind = cuisine
    ? `${/^[aeiou]/i.test(cuisine) ? 'an' : 'a'} ${cuisine} restaurant`
    : 'a restaurant'

  // A third of listings have no street address, so don't write "at Katy, TX".
  const street = restaurant.address?.trim()
  const area = [restaurant.city, restaurant.state, restaurant.zipCode].filter(Boolean).join(', ')
  const where = street ? `at ${street}, ${area}` : `in ${area}`

  return `${restaurant.name} is ${kind} ${where}. `
    + 'Find hours, phone, directions, photos and reviews on eKaty.'
}
