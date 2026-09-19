'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/utils/api-response'

interface Restaurant {
  id: string
  name: string
  slug: string
  email?: string | null
  address: string
  zipCode: string
  phone: string | null
  website: string | null
  featured: boolean
  verified: boolean
  active: boolean
  logoUrl: string | null
  categories: string | null
  cuisineTypes: string | null
  priceLevel: string
  createdAt: string
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'featured'>('all')

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    setLoading(true)
    setLoadError('')

    try {
      const response = await fetch('/api/admin/restaurants')
      // Safe parse: a proxy error page or auth redirect returns HTML, and
      // response.json() on that throws "Unexpected token '<'".
      const parsed = await parseJsonResponse<{ restaurants?: Restaurant[] }>(
        response,
        'Failed to load restaurants'
      )

      if (!parsed.ok) {
        console.error('Failed to fetch restaurants:', parsed.status, parsed.rawBody)
        setLoadError(parsed.error || 'Failed to load restaurants')
        setRestaurants([])
        return
      }

      setRestaurants(parsed.data?.restaurants || [])
    } catch (error) {
      console.error('Failed to fetch restaurants:', error)
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load restaurants (network error)'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleExportCsv = () => {
    if (!restaurants || restaurants.length === 0) return

    const header = ['Name', 'Email']
    const rows = restaurants.map((r) => [
      r.name || '',
      (r.email || '').toString(),
    ])

    const escape = (value: string) => {
      const v = value ?? ''
      if (v.includes('"') || v.includes(',') || v.includes('\n')) {
        return '"' + v.replace(/"/g, '""') + '"'
      }
      return v
    }

    const csvContent = [
      header.join(','),
      ...rows.map((row) => row.map(escape).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'restaurants-name-email.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         restaurant.address.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = 
      filterStatus === 'all' ? true :
      filterStatus === 'active' ? restaurant.active :
      filterStatus === 'inactive' ? !restaurant.active :
      filterStatus === 'featured' ? restaurant.featured : true

    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Restaurant Management</h1>
              <p className="text-gray-600 mt-2">
                {filteredRestaurants.length} of {restaurants.length} restaurants
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2 bg-white border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium"
              >
                Export Name + Email CSV
              </button>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          {loadError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">Could not load restaurants</p>
                  <p className="text-sm mt-1">{loadError}</p>
                </div>
                <button
                  type="button"
                  onClick={fetchRestaurants}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shrink-0"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or address..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Restaurants</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="featured">Featured Only</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Restaurant List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRestaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {restaurant.logoUrl && (
                          <img
                            src={restaurant.logoUrl}
                            alt={restaurant.name}
                            className="h-10 w-10 rounded-full object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {restaurant.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {restaurant.cuisineTypes?.split(',')[0] || 'Restaurant'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{restaurant.address}</div>
                      <div className="text-sm text-gray-500">{restaurant.zipCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          restaurant.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {restaurant.active ? 'Active' : 'Inactive'}
                        </span>
                        {restaurant.featured && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            ⭐ Featured
                          </span>
                        )}
                        {restaurant.verified && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{restaurant.priceLevel}</div>
                      {restaurant.phone && (
                        <div className="text-xs">{restaurant.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/restaurants/${restaurant.slug}`}
                          className="text-primary-600 hover:text-primary-900"
                          target="_blank"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/restaurants/${restaurant.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRestaurants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No restaurants found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
