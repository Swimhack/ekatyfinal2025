import Link from 'next/link'
import Image from 'next/image'
import { Restaurant } from '@/lib/supabase/database.types'
import { getDisplayPhoto, getOptimizedUrl } from '@/lib/services/photo-service'
import FavoriteButton from './FavoriteButton'

interface RestaurantCardProps {
  restaurant: Restaurant
  showFavoriteButton?: boolean
}

export default function RestaurantCard({
  restaurant,
  showFavoriteButton = true,
}: RestaurantCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow relative">
      <Link href={`/restaurant/${restaurant.id}`} className="block">
        {restaurant.featured && (
          <div className="bg-brand-500 text-white text-xs px-2 py-1 rounded-full inline-block mb-2">
            Featured
          </div>
        )}

        <div className="relative h-48 bg-gray-200 rounded-lg mb-4 overflow-hidden">
          <Image
            src={getOptimizedUrl(getDisplayPhoto(restaurant.photos || []), {
              width: 400,
              height: 200,
              quality: 80,
            })}
            alt={`${restaurant.name} restaurant photo`}
            fill
            className="object-cover transition-transform hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Favorite Button - positioned over image */}
          {showFavoriteButton && (
            <div className="absolute top-2 right-2 z-10">
              <FavoriteButton restaurantId={restaurant.id} size="md" />
            </div>
          )}
        </div>

        <h3 className="font-semibold text-lg text-gray-900 mb-2">
          {restaurant.name}
        </h3>

        <p className="text-gray-600 mb-2">
          {restaurant.categories.join(', ')} •{' '}
          {'$'.repeat(restaurant.priceLevel)}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {restaurant.rating ? (
              <>
                <span className="text-yellow-400">
                  {'★'.repeat(Math.floor(restaurant.rating))}
                </span>
                <span className="text-gray-600 ml-1">
                  ({restaurant.reviewCount || 0})
                </span>
              </>
            ) : (
              <span className="text-gray-400">No reviews yet</span>
            )}
          </div>
          <span className="text-brand-600 hover:text-brand-700 font-medium">
            View Details
          </span>
        </div>
      </Link>
    </div>
  )
}
