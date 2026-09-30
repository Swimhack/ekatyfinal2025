/**
 * Shared SEO/AEO/GEO helpers: canonical site URL, JSON-LD builders for
 * schema.org structured data, and category metadata used by the
 * server-rendered directory pages, sitemap, and llms.txt.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://ekaty.fly.dev').replace(/\/$/, '')
export const SITE_NAME = 'eKaty.com'

// Katy, TX city center — used for geo meta tags and areaServed
export const KATY_GEO = { lat: 29.7858, lng: -95.8245 }

export interface CategoryMeta {
  name: string
  slug: string
  emoji: string
  description: string
}

// Mirrors the category list rendered by the client category pages
export const CATEGORY_META: CategoryMeta[] = [
  { name: 'Mexican', slug: 'mexican', emoji: '🌮', description: 'Tacos, burritos, and authentic Mexican cuisine' },
  { name: 'BBQ', slug: 'bbq', emoji: '🍖', description: 'Smoked meats and Texas-style barbecue' },
  { name: 'Asian', slug: 'asian', emoji: '🥢', description: 'Chinese, Japanese, Thai, and more' },
  { name: 'American', slug: 'american', emoji: '🍔', description: 'Burgers, steaks, and comfort food' },
  { name: 'Seafood', slug: 'seafood', emoji: '🦐', description: 'Fresh catches and coastal favorites' },
  { name: 'Indian', slug: 'indian', emoji: '🍛', description: 'Curries, tandoori, and spiced delights' },
  { name: 'Greek', slug: 'greek', emoji: '🥙', description: 'Mediterranean flavors and fresh ingredients' },
  { name: 'Breakfast', slug: 'breakfast', emoji: '🥞', description: 'All-day breakfast and brunch spots' },
  { name: 'Italian', slug: 'italian', emoji: '🍝', description: 'Pizza, pasta, and Italian classics' },
  { name: 'Chinese', slug: 'chinese', emoji: '🥟', description: 'Authentic Chinese and fusion dishes' },
  { name: 'Japanese', slug: 'japanese', emoji: '🍱', description: 'Sushi, ramen, and Japanese cuisine' },
  { name: 'Thai', slug: 'thai', emoji: '🌶️', description: 'Spicy and flavorful Thai dishes' },
  { name: 'Vietnamese', slug: 'vietnamese', emoji: '🍜', description: 'Pho, banh mi, and Vietnamese specialties' },
  { name: 'Bar', slug: 'bar', emoji: '🍺', description: 'Pubs, sports bars, and nightlife' },
  { name: 'Healthy', slug: 'healthy', emoji: '🥗', description: 'Salads, smoothies, and healthy options' },
  { name: 'Desserts', slug: 'desserts', emoji: '🍰', description: 'Sweet treats and dessert spots' },
]

/**
 * Serialize a JSON-LD object for injection into a <script> tag.
 * JSON.stringify does not escape <, >, or &, so an untrusted value like a
 * restaurant name containing "</script>" could terminate the script element
 * (stored XSS). Escaping them as Unicode sequences keeps the JSON valid.
 */
export function serializeJsonLd(data: Record<string, any>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

export function priceRangeSymbol(priceLevel?: string | null): string {
  switch (priceLevel) {
    case 'BUDGET':
      return '$'
    case 'UPSCALE':
      return '$$$'
    case 'PREMIUM':
      return '$$$$'
    default:
      return '$$'
  }
}

const SCHEMA_DAYS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

// "11:00 AM" -> "11:00", "10:30 PM" -> "22:30"; null if unparseable
function to24Hour(time: string): string | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return null
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const meridiem = match[3]?.toUpperCase()
  if (meridiem === 'PM' && hours !== 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  if (hours > 23) return null
  return `${String(hours).padStart(2, '0')}:${minutes}`
}

/**
 * Build schema.org OpeningHoursSpecification entries from the stored
 * hours JSON. Handles both stored shapes:
 *  - Google-imported: { monday: "11:00 AM – 10:00 PM" | "Closed" | ... }
 *  - Seeded:          { monday: { open: "11:00 AM", close: "10:00 PM" } | { closed: true } | null }
 * Unparseable days are skipped rather than guessed.
 */
export function openingHoursSpec(hoursJson?: string | null): any[] {
  if (!hoursJson) return []
  let hours: any
  try {
    hours = JSON.parse(hoursJson)
  } catch {
    return []
  }
  if (!hours || typeof hours !== 'object') return []

  const specs: any[] = []
  for (const [day, value] of Object.entries(hours)) {
    const dayOfWeek = SCHEMA_DAYS[day.toLowerCase()]
    if (!dayOfWeek || !value) continue

    let opens: string | null = null
    let closes: string | null = null

    if (typeof value === 'string') {
      if (/closed|not available/i.test(value)) continue
      // Split on hyphen/en-dash/em-dash, tolerating narrow spaces from Google
      const parts = value.replace(/[  ]/g, ' ').split(/\s*[-–—]\s*/)
      if (parts.length !== 2) continue
      opens = to24Hour(parts[0])
      closes = to24Hour(parts[1])
    } else if (typeof value === 'object') {
      if ((value as any).closed) continue
      opens = (value as any).open ? to24Hour((value as any).open) : null
      closes = (value as any).close ? to24Hour((value as any).close) : null
    }

    if (opens && closes) {
      specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek, opens, closes })
    }
  }
  return specs
}

/** schema.org Restaurant node for a restaurant profile page */
export function restaurantJsonLd(restaurant: any): Record<string, any> {
  const url = `${SITE_URL}/restaurants/${restaurant.slug}`
  // Exclude stock imagery (legacy seeds used Unsplash placeholders) — only
  // real photos of the establishment belong in structured data
  const photos = (typeof restaurant.photos === 'string'
    ? restaurant.photos.split(',').map((p: string) => p.trim()).filter(Boolean)
    : Array.isArray(restaurant.photos) ? restaurant.photos : []
  ).filter((p: string) => !p.includes('images.unsplash.com'))
  const cuisines = typeof restaurant.cuisineTypes === 'string'
    ? restaurant.cuisineTypes.split(',').map((c: string) => c.trim()).filter(Boolean)
    : []

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': url,
    name: restaurant.name,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address,
      addressLocality: restaurant.city || 'Katy',
      addressRegion: restaurant.state || 'TX',
      postalCode: restaurant.zipCode,
      addressCountry: 'US',
    },
    servesCuisine: cuisines,
    priceRange: priceRangeSymbol(restaurant.priceLevel),
  }

  if (restaurant.description) schema.description = restaurant.description
  if (restaurant.phone) schema.telephone = restaurant.phone
  if (restaurant.website) schema.sameAs = [restaurant.website]
  if (photos.length > 0) schema.image = photos.slice(0, 3)
  if (restaurant.latitude && restaurant.longitude) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    }
  }

  const hours = openingHoursSpec(restaurant.hours)
  if (hours.length > 0) schema.openingHoursSpecification = hours

  if (restaurant.rating && restaurant.reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: restaurant.rating,
      reviewCount: restaurant.reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return schema
}

/** schema.org BreadcrumbList for nested pages */
export function breadcrumbJsonLd(items: { name: string; url: string }[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/** schema.org ItemList of restaurants for category/directory pages */
export function restaurantItemListJsonLd(
  restaurants: any[],
  listName: string
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: restaurants.length,
    itemListElement: restaurants.map((r, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: r.name,
      url: `${SITE_URL}/restaurants/${r.slug}`,
    })),
  }
}
