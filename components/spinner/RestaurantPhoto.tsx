'use client'

import { useEffect, useState } from 'react'

interface RestaurantPhotoProps {
  photos: string[]
  name: string
  cuisine?: string
  className?: string
}

/**
 * Stock photography is never presented as a venue photo. If a listing has no
 * usable image we fall back to a branded plate that is obviously a placeholder.
 */
function isUsableVenuePhoto(url: string | undefined): url is string {
  if (!url) return false
  const normalized = url.trim().toLowerCase()
  if (!normalized.startsWith('http') && !normalized.startsWith('/')) return false
  // Stock libraries were used as filler during imports; they are not this venue.
  return !normalized.includes('unsplash.com') && !normalized.includes('pexels.com')
}

export function PhotoPlaceholder({ name, cuisine }: { name: string; cuisine?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,#7f1d1d,#1c1917_70%)] text-center"
      role="img"
      aria-label={`No photo available for ${name}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-400/70 bg-black/30 text-3xl font-black text-amber-300">
        {initial}
      </div>
      <p className="px-6 text-sm font-semibold text-amber-100/90">{cuisine || 'Katy, TX'}</p>
      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/45">Photo coming soon</p>
    </div>
  )
}

export default function RestaurantPhoto({ photos, name, cuisine, className = '' }: RestaurantPhotoProps) {
  const candidate = photos.find(isUsableVenuePhoto)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [candidate])

  return (
    <div className={`relative overflow-hidden bg-stone-900 ${className}`}>
      {candidate && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- listing photos come from arbitrary import domains
        <img
          src={candidate}
          alt={`${name} in Katy, TX`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <PhotoPlaceholder name={name} cuisine={cuisine} />
      )}
    </div>
  )
}
