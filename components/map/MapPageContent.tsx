'use client'

import { useState, useEffect } from 'react'
import { Restaurant } from '@/lib/supabase/database.types'
import RestaurantMap from './RestaurantMap'
import { Filter, List } from 'lucide-react'

const CATEGORIES = ['Mexican', 'American', 'Asian', 'Italian', 'BBQ', 'Seafood', 'Pizza']
const PRICE_LEVELS = [
  { label: '$', value: 1 },
  { label: '$$', value: 2 },
  { label: '$$$', value: 3 },
  { label: '$$$$', value: 4 },
]

export default function MapPageContent() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<{
    categories: string[]
    priceLevel: number[]
  }>({
    categories: [],
    priceLevel: [],
  })

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const response = await fetch('/api/restaurants')
        const data = await response.json()
        setRestaurants(data.restaurants || [])
        setFilteredRestaurants(data.restaurants || [])
      } catch (error) {
        console.error('Error fetching restaurants:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurants()
  }, [])

  useEffect(() => {
    // Apply filters
    let filtered = restaurants

    if (filters.categories.length > 0) {
      filtered = filtered.filter((restaurant) =>
        restaurant.categories.some((cat) => filters.categories.includes(cat))
      )
    }

    if (filters.priceLevel.length > 0) {
      filtered = filtered.filter((restaurant) =>
        filters.priceLevel.includes(restaurant.priceLevel)
      )
    }

    setFilteredRestaurants(filtered)
  }, [filters, restaurants])

  const handleCategoryToggle = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }))
  }

  const handlePriceToggle = (price: number) => {
    setFilters((prev) => ({
      ...prev,
      priceLevel: prev.priceLevel.includes(price)
        ? prev.priceLevel.filter((p) => p !== price)
        : [...prev.priceLevel, price],
    }))
  }

  const handleClearFilters = () => {
    setFilters({ categories: [], priceLevel: [] })
  }

  const hasActiveFilters = filters.categories.length > 0 || filters.priceLevel.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🗺️</div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button (Mobile) */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Explore {filteredRestaurants.length} Restaurant{filteredRestaurants.length === 1 ? '' : 's'}
        </h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center space-x-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors min-h-[44px]"
        >
          <Filter size={18} />
          <span>
            Filters {hasActiveFilters && `(${filters.categories.length + filters.priceLevel.length})`}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Filters Sidebar */}
        <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="card p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-brand-600 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Categories */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cuisine Type
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-all min-h-[36px]
                      ${
                        filters.categories.includes(category)
                          ? 'bg-brand-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Levels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Price Range
              </label>
              <div className="flex flex-wrap gap-2">
                {PRICE_LEVELS.map((price) => (
                  <button
                    key={price.value}
                    onClick={() => handlePriceToggle(price.value)}
                    className={`
                      px-4 py-2 rounded-full text-lg font-bold transition-all min-h-[36px]
                      ${
                        filters.priceLevel.includes(price.value)
                          ? 'bg-brand-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {price.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Map Legend</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                  <span>Restaurant Location</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Your Location</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <RestaurantMap restaurants={filteredRestaurants} filters={filters} />
        </div>
      </div>
    </div>
  )
}
