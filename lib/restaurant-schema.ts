import type { RestaurantDetail } from '@/lib/restaurant-detail'

const DAY_NAMES: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const PRICE_RANGE: Record<string, string> = {
  BUDGET: '$',
  MODERATE: '$$',
  UPSCALE: '$$$',
  PREMIUM: '$$$$',
}

// "7:00 AM" -> "07:00". Returns null for anything that isn't a clock time.
function to24Hour(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$/)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  if (hour < 1 || hour > 12) return null
  const isPm = match[3].toLowerCase() === 'p'
  if (hour === 12) hour = isPm ? 12 : 0
  else if (isPm) hour += 12
  return `${String(hour).padStart(2, '0')}:${match[2] ?? '00'}`
}

// Stored hours use an en dash: {"monday":"7:00 AM – 8:00 PM"}
function openingHoursSpecification(hours: Record<string, string> | null | undefined) {
  const spec: Array<Record<string, string>> = []

  for (const [day, value] of Object.entries(hours ?? {})) {
    const dayOfWeek = DAY_NAMES[day.toLowerCase()]
    if (!dayOfWeek || typeof value !== 'string') continue

    if (/open\s*24/i.test(value)) {
      spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek, opens: '00:00', closes: '23:59' })
      continue
    }
    if (/closed/i.test(value)) continue

    const parts = value.split(/[–—-]/)
    if (parts.length !== 2) continue
    const opens = to24Hour(parts[0])
    const closes = to24Hour(parts[1])
    if (!opens || !closes) continue

    spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek, opens, closes })
  }

  return spec
}

export function buildRestaurantJsonLd(restaurant: RestaurantDetail, url: string) {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': url,
    name: restaurant.name,
    url,
    address: {
      '@type': 'PostalAddress',
      ...(restaurant.address?.trim() ? { streetAddress: restaurant.address.trim() } : {}),
      addressLocality: restaurant.city,
      addressRegion: restaurant.state,
      ...(restaurant.zipCode ? { postalCode: restaurant.zipCode } : {}),
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    },
  }

  if (restaurant.description) schema.description = restaurant.description
  if (restaurant.phone) schema.telephone = restaurant.phone
  if (restaurant.website) {
    schema.sameAs = [restaurant.website]
    schema.hasMenu = restaurant.website
  }

  const images = [restaurant.heroImage, ...restaurant.photos].filter(Boolean).slice(0, 6)
  if (images.length) schema.image = images

  // "Restaurant" and "Food" are how the importer tags an unknown cuisine; they
  // say nothing and Google treats them as noise in servesCuisine.
  const cuisines = Array.from(new Set([...restaurant.cuisineTypes, ...restaurant.categories]))
    .filter((cuisine) => !/^(restaurants?|food|other)$/i.test(cuisine))
  if (cuisines.length) schema.servesCuisine = cuisines

  const priceRange = PRICE_RANGE[restaurant.priceLevel]
  if (priceRange) schema.priceRange = priceRange

  // Only ever publish a rating built from reviews left on eKaty. Marking up a
  // rating sourced from another platform is a structured-data violation.
  const ownReviewCount = restaurant._count?.reviews ?? 0
  if (ownReviewCount > 0 && typeof restaurant.rating === 'number') {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: restaurant.rating.toFixed(1),
      reviewCount: ownReviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  const openingHours = openingHoursSpecification(restaurant.hours)
  if (openingHours.length) schema.openingHoursSpecification = openingHours

  return schema
}

export function buildBreadcrumbJsonLd(restaurant: RestaurantDetail, siteUrl: string) {
  const trail = [
    { name: 'Katy Restaurants', item: `${siteUrl}/discover` },
    { name: restaurant.name, item: `${siteUrl}/restaurants/${restaurant.slug}` },
  ]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  }
}
