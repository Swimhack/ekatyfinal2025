'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import RestaurantPhoto from './RestaurantPhoto'
import { priceSymbol } from '@/lib/spinner/moods'
import type { SpinnerRestaurant } from '@/lib/spinner/candidates'

const SPINNER_URL = 'https://ekaty.com/spinner'

interface SpinRevealCardProps {
  restaurant: SpinnerRestaurant
  spinNumber: number
  reducedMotion: boolean
  onSpinAgain: () => void
  onClose: () => void
}

/**
 * Imported rows repeat the same label in different shapes ("BBQ", "bbq",
 * "smoked-meats"), so normalise separators and de-duplicate case-insensitively.
 */
function cuisineLabel(restaurant: SpinnerRestaurant): string {
  const seen = new Set<string>()
  const labels: string[] = []

  for (const raw of [...restaurant.categories, ...restaurant.cuisineTypes]) {
    const label = raw.replace(/[_-]+/g, ' ').trim()
    if (!label || /^(food|restaurant|point of interest|establishment)$/i.test(label)) continue

    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(label)
    if (labels.length === 3) break
  }

  return labels.join(' · ')
}

export default function SpinRevealCard({
  restaurant,
  spinNumber,
  reducedMotion,
  onSpinAgain,
  onClose,
}: SpinRevealCardProps) {
  const [copied, setCopied] = useState(false)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  const cuisine = cuisineLabel(restaurant)
  const price = priceSymbol(restaurant.priceLevel)
  const shareText = `🎰 Grub Roulette sent me to ${restaurant.name} in Katy. Spin your own dinner plans:`

  useEffect(() => {
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'eKaty Grub Roulette', text: shareText, url: SPINNER_URL })
        window.dispatchEvent(new CustomEvent('ekaty:share'))
        return
      } catch {
        // User dismissed the sheet; fall through to the copy fallback.
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${SPINNER_URL}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
      window.dispatchEvent(new CustomEvent('ekaty:share'))
    } catch {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SPINNER_URL)}`,
        '_blank',
        'noopener,width=600,height=420'
      )
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-charcoal-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        reducedMotion ? '' : 'animate-reveal-fade'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="spin-reveal-name"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`relative flex max-h-[100dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl bg-bone-50 shadow-2xl sm:max-h-[90vh] sm:rounded-3xl ${
          reducedMotion ? '' : 'animate-reveal-rise'
        }`}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close result"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative">
          <RestaurantPhoto
            photos={restaurant.photos}
            name={restaurant.name}
            className="h-52 w-full sm:h-60"
            captionInset
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-honey-300">
              Spin #{spinNumber} · Tonight you&apos;re eating at
            </p>
            <h2 id="spin-reveal-name" className="text-3xl font-black leading-tight text-white drop-shadow sm:text-4xl">
              {restaurant.name}
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {cuisine && (
              <span className="rounded-full bg-sage-100 px-3 py-1 font-semibold capitalize text-sage-700">
                {cuisine}
              </span>
            )}
            {price && (
              <span className="rounded-full bg-charcoal-100 px-3 py-1 font-semibold text-charcoal-700">{price}</span>
            )}
            {restaurant.rating != null && (
              <span className="rounded-full bg-honey-50 px-3 py-1 font-semibold text-honey-800">
                ★ {restaurant.rating.toFixed(1)}
                {restaurant.reviewCount > 0 && (
                  <span className="ml-1 font-normal text-honey-700/80">({restaurant.reviewCount})</span>
                )}
              </span>
            )}
            {restaurant.distance != null && (
              <span className="rounded-full bg-charcoal-100 px-3 py-1 font-semibold text-charcoal-700">
                {restaurant.distance.toFixed(1)} mi away
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-charcoal-600">
            {restaurant.description
              ? restaurant.description
              : `${restaurant.address}, ${restaurant.city}, ${restaurant.state}`}
          </p>

          <div className="flex flex-col gap-2">
            <Link
              href={`/restaurants/${restaurant.slug || restaurant.id}`}
              className="flex min-h-[52px] items-center justify-center rounded-xl bg-primary-700 px-6 text-base font-bold text-bone-50 transition hover:bg-primary-800"
            >
              View listing
            </Link>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onSpinAgain}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-charcoal-200 px-4 text-sm font-bold text-charcoal-700 transition hover:border-honey-300 hover:bg-honey-50 hover:text-honey-800"
              >
                <span aria-hidden>🎰</span> Spin again
              </button>
              <button
                onClick={handleShare}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-charcoal-200 px-4 text-sm font-bold text-charcoal-700 transition hover:border-honey-300 hover:bg-honey-50 hover:text-honey-800"
              >
                <span aria-hidden>{copied ? '✅' : '📣'}</span> {copied ? 'Link copied' : 'Share'}
              </button>
            </div>
          </div>

          {(restaurant.phone || restaurant.website) && (
            <div className="flex flex-wrap gap-4 border-t border-charcoal-100 pt-3 text-sm font-semibold text-charcoal-500">
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="hover:text-primary-700">
                  {restaurant.phone}
                </a>
              )}
              {restaurant.website && (
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-700"
                >
                  Website
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
