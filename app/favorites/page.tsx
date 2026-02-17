'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import RestaurantCard from '@/components/RestaurantCard'

interface Favorite {
  id: string
  notes: string | null
  createdAt: string
  restaurant: any
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/favorites')
      const data = await response.json()
      setFavorites(data.favorites || [])
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (restaurantId: string) => {
    try {
      const response = await fetch(`/api/favorites?restaurantId=${restaurantId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setFavorites(favorites.filter(fav => fav.restaurant.id !== restaurantId))
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error)
    }
  }

  const handleShare = () => {
    const restaurantIds = favorites.map(fav => fav.restaurant.id).join(',')
    const url = `${window.location.origin}/shared-favorites?ids=${restaurantIds}`
    setShareUrl(url)
    setShowShareModal(true)
  }

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('Link copied to clipboard!')
    window.dispatchEvent(new CustomEvent('ekaty:share'))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">My Favorites</h1>
              <p className="text-gray-600 mt-2">
                {favorites.length} {favorites.length === 1 ? 'restaurant' : 'restaurants'} saved
              </p>
            </div>
            <div className="flex gap-3">
              {favorites.length > 0 && (
                <>
                  <button
                    onClick={handleShare}
                    className="px-6 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 font-semibold"
                  >
                    📤 Share List
                  </button>
                  <Link
                    href="/spinner?favoritesOnly=true"
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
                  >
                    🎰 Spin Favorites
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Favorites Yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start building your list of favorite restaurants! Click the heart icon on any restaurant to save it here.
            </p>
            <Link
              href="/discover"
              className="inline-block px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
            >
              Discover Restaurants
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <div key={favorite.id} className="relative">
                <RestaurantCard restaurant={favorite.restaurant} />
                <button
                  onClick={() => handleRemoveFavorite(favorite.restaurant.id)}
                  className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                  title="Remove from favorites"
                >
                  ❤️
                </button>
                {favorite.notes && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Note:</span> {favorite.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Share Your Favorites</h2>
            <p className="text-gray-600 mb-4">
              Share this link with friends so they can see your favorite restaurants!
            </p>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <button
                onClick={copyShareUrl}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
