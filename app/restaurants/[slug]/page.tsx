'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// Review Form Component
function ReviewForm({ restaurantId, restaurantName, onClose }: { restaurantId: string, restaurantName: string, onClose: () => void }) {
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // In a real app, this would submit to an API endpoint
    // For now, we'll just show a success message
    setTimeout(() => {
      alert('Thank you for your review! In a production app, this would be saved to the database.')
      setTitle('')
      setText('')
      setRating(5)
      setSubmitting(false)
      onClose()
    }, 500)
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-primary-200">
      <h3 className="text-lg font-semibold mb-3">Write a Review for {restaurantName}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none"
              >
                <svg
                  className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Give your review a title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Review
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Tell others about your experience..."
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default function RestaurantDetailPage() {
  const params = useParams()
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)

  useEffect(() => {
    if (params.slug) {
      fetchRestaurant(params.slug as string)
      checkFavoriteStatus()
    }
  }, [params.slug])

  const fetchRestaurant = async (slug: string) => {
    try {
      const response = await fetch(`/api/restaurants/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setRestaurant(data)
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkFavoriteStatus = () => {
    if (params.slug && typeof window !== 'undefined') {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
      setIsFavorite(favorites.includes(params.slug as string))
    }
  }

  const handleToggleFavorite = () => {
    if (!params.slug || typeof window === 'undefined') return
    
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
    const slug = params.slug as string
    
    if (isFavorite) {
      // Remove from favorites
      const updatedFavorites = favorites.filter((f: string) => f !== slug)
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites))
      setIsFavorite(false)
      alert('Removed from favorites')
    } else {
      // Add to favorites
      favorites.push(slug)
      localStorage.setItem('favorites', JSON.stringify(favorites))
      setIsFavorite(true)
      alert('Added to favorites!')
    }
  }

  const handleShareRestaurant = async () => {
    if (navigator.share && restaurant) {
      try {
        await navigator.share({
          title: restaurant.name,
          text: `Check out ${restaurant.name} in Katy, Texas!`,
          url: window.location.href,
        })
      } catch (err) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    alert('Link copied to clipboard!')
  }

  const getPriceLevelDisplay = (level: string) => {
    switch (level) {
      case 'BUDGET': return '$'
      case 'MODERATE': return '$$'
      case 'UPSCALE': return '$$$'
      case 'PREMIUM': return '$$$$'
      default: return '$$'
    }
  }

  const formatHours = (hours: any) => {
    if (!hours) return null
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
    return hours[today]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading restaurant details...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Restaurant Not Found</h2>
          <p className="text-gray-600 mb-6">The restaurant you're looking for doesn't exist.</p>
          <Link href="/discover" className="btn-primary">
            Browse Restaurants
          </Link>
        </div>
      </div>
    )
  }

  const todayHours = formatHours(restaurant.hours)
  const defaultImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Image */}
      <div className="relative h-96 bg-gray-200">
        <img 
          src={restaurant.photos?.[0] || defaultImage}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        {/* Breadcrumb */}
        <div className="absolute top-4 left-4">
          <Link href="/discover" className="text-white hover:text-primary-200 flex items-center bg-black/30 px-3 py-2 rounded-lg backdrop-blur-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Discover
          </Link>
        </div>

        {/* Restaurant Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2" data-testid="restaurant-name">
                  {restaurant.name}
                </h1>
                <div className="flex items-center gap-4 text-white">
                  {restaurant.rating && (
                    <div className="flex items-center">
                      <span className="text-yellow-400 mr-1">⭐</span>
                      <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
                      <span className="ml-1 opacity-75">({restaurant.reviewCount || 0} reviews)</span>
                    </div>
                  )}
                  <span className="opacity-75">•</span>
                  <span className="font-semibold">{getPriceLevelDisplay(restaurant.priceLevel)}</span>
                  {restaurant.featured && (
                    <>
                      <span className="opacity-75">•</span>
                      <span className="bg-primary-600 px-2 py-1 rounded text-sm">FEATURED</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleToggleFavorite}
                  className="bg-white/10 backdrop-blur-sm p-3 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <svg className={`w-6 h-6 ${isFavorite ? 'text-red-500 fill-current' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="bg-white/10 backdrop-blur-sm p-3 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Share restaurant"
                  title="Share restaurant"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Description */}
            {restaurant.description && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-3">About</h2>
                <p className="text-gray-700">{restaurant.description}</p>
              </div>
            )}

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-3">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {restaurant.categories && (
                  typeof restaurant.categories === 'string' 
                    ? restaurant.categories.split(',').map((cat: string) => cat.trim())
                    : restaurant.categories
                ).map((cat: string) => (
                  <Link
                    key={cat}
                    href={`/discover?category=${cat}`}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-primary-100 hover:text-primary-700 transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Reviews</h2>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="btn-primary text-sm"
                >
                  {showReviewForm ? 'Cancel' : 'Write a Review'}
                </button>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <ReviewForm 
                  restaurantId={restaurant.id}
                  restaurantName={restaurant.name}
                  onClose={() => setShowReviewForm(false)}
                />
              )}

              {restaurant.reviews && restaurant.reviews.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {restaurant.reviews.map((review: any) => (
                    <div key={review.id} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-gray-900">{review.user?.name || 'Anonymous'}</div>
                          <div className="flex items-center mt-1">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.title && (
                        <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                      )}
                      <p className="text-gray-700">{review.text}</p>
                    </div>
                  ))}
                </div>
              ) : !showReviewForm ? (
                <p className="text-gray-500">No reviews yet. Be the first to review!</p>
              ) : null}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Contact & Hours</h2>
              
              {/* Address */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Address</h3>
                <p className="text-gray-900">
                  {restaurant.address}<br />
                  {restaurant.city}, {restaurant.state} {restaurant.zipCode}
                </p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address} ${restaurant.city} ${restaurant.state}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Get Directions
                </a>
              </div>

              {/* Phone */}
              {restaurant.phone && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Phone</h3>
                  <a href={`tel:${restaurant.phone}`} className="text-primary-600 hover:text-primary-700">
                    {restaurant.phone}
                  </a>
                </div>
              )}

              {/* Website */}
              {restaurant.website && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Website</h3>
                  <a 
                    href={restaurant.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 break-all"
                  >
                    Visit Website
                  </a>
                </div>
              )}

              {/* Hours */}
              {todayHours && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Today's Hours</h3>
                  <p className="text-gray-900">
                    {todayHours.open} - {todayHours.close}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-6">
                <Link
                  href={`/spinner?restaurant=${restaurant.id}`}
                  className="btn-primary text-center"
                >
                  🎰 Spin Similar
                </Link>
                {restaurant.website && (
                  <a
                    href={restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-center"
                  >
                    Make Reservation
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}