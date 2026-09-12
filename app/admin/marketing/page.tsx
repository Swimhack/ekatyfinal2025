'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

interface MarketingKidsDeal {
  enabled?: boolean
  days?: string[]
  description?: string
}

interface MarketingSpecial {
  title?: string
  day?: string
  timeWindow?: string
  description?: string
  tags?: string[]
}

interface MarketingMeta {
  kidsDeal?: MarketingKidsDeal | null
  specials?: MarketingSpecial[] | null
}

interface MarketingRestaurant {
  id: string
  name: string
  slug: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string | null
  website: string | null
  featured: boolean
  verified: boolean
  active: boolean
  categories: string | null
  cuisineTypes: string | null
  priceLevel: string
  marketing?: MarketingMeta | null
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'featured'

type DayFilter = 'all' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export default function MarketingDashboardPage() {
  const [restaurants, setRestaurants] = useState<MarketingRestaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [kidsOnly, setKidsOnly] = useState(false)
  const [specialsOnly, setSpecialsOnly] = useState(false)
  const [day, setDay] = useState<DayFilter>('all')
  const [featuredOnly, setFeaturedOnly] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (status !== 'all') params.set('status', status)
        if (featuredOnly) params.set('featured', 'true')

        const res = await fetch(`/api/admin/marketing/restaurants?${params.toString()}`)
        const data = await readJson(res)

        if (!res.ok || data.error) {
          if (!isMounted) return
          setError(data.error || 'Failed to load marketing data')
          setRestaurants([])
        } else {
          if (!isMounted) return
          setRestaurants(data.restaurants || [])
        }
      } catch (e: any) {
        if (!isMounted) return
        setError(e?.message || 'Failed to load marketing data')
        setRestaurants([])
      } finally {
        if (!isMounted) return
        setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [search, status, featuredOnly])

  const filtered = useMemo(() => {
    return restaurants.filter(r => {
      const kids = r.marketing?.kidsDeal
      const specials = r.marketing?.specials || []

      const matchesKids = kidsOnly ? !!kids && kids.enabled !== false : true

      const matchesSpecials = specialsOnly ? specials.length > 0 : true

      const matchesDay = (() => {
        if (day === 'all') return true
        const dayMap: Record<DayFilter, string> = {
          all: '',
          Mon: 'monday',
          Tue: 'tuesday',
          Wed: 'wednesday',
          Thu: 'thursday',
          Fri: 'friday',
          Sat: 'saturday',
          Sun: 'sunday',
        }
        const target = dayMap[day]
        const kidsDays = (kids?.days || []).map(d => d.toLowerCase())
        const specialsDays = specials
          .map(s => (s.day || '').toLowerCase())
          .filter(Boolean)
        if (!target) return true
        return kidsDays.includes(target) || specialsDays.includes(target)
      })()

      return matchesKids && matchesSpecials && matchesDay
    })
  }, [restaurants, kidsOnly, specialsOnly, day])

  const exportCsv = () => {
    if (filtered.length === 0) return

    const header = [
      'Name',
      'Slug',
      'Address',
      'City',
      'State',
      'Zip',
      'Phone',
      'Website',
      'Categories',
      'Cuisine',
      'Price',
      'Active',
      'Featured',
      'KidsEnabled',
      'KidsDays',
      'KidsDescription',
      'SpecialsSummary',
    ]

    const rows = filtered.map(r => {
      const kids = r.marketing?.kidsDeal
      const specials = r.marketing?.specials || []
      const specialsSummary = specials
        .map(s => `${s.title || ''} (${s.day || ''} ${s.timeWindow || ''})`.trim())
        .join(' | ')

      return [
        r.name,
        r.slug,
        r.address,
        r.city,
        r.state,
        r.zipCode,
        r.phone || '',
        r.website || '',
        r.categories || '',
        r.cuisineTypes || '',
        r.priceLevel,
        r.active ? 'yes' : 'no',
        r.featured ? 'yes' : 'no',
        kids && kids.enabled !== false ? 'yes' : 'no',
        (kids?.days || []).join(','),
        kids?.description || '',
        specialsSummary,
      ].map(value => {
        const v = String(value ?? '')
        if (v.includes(',') || v.includes('\n') || v.includes('"')) {
          return '"' + v.replace(/"/g, '""') + '"'
        }
        return v
      }).join(',')
    })

    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'ekaty-marketing-restaurants.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketing Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Build campaign and article lists from your restaurant data.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, address, cuisine, category"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="featured">Featured</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day focus
              </label>
              <select
                value={day}
                onChange={e => setDay(e.target.value as DayFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="all">Any day</option>
                <option value="Mon">Monday</option>
                <option value="Tue">Tuesday</option>
                <option value="Wed">Wednesday</option>
                <option value="Thu">Thursday</option>
                <option value="Fri">Friday</option>
                <option value="Sat">Saturday</option>
                <option value="Sun">Sunday</option>
              </select>
            </div>

            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-2">
                <label className="inline-flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={kidsOnly}
                    onChange={e => setKidsOnly(e.target.checked)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded mr-2"
                  />
                  Kids deals only
                </label>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <label className="inline-flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={specialsOnly}
                    onChange={e => setSpecialsOnly(e.target.checked)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded mr-2"
                  />
                  Has specials
                </label>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={featuredOnly}
                    onChange={e => setFeaturedOnly(e.target.checked)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded mr-2"
                  />
                  Featured only
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {filtered.length} of {restaurants.length} restaurants
            </span>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-500 text-sm">Loading marketing data…</div>
          ) : error ? (
            <div className="py-16 text-center text-red-600 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">No restaurants match your filters yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Restaurant</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Kids deal</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Specials</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Tags</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const kids = r.marketing?.kidsDeal
                    const specials = r.marketing?.specials || []
                    const tags = new Set<string>()
                    if (kids && kids.enabled !== false) tags.add('kids-deal')
                    specials.forEach(s => (s.tags || []).forEach(t => tags.add(t)))

                    const specialsSummary = specials.slice(0, 2).map(s => s.title || s.description || '').filter(Boolean).join(' • ')

                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <Link
                              href={`/restaurants/${r.slug}`}
                              className="hover:text-primary-600"
                            >
                              {r.name}
                            </Link>
                            {r.featured && (
                              <span className="text-[10px] uppercase tracking-wide bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                                Featured
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {r.address}, {r.city}, {r.state} {r.zipCode}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {(r.cuisineTypes || r.categories || '').split(',').slice(0, 3).join(', ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-gray-700">
                          {kids && kids.enabled !== false ? (
                            <div>
                              <div className="font-semibold text-green-700 mb-1">Kids deal</div>
                              {kids.days && kids.days.length > 0 && (
                                <div className="mb-1 text-gray-600">{kids.days.join(', ')}</div>
                              )}
                              <div className="text-gray-600 line-clamp-3 max-w-xs">{kids.description}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">None yet</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-gray-700">
                          {specials.length === 0 ? (
                            <span className="text-gray-400">None yet</span>
                          ) : (
                            <div className="max-w-xs">
                              <div className="font-semibold text-gray-800 mb-1">Top specials</div>
                              <div className="text-gray-600 line-clamp-3">{specialsSummary}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-xs">
                          {Array.from(tags).length === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {Array.from(tags).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-[10px] uppercase tracking-wide"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-gray-700">
                          <div>{r.active ? 'Active' : 'Inactive'}</div>
                          <div className="text-gray-500">{r.verified ? 'Verified' : 'Unverified'}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-right text-xs">
                          <Link
                            href={`/admin/restaurants/${r.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
