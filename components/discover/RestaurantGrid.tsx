'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Restaurant } from '@/lib/supabase/database.types'
import { getDisplayPhoto, getOptimizedUrl } from '@/lib/services/photo-service'

export function RestaurantGrid() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('rating')
  const searchParams = useSearchParams()

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const params = new URLSearchParams()
        
        // Add search parameters from URL
        const search = searchParams.get('search')
        const categories = searchParams.get('categories')
        const priceLevel = searchParams.get('priceLevel')
        
        if (search) params.append('search', search)
        if (categories) params.append('categories', categories)
        if (priceLevel) params.append('priceLevel', priceLevel)
        
        const response = await fetch(`/api/restaurants?${params.toString()}`)
        const data = await response.json()
        setRestaurants(data.restaurants || [])
      } catch (error) {
        console.error('Error fetching restaurants:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurants()
  }, [searchParams])

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

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (restaurants.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🍽️</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No restaurants found
        </h3>
        <p className="text-gray-600 mb-6">
          Try adjusting your search criteria or browse all restaurants.
        </p>
        <Link href="/discover" className="btn-primary">
          View All Restaurants
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {restaurants.length} restaurant{restaurants.length === 1 ? '' : 's'} found
        </h2>
        <select 
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="rating">Sort by Rating</option>
          <option value="price">Sort by Price</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedRestaurants.map((restaurant) => (
          <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`} className="card hover:shadow-md transition-shadow">
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
                  quality: 80 
                })}
                alt={`${restaurant.name} restaurant photo`}
                fill
                className="object-cover transition-transform hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <h3 className="font-semibold text-lg text-gray-900 mb-2">
              {restaurant.name}
            </h3>
            <p className="text-gray-600 mb-2">
              {restaurant.categories.join(', ')} • {'$'.repeat(restaurant.priceLevel)}
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
        ))}
      </div>
    </div>
  )
}
