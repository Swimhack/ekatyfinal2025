'use client'

import { useEffect, useState } from 'react'

interface RestaurantPhotoProps {
  photos: string[]
  name: string
  cuisine?: string
  className?: string
  /** Lifts the placeholder clear of a caption overlay sitting on the image. */
  captionInset?: boolean
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

export function PhotoPlaceholder({
  name,
  cuisine,
  captionInset = false,
}: {
  name: string
  cuisine?: string
  captionInset?: boolean
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,#3e5245,#1b1815_72%)] text-center ${
        captionInset ? 'pb-24' : ''
      }`}
      role="img"
      aria-label={`No photo available for ${name}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-honey-400/70 bg-charcoal-950/40 text-3xl font-black text-honey-300">
        {initial}
      </div>
      <p className="px-6 text-[0.65rem] uppercase tracking-[0.2em] text-bone-100/60">
        {cuisine || 'Photo coming soon'}
      </p>
    </div>
  )
}

export default function RestaurantPhoto({
  photos,
  name,
  cuisine,
  className = '',
  captionInset = false,
}: RestaurantPhotoProps) {
  const candidate = photos.find(isUsableVenuePhoto)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [candidate])

  return (
    <div className={`relative overflow-hidden bg-charcoal-900 ${className}`}>
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
        <PhotoPlaceholder name={name} cuisine={cuisine} captionInset={captionInset} />
      )}
    </div>
  )
}
