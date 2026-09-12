'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Submission {
  id: string
  url: string
  status: string
  rightsBasis: string
  credit: string | null
  license: string | null
  sourceUrl: string | null
  attestationText: string
  adminNotes: string | null
  createdAt: string
  restaurant: {
    id: string
    name: string
    slug: string
  }
  submittedBy: {
    id: string
    email: string
    name: string | null
  }
}

export default function AdminPhotosPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [auditBusy, setAuditBusy] = useState(false)
  const [auditReport, setAuditReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSubmissions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/photos?status=${filter}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setSubmissions(data.submissions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const review = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          adminNotes: notes[id] || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      await fetchSubmissions()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const runAudit = async (commit: boolean) => {
    if (commit) {
      const ok = window.confirm(
        'Commit photo cleanup? This clears invalid/stock/unreachable URLs from active listings (admin photo overrides are skipped).'
      )
      if (!ok) return
    }
    setAuditBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/photos/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commit, skipNetwork: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Audit failed')
      setAuditReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed')
    } finally {
      setAuditBusy(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photo Review</h1>
          <p className="text-sm text-gray-600 mt-1">
            Approve owner/admin submissions and run the bounded photo audit.
          </p>
        </div>
        <Link href="/admin/restaurants" className="text-sm text-brand-600 hover:underline">
          ← Restaurants
        </Link>
      </div>

      <section className="border rounded-lg p-4 space-y-3 bg-white">
        <h2 className="font-semibold">Photo URL audit</h2>
        <p className="text-sm text-gray-600">
          Dry-run first. Clears only invalid, stock, logo/favicon, or unreachable URLs.
          Does not scrape or rehost third-party photos.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            disabled={auditBusy}
            onClick={() => runAudit(false)}
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm disabled:opacity-50"
          >
            {auditBusy ? 'Running…' : 'Dry-run audit'}
          </button>
          <button
            type="button"
            disabled={auditBusy}
            onClick={() => runAudit(true)}
            className="px-4 py-2 rounded border border-red-300 text-red-700 text-sm disabled:opacity-50"
          >
            Commit cleanup
          </button>
        </div>
        {auditReport && (
          <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-80">
            {JSON.stringify(auditReport, null, 2)}
          </pre>
        )}
      </section>

      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded text-sm capitalize ${
              filter === value
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : submissions.length === 0 ? (
        <p className="text-gray-600">No submissions in this filter.</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="border rounded-lg p-4 bg-white grid md:grid-cols-[160px_1fr] gap-4"
            >
              <div className="relative aspect-square rounded overflow-hidden bg-gray-100">
                <Image
                  src={sub.url}
                  alt={`Submission for ${sub.restaurant.name}`}
                  fill
                  className="object-cover"
                  sizes="160px"
                  unoptimized={sub.url.startsWith('/')}
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <Link
                      href={`/restaurants/${sub.restaurant.slug}`}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      {sub.restaurant.name}
                    </Link>
                    <p className="text-gray-600">
                      by {sub.submittedBy.name || sub.submittedBy.email} ·{' '}
                      <span className="capitalize">{sub.status}</span> · {sub.rightsBasis}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(sub.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700">{sub.attestationText}</p>
                {sub.credit && <p>Credit: {sub.credit}</p>}
                {sub.sourceUrl && (
                  <p>
                    Source:{' '}
                    <a href={sub.sourceUrl} className="text-brand-600 underline" target="_blank" rel="noreferrer">
                      {sub.sourceUrl}
                    </a>
                  </p>
                )}
                {sub.status === 'pending' && (
                  <>
                    <textarea
                      value={notes[sub.id] || ''}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))
                      }
                      placeholder="Admin notes (optional)"
                      className="w-full border rounded px-3 py-2 text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => review(sub.id, 'approved')}
                        className="px-3 py-1.5 rounded bg-green-700 text-white text-sm"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => review(sub.id, 'rejected')}
                        className="px-3 py-1.5 rounded bg-red-600 text-white text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
