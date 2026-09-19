'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  Users,
  UserMinus,
  Download,
} from 'lucide-react'
import MetricsCard from '@/components/admin/monetization/MetricsCard'
import RevenueChart from '@/components/admin/monetization/RevenueChart'
import { readJson } from '@/lib/utils/api-response'

interface RevenueMetrics {
  total_mrr: number
  mrr_change: number
  active_partnerships: number
  partnerships_change: number
  new_this_month: number
  new_change: number
  churned_this_month: number
  churned_change: number
}

interface ChartDataPoint {
  month: string
  mrr: number
}

interface TierBreakdown {
  tier_name: string
  tier_slug: string
  count: number
  mrr: number
  percentage: number
}

type Period = 'month' | 'quarter' | 'year'

export default function RevenueDashboardPage() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [tierBreakdown, setTierBreakdown] = useState<TierBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchRevenueData()
  }, [period])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/revenue/metrics?period=${period}`)
      const data = await readJson(response)

      if (response.ok) {
        setMetrics(data.metrics)
        setChartData(data.chart_data || [])
        setTierBreakdown(data.tier_breakdown || [])
      } else {
        setError(data.error || 'Failed to fetch revenue data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      setError(null)

      const response = await fetch(
        `/api/admin/revenue/export?period=${period}`
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `revenue-report-${period}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await readJson(response)
        setError(data.error || 'Failed to export report')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setExporting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Track Monthly Recurring Revenue and partnership metrics
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="btn-primary flex items-center gap-2 justify-center"
        >
          <Download className="w-5 h-5" />
          {exporting ? 'Exporting...' : 'Export Report'}
        </button>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'month'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setPeriod('quarter')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'quarter'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Quarter
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'year'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricsCard
          title="Total MRR"
          value={metrics ? formatCurrency(metrics.total_mrr) : '$0'}
          change={metrics?.mrr_change}
          changeLabel="vs last period"
          icon={DollarSign}
          trend={
            metrics && metrics.mrr_change > 0
              ? 'up'
              : metrics && metrics.mrr_change < 0
              ? 'down'
              : 'neutral'
          }
          loading={loading}
        />

        <MetricsCard
          title="Active Partnerships"
          value={metrics?.active_partnerships || 0}
          change={metrics?.partnerships_change}
          changeLabel="vs last period"
          icon={Users}
          trend={
            metrics && metrics.partnerships_change > 0
              ? 'up'
              : metrics && metrics.partnerships_change < 0
              ? 'down'
              : 'neutral'
          }
          loading={loading}
        />

        <MetricsCard
          title="New This Month"
          value={metrics?.new_this_month || 0}
          change={metrics?.new_change}
          changeLabel="vs last period"
          icon={TrendingUp}
          trend={
            metrics && metrics.new_change > 0
              ? 'up'
              : metrics && metrics.new_change < 0
              ? 'down'
              : 'neutral'
          }
          loading={loading}
        />

        <MetricsCard
          title="Churned This Month"
          value={metrics?.churned_this_month || 0}
          change={metrics?.churned_change}
          changeLabel="vs last period"
          icon={UserMinus}
          trend={
            metrics && metrics.churned_change < 0
              ? 'up'
              : metrics && metrics.churned_change > 0
              ? 'down'
              : 'neutral'
          }
          loading={loading}
        />
      </div>

      {/* Revenue Chart */}
      <div className="mb-8">
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chart data...</p>
          </div>
        ) : (
          <RevenueChart data={chartData} />
        )}
      </div>

      {/* Partnerships by Tier */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Partnerships by Tier
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tier breakdown...</p>
          </div>
        ) : tierBreakdown.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No tier data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partnerships
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MRR
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tierBreakdown.map((tier, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {tier.tier_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        /{tier.tier_slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {tier.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatCurrency(tier.mrr)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {tier.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                    {tierBreakdown.reduce((sum, tier) => sum + tier.count, 0)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(
                      tierBreakdown.reduce((sum, tier) => sum + tier.mrr, 0)
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                    100.0%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
