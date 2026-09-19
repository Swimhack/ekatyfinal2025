'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

interface OutreachSegment {
  name: string
  count: number
  criteria: string
  potentialRevenue: number
  restaurants: any[]
}

interface CampaignStats {
  totalTargets: number
  emailsSent: number
  smsSent: number
  responses: number
  conversions: number
  revenue: number
}

export default function OutreachDashboard() {
  const [segments, setSegments] = useState<OutreachSegment[]>([])
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [sendingEmails, setSendingEmails] = useState(false)

  useEffect(() => {
    loadOutreachData()
  }, [])

  async function loadOutreachData() {
    try {
      const res = await fetch('/api/admin/outreach/segments')
      const data = await readJson(res)

      if (data.segments) {
        setSegments(data.segments)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load outreach data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function sendBulkEmails(segmentName: string) {
    if (!confirm(`Send emails to all restaurants in "${segmentName}"?`)) return

    setSendingEmails(true)
    try {
      const res = await fetch('/api/admin/outreach/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment: segmentName })
      })

      const data = await readJson(res)

      if (data.success) {
        alert(`Successfully sent ${data.sent} emails!`)
        loadOutreachData()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to send emails')
    } finally {
      setSendingEmails(false)
    }
  }

  async function exportSegmentCSV(segmentName: string) {
    try {
      const res = await fetch(`/api/admin/outreach/export?segment=${encodeURIComponent(segmentName)}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${segmentName.toLowerCase().replace(/\s+/g, '-')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to export CSV')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading outreach data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Restaurant Outreach</h1>
              <p className="text-gray-600 mt-1">
                Automated email and SMS campaigns to convert restaurants
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Targets</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalTargets}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Emails Sent</div>
              <div className="text-2xl font-bold text-blue-600">{stats.emailsSent}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">SMS Sent</div>
              <div className="text-2xl font-bold text-green-600">{stats.smsSent}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Responses</div>
              <div className="text-2xl font-bold text-purple-600">{stats.responses}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Conversions</div>
              <div className="text-2xl font-bold text-orange-600">{stats.conversions}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Revenue (MRR)</div>
              <div className="text-2xl font-bold text-green-700">${stats.revenue}</div>
            </div>
          </div>
        )}

        {/* Revenue Projections */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Revenue Potential</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm opacity-90">Conservative (10% Conversion)</div>
              <div className="text-3xl font-bold">
                ${Math.floor((stats?.totalTargets || 249) * 0.10 * 99).toLocaleString()}/month
              </div>
              <div className="text-sm opacity-75 mt-1">
                ${Math.floor((stats?.totalTargets || 249) * 0.10 * 99 * 12).toLocaleString()}/year
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90">Optimistic (20% Conversion)</div>
              <div className="text-3xl font-bold">
                ${Math.floor((stats?.totalTargets || 249) * 0.20 * 99).toLocaleString()}/month
              </div>
              <div className="text-sm opacity-75 mt-1">
                ${Math.floor((stats?.totalTargets || 249) * 0.20 * 99 * 12).toLocaleString()}/year
              </div>
            </div>
          </div>
        </div>

        {/* Segments */}
        <div className="space-y-6">
          {segments.map((segment) => (
            <div key={segment.name} className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{segment.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{segment.criteria}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{segment.count}</div>
                    <div className="text-sm text-gray-600">restaurants</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-600">Potential Revenue (10%)</div>
                    <div className="text-lg font-semibold text-green-600">
                      ${Math.floor(segment.count * 0.10 * 99)}/mo
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-600">Potential Revenue (20%)</div>
                    <div className="text-lg font-semibold text-green-700">
                      ${Math.floor(segment.count * 0.20 * 99)}/mo
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-600">Annual Potential (20%)</div>
                    <div className="text-lg font-semibold text-green-800">
                      ${Math.floor(segment.count * 0.20 * 99 * 12).toLocaleString()}/yr
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedSegment(selectedSegment === segment.name ? null : segment.name)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {selectedSegment === segment.name ? 'Hide' : 'View'} Restaurants
                  </button>

                  <button
                    onClick={() => sendBulkEmails(segment.name)}
                    disabled={sendingEmails}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingEmails ? 'Sending...' : 'Send Bulk Emails'}
                  </button>

                  <button
                    onClick={() => exportSegmentCSV(segment.name)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Export CSV
                  </button>

                  <Link
                    href={`/admin/outreach/${segment.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Manage Campaign
                  </Link>
                </div>

                {/* Restaurant List */}
                {selectedSegment === segment.name && (
                  <div className="mt-6 border-t pt-6">
                    <div className="space-y-3">
                      {segment.restaurants.slice(0, 10).map((restaurant: any, index: number) => (
                        <div key={restaurant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{restaurant.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {restaurant.cuisine} • {restaurant.rating}/5 ({restaurant.reviews} reviews)
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {restaurant.phone || 'No phone'} • {restaurant.website || 'No website'}
                            </div>
                          </div>
                          <div className="ml-4">
                            <Link
                              href={`/admin/restaurants/${restaurant.id}/edit`}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                      {segment.restaurants.length > 10 && (
                        <div className="text-center text-sm text-gray-600 pt-4">
                          + {segment.restaurants.length - 10} more restaurants
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                const phoneSegment = segments.find(s => s.name === 'Phone-Only Quick Wins')
                if (phoneSegment) {
                  exportSegmentCSV(phoneSegment.name)
                }
              }}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="font-semibold text-gray-900">Download SMS List</div>
              <div className="text-sm text-gray-600 mt-1">
                24 phone-only restaurants - highest conversion
              </div>
            </button>

            <button
              onClick={() => {
                window.open('https://sendgrid.com/signup', '_blank')
              }}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="font-semibold text-gray-900">Setup SendGrid</div>
              <div className="text-sm text-gray-600 mt-1">
                Free 2,000 emails/month for automation
              </div>
            </button>

            <button
              onClick={() => {
                window.open('https://www.twilio.com/try-twilio', '_blank')
              }}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="font-semibold text-gray-900">Setup Twilio SMS</div>
              <div className="text-sm text-gray-600 mt-1">
                $15 free credit for SMS outreach
              </div>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-2">Getting Started</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
            <li>Click &ldquo;Export CSV&rdquo; on Phone-Only Quick Wins to get SMS list</li>
            <li>Text first 5-10 restaurants manually from your phone</li>
            <li>Click &ldquo;Send Bulk Emails&rdquo; on High-Value Targets segment</li>
            <li>Track responses and conversions in the stats above</li>
            <li>Follow up with interested restaurants within 1 hour</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
