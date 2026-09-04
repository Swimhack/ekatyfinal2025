import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RestaurantCard from '@/components/RestaurantCard'
import { diversifyAdjacentPhotos } from '@/lib/utils/photo-diversity'
import { searchRestaurants } from '@/lib/search/search-restaurants'
import { RESTAURANT_CATEGORIES, THIN_CATEGORY_THRESHOLD, findCategory } from '@/lib/categories'

export const revalidate = 3600

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ekaty.com'
const MAX_LISTINGS = 48

export async function generateStaticParams() {
  return RESTAURANT_CATEGORIES.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = findCategory(params.slug)
  if (!category) {
    return { title: 'Category Not Found | eKaty.com', robots: { index: false, follow: true } }
  }

  const { pagination } = await searchRestaurants({ categoryTags: category.tags, limit: 1 })
  const total = pagination.total
  const title = `${total} Best ${category.heading} in Katy, TX (2026) | eKaty.com`
  const description = `${category.blurb} Browse all ${total} on eKaty with hours, phone numbers, addresses and directions.`.slice(0, 300)
  const url = `${SITE_URL}/categories/${category.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    // A page listing three places isn't worth putting in front of a searcher.
    robots: total < THIN_CATEGORY_THRESHOLD ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url, siteName: 'eKaty.com', type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = findCategory(params.slug)
  if (!category) notFound()

  const { restaurants, pagination } = await searchRestaurants({
    categoryTags: category.tags,
    limit: MAX_LISTINGS,
    sortBy: 'rating',
    // One card per brand. Fifteen Starbucks rows used to fill the top of this
    // page ahead of most of Katy's independent coffee shops.
    maxPerChain: 1,
  })

  const url = `${SITE_URL}/categories/${category.slug}`
  const siblings = RESTAURANT_CATEGORIES.filter((c) => c.slug !== category.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.heading} in Katy, TX`,
    description: category.blurb,
    url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: pagination.total,
      itemListElement: restaurants.map((restaurant: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/restaurants/${restaurant.slug}`,
        name: restaurant.name,
      })),
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Categories', item: `${SITE_URL}/categories` },
      { '@type': 'ListItem', position: 2, name: category.heading, item: url },
    ],
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary-600">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/categories" className="hover:text-primary-600">Categories</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{category.name}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            <span className="mr-3" aria-hidden="true">{category.emoji}</span>
            {category.heading} in Katy, TX
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-600">{category.blurb}</p>
          <p className="mt-4 text-sm font-medium text-gray-500">
            {pagination.total} {pagination.total === 1 ? 'restaurant' : 'restaurants'} listed in Katy and the surrounding area
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {restaurants.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {diversifyAdjacentPhotos(restaurants).map((restaurant: any) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>

            {pagination.total > restaurants.length && (
              <div className="mt-10 text-center">
                <Link href={`/discover?q=${encodeURIComponent(category.name)}`} className="btn-primary">
                  See all {pagination.total} {category.name.toLowerCase()} results
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4" aria-hidden="true">{category.emoji}</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Nothing listed here yet</h2>
            <p className="text-gray-600 mb-6">
              No {category.name.toLowerCase()} restaurants are in the directory at the moment.
            </p>
            <Link href="/discover" className="btn-primary">Browse every Katy restaurant</Link>
          </div>
        )}

        <div className="mt-16 border-t border-gray-200 pt-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse other cuisines in Katy</h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((sibling) => (
              <Link
                key={sibling.slug}
                href={`/categories/${sibling.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:border-primary-500 hover:text-primary-700"
              >
                <span aria-hidden="true">{sibling.emoji}</span>
                {sibling.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
