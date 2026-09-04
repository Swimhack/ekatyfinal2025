import type { Metadata } from 'next'
import Link from 'next/link'
import { RESTAURANT_CATEGORIES } from '@/lib/categories'
import { getCategoryCounts } from '@/lib/category-counts'

export const revalidate = 3600

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ekaty.com'

export const metadata: Metadata = {
  title: 'Restaurant Categories in Katy, TX | Browse by Cuisine | eKaty.com',
  description:
    'Browse Katy restaurants by cuisine — Mexican, BBQ, sushi, pizza, Vietnamese, bakeries and more. Every category lists real Katy addresses, hours and phone numbers.',
  alternates: { canonical: `${SITE_URL}/categories` },
  openGraph: {
    title: 'Restaurant Categories in Katy, TX | Browse by Cuisine',
    description: 'Browse Katy restaurants by cuisine, from taquerias and smokehouses to bakeries and boba.',
    url: `${SITE_URL}/categories`,
    siteName: 'eKaty.com',
    type: 'website',
  },
}

export default async function CategoriesPage() {
  const counts = await getCategoryCounts()
  const categories = [...RESTAURANT_CATEGORIES].sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Restaurant Categories in Katy, TX',
    url: `${SITE_URL}/categories`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: categories.length,
      itemListElement: categories.map((category, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/categories/${category.slug}`,
        name: `${category.heading} in Katy, TX`,
      })),
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Katy Restaurants by Cuisine</h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-600">
            Every restaurant in the Katy directory, grouped by what they actually cook. Pick a cuisine
            to see addresses, hours and phone numbers across 77449, 77450, 77493 and 77494.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="group block rounded-xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md"
            >
              <div className="text-4xl mb-3" aria-hidden="true">{category.emoji}</div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-700">
                {category.heading}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {counts[category.slug] ?? 0} in Katy
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/discover" className="btn-primary">Browse every Katy restaurant</Link>
        </div>
      </div>
    </div>
  )
}
