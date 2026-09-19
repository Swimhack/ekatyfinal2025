'use client'

import { useState, useEffect } from 'react'
import { Search, Check } from 'lucide-react'
import { readJson } from '@/lib/utils/api-response'

export interface Lead {
  id: string
  business_name: string
  contact_name: string
  email: string
  city: string
  cuisine_type?: string
  status: string
}

interface LeadSelectorProps {
  selectedLeads: string[]
  onSelectionChange: (leadIds: string[]) => void
  maxSelection?: number
}

export default function LeadSelector({
  selectedLeads,
  onSelectionChange,
  maxSelection,
}: LeadSelectorProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchLeads()
  }, [statusFilter])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (statusFilter) queryParams.append('status', statusFilter)

      const response = await fetch(`/api/admin/leads?${queryParams.toString()}`)
      const data = await readJson(response)

      if (response.ok) {
        setLeads(data.leads)
      } else {
        setError(data.error || 'Failed to fetch leads')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleLead = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      // Deselect
      onSelectionChange(selectedLeads.filter((id) => id !== leadId))
    } else {
      // Select (check max selection)
      if (maxSelection && selectedLeads.length >= maxSelection) {
        return // Don't allow more selections
      }
      onSelectionChange([...selectedLeads, leadId])
    }
  }

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      // Deselect all
      onSelectionChange([])
    } else {
      // Select all (respecting max)
      const leadsToSelect = maxSelection
        ? filteredLeads.slice(0, maxSelection)
        : filteredLeads
      onSelectionChange(leadsToSelect.map((l) => l.id))
    }
  }

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      lead.business_name.toLowerCase().includes(query) ||
      lead.contact_name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.city.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin h-6 w-6 border-3 border-brand-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">Loading leads...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="interested">Interested</option>
        </select>
      </div>

      {/* Selection Summary */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {selectedLeads.length}
          </span>{' '}
          of {filteredLeads.length} leads selected
          {maxSelection && (
            <span className="ml-2 text-gray-500">(max {maxSelection})</span>
          )}
        </div>
        <button
          onClick={handleSelectAll}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          {selectedLeads.length === filteredLeads.length
            ? 'Deselect All'
            : 'Select All'}
        </button>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No leads found matching your criteria</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredLeads.map((lead) => {
            const isSelected = selectedLeads.includes(lead.id)
            const isDisabled =
              !isSelected &&
              maxSelection !== undefined &&
              selectedLeads.length >= maxSelection

            return (
              <div
                key={lead.id}
                className={`p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-brand-50 hover:bg-brand-100'
                    : isDisabled
                    ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => !isDisabled && handleToggleLead(lead.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {lead.business_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {lead.contact_name}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-sm text-gray-500">{lead.email}</p>
                          <p className="text-sm text-gray-500">{lead.city}</p>
                          {lead.cuisine_type && (
                            <p className="text-sm text-gray-500">
                              {lead.cuisine_type}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          lead.status === 'new'
                            ? 'bg-blue-100 text-blue-800'
                            : lead.status === 'contacted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : lead.status === 'interested'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
