import { cache } from 'react'
import { prisma } from '@/lib/prisma'

const splitList = (value?: string | null) =>
  value ? value.split(',').map((v: string) => v.trim()).filter(Boolean) : []

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

// Wrapped in cache() so generateMetadata and the page body share one query per request.
export const getRestaurantDetail = cache(async (idOrSlug: string) => {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      active: true,
    },
    include: {
      reviews: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: { select: { reviews: true, favorites: true } },
    },
  })

  if (!restaurant) return null

  const metadata = parseJson<Record<string, any>>(restaurant.metadata, {})

  return {
    ...restaurant,
    categories: splitList(restaurant.categories),
    cuisineTypes: splitList(restaurant.cuisineTypes),
    photos: splitList(restaurant.photos),
    hours: parseJson<Record<string, string>>(restaurant.hours, {}),
    heroImage: metadata.profileImageUrl || metadata.heroImage || null,
    reviews: restaurant.reviews.map((review: any) => ({
      ...review,
      photos: splitList(review.photos),
    })),
  }
})

export type RestaurantDetail = NonNullable<Awaited<ReturnType<typeof getRestaurantDetail>>>
