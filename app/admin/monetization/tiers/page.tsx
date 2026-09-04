'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, DollarSign, CheckCircle, XCircle } from 'lucide-react'
import TierForm, { TierFormData } from '@/components/admin/monetization/TierForm'
import { readJson } from '@/lib/utils/api-response'

interface Tier {
  id: string
  name: string
  slug: string
  monthly_price: number
  features: string[]
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function TiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTier, setEditingTier] = useState<Tier | null>(null)
  const [includeInactive, setIncludeInactive] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchTiers()
  }, [includeInactive])

  const fetchTiers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (includeInactive) params.append('include_inactive', 'true')

      const response = await fetch(`/api/admin/tiers?${params.toString()}`)
      const data = await readJson(response)

      if (response.ok) {
        setTiers(data.tiers)
      } else {
        setError(data.error || 'Failed to fetch tiers')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (tier: Tier) => {
    setEditingTier(tier)
    setShowModal(true)
  }

  const handleAdd = () => {
    setEditingTier(null)
    setShowModal(true)
  }

  const handleDelete = async (tierId: string) => {
    try {
      const response = await fetch(`/api/admin/tiers/${tierId}`, {
        method: 'DELETE',
      })

      const data = await readJson(response)

      if (response.ok) {
        await fetchTiers()
        setDeleteConfirm(null)
      } else {
        setError(data.error || 'Failed to delete tier')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleFormSubmit = async (data: TierFormData) => {
    setFormLoading(true)
    setError(null)

    try {
      const url = editingTier ? `/api/admin/tiers/${editingTier.id}` : '/api/admin/tiers'
      const method = editingTier ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await readJson(response)

      if (response.ok) {
        setShowModal(false)
        setEditingTier(null)
        await fetchTiers()
      } else {
        setError(result.error || result.details || 'Failed to save tier')
        throw new Error(result.error || result.details || 'Failed to save tier')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      throw err
    } finally {
      setFormLoading(false)
    }
  }

  const handleFormCancel = () => {
    setShowModal(false)
    setEditingTier(null)
    setError(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partnership Tiers</h1>
          <p className="text-gray-600 mt-2">
            Manage pricing tiers and features for restaurant partners
          </p>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Tier
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-700">Include inactive tiers</span>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Tiers Grid */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tiers...</p>
        </div>
      ) : tiers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600 mb-4">No tiers found</p>
          <button
            onClick={handleAdd}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Your First Tier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`bg-white rounded-lg border-2 p-6 hover:shadow-lg transition-shadow ${
                tier.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                  <p className="text-sm text-gray-500">/{tier.slug}</p>
                </div>
                <div className="flex items-center gap-1">
                  {tier.is_active ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <span className="text-3xl font-bold text-gray-900">
                    {tier.monthly_price}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Features ({tier.features.length})
                </p>
                <ul className="space-y-1">
                  {tier.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-brand-500 mt-1">•</span>
                      <span className="flex-1 truncate">{feature}</span>
                    </li>
                  ))}
                  {tier.features.length > 3 && (
                    <li className="text-sm text-gray-500 italic">
                      +{tier.features.length - 3} more
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  Order: {tier.display_order}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(tier)}
                    className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    title="Edit tier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {deleteConfirm === tier.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(tier.id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(tier.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTier ? 'Edit Tier' : 'Add New Tier'}
              </h2>
            </div>
            <div className="p-6">
              <TierForm
                initialData={
                  editingTier
                    ? {
                        name: editingTier.name,
                        slug: editingTier.slug,
                        monthly_price: editingTier.monthly_price,
                        features: editingTier.features,
                        display_order: editingTier.display_order,
                        is_active: editingTier.is_active,
                      }
                    : undefined
                }
                existingSlugs={tiers
                  .filter((t) => !editingTier || t.id !== editingTier.id)
                  .map((t) => t.slug)}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                loading={formLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
