'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

interface User {
  id: string
  name: string | null
  email: string
  role: string
}

interface Lead {
  id: string
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  contactEmail: string
  contactName: string | null
  contactPhone: string | null
  tier: string
  source: string
  status: 'new' | 'contacted' | 'interested' | 'converted' | 'lost'
  notes: string | null
  assignedToId: string | null
  assignedTo: User | null
  createdAt: string
  updatedAt: string
}

export default function MonetizationLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'interested' | 'converted' | 'lost'>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [availableSources, setAvailableSources] = useState<string[]>([])
  const [adminUsers, setAdminUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [notes, setNotes] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')

  useEffect(() => {
    fetchLeads()
  }, [filter, sourceFilter])

  useEffect(() => {
    fetchAdminUsers()
  }, [])

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=ADMIN,EDITOR', {
        headers: {
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'ekaty-admin-secret-2025'
        }
      })

      if (response.ok) {
        const data = await readJson(response)
        setAdminUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch admin users:', error)
    }
  }

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)

      const url = params.toString()
        ? `/api/admin/monetization/leads?${params}`
        : '/api/admin/monetization/leads'

      const response = await fetch(url, {
        headers: {
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'ekaty-admin-secret-2025'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }

      const data = await readJson(response)
      const fetchedLeads = data.leads || []
      setLeads(fetchedLeads)

      // Extract unique sources for filtering
      const sources = Array.from(new Set(fetchedLeads.map((l: Lead) => l.source)))
      setAvailableSources(sources as string[])
    } catch (error) {
      console.error('Failed to fetch leads:', error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const updateLead = async (leadId: string, updates: { status?: Lead['status'], notes?: string, assignedToId?: string | null }) => {
    try {
      const response = await fetch(`/api/admin/monetization/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'ekaty-admin-secret-2025'
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        alert('Lead updated successfully!')
        setSelectedLead(null)
        setNotes('')
        setSelectedAssignee('')
        fetchLeads()
      }
    } catch (error) {
      console.error('Failed to update lead:', error)
      alert('Failed to update lead')
    }
  }

  const exportToCSV = () => {
    // Prepare CSV data
    const headers = [
      'Restaurant Name',
      'Contact Name',
      'Contact Email',
      'Contact Phone',
      'Tier',
      'Source',
      'Status',
      'Assigned To',
      'Notes',
      'Created Date',
      'Updated Date'
    ]

    const rows = leads.map(lead => [
      lead.restaurantName,
      lead.contactName || '',
      lead.contactEmail,
      lead.contactPhone || '',
      lead.tier,
      lead.source,
      lead.status,
      lead.assignedTo?.name || lead.assignedTo?.email || 'Unassigned',
      (lead.notes || '').replace(/"/g, '""'), // Escape quotes
      new Date(lead.createdAt).toLocaleDateString(),
      new Date(lead.updatedAt).toLocaleDateString()
    ])

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `monetization-leads-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusColor = (status: Lead['status']) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      interested: 'bg-purple-100 text-purple-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-gray-100 text-gray-800'
    }
    return colors[status]
  }

  const getTierBadge = (tier: string) => {
    const colors = {
      owner: 'bg-blue-500 text-white',
      featured: 'bg-purple-500 text-white',
      premium: 'bg-amber-500 text-white'
    }
    return colors[tier as keyof typeof colors] || 'bg-gray-500 text-white'
  }

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    interested: leads.filter(l => l.status === 'interested').length,
    converted: leads.filter(l => l.status === 'converted').length,
    conversionRate: leads.length > 0 ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1) : '0'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monetization Leads</h1>
              <p className="text-gray-600 mt-1">Track and manage restaurant claim interest</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportToCSV}
                disabled={leads.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Export CSV ({leads.length})
              </button>
              <Link
                href="/admin/dashboard"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Leads</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
              <div className="text-sm text-blue-700">New</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.contacted}</div>
              <div className="text-sm text-yellow-700">Contacted</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.interested}</div>
              <div className="text-sm text-purple-700">Interested</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
              <div className="text-sm text-green-700">Converted</div>
            </div>
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary-600">{stats.conversionRate}%</div>
              <div className="text-sm text-primary-700">Conv. Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Status:</label>
            <div className="flex gap-2 overflow-x-auto">
              {(['all', 'new', 'contacted', 'interested', 'converted', 'lost'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    filter === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {availableSources.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Source:</label>
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    sourceFilter === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Sources
                </button>
                {availableSources.map((source) => (
                  <button
                    key={source}
                    onClick={() => setSourceFilter(source)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      sourceFilter === source
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leads List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No {filter !== 'all' ? filter : ''} leads found</p>
            <p className="text-sm text-gray-500 mt-2">
              Leads are generated when users click &quot;Claim This Restaurant&quot; buttons
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {lead.restaurantName}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTierBadge(lead.tier)}`}>
                        {lead.tier.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Contact Information:</p>
                        <p className="font-medium">{lead.contactName || 'Unknown'}</p>
                        <p className="text-sm text-gray-700">{lead.contactEmail}</p>
                        {lead.contactPhone && (
                          <p className="text-sm text-gray-700">{lead.contactPhone}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Lead Details:</p>
                        <p className="text-sm">Source: <span className="font-medium">{lead.source.replace(/_/g, ' ')}</span></p>
                        <p className="text-sm">Created: {new Date(lead.createdAt).toLocaleDateString()}</p>
                        <p className="text-sm">Updated: {new Date(lead.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Assignment:</p>
                        {lead.assignedTo ? (
                          <>
                            <p className="font-medium text-sm">{lead.assignedTo.name || 'Unnamed User'}</p>
                            <p className="text-sm text-gray-700">{lead.assignedTo.email}</p>
                            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {lead.assignedTo.role}
                            </span>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Unassigned</p>
                        )}
                      </div>
                    </div>

                    {lead.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Notes:</p>
                        <p className="text-sm bg-gray-50 p-3 rounded">{lead.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link
                        href={`/restaurants/${lead.restaurantSlug}`}
                        target="_blank"
                        className="text-sm text-primary-600 hover:underline"
                      >
                        View Restaurant →
                      </Link>
                      <a
                        href={`mailto:${lead.contactEmail}`}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        Send Email →
                      </a>
                    </div>
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={() => {
                        setSelectedLead(lead)
                        setNotes(lead.notes || '')
                        setSelectedAssignee(lead.assignedToId || '')
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Update Lead
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Update Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Update Lead: {selectedLead.restaurantName}
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(['new', 'contacted', 'interested', 'converted', 'lost'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateLead(selectedLead.id, { status })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedLead.status === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign To
              </label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Unassigned</option>
                {adminUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.role})
                  </option>
                ))}
              </select>
              <button
                onClick={() => updateLead(selectedLead.id, { assignedToId: selectedAssignee || null })}
                className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Update Assignment
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Add notes about this lead..."
              />
              <button
                onClick={() => updateLead(selectedLead.id, { notes })}
                className="mt-2 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Save Notes
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedLead(null)
                  setNotes('')
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
