'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

type View = 'overview' | 'launch' | 'restaurants' | 'sessions' | 'funnels' | 'performance'

interface ApiResponse<T = any> {
  success?: boolean
  data?: T
  error?: string
}

const views: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'launch', label: 'Launch' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'funnels', label: 'Funnels' },
  { id: 'performance', label: 'Performance' },
]

export default function AnalyticsPage() {
  const [activeView, setActiveView] = useState<View>('overview')
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<any | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set('view', activeView)
        if (activeView !== 'sessions') {
          params.set('days', String(days))
        }
        const res = await fetch(`/api/admin/analytics?${params.toString()}`)
        const data: ApiResponse = await readJson(res)
        if (!res.ok || data.error) {
          if (!isMounted) return
          setError(data.error || 'Failed to load analytics')
          setPayload(null)
        } else {
          if (!isMounted) return
          setPayload(data.data ?? data)
        }
      } catch (e: any) {
        if (!isMounted) return
        setError(e?.message || 'Failed to load analytics')
        setPayload(null)
      } finally {
        if (!isMounted) return
        setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [activeView, days])

  const canChangeDays = activeView !== 'sessions'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-1">View platform statistics and insights</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
            {views.map(view => (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeView === view.id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">Range</span>
            <select
              disabled={!canChangeDays}
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 min-h-[320px]">
          {loading && (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              Loading analytics
            </div>
          )}

          {!loading && error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && payload && (
            <AnalyticsView view={activeView} data={payload} />
          )}

          {!loading && !error && !payload && (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              No analytics data available for this range.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AnalyticsView({ view, data }: { view: View; data: any }) {
  switch (view) {
    case 'overview':
      return <OverviewView data={data} />
    case 'launch':
      return <LaunchView data={data} />
    case 'restaurants':
      return <RestaurantsView data={data} />
    case 'sessions':
      return <SessionsView data={data} />
    case 'funnels':
      return <FunnelsView data={data} />
    case 'performance':
      return <PerformanceView data={data} />
    default:
      return null
  }
}

function OverviewView({ data }: { data: any }) {
  const dailyMetrics = data?.dailyMetrics || []
  const sessionStats = data?.sessionStats || {}
  const eventsByCategory = data?.eventsByCategory || []
  const topRestaurants = data?.topRestaurants || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Sessions</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{sessionStats.total || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Converted</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{sessionStats.converted || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Avg Duration (s)</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{Math.round(sessionStats.avgDuration || 0)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Days</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{dailyMetrics.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Events by category</h3>
          {eventsByCategory.length === 0 ? (
            <p className="text-sm text-gray-500">No events recorded for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b text-gray-500">
                  <tr>
                    <th className="py-2 pr-4 text-left font-medium">Category</th>
                    <th className="py-2 text-left font-medium">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsByCategory.map((row: any) => (
                    <tr key={row.eventCategory} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-gray-900">{row.eventCategory}</td>
                      <td className="py-2 text-gray-900">{row._count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top restaurants by profile views</h3>
          {topRestaurants.length === 0 ? (
            <p className="text-sm text-gray-500">No restaurant analytics recorded for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b text-gray-500">
                  <tr>
                    <th className="py-2 pr-4 text-left font-medium">Restaurant</th>
                    <th className="py-2 text-left font-medium">Date</th>
                    <th className="py-2 text-left font-medium">Profile views</th>
                  </tr>
                </thead>
                <tbody>
                  {topRestaurants.map((row: any) => (
                    <tr key={`${row.restaurantId}-${row.date}`} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-gray-900">{row.restaurantId}</td>
                      <td className="py-2 text-gray-900">{row.date}</td>
                      <td className="py-2 text-gray-900">{row.profileViews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LaunchView({ data }: { data: any }) {
  const metrics = data?.metrics || []
  const giveawayEntries = data?.giveawayEntries || []
  const coupons = data?.coupons || []
  const flyerDownloads = data?.flyerDownloads || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Days</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.length}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Giveaway entries</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{giveawayEntries.length}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Coupons</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{coupons.length}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Flyer types</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{flyerDownloads.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Giveaway entries (latest)</h3>
          {giveawayEntries.length === 0 ? (
            <p className="text-sm text-gray-500">No giveaway entries recorded for this period.</p>
          ) : (
            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full text-sm">
                <thead className="border-b text-gray-500">
                  <tr>
                    <th className="py-2 pr-4 text-left font-medium">Email</th>
                    <th className="py-2 text-left font-medium">Name</th>
                    <th className="py-2 text-left font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {giveawayEntries.slice(0, 20).map((row: any) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-gray-900">{row.email}</td>
                      <td className="py-2 text-gray-900">{row.name}</td>
                      <td className="py-2 text-gray-900">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Flyer downloads by type</h3>
          {flyerDownloads.length === 0 ? (
            <p className="text-sm text-gray-500">No flyer downloads recorded for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b text-gray-500">
                  <tr>
                    <th className="py-2 pr-4 text-left font-medium">Type</th>
                    <th className="py-2 text-left font-medium">Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {flyerDownloads.map((row: any) => (
                    <tr key={row.flyerType} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-gray-900">{row.flyerType}</td>
                      <td className="py-2 text-gray-900">{row._count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RestaurantsView({ data }: { data: any }) {
  const byRestaurant = data?.byRestaurant || []

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Restaurant engagement (aggregated)</h3>
      {byRestaurant.length === 0 ? (
        <p className="text-sm text-gray-500">No restaurant analytics recorded for this period.</p>
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="py-2 pr-4 text-left font-medium">Restaurant</th>
                <th className="py-2 text-left font-medium">Profile views</th>
                <th className="py-2 text-left font-medium">Clicks</th>
                <th className="py-2 text-left font-medium">Roulette spins</th>
                <th className="py-2 text-left font-medium">Favorites</th>
              </tr>
            </thead>
            <tbody>
              {byRestaurant.map((row: any) => (
                <tr key={row.restaurantId} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-gray-900">{row.restaurantId}</td>
                  <td className="py-2 text-gray-900">{row.totalViews}</td>
                  <td className="py-2 text-gray-900">{row.totalClicks}</td>
                  <td className="py-2 text-gray-900">{row.totalSpins}</td>
                  <td className="py-2 text-gray-900">{row.totalFavorites}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SessionsView({ data }: { data: any }) {
  const stats = data?.stats || {}
  const sessions = data?.sessions || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Sessions</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.totalSessions || 0}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Bounce rate</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{Math.round(stats.bounceRate || 0)}%</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Conversion rate</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{Math.round(stats.conversionRate || 0)}%</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Avg page views</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{(stats.avgPageViews || 0).toFixed(1)}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent sessions</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions recorded for this period.</p>
        ) : (
          <div className="overflow-x-auto max-h-80">
            <table className="min-w-full text-sm">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="py-2 pr-4 text-left font-medium">Started</th>
                  <th className="py-2 text-left font-medium">Device</th>
                  <th className="py-2 text-left font-medium">Page views</th>
                  <th className="py-2 text-left font-medium">Converted</th>
                  <th className="py-2 text-left font-medium">Bounced</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-gray-900">
                      {s.startTime ? new Date(s.startTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      }) : '-'}
                    </td>
                    <td className="py-2 text-gray-900">{s.deviceType}</td>
                    <td className="py-2 text-gray-900">{s.pageViews}</td>
                    <td className="py-2 text-gray-900">{s.converted ? 'Yes' : 'No'}</td>
                    <td className="py-2 text-gray-900">{s.bounced ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FunnelsView({ data }: { data: any }) {
  const byType = data?.byType || []

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Conversion funnels</h3>
      {byType.length === 0 ? (
        <p className="text-sm text-gray-500">No conversion funnel data recorded for this period.</p>
      ) : (
        <div className="overflow-x-auto max-h-80">
          <table className="min-w-full text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="py-2 pr-4 text-left font-medium">Type</th>
                <th className="py-2 text-left font-medium">Total</th>
                <th className="py-2 text-left font-medium">Completed</th>
                <th className="py-2 text-left font-medium">Abandoned</th>
                <th className="py-2 text-left font-medium">Step 1</th>
                <th className="py-2 text-left font-medium">Step 2</th>
                <th className="py-2 text-left font-medium">Step 3</th>
                <th className="py-2 text-left font-medium">Step 4</th>
              </tr>
            </thead>
            <tbody>
              {byType.map((row: any) => (
                <tr key={row.type} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-gray-900">{row.type}</td>
                  <td className="py-2 text-gray-900">{row.total}</td>
                  <td className="py-2 text-gray-900">{row.completed}</td>
                  <td className="py-2 text-gray-900">{row.abandoned}</td>
                  <td className="py-2 text-gray-900">{row.step1}</td>
                  <td className="py-2 text-gray-900">{row.step2}</td>
                  <td className="py-2 text-gray-900">{row.step3}</td>
                  <td className="py-2 text-gray-900">{row.step4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PerformanceView({ data }: { data: any }) {
  const metrics = data?.metrics || []

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Page performance</h3>
      {metrics.length === 0 ? (
        <p className="text-sm text-gray-500">No performance metrics recorded for this period.</p>
      ) : (
        <div className="overflow-x-auto max-h-80">
          <table className="min-w-full text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="py-2 pr-4 text-left font-medium">Page</th>
                <th className="py-2 text-left font-medium">TTFB</th>
                <th className="py-2 text-left font-medium">FCP</th>
                <th className="py-2 text-left font-medium">LCP</th>
                <th className="py-2 text-left font-medium">CLS</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row: any) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-gray-900">{row.page}</td>
                  <td className="py-2 text-gray-900">{row.ttfb ?? '-'}</td>
                  <td className="py-2 text-gray-900">{row.fcp ?? '-'}</td>
                  <td className="py-2 text-gray-900">{row.lcp ?? '-'}</td>
                  <td className="py-2 text-gray-900">{row.cls ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
