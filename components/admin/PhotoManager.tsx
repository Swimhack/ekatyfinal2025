'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { OWNER_ATTESTATION } from '@/lib/photos/attestation'

interface PhotoManagerProps {
  restaurant: {
    id: string
    name: string
    photos?: string[] | string | null
  }
  /** When true, admin can publish immediately instead of pending review. */
  isAdmin?: boolean
  onPhotosUpdated?: (photos: string[]) => void
}

interface Submission {
  id: string
  url: string
  status: string
  credit: string | null
  createdAt: string
  adminNotes: string | null
}

export function PhotoManager({
  restaurant,
  isAdmin = false,
  onPhotosUpdated,
}: PhotoManagerProps) {
  const [livePhotos, setLivePhotos] = useState<string[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [attested, setAttested] = useState(false)
  const [credit, setCredit] = useState('')
  const [publishNow, setPublishNow] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/photos`)
      if (!res.ok) return
      const data = await res.json()
      setLivePhotos(data.livePhotos || [])
      setSubmissions(data.submissions || [])
      onPhotosUpdated?.(data.livePhotos || [])
    } catch (err) {
      console.error('Failed to load photo submissions', err)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id])

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!attested) {
      setError('You must confirm the rights attestation before uploading.')
      return
    }

    setUploading(true)
    setError(null)
    setMessage(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue

        const form = new FormData()
        form.append('file', file)
        form.append('attested', 'true')
        if (credit.trim()) form.append('credit', credit.trim())
        if (isAdmin && publishNow) form.append('publishNow', 'true')

        const res = await fetch(`/api/restaurants/${restaurant.id}/photos`, {
          method: 'POST',
          body: form,
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Upload failed')
        }
      }

      setMessage(
        isAdmin && publishNow
          ? 'Photos uploaded and published.'
          : 'Photos submitted for review. They appear on the listing after approval.'
      )
      setAttested(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const pending = submissions.filter((s) => s.status === 'pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Listing Photos</h3>
        <span className="text-sm text-gray-600">{livePhotos.length} live</span>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-3">
        <p className="font-medium">Rights attestation required</p>
        <p>{OWNER_ATTESTATION}</p>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={attested}
            onChange={(e) => setAttested(e.target.checked)}
            className="mt-1"
          />
          <span>I confirm the statement above for every photo I upload.</span>
        </label>
        <div>
          <label className="block text-xs font-medium mb-1">Credit (optional)</label>
          <input
            type="text"
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            className="w-full rounded border border-amber-300 px-3 py-2 text-sm bg-white"
            placeholder="Photographer or business name"
          />
        </div>
        {isAdmin && (
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="mt-1"
            />
            <span>Publish immediately (admin license — skips pending queue)</span>
          </label>
        )}
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading || !attested}
        />

        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600">Uploading…</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">
              Drag photos here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              JPG, PNG, WebP, or GIF · max 5MB · stored privately until approved
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded px-3 py-2">
          {message}
        </p>
      )}

      {livePhotos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Live on listing</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {livePhotos.map((photo, index) => (
              <div key={`${photo}-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={photo}
                  alt={`${restaurant.name} photo ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized={photo.startsWith('/')}
                />
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-primary-500 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">
            Pending review ({pending.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pending.map((sub) => (
              <div key={sub.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={sub.url}
                  alt={`Pending photo for ${restaurant.name}`}
                  fill
                  className="object-cover opacity-80"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized={sub.url.startsWith('/')}
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  Pending
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600 space-y-1">
        <p>• Owner submissions stay pending until an admin approves them.</p>
        <p>• Do not upload Google Maps, Yelp, social, or delivery-platform photos without a license.</p>
        <p>• Listings without a cleared photo show the eKaty branded placeholder.</p>
      </div>
    </div>
  )
}
