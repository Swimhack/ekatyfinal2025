import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import RestaurantsGrid from '@/components/restaurants/RestaurantsGrid'
import Link from 'next/link'
import { Restaurant } from '@/lib/supabase/database.types'

export const metadata = {
  title: 'My Dashboard - eKaty',
  description: 'View your favorite restaurants, reviews, and activity',
}

export default async function DashboardPage() {
  // Check authentication
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth?redirect=/dashboard')
  }

  // Fetch user's favorites
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: {
      restaurant: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  // Fetch user's reviews
  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const priceLevelMap: Record<string, number> = {
    'BUDGET': 1, 'MODERATE': 2, 'UPSCALE': 3, 'PREMIUM': 4
  }

  const favoriteRestaurants: Restaurant[] =
    favorites?.map((fav) => {
      const r = fav.restaurant
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        address: r.address,
        city: r.city,
        lat: r.latitude,
        lng: r.longitude,
        phone: r.phone,
        website: r.website,
        categories: r.categories ? r.categories.split(',').map(c => c.trim()) : [],
        priceLevel: priceLevelMap[r.priceLevel] || 2,
        photos: r.photos ? r.photos.split(',').map(p => p.trim()) : [],
        featured: r.featured,
        rating: r.rating,
        reviewCount: r.reviewCount,
      }
    }).filter(Boolean) ?? []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            My Dashboard
          </h1>
          <p className="text-gray-600">Welcome back!</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-brand-600 mb-1">
              {favoriteRestaurants.length}
            </div>
            <div className="text-sm text-gray-600">Favorite Restaurants</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-brand-600 mb-1">
              {reviews?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Reviews Written</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-brand-600 mb-1">
              {user.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="text-sm text-gray-600 truncate">
              {user.email}
            </div>
          </div>
        </div>

        {/* My Favorites */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">My Favorites</h2>
            <Link
              href="/favorites"
              className="text-brand-600 hover:text-brand-700 font-medium text-sm"
            >
              View All →
            </Link>
          </div>

          {favoriteRestaurants.length > 0 ? (
            <RestaurantsGrid
              restaurants={favoriteRestaurants}
              showFavoriteButton={true}
              showSort={false}
            />
          ) : (
            <div className="card text-center py-8">
              <div className="text-6xl mb-4">💚</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No favorites yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start exploring and save your favorite restaurants!
              </p>
              <Link href="/discover" className="btn-primary inline-block px-6 py-2">
                Discover Restaurants
              </Link>
            </div>
          )}
        </div>

        {/* My Reviews */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">My Recent Reviews</h2>
          </div>

          {reviews && reviews.length > 0 ? (
            <div className="card">
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Link
                        href={`/restaurant/${review.restaurant?.id}`}
                        className="font-semibold text-gray-900 hover:text-brand-600"
                      >
                        {review.restaurant?.name}
                      </Link>
                      <div className="flex items-center">
                        <span className="text-yellow-400">
                          {'★'.repeat(review.rating)}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-1">{review.text}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No reviews yet
              </h3>
              <p className="text-gray-600 mb-4">
                Share your dining experiences with the community!
              </p>
              <Link href="/discover" className="btn-primary inline-block px-6 py-2">
                Find Restaurants
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
