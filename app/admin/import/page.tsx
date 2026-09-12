'use client'

import { useState } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

interface SearchResult {
  name: string
  address: string
  placeId: string
  rating: number
  inDatabase: boolean
  databaseId?: string
}

interface ImportResult {
  success: boolean
  action: 'created' | 'updated'
  restaurant: {
    id: string
    name: string
    slug: string
    address: string
    phone: string | null
    website: string | null
    rating: number | null
    reviewCount: number
    cuisineTypes: string
    priceLevel: string
  }
}

export default function ImportRestaurantPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    setError(null)
    setSearchResult(null)
    setImportResult(null)

    try {
      const response = await fetch(`/api/admin/import-restaurant?q=${encodeURIComponent(searchQuery)}`)
      const data = await readJson(response)

      if (!response.ok) {
        setError(data.message || 'Restaurant not found')
        return
      }

      setSearchResult(data.restaurant)
    } catch (err: any) {
      setError('Failed to search. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleImport = async () => {
    if (!searchQuery.trim()) return

    setImporting(true)
    setError(null)
    setImportResult(null)

    try {
      const response = await fetch('/api/admin/import-restaurant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ekaty-admin-secret-2025'
        },
        body: JSON.stringify({ restaurantName: searchQuery })
      })

      const data = await readJson(response)

      if (!response.ok) {
        setError(data.message || 'Import failed')
        return
      }

      setImportResult(data)
      setSearchResult(null)
    } catch (err: any) {
      setError('Failed to import. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Import Restaurant</h1>
              <p className="text-gray-600 mt-1">Search and import restaurants from Google Places</p>
            </div>
            <Link 
              href="/"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSearch}>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant Name
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Texas Roadhouse, Pappasito's Cantina"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={searching || importing}
              />
              <button
                type="submit"
                disabled={searching || importing || !searchQuery.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              💡 Tip: Include &ldquo;Katy&rdquo; or the full restaurant name for best results
            </p>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Result */}
        {searchResult && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{searchResult.name}</h2>
                <p className="text-gray-600 mt-1">{searchResult.address}</p>
              </div>
              {searchResult.rating && (
                <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full">
                  <span className="text-yellow-600 font-semibold">{searchResult.rating}</span>
                  <span className="text-yellow-500 ml-1">⭐</span>
                </div>
              )}
            </div>

            {searchResult.inDatabase ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Already in database</p>
                    <p className="text-sm text-blue-700">This restaurant is already imported. Click import to update its information.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">Ready to import</p>
                    <p className="text-sm text-green-700">This restaurant will be added to your database.</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {importing ? 'Importing...' : searchResult.inDatabase ? 'Update Restaurant Data' : 'Import Restaurant'}
            </button>
          </div>
        )}

        {/* Import Success */}
        {importResult && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {importResult.action === 'created' ? 'Restaurant Imported!' : 'Restaurant Updated!'}
              </h2>
              <p className="text-gray-600">
                {importResult.action === 'created' 
                  ? 'The restaurant has been successfully added to your database.'
                  : 'The restaurant information has been updated with the latest data.'}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Restaurant Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Name:</dt>
                  <dd className="font-medium text-gray-900">{importResult.restaurant.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Address:</dt>
                  <dd className="font-medium text-gray-900 text-right">{importResult.restaurant.address}</dd>
                </div>
                {importResult.restaurant.phone && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Phone:</dt>
                    <dd className="font-medium text-gray-900">{importResult.restaurant.phone}</dd>
                  </div>
                )}
                {importResult.restaurant.website && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Website:</dt>
                    <dd className="font-medium text-gray-900">
                      <a href={importResult.restaurant.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                        Visit
                      </a>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-600">Cuisine:</dt>
                  <dd className="font-medium text-gray-900">{importResult.restaurant.cuisineTypes}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Price Level:</dt>
                  <dd className="font-medium text-gray-900">{importResult.restaurant.priceLevel}</dd>
                </div>
                {importResult.restaurant.rating && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Rating:</dt>
                    <dd className="font-medium text-gray-900">
                      {importResult.restaurant.rating} ⭐ ({importResult.restaurant.reviewCount} reviews)
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                href={`/restaurants/${importResult.restaurant.slug}`}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-center"
              >
                View Restaurant
              </Link>
              <button
                onClick={() => {
                  setImportResult(null)
                  setSearchQuery('')
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Import Another
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!searchResult && !importResult && !error && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">How to Use</h3>
            <ol className="space-y-3 text-gray-600">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">1</span>
                <span>Enter the restaurant name in the search box above</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">2</span>
                <span>Click &ldquo;Search&rdquo; to find the restaurant on Google Places</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">3</span>
                <span>Review the search result to confirm it&apos;s the correct restaurant</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">4</span>
                <span>Click &ldquo;Import Restaurant&rdquo; to add it to your database with full details</span>
              </li>
            </ol>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use the full restaurant name for best results</li>
                <li>• Include &ldquo;Katy&rdquo; if the restaurant has multiple locations</li>
                <li>• The system will automatically fetch photos, hours, ratings, and more</li>
                <li>• You can re-import to update existing restaurant data</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
