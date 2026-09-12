'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Restaurant {
  id: string
  name: string
  slug: string
  description: string
  address: string
  phone: string
  website: string
  hours: any
  cuisineTypes: string
  priceLevel: string
  rating: number
  reviewCount: number
  active: boolean
}

interface Review {
  id: string
  rating: number
  comment: string
  userName: string
  createdAt: string
  response: string | null
}

interface Event {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  active: boolean
}

export default function RestaurantDashboardPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'reviews' | 'events'>('profile')
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editedRestaurant, setEditedRestaurant] = useState<Partial<Restaurant>>({})

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only listings the signed-in user is a verified owner of are manageable
    fetch('/api/owner/restaurants')
      .then(async res => {
        if (res.status === 401) {
          throw new Error('Please sign in to access your restaurant dashboard.')
        }
        return res.json()
      })
      .then(data => {
        if (data.restaurants && data.restaurants.length > 0) {
          setRestaurantId(data.restaurants[0].id)
        } else {
          setError('No claimed restaurants found for your account.')
          setLoading(false)
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to load restaurant data')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantData()
    }
  }, [restaurantId])

  const fetchRestaurantData = async () => {
    if (!restaurantId) return
    
    setLoading(true)
    try {
      // Fetch restaurant profile
      const resData = await fetch(`/api/restaurant-dashboard/${restaurantId}`)
      const data = await resData.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setRestaurant(data.restaurant)
        setReviews(data.reviews || [])
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Failed to fetch restaurant data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`/api/restaurant-dashboard/${restaurantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedRestaurant)
      })
      
      if (response.ok) {
        await fetchRestaurantData()
        setEditMode(false)
        alert('Profile updated successfully!')
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile')
    }
  }

  const handleRespondToReview = async (reviewId: string, response: string) => {
    try {
      const res = await fetch(`/api/restaurant-dashboard/${restaurantId}/reviews/${reviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      })
      
      if (res.ok) {
        await fetchRestaurantData()
        alert('Response posted successfully!')
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to post response')
      }
    } catch (error) {
      console.error('Failed to respond to review:', error)
      alert('Failed to post response')
    }
  }

  const handleCreateEvent = async (eventData: any) => {
    try {
      const response = await fetch(`/api/restaurant-dashboard/${restaurantId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (response.ok) {
        await fetchRestaurantData()
        alert('Event created successfully!')
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.error || 'Failed to create event')
      }
    } catch (error) {
      console.error('Failed to create event:', error)
      alert('Failed to create event')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            {error || 'Please sign in to access your restaurant dashboard.'}
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Only verified restaurant owners can manage a listing. Claim your restaurant to get access.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Restaurant Dashboard</h1>
              <p className="text-gray-600 mt-1">{restaurant?.name}</p>
            </div>
            <Link 
              href={`/restaurants/${restaurant?.slug}`}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View Public Profile →
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'reviews'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'events'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Events ({events.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Tab */}
        {activeTab === 'profile' && restaurant && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Restaurant Profile</h2>
              {!editMode ? (
                <button
                  onClick={() => {
                    setEditMode(true)
                    setEditedRestaurant(restaurant)
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedRestaurant.name || ''}
                    onChange={(e) => setEditedRestaurant({ ...editedRestaurant, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{restaurant.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                {editMode ? (
                  <textarea
                    value={editedRestaurant.description || ''}
                    onChange={(e) => setEditedRestaurant({ ...editedRestaurant, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{restaurant.description}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={editedRestaurant.phone || ''}
                      onChange={(e) => setEditedRestaurant({ ...editedRestaurant, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{restaurant.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  {editMode ? (
                    <input
                      type="url"
                      value={editedRestaurant.website || ''}
                      onChange={(e) => setEditedRestaurant({ ...editedRestaurant, website: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      {restaurant.website}
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedRestaurant.address || ''}
                    onChange={(e) => setEditedRestaurant({ ...editedRestaurant, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{restaurant.address}</p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">{restaurant.rating}</div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">{restaurant.reviewCount}</div>
                  <div className="text-sm text-gray-600">Total Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">{events.length}</div>
                  <div className="text-sm text-gray-600">Active Events</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
              
              {reviews.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No reviews yet</p>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onRespond={handleRespondToReview}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Events & Promotions</h2>
                <button
                  onClick={() => {
                    const title = prompt('Event Title:')
                    const description = prompt('Event Description:')
                    const startDate = prompt('Start Date (YYYY-MM-DD):')
                    if (title && description && startDate) {
                      handleCreateEvent({ title, description, startDate, endDate: startDate })
                    }
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  + Create Event
                </button>
              </div>

              {events.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No events yet. Create your first event!</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Review Card Component
function ReviewCard({ review, onRespond }: { review: Review; onRespond: (id: string, response: string) => void }) {
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [response, setResponse] = useState('')

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-gray-900">{review.userName}</span>
            <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
          </div>
          <p className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      
      <p className="text-gray-700 mb-4">{review.comment}</p>

      {review.response ? (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">Your Response:</p>
          <p className="text-sm text-blue-800">{review.response}</p>
        </div>
      ) : (
        <>
          {!showResponseForm ? (
            <button
              onClick={() => setShowResponseForm(true)}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Respond to Review
            </button>
          ) : (
            <div className="mt-4">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write your response..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onRespond(review.id, response)
                    setShowResponseForm(false)
                    setResponse('')
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                  Post Response
                </button>
                <button
                  onClick={() => {
                    setShowResponseForm(false)
                    setResponse('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Event Card Component
function EventCard({ event }: { event: Event }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          event.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {event.active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <p className="text-gray-700 mb-4">{event.description}</p>
      <div className="text-sm text-gray-500">
        📅 {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
      </div>
    </div>
  )
}
