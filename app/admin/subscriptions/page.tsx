'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

interface Subscription {
  id: string
  user: {
    id: string
    email: string
    name: string | null
  }
  tier: string
  status: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
}

interface Stats {
  totalSubscriptions: number
  activeSubscriptions: number
  canceledSubscriptions: number
  pastDueSubscriptions: number
  mrr: number
  byTier: {
    FREE: number
    BASIC: number
    PRO: number
    PREMIUM: number
  }
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'canceled' | 'past_due'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSubscriptions()
  }, [filter])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/subscriptions?status=${filter}`)
      if (response.ok) {
        const data = await readJson(response)
        setSubscriptions(data.subscriptions)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return

    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST'
      })

      if (response.ok) {
        alert('Subscription canceled successfully')
        fetchSubscriptions()
      } else {
        alert('Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      alert('Error canceling subscription')
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.tier.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      FREE: 'bg-gray-100 text-gray-800',
      BASIC: 'bg-blue-100 text-blue-800',
      PRO: 'bg-purple-100 text-purple-800',
      PREMIUM: 'bg-yellow-100 text-yellow-800'
    }
    return colors[tier] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800',
      past_due: 'bg-orange-100 text-orange-800',
      trialing: 'bg-blue-100 text-blue-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
              <p className="mt-1 text-sm text-gray-600">Monitor and manage all subscriptions</p>
            </div>
            <Link href="/admin" className="btn-secondary">
              Back to Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Total Subscriptions</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalSubscriptions}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Active</div>
              <div className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Canceled</div>
              <div className="text-3xl font-bold text-red-600">{stats.canceledSubscriptions}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Past Due</div>
              <div className="text-3xl font-bold text-orange-600">{stats.pastDueSubscriptions}</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">MRR</div>
              <div className="text-3xl font-bold text-purple-600">${stats.mrr.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Tier Breakdown */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Subscriptions by Tier</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{stats.byTier.FREE}</div>
                <div className="text-sm text-gray-600">Free</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">{stats.byTier.BASIC}</div>
                <div className="text-sm text-blue-600">Basic</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-800">{stats.byTier.PRO}</div>
                <div className="text-sm text-purple-600">Pro</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-800">{stats.byTier.PREMIUM}</div>
                <div className="text-sm text-yellow-600">Premium</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by email, name, or tier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('canceled')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'canceled'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Canceled
              </button>
              <button
                onClick={() => setFilter('past_due')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'past_due'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Past Due
              </button>
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {subscription.user.name || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500">{subscription.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierColor(subscription.tier)}`}>
                          {subscription.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(subscription.status)}`}>
                          {subscription.status}
                        </span>
                        {subscription.cancelAtPeriodEnd && (
                          <div className="text-xs text-orange-600 mt-1">Cancels at period end</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{new Date(subscription.currentPeriodStart).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">
                          to {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <a
                            href={`https://dashboard.stripe.com/customers/${subscription.stripeCustomerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View in Stripe
                          </a>
                          {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                            <button
                              onClick={() => handleCancelSubscription(subscription.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
