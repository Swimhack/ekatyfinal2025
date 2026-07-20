import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import {
  SITE_URL,
  CATEGORY_META,
  breadcrumbJsonLd,
  restaurantItemListJsonLd,
} from '@/lib/seo'
import CategoryClient from './CategoryClient'

export const revalidate = 3600

function categoryForSlug(slug: string) {
  return CATEGORY_META.find((c) => c.slug === slug)
}

async function getCategoryRestaurants(categoryName: string) {
  try {
    return await prisma.restaurant.findMany({
      where: {
        active: true,
        OR: [
          { categories: { contains: categoryName } },
          { cuisineTypes: { contains: categoryName } },
        ],
      },
      orderBy: { rating: 'desc' },
      take: 25,
      select: { name: true, slug: true },
    })
  } catch (error) {
    console.error('SEO: failed to load category restaurants:', error)
    return []
  }
}

export function generateStaticParams() {
  return CATEGORY_META.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const category = categoryForSlug(params.slug)

  if (!category) {
    return {
      title: 'Category Not Found | eKaty.com',
      robots: { index: false, follow: false },
    }
  }

  const title = `Best ${category.name} Restaurants in Katy, TX | eKaty.com`
  const description = `Find the best ${category.name} restaurants in Katy, Texas. ${category.description}. Compare ratings, hours, and locations across Katy, Cinco Ranch, and the surrounding area.`
  const url = `${SITE_URL}/categories/${category.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', siteName: 'eKaty.com' },
    twitter: { card: 'summary', title, description },
    other: {
      'geo.region': 'US-TX',
      'geo.placename': 'Katy',
    },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string }
}) {
  const category = categoryForSlug(params.slug)
  const restaurants = category ? await getCategoryRestaurants(category.name) : []

  return (
    <>
      {category && (
        <>
          {restaurants.length > 0 && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(
                  restaurantItemListJsonLd(
                    restaurants,
                    `Best ${category.name} Restaurants in Katy, TX`
                  )
                ),
              }}
            />
          )}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                breadcrumbJsonLd([
                  { name: 'Home', url: SITE_URL },
                  { name: 'Categories', url: `${SITE_URL}/categories` },
                  {
                    name: category.name,
                    url: `${SITE_URL}/categories/${category.slug}`,
                  },
                ])
              ),
            }}
          />
        </>
      )}
      <CategoryClient />
    </>
  )
}
