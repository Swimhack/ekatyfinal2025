'use client'

import { useEffect, useState } from 'react'
import { filterDisplayPhotos } from '@/lib/photos/photo-policy'

interface RestaurantPhotoProps {
  photos: string[]
  name: string
  cuisine?: string
  className?: string
  /** Lifts the placeholder clear of a caption overlay sitting on the image. */
  captionInset?: boolean
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
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,#7f1d1d,#1c1917_70%)] text-center ${
        captionInset ? 'pb-24' : ''
      }`}
      role="img"
      aria-label={`No photo available for ${name}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-400/70 bg-black/30 text-3xl font-black text-amber-300">
        {initial}
      </div>
      <p className="px-6 text-[0.65rem] uppercase tracking-[0.2em] text-white/55">
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
  /**
   * The reveal is the loudest place a photo appears, so it defers to the same
   * policy as the listing grids rather than keeping its own idea of a usable
   * image. Its local check only knew about stock libraries, which let a chain's
   * Open Graph tile through — a corporate square is not this venue either, and
   * the placeholder below is the honest answer.
   */
  const candidate = filterDisplayPhotos(photos)[0]
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
        <PhotoPlaceholder name={name} cuisine={cuisine} captionInset={captionInset} />
      )}
    </div>
  )
}
