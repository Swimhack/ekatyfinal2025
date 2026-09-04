'use client'

// The client boundary is needed for the <img onError> fallback. Every consumer
// was already a client component, so declaring it only unblocks rendering the
// card from a server component such as the category pages.

import { useState } from 'react'
import Link from 'next/link'
import PhotoPlaceholder from '@/components/PhotoPlaceholder'
import { pickDisplayPhoto } from '@/lib/photos/photo-policy'
import { trackRestaurantEvent } from '@/lib/analytics'

interface RestaurantCardProps {
  restaurant: any
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  // A broken or policy-rejected image becomes the honest empty state rather
  // than an unrelated stock photograph.
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)

  const getPriceLevelDisplay = (level: string | number) => {
    if (typeof level === 'number') {
      return '$'.repeat(Math.min(Math.max(level, 1), 4)) || '$$'
    }
    switch (level) {
      case 'BUDGET': return '$'
      case 'MODERATE': return '$$'
      case 'UPSCALE': return '$$$'
      case 'PREMIUM': return '$$$$'
      default: return '$$'
    }
  }

  const ownPhoto = pickDisplayPhoto(restaurant)
  const thumbnailImage = ownPhoto && failedImageUrl !== ownPhoto ? ownPhoto : null

  return (
    <Link
      href={`/restaurants/${restaurant.slug || restaurant.id}`}
      // The click-through from a listing grid is the number worth quoting to a
      // restaurant: how many people eKaty sent their way.
      onClick={() => {
        if (restaurant.id) trackRestaurantEvent('card_click', restaurant.id, restaurant.name)
      }}
    >
      <div className="card overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer group">
        <div className="relative h-48 bg-gray-200 overflow-hidden">
          {thumbnailImage ? (
            <img
              src={thumbnailImage}
              alt={`${restaurant.name || 'Restaurant'} in Katy, TX`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailedImageUrl(ownPhoto)}
            />
          ) : (
            <PhotoPlaceholder restaurant={restaurant} />
          )}
          {restaurant.featured && (
            <div className="absolute top-2 left-2 bg-primary-600 text-white px-2 py-1 rounded text-xs font-semibold">
              FEATURED
            </div>
          )}
          {restaurant.distance && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
              {restaurant.distance.toFixed(1)} mi
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {restaurant.name}
            </h3>
            <span className="text-sm font-medium text-gray-500">
              {getPriceLevelDisplay(restaurant.priceLevel)}
            </span>
          </div>

          {restaurant.categories && (
            <div className="flex flex-wrap gap-1 mb-2">
              {(Array.isArray(restaurant.categories)
                ? restaurant.categories
                : String(restaurant.categories).split(',')
              )
                .slice(0, 3)
                .map((cat: string, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {String(cat).trim()}
                  </span>
                ))}
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            {restaurant.rating != null && (
              <>
                <span className="text-yellow-400">★</span>
                <span className="text-sm font-medium text-gray-900">{restaurant.rating}</span>
                {restaurant.reviewCount != null && (
                  <span className="text-sm text-gray-500">({restaurant.reviewCount} reviews)</span>
                )}
              </>
            )}
          </div>

          {restaurant.address && (
            <p className="text-sm text-gray-500 truncate">{restaurant.address}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
