'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import RestaurantCard from '@/components/RestaurantCard'
import SearchBar from '@/components/SearchBar'
import BlogPreview from '@/components/BlogPreview'

const categories = [
  'All', 'Mexican', 'BBQ', 'Asian', 'American', 
  'Seafood', 'Indian', 'Greek', 'Breakfast', 'Italian',
  'Chinese', 'Japanese', 'Thai', 'Vietnamese'
]

const priceLevels = [
  { value: '', label: 'All Prices' },
  { value: 'BUDGET', label: '$' },
  { value: 'MODERATE', label: '$$' },
  { value: 'UPSCALE', label: '$$$' },
  { value: 'PREMIUM', label: '$$$$' }
]

const sortOptions = [
  { value: 'rating', label: 'Rating' },
  { value: 'distance', label: 'Distance' },
  { value: 'name', label: 'Name' },
  { value: 'reviews', label: 'Most Reviewed' }
]

function DiscoverPageContent() {
  const searchParams = useSearchParams()
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All')
  const [selectedPriceLevel, setSelectedPriceLevel] = useState(searchParams.get('priceLevel') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'rating')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(searchParams.get('featured') === 'true')
  const [offset, setOffset] = useState(0)
  
  const fetchRestaurants = useCallback(async (reset = false) => {
    setLoading(true)
    
    const params = new URLSearchParams()
    if (searchQuery) params.append('q', searchQuery)
    if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory)
    if (selectedPriceLevel) params.append('priceLevel', selectedPriceLevel)
    if (showFeaturedOnly) params.append('featured', 'true')
    params.append('sortBy', sortBy)
    // One card per brand while browsing. The API ignores this when a search
    // term is present, so typing a chain's name still lists its locations.
    params.append('maxPerChain', '1')
    params.append('limit', '12')
    params.append('offset', reset ? '0' : offset.toString())
    
    try {
      const response = await fetch(`/api/restaurants?${params.toString()}`)
      const data = await response.json()
      
      if (reset) {
        setRestaurants(data.restaurants || [])
        setOffset(12)
      } else {
        setRestaurants(prev => [...prev, ...(data.restaurants || [])])
        setOffset(prev => prev + 12)
      }
      
      setHasMore(data.pagination?.hasMore || false)
      setTotalCount(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching restaurants:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, selectedPriceLevel, showFeaturedOnly, sortBy, offset])
  
  // Fetch on mount and when filters change
  useEffect(() => {
    setOffset(0)
    fetchRestaurants(true)
  }, [searchQuery, selectedCategory, selectedPriceLevel, showFeaturedOnly, sortBy])
  
  // Handle search from URL params
  useEffect(() => {
    const q = searchParams.get('q')
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')
    
    if (q) setSearchQuery(q)
    if (category) setSelectedCategory(category)
    if (featured === 'true') setShowFeaturedOnly(true)
  }, [searchParams])
  
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchRestaurants(false)
    }
  }
  
  const clearFilters = () => {
    setSelectedCategory('All')
    setSelectedPriceLevel('')
    setShowFeaturedOnly(false)
    setSortBy('rating')
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Discover Restaurants</h1>
          <p className="text-xl text-primary-100">
            Explore Katy's Best Restaurants
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mt-6">
            <SearchBar />
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {/* Category Pills */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Price Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Level
              </label>
              <select
                value={selectedPriceLevel}
                onChange={(e) => setSelectedPriceLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {priceLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Featured Only */}
            <div className="flex items-end">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFeaturedOnly}
                  onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                  className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Featured Only
                </span>
              </label>
            </div>
            
            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
        
        {/* Active Filters Display */}
        {(searchQuery || (selectedCategory !== 'All') || selectedPriceLevel || showFeaturedOnly) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {searchQuery && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700">
                Search: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-2 hover:text-primary-900"
                >
                  ×
                </button>
              </span>
            )}
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700">
                {selectedCategory}
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="ml-2 hover:text-primary-900"
                >
                  ×
                </button>
              </span>
            )}
            {selectedPriceLevel && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700">
                Price: {priceLevels.find(p => p.value === selectedPriceLevel)?.label}
                <button
                  onClick={() => setSelectedPriceLevel('')}
                  className="ml-2 hover:text-primary-900"
                >
                  ×
                </button>
              </span>
            )}
            {showFeaturedOnly && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700">
                Featured
                <button
                  onClick={() => setShowFeaturedOnly(false)}
                  className="ml-2 hover:text-primary-900"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
        
        {/* Results */}
        {loading && restaurants.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse"></div>
            ))}
          </div>
        ) : restaurants.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Loading...' : 'Load More Restaurants'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No restaurants found
            </h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or search terms
            </p>
            <button
              onClick={clearFilters}
              className="btn-primary"
            >
              Clear Filters
            </button>
          </div>
        )}
        
        {/* Blog Sidebar */}
        {restaurants.length > 0 && (
          <div className="mt-16 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8">
            <BlogPreview limit={2} showTitle={true} familyFocused={true} />
          </div>
        )}
      </div>
    </div>
  )
}
export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>}>
      <DiscoverPageContent />
    </Suspense>
  )
}
