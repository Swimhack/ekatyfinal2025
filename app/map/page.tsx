import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import RestaurantMap from '@/components/RestaurantMap'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Restaurant Map | eKaty - Explore Katy Restaurants',
  description: 'Interactive map of all restaurants in Katy, Texas. Find dining options near you with our easy-to-use restaurant map.',
  openGraph: {
    title: 'Restaurant Map | eKaty - Explore Katy Restaurants',
    description: 'Interactive map of all restaurants in Katy, Texas. Find dining options near you with our easy-to-use restaurant map.',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Restaurant Map | eKaty - Explore Katy Restaurants',
    description: 'Interactive map of all restaurants in Katy, Texas. Find dining options near you with our easy-to-use restaurant map.',
    images: ['/og-image.jpg'],
  },
}

async function getRestaurants() {
  const restaurants = await prisma.restaurant.findMany({
    where: {
      active: true
    },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      latitude: true,
      longitude: true,
      rating: true,
      cuisineTypes: true,
      priceLevel: true
    },
    orderBy: { name: 'asc' }
  })

  return restaurants
    .filter(r => r.latitude !== null && r.longitude !== null)
    .map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      address: r.address,
      latitude: r.latitude!,
      longitude: r.longitude!,
      rating: r.rating ?? undefined,
      cuisineTypes: r.cuisineTypes,
      priceLevel: r.priceLevel
    }))
}

export default async function MapPage() {
  const restaurants = await getRestaurants()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Restaurant Map
              </h1>
              <p className="text-lg text-gray-600">
                Explore {restaurants.length} restaurants across Katy, Texas
              </p>
            </div>
            <Link
              href="/restaurants"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              List View
            </Link>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <Suspense
            fallback={
              <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            }
          >
            <RestaurantMap restaurants={restaurants} height="600px" zoom={12} />
          </Suspense>
        </div>

        {/* Map Legend */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Map Guide</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">🗺️ Navigation</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click and drag to move around</li>
                <li>• Scroll to zoom in/out</li>
                <li>• Click markers for details</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">📍 Markers</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Each marker is a restaurant</li>
                <li>• Click for name, rating & address</li>
                <li>• View full details from popup</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">🔍 Find More</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use filters in list view</li>
                <li>• Try Grub Roulette for random picks</li>
                <li>• Browse by cuisine type</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-primary-600">{restaurants.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Restaurants</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-primary-600">
              {new Set(restaurants.flatMap(r => r.cuisineTypes.split(','))).size}
            </div>
            <div className="text-sm text-gray-600 mt-1">Cuisine Types</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-primary-600">
              {restaurants.filter(r => r.rating && r.rating >= 4.5).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Highly Rated (4.5+)</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-primary-600">Free</div>
            <div className="text-sm text-gray-600 mt-1">No Sign-up Required</div>
          </div>
        </div>
      </div>
    </div>
  )
}
