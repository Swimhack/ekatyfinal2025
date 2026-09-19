'use client'

import { useState, useEffect } from 'react'
import { Plus, Filter } from 'lucide-react'
import Link from 'next/link'
import OutreachTable from '@/components/admin/monetization/OutreachTable'
import { readJson } from '@/lib/utils/api-response'

interface Campaign {
  id: string
  name: string
  status: string
  total_sent: number
  total_opened: number
  total_clicked: number
  sent_at?: string
  scheduled_for?: string
  created_at: string
}

export default function OutreachCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (statusFilter) queryParams.append('status', statusFilter)

      const response = await fetch(
        `/api/admin/outreach?${queryParams.toString()}`
      )
      const data = await readJson(response)

      if (response.ok) {
        setCampaigns(data.campaigns)
      } else {
        setError(data.error || 'Failed to fetch campaigns')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Outreach Campaigns
          </h1>
          <p className="text-gray-600 mt-2">
            Create and manage email campaigns to attract restaurant partners
          </p>
        </div>
        <Link
          href="/admin/monetization/outreach/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </Link>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{campaigns.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Sent</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Opens</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {campaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Clicks</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {campaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Campaigns Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaigns...</p>
        </div>
      ) : (
        <OutreachTable campaigns={campaigns} />
      )}
    </div>
  )
}
