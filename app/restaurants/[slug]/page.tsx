import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRestaurantDetail, type RestaurantDetail } from '@/lib/restaurant-detail'
import { buildRestaurantJsonLd, buildBreadcrumbJsonLd } from '@/lib/restaurant-schema'
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  buildRestaurantDescription,
  buildRestaurantTitle,
  resolveOgImage,
  restaurantUrl,
  siteUrl,
} from '@/lib/seo/restaurant-og'
import RestaurantDetailClient from './RestaurantDetailClient'

export const revalidate = 3600

type LoadResult =
  | { status: 'found'; restaurant: RestaurantDetail }
  | { status: 'missing' }
  | { status: 'unavailable' }

/**
 * A database hiccup used to be invisible here, because the page was a client
 * component that fetched on mount. Rendering on the server means a failed query
 * would 500 the page or, worse, 404 a real listing — so a thrown query is told
 * apart from a listing that genuinely does not exist, and only the latter 404s.
 */
async function load(slug: string): Promise<LoadResult> {
  try {
    const restaurant = await getRestaurantDetail(slug)
    return restaurant ? { status: 'found', restaurant } : { status: 'missing' }
  } catch (error) {
    console.error(`Restaurant detail query failed for "${slug}":`, error)
    return { status: 'unavailable' }
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await load(params.slug)

  if (result.status === 'missing') {
    return { title: 'Restaurant Not Found | eKaty.com', robots: { index: false, follow: true } }
  }
  // Inheriting the site defaults beats emitting a wrong title for a real listing.
  if (result.status === 'unavailable') return {}

  const { restaurant } = result
  const title = buildRestaurantTitle(restaurant)
  const description = buildRestaurantDescription(restaurant)
  const url = restaurantUrl(restaurant.slug)
  const image = resolveOgImage(restaurant)

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'eKaty.com',
      type: 'website',
      images: [
        {
          url: image.url,
          alt: `${restaurant.name} — Katy, TX`,
          // Only the generated card has known dimensions; a scraper reads a
          // third-party photo's own size.
          ...(image.isGeneratedCard ? { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT } : {}),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  }
}

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const result = await load(params.slug)
  if (result.status === 'missing') notFound()

  // With no listing in hand the client component falls back to its own fetch,
  // which is how this page behaved before it was rendered on the server.
  if (result.status === 'unavailable') return <RestaurantDetailClient />

  const { restaurant } = result
  const url = restaurantUrl(restaurant.slug)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildRestaurantJsonLd(restaurant, url)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(restaurant, siteUrl())) }}
      />
      <RestaurantDetailClient initial={restaurant} />
    </>
  )
}
