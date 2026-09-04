'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

interface Suggestion {
  id: string
  type: string
  restaurantId?: string
  restaurantName?: string
  field?: string
  currentValue?: string
  suggestedValue: string
  reason?: string
  submittedBy?: string
  submitterName?: string
  status: string
  priority: string
  votes: number
  createdAt: string
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchSuggestions()
  }, [filter])

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/suggestions?status=${filter}`)
      const data = await readJson(response)
      setSuggestions(data.suggestions || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, status: 'approved' | 'rejected', applyChanges = false) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, applyChanges })
      })

      if (response.ok) {
        fetchSuggestions()
      }
    } catch (error) {
      console.error('Error updating suggestion:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    }
    return colors[priority] || colors.normal
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      correction: '✏️',
      new_restaurant: '🏪',
      photo: '📸',
      menu: '📋',
      hours: '🕐',
      translation: '🌐'
    }
    return icons[type] || '📝'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Community Suggestions
        </h1>
        <p className="text-gray-600">
          Review and manage suggestions from the community
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {['pending', 'approved', 'rejected', 'duplicate'].map((status) => (
          <div
            key={status}
            className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${
              filter === status ? 'ring-2 ring-primary-500' : 'hover:shadow-md'
            }`}
            onClick={() => setFilter(status)}
          >
            <div className="text-sm text-gray-500 capitalize">{status}</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats[status] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="duplicate">Duplicate</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Suggestions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No suggestions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-2xl">{getTypeIcon(suggestion.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {suggestion.restaurantName || 'Unknown Restaurant'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority}
                      </span>
                      {suggestion.votes > 1 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {suggestion.votes} votes
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 capitalize">
                      {suggestion.type.replace('_', ' ')} 
                      {suggestion.field && ` - ${suggestion.field}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {suggestion.currentValue && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-xs text-red-600 font-medium mb-1">Current Value</p>
                    <p className="text-sm text-gray-900">{suggestion.currentValue}</p>
                  </div>
                )}
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-600 font-medium mb-1">Suggested Value</p>
                  <p className="text-sm text-gray-900">{suggestion.suggestedValue}</p>
                </div>
              </div>

              {suggestion.reason && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Reason:</p>
                  <p className="text-sm text-gray-700">{suggestion.reason}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  {suggestion.submitterName && (
                    <span>By {suggestion.submitterName} • </span>
                  )}
                  {new Date(suggestion.createdAt).toLocaleDateString()}
                  {suggestion.restaurantId && (
                    <>
                      {' • '}
                      <Link
                        href={`/admin/restaurants/${suggestion.restaurantId}/edit`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        View Restaurant
                      </Link>
                    </>
                  )}
                </div>

                {suggestion.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAction(suggestion.id, 'rejected')}
                      disabled={processingId === suggestion.id}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(suggestion.id, 'approved', false)}
                      disabled={processingId === suggestion.id}
                      className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors disabled:opacity-50"
                    >
                      Approve Only
                    </button>
                    {suggestion.restaurantId && suggestion.field && (
                      <button
                        onClick={() => handleAction(suggestion.id, 'approved', true)}
                        disabled={processingId === suggestion.id}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        Approve & Apply
                      </button>
                    )}
                  </div>
                )}

                {suggestion.status !== 'pending' && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    suggestion.status === 'approved' ? 'bg-green-100 text-green-800' :
                    suggestion.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {suggestion.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
