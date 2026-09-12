'use client'

import { useState } from 'react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

export default function SyncDataPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/sync-multi-source', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ekaty-admin-secret-2025',
          'Content-Type': 'application/json'
        }
      })

      const data = await readJson(response)
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Sync failed'
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sync Restaurant Data</h1>
              <p className="text-gray-600 mt-1">Run multi-source restaurant synchronization</p>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
          >
            {syncing ? 'Syncing...' : '🔄 Start Multi-Source Sync'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">
              {result.success ? '✅ Sync Completed!' : '❌ Sync Failed'}
            </h3>
            <p className="text-gray-600">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
