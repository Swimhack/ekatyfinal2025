'use client'

import { useState, useEffect } from 'react'
import { Restaurant } from '@/lib/supabase/database.types'
import GrubRouletteWheel from './GrubRouletteWheel'
import SpinnerFilters from './SpinnerFilters'
// import { SpinHistory } from '@/components/ui/placeholders'

export default function SpinnerPageContent() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
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

  const handleFiltersChange = (newFilters: {
    categories: string[]
    priceLevel: number[]
  }) => {
    setFilters(newFilters)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎲</div>
          <p className="text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <SpinnerFilters onFiltersChange={handleFiltersChange} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spinner */}
        <div className="lg:col-span-2">
          <GrubRouletteWheel restaurants={filteredRestaurants} filters={filters} />
        </div>

        {/* History */}
        <div className="lg:col-span-1">
          {/* <SpinHistory /> */}
        </div>
      </div>
    </div>
  )
}
