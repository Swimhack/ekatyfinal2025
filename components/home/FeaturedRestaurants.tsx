'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Restaurant } from '@/lib/supabase/database.types'
import { getDisplayPhoto, getOptimizedUrl } from '@/lib/services/photo-service'

export function FeaturedRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeaturedRestaurants() {
      try {
        const response = await fetch('/api/restaurants?featured=true&limit=6')
        const data = await response.json()
        setRestaurants(data.restaurants || [])
      } catch (error) {
        console.error('Error fetching featured restaurants:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedRestaurants()
  }, [])

  if (loading) {
    return (
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          Featured Restaurants
        </h2>
        <p className="text-gray-600 mb-12">
          Loading the best restaurants in Katy...
        </p>
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
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          Featured Restaurants
        </h2>
        <p className="text-gray-600 mb-12">
          No featured restaurants available yet. Check back soon!
        </p>
        <Link href="/discover" className="btn-primary">
          Browse All Restaurants
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">
        Community Favorites
      </h2>
      <p className="text-gray-600 mb-12">
        Where Katy families gather for memorable meals and authentic flavors
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((restaurant) => (
          <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`} className="card hover:shadow-lg transition-shadow">
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
              <span className="text-brand-600 font-medium hover:text-brand-700">
                View Details
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
