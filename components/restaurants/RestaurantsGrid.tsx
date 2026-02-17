'use client'

import { useState } from 'react'
import { Restaurant } from '@/lib/supabase/database.types'
import RestaurantCard from './RestaurantCard'

interface RestaurantsGridProps {
  restaurants: Restaurant[]
  showFavoriteButton?: boolean
  showSort?: boolean
}

export default function RestaurantsGrid({
  restaurants,
  showFavoriteButton = true,
  showSort = true,
}: RestaurantsGridProps) {
  const [sortBy, setSortBy] = useState('rating')

  const sortedRestaurants = [...restaurants].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'price':
        return a.priceLevel - b.priceLevel
      case 'rating':
      default:
        return (b.rating || 0) - (a.rating || 0)
    }
  })

  if (restaurants.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🍽️</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No restaurants found
        </h3>
        <p className="text-gray-600">
          Try adjusting your search or explore other options.
        </p>
      </div>
    )
  }

  return (
    <div>
      {showSort && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {restaurants.length} restaurant{restaurants.length === 1 ? '' : 's'}
          </h2>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-[44px]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="rating">Sort by Rating</option>
            <option value="price">Sort by Price</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedRestaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            showFavoriteButton={showFavoriteButton}
          />
        ))}
      </div>
    </div>
  )
}
