'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import RestaurantCard from '@/components/RestaurantCard'

const allCategories = [
  { name: 'Mexican', slug: 'mexican', emoji: '🌮', description: 'Tacos, burritos, and authentic Mexican cuisine' },
  { name: 'BBQ', slug: 'bbq', emoji: '🍖', description: 'Smoked meats and Texas-style barbecue' },
  { name: 'Asian', slug: 'asian', emoji: '🥢', description: 'Chinese, Japanese, Thai, and more' },
  { name: 'American', slug: 'american', emoji: '🍔', description: 'Burgers, steaks, and comfort food' },
  { name: 'Seafood', slug: 'seafood', emoji: '🦐', description: 'Fresh catches and coastal favorites' },
  { name: 'Indian', slug: 'indian', emoji: '🍛', description: 'Curries, tandoori, and spiced delights' },
  { name: 'Greek', slug: 'greek', emoji: '🥙', description: 'Mediterranean flavors and fresh ingredients' },
  { name: 'Breakfast', slug: 'breakfast', emoji: '🥞', description: 'All-day breakfast and brunch spots' },
  { name: 'Italian', slug: 'italian', emoji: '🍝', description: 'Pizza, pasta, and Italian classics' },
  { name: 'Chinese', slug: 'chinese', emoji: '🥟', description: 'Authentic Chinese and fusion dishes' },
  { name: 'Japanese', slug: 'japanese', emoji: '🍱', description: 'Sushi, ramen, and Japanese cuisine' },
  { name: 'Thai', slug: 'thai', emoji: '🌶️', description: 'Spicy and flavorful Thai dishes' },
  { name: 'Vietnamese', slug: 'vietnamese', emoji: '🍜', description: 'Pho, banh mi, and Vietnamese specialties' },
  { name: 'Bar', slug: 'bar', emoji: '🍺', description: 'Pubs, sports bars, and nightlife' },
  { name: 'Healthy', slug: 'healthy', emoji: '🥗', description: 'Salads, smoothies, and healthy options' },
  { name: 'Desserts', slug: 'desserts', emoji: '🍰', description: 'Sweet treats and dessert spots' }
]

export default function CategoryClient() {
  const params = useParams()
  const slug = params.slug as string
  const category = allCategories.find(c => c.slug === slug)
  
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (category) {
      fetchRestaurants()
    }
  }, [category])

  const fetchRestaurants = async () => {
    if (!category) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/restaurants?category=${encodeURIComponent(category.name)}&limit=50`)
      const data = await response.json()
      setRestaurants(data.restaurants || [])
      setCount(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching restaurants:', error)
      setRestaurants([])
    } finally {
      setLoading(false)
    }
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Category not found</h1>
          <Link href="/categories" className="btn-primary">
            View All Categories
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumbs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              Home
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/categories" className="text-gray-500 hover:text-gray-700">
              Categories
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 font-medium">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-6xl">{category.emoji}</span>
            <div>
              <h1 className="text-4xl font-bold">
                {category.name} Restaurants in Katy
              </h1>
              <p className="text-xl text-primary-100 mt-2">
                {category.description}
              </p>
            </div>
          </div>
          {count > 0 && (
            <p className="text-primary-100 mt-4">
              Found {count} {category.name.toLowerCase()} {count === 1 ? 'restaurant' : 'restaurants'}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse"></div>
            ))}
          </div>
        ) : restaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {category.name} restaurants found
            </h3>
            <p className="text-gray-600 mb-6">
              We're constantly adding new restaurants. Check back soon!
            </p>
            <Link href="/categories" className="btn-primary">
              View All Categories
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
