'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

interface Claim {
  id: string
  status: string
  verificationMethod: string | null
  verificationData: string | null
  adminNotes: string | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
  restaurant: {
    id: string
    name: string
    slug: string
    address: string
    phone: string | null
    website: string | null
  }
}

export default function ClaimsManagementPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [loading, setLoading] = useState(true)
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchClaims()
  }, [filter])

  const fetchClaims = async () => {
    setLoading(true)
    try {
      const url = filter === 'all' 
        ? '/api/claims'
        : `/api/claims?status=${filter}`
      
      const response = await fetch(url, {
        headers: {
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'ekaty-admin-secret-2025'
        }
      })
      
      const data = await readJson(response)
      setClaims(data.claims || [])
    } catch (error) {
      console.error('Failed to fetch claims:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (claimId: string) => {
    try {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'ekaty-admin-secret-2025'
        },
        body: JSON.stringify({
          status: 'approved',
          adminNotes,
          reviewedBy: 'admin' // TODO: Get from session
        })
      })

      if (response.ok) {
        alert('Claim approved successfully!')
        setSelectedClaim(null)
        setAdminNotes('')
        fetchClaims()
      }
    } catch (error) {
      console.error('Failed to approve claim:', error)
      alert('Failed to approve claim')
    }
  }

  const handleReject = async (claimId: string) => {
    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'ekaty-admin-secret-2025'
        },
        body: JSON.stringify({
          status: 'rejected',
          adminNotes,
          reviewedBy: 'admin' // TODO: Get from session
        })
      })

      if (response.ok) {
        alert('Claim rejected')
        setSelectedClaim(null)
        setAdminNotes('')
        fetchClaims()
      }
    } catch (error) {
      console.error('Failed to reject claim:', error)
      alert('Failed to reject claim')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Restaurant Claims</h1>
              <p className="text-gray-600 mt-1">Review and approve ownership requests</p>
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

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 py-4">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
      </div>

      {/* Claims List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No {filter !== 'all' ? filter : ''} claims found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <div key={claim.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {claim.restaurant.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        claim.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {claim.status}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Claimed By:</p>
                        <p className="font-medium">{claim.user.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{claim.user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Restaurant Details:</p>
                        <p className="text-sm">{claim.restaurant.address}</p>
                        {claim.restaurant.phone && (
                          <p className="text-sm">{claim.restaurant.phone}</p>
                        )}
                        {claim.restaurant.website && (
                          <a
                            href={claim.restaurant.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:underline"
                          >
                            {claim.restaurant.website}
                          </a>
                        )}
                      </div>
                    </div>

                    {claim.verificationMethod && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Verification Method:</p>
                        <p className="text-sm font-medium">{claim.verificationMethod}</p>
                        {claim.verificationData && (
                          <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                            {JSON.stringify(JSON.parse(claim.verificationData), null, 2)}
                          </pre>
                        )}
                      </div>
                    )}

                    {claim.adminNotes && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Admin Notes:</p>
                        <p className="text-sm bg-gray-50 p-2 rounded">{claim.adminNotes}</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Submitted: {new Date(claim.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {claim.status === 'pending' && (
                    <div className="ml-4">
                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Review Claim: {selectedClaim.restaurant.name}
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (optional for approval, required for rejection)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Add notes about this claim..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(selectedClaim.id)}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                ✓ Approve Claim
              </button>
              <button
                onClick={() => handleReject(selectedClaim.id)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                ✗ Reject Claim
              </button>
              <button
                onClick={() => {
                  setSelectedClaim(null)
                  setAdminNotes('')
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
