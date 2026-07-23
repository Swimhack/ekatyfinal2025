import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import {
  SITE_URL,
  restaurantJsonLd,
  breadcrumbJsonLd,
  priceRangeSymbol,
  serializeJsonLd,
} from '@/lib/seo'
import RestaurantDetailClient from './RestaurantDetailClient'

// Re-render at most hourly so profile edits and watchdog updates surface
export const revalidate = 3600

async function getRestaurant(slug: string) {
  try {
    return await prisma.restaurant.findFirst({ where: { slug } })
  } catch (error) {
    console.error('SEO: failed to load restaurant for metadata:', error)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const restaurant = await getRestaurant(params.slug)

  if (!restaurant) {
    return {
      title: 'Restaurant Not Found | eKaty.com',
      robots: { index: false, follow: false },
    }
  }

  const cuisine = (restaurant.cuisineTypes || '').split(',')[0]?.trim()
  const title = `${restaurant.name} - ${cuisine ? `${cuisine} ` : ''}Restaurant in Katy, TX | eKaty.com`
  const description =
    restaurant.description?.slice(0, 155) ||
    `${restaurant.name} in Katy, Texas. ${restaurant.address}, ${restaurant.city}, TX ${restaurant.zipCode}. ` +
      `${priceRangeSymbol(restaurant.priceLevel)} · Find hours, photos, and reviews on eKaty.com.`
  const url = `${SITE_URL}/restaurants/${restaurant.slug}`
  const photos = (restaurant.photos || '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !p.includes('images.unsplash.com'))

  return {
    title,
    description,
    alternates: { canonical: url },
    // Closed/deactivated profiles stay reachable but drop out of the index
    robots: restaurant.active ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'eKaty.com',
      images: photos.length > 0 ? [{ url: photos[0] }] : undefined,
    },
    twitter: {
      card: photos.length > 0 ? 'summary_large_image' : 'summary',
      title,
      description,
    },
    other: {
      'geo.region': 'US-TX',
      'geo.placename': restaurant.city || 'Katy',
      ...(restaurant.latitude && restaurant.longitude
        ? {
            'geo.position': `${restaurant.latitude};${restaurant.longitude}`,
            ICBM: `${restaurant.latitude}, ${restaurant.longitude}`,
          }
        : {}),
    },
  }
}

export default async function RestaurantDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const restaurant = await getRestaurant(params.slug)

  return (
    <>
      {restaurant && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(restaurantJsonLd(restaurant)),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(
                breadcrumbJsonLd([
                  { name: 'Home', url: SITE_URL },
                  { name: 'Restaurants', url: `${SITE_URL}/discover` },
                  {
                    name: restaurant.name,
                    url: `${SITE_URL}/restaurants/${restaurant.slug}`,
                  },
                ])
              ),
            }}
          />
        </>
      )}
      <RestaurantDetailClient />
    </>
  )
}
