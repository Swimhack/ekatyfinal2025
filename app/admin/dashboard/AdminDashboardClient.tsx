'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { parseJsonResponse } from '@/lib/utils/api-response'

interface Stats {
  totalRestaurants: number
  totalUsers: number
  totalReviews: number
  activeRestaurants: number
  totalBlogArticles: number
  publishedBlogArticles: number
  featuredRestaurants: number
  recentRestaurants: Array<{
    id: string
    name: string
    slug: string
    featured: boolean
    verified: boolean
    active: boolean
  }>
  recentBlogArticles: Array<{
    id: string
    title: string
    slug: string
    publishedDate: string | null
    status: string
  }>
}

export default function AdminDashboardClient() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [unfeaturing, setUnfeaturing] = useState(false)
  const [unfeatureMessage, setUnfeatureMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/signin')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const parsed = await parseJsonResponse<Stats>(response, 'Failed to fetch stats')
      if (!parsed.ok || !parsed.data) {
        console.error('Stats API error:', parsed.status, parsed.rawBody)
        throw new Error(parsed.error || 'Failed to fetch stats')
      }
      console.log('Stats loaded:', parsed.data)
      setStats(parsed.data)
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
      setError(error.message || 'Failed to load dashboard data')
      // Set default stats so dashboard still shows
      setStats({
        totalRestaurants: 0,
        activeRestaurants: 0,
        featuredRestaurants: 0,
        totalUsers: 0,
        totalReviews: 0,
        totalBlogArticles: 0,
        publishedBlogArticles: 0,
        recentRestaurants: [],
        recentBlogArticles: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnfeatureAll = async () => {
    if (!confirm('Are you sure you want to remove featured status from ALL restaurants? This action cannot be undone.')) {
      return
    }

    setUnfeaturing(true)
    setUnfeatureMessage(null)

    try {
      const response = await fetch('/api/admin/restaurants/unfeature-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const parsed = await parseJsonResponse<{ message?: string; count?: number }>(
        response,
        'Failed to unfeature restaurants'
      )

      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to unfeature restaurants')
      }

      setUnfeatureMessage({
        type: 'success',
        text: parsed.data?.message || `Successfully unfeatured ${parsed.data?.count ?? 0} restaurant(s)`
      })

      // Refresh stats to reflect changes
      await fetchStats()

      // Clear message after 5 seconds
      setTimeout(() => {
        setUnfeatureMessage(null)
      }, 5000)

    } catch (error: any) {
      setUnfeatureMessage({
        type: 'error',
        text: error.message || 'Failed to unfeature restaurants'
      })
    } finally {
      setUnfeaturing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 relative z-0">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
              <span className="text-sm">- Showing default values</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white border-b relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your eKaty platform</p>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Back to Site
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Restaurants</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRestaurants}</p>
                </div>
                <div className="text-4xl">🍽️</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Restaurants</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeRestaurants}</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reviews</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalReviews}</p>
                </div>
                <div className="text-4xl">⭐</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Featured</p>
                  <p className="text-3xl font-bold text-primary-600 mt-2">{stats.featuredRestaurants}</p>
                  <p className="text-xs text-gray-500 mt-1">restaurants</p>
                </div>
                <div className="text-4xl">⭐</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Recent Restaurants */}
        {stats && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recent Restaurants</h2>
              <Link href="/admin/restaurants" className="text-primary-600 hover:text-primary-700 font-medium">
                View All →
              </Link>
            </div>
            {stats.recentRestaurants && stats.recentRestaurants.length > 0 ? (
              <div className="bg-white rounded-lg shadow divide-y">
                {stats.recentRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{restaurant.name}</h3>
                          {restaurant.featured && <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">Featured</span>}
                          {restaurant.verified && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Verified</span>}
                          {!restaurant.active && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Inactive</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/restaurants/${restaurant.slug}`}
                          target="_blank"
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/restaurants/${restaurant.id}/edit`}
                          className="text-gray-600 hover:text-gray-900 text-sm"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No restaurants yet
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
            {unfeatureMessage && (
              <div className={`px-4 py-2 rounded-lg ${
                unfeatureMessage.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {unfeatureMessage.text}
              </div>
            )}
          </div>
          
          {/* Clear All Featured Button */}
          <div className="mb-6">
            <button
              onClick={handleUnfeatureAll}
              disabled={unfeaturing}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            >
              {unfeaturing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Unfeaturing...
                </>
              ) : (
                <>
                  <span className="mr-2">⭐</span>
                  Clear All Featured Restaurants
                </>
              )}
            </button>
            <p className="text-sm text-gray-600 mt-2">Remove featured status from all restaurants to make spots available for sale</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Manage Restaurants */}
            <Link href="/admin/restaurants" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block">
              <div className="flex items-start">
                <div className="text-4xl mr-4">🍽️</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Restaurants</h3>
                  <p className="text-sm text-gray-600">View, edit, and manage all restaurants</p>
                </div>
              </div>
            </Link>

            {/* My Favorites (user view) */}
            <Link href="/favorites" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block">
              <div className="flex items-start">
                <div className="text-4xl mr-4"></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">My Favorites</h3>
                  <p className="text-sm text-gray-600">View and manage your personal saved restaurants</p>
                </div>
              </div>
            </Link>

            {/* Spin Favorites (Grub Roulette) */}
            <Link href="/spinner?favoritesOnly=true" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block">
              <div className="flex items-start">
                <div className="text-4xl mr-4">
                  
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Spin Favorites</h3>
                  <p className="text-sm text-gray-600">Use Grub Roulette on your own favorites list</p>
                </div>
              </div>
            </Link>

            {/* Manage Users */}
            <Link href="/admin/users" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block">
              <div className="flex items-start">
                <div className="text-4xl mr-4">👥</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
                  <p className="text-sm text-gray-600">View and edit user profiles</p>
                </div>
              </div>
            </Link>

            {/* Import Restaurant */}
            <Link href="/admin/import" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block">
              <div className="flex items-start">
                <div className="text-4xl mr-4">📥</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Restaurant</h3>
                  <p className="text-sm text-gray-600">Add new restaurants from Google Places</p>
                </div>
              </div>
            </Link>

            {/* Sync Data */}
            <Link href="/admin/sync" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block">
              <div className="flex items-start">
                <div className="text-4xl mr-4">🔄</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sync Data</h3>
                  <p className="text-sm text-gray-600">Run multi-source restaurant sync</p>
                </div>
              </div>
            </Link>

            {/* Reviews */}
            <Link href="/admin/reviews" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block">
              <div className="flex items-start">
                <div className="text-4xl mr-4">⭐</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Reviews</h3>
                  <p className="text-sm text-gray-600">Moderate and manage user reviews</p>
                </div>
              </div>
            </Link>

            {/* Analytics */}
            <Link href="/admin/analytics" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block">
              <div className="flex items-start">
                <div className="text-4xl mr-4">📊</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
                  <p className="text-sm text-gray-600">View platform statistics and insights</p>
                </div>
              </div>
            </Link>

            {/* Blog Manager */}
            <Link href="/admin/blog" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block">
              <div className="flex items-start">
                <div className="text-4xl mr-4">📝</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Blog Manager</h3>
                  <p className="text-sm text-gray-600">Create and manage blog articles</p>
                </div>
              </div>
            </Link>

          </div>
        </div>

        {/* Blog Management Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">📝</span>
                Blog Management
              </h2>
              <p className="text-gray-600 mt-1">Create and manage your family dining blog articles</p>
            </div>
            <div className="flex gap-3">
              <Link 
                href="/admin/blog?action=quick_generate" 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center"
              >
                <span className="mr-2">⚡</span>
                Quick Generate
              </Link>
              <Link 
                href="/admin/blog?action=create" 
                className="px-4 py-2 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center"
              >
                <span className="mr-2">✍️</span>
                Create New
              </Link>
            </div>
          </div>
          
          {stats && stats.recentBlogArticles && stats.recentBlogArticles.length > 0 ? (
            <div className="bg-white rounded-lg shadow">
              <div className="divide-y divide-gray-200">
                {stats.recentBlogArticles.slice(0, 5).map((article) => (
                  <Link
                    key={article.id}
                    href={`/admin/blog?action=edit&id=${article.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {article.publishedDate && (
                            <span>
                              📅 {new Date(article.publishedDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs ${
                            article.status === 'published' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {article.status}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <Link
                          href={`/blog/${article.slug}`}
                          target="_blank"
                          className="text-primary-600 hover:text-primary-700 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {stats.totalBlogArticles > 5 && (
                <div className="p-4 border-t border-gray-200 text-center">
                  <Link 
                    href="/admin/blog" 
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View All {stats.totalBlogArticles} Articles →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Blog Articles Yet</h3>
              <p className="text-gray-600 mb-6">Start creating engaging content for Katy families!</p>
              <div className="flex gap-3 justify-center">
                <Link 
                  href="/admin/blog?action=quick_generate" 
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors inline-flex items-center"
                >
                  <span className="mr-2">⚡</span>
                  Generate with AI
                </Link>
                <Link 
                  href="/admin/blog?action=create" 
                  className="px-6 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors inline-flex items-center"
                >
                  <span className="mr-2">✍️</span>
                  Write Manually
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">System Status</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-900 font-medium">Database</span>
                </div>
                <span className="text-green-600 text-sm font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-900 font-medium">API</span>
                </div>
                <span className="text-green-600 text-sm font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-900 font-medium">Google Places API</span>
                </div>
                <span className="text-green-600 text-sm font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

