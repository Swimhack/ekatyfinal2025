'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import confetti from 'canvas-confetti'
import RouletteWheel, { type WheelSegment } from '@/components/spinner/RouletteWheel'
import SpinRevealCard from '@/components/spinner/SpinRevealCard'
import MoodChips from '@/components/spinner/MoodChips'
import { useSound } from '@/hooks/useSound'
import { useTickSound } from '@/hooks/useTickSound'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  MOODS_BY_ID,
  PRICE_LEVELS,
  priceLevelsForMoods,
  priceSymbol,
  termsForMoods,
  type MoodId,
} from '@/lib/spinner/moods'
import type { SpinnerRestaurant } from '@/lib/spinner/candidates'

const CUISINES = ['Mexican', 'BBQ', 'Asian', 'American', 'Seafood', 'Indian', 'Italian', 'Breakfast']

/** How long the wheel glides before it settles. */
const SPIN_DURATION_MS = 4600
/** Target wedge count; the pool caps it when the directory is thin. */
const WHEEL_SEGMENTS = 10
const MIN_SEGMENTS = 3

interface Coordinates {
  lat: number
  lng: number
}

function fireConfetti() {
  const base = { spread: 78, ticks: 220, gravity: 0.9, scalar: 1.05, zIndex: 60 }

  confetti({ ...base, particleCount: 90, origin: { x: 0.5, y: 0.45 } })
  window.setTimeout(() => confetti({ ...base, particleCount: 55, angle: 60, origin: { x: 0, y: 0.7 } }), 160)
  window.setTimeout(() => confetti({ ...base, particleCount: 55, angle: 120, origin: { x: 1, y: 0.7 } }), 260)
}

function SpinnerPageContent() {
  const searchParams = useSearchParams()
  const favoritesOnly = searchParams?.get('favoritesOnly') === 'true'

  const prefersReducedMotion = usePrefersReducedMotion()

  const [pool, setPool] = useState<SpinnerRestaurant[]>([])
  const [poolTotal, setPoolTotal] = useState(0)
  const [poolLoading, setPoolLoading] = useState(true)
  const [segments, setSegments] = useState<SpinnerRestaurant[]>([])

  const [isSpinning, setIsSpinning] = useState(false)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const [pendingWinner, setPendingWinner] = useState<SpinnerRestaurant | null>(null)
  const [result, setResult] = useState<SpinnerRestaurant | null>(null)
  const [spinCount, setSpinCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SpinnerRestaurant[]>([])

  const [activeMoods, setActiveMoods] = useState<MoodId[]>([])
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<string | null>(null)
  const [radius, setRadius] = useState(5)
  const [coords, setCoords] = useState<Coordinates | null>(null)
  const [geoPending, setGeoPending] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [soundEnabled, setSoundEnabled] = useState(true)
  const spinSound = useSound('/sounds/spin.mp3', { volume: 0.4 })
  const winSound = useSound('/sounds/win.mp3', { volume: 0.7 })
  const playTick = useTickSound()

  const [favorites, setFavorites] = useState<SpinnerRestaurant[]>([])

  // Resolved after mount so the server and client render the same chip list.
  const [geoAvailable, setGeoAvailable] = useState(false)
  useEffect(() => {
    setGeoAvailable(typeof navigator !== 'undefined' && 'geolocation' in navigator)
  }, [])

  const moodTerms = useMemo(() => termsForMoods(activeMoods), [activeMoods])
  const moodPriceLevels = useMemo(() => priceLevelsForMoods(activeMoods), [activeMoods])
  const priceLevels = useMemo(
    () => (selectedPriceLevel ? [selectedPriceLevel] : moodPriceLevels),
    [selectedPriceLevel, moodPriceLevels]
  )
  const nearMeActive = activeMoods.includes('near-me')

  const activeFilterCount =
    selectedCuisines.length + (selectedPriceLevel ? 1 : 0) + activeMoods.filter(id => id !== 'surprise').length

  useEffect(() => {
    if (!favoritesOnly) return

    let cancelled = false
    fetch('/api/favorites')
      .then(response => response.json())
      .then(data => {
        if (cancelled) return
        const restaurants: SpinnerRestaurant[] = (data.favorites || [])
          .map((favorite: any) => favorite.restaurant)
          .filter(Boolean)
          .map(normalizeRestaurant)
        setFavorites(restaurants)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your favorites.')
      })

    return () => {
      cancelled = true
    }
  }, [favoritesOnly])

  /** Favourites mode filters in the browser; everything else asks the API. */
  const favoritesPool = useMemo(() => {
    if (!favoritesOnly) return []

    return favorites.filter(restaurant => {
      const haystack = [restaurant.name, ...restaurant.categories, ...restaurant.cuisineTypes]
        .join(' ')
        .toLowerCase()

      if (selectedCuisines.length > 0 && !selectedCuisines.some(c => haystack.includes(c.toLowerCase()))) return false
      if (moodTerms.length > 0 && !moodTerms.some(term => haystack.includes(term))) return false
      if (priceLevels.length > 0 && !priceLevels.includes(restaurant.priceLevel)) return false
      return true
    })
  }, [favoritesOnly, favorites, selectedCuisines, moodTerms, priceLevels])

  const loadPool = useCallback(async () => {
    if (favoritesOnly) {
      setPool(favoritesPool)
      setPoolTotal(favoritesPool.length)
      setPoolLoading(false)
      return
    }

    setPoolLoading(true)

    const params = new URLSearchParams()
    if (selectedCuisines.length > 0) params.set('categories', selectedCuisines.join(','))
    if (moodTerms.length > 0) params.set('terms', moodTerms.join(','))
    if (priceLevels.length > 0) params.set('priceLevels', priceLevels.join(','))
    if (nearMeActive && coords) {
      params.set('lat', String(coords.lat))
      params.set('lng', String(coords.lng))
      params.set('radius', String(radius))
    }
    params.set('limit', '40')

    try {
      const response = await fetch(`/api/spin?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load restaurants')

      const data = await response.json()
      setPool(data.restaurants || [])
      setPoolTotal(data.total ?? (data.restaurants || []).length)
      setError(null)
    } catch {
      setPool([])
      setPoolTotal(0)
      setError('We could not reach the eKaty directory. Try again in a moment.')
    } finally {
      setPoolLoading(false)
    }
  }, [favoritesOnly, favoritesPool, selectedCuisines, moodTerms, priceLevels, nearMeActive, coords, radius])

  useEffect(() => {
    void loadPool()
  }, [loadPool])

  // Repaint the wedges whenever the pool changes, but never mid-spin and never
  // while the reveal is open, so the landed wedge still reads correctly on close.
  useEffect(() => {
    if (isSpinning || result) return

    const recentIds = new Set(history.slice(0, 3).map(item => item.id))
    const fresh = pool.filter(restaurant => !recentIds.has(restaurant.id))
    const source = fresh.length >= MIN_SEGMENTS ? fresh : pool

    setSegments(source.slice(0, WHEEL_SEGMENTS))
  }, [pool, history, isSpinning, result])

  const wheelSegments: WheelSegment[] = useMemo(
    () => segments.map(restaurant => ({ id: restaurant.id, label: restaurant.name })),
    [segments]
  )

  const requestLocation = useCallback(() => {
    if (!geoAvailable) return

    setGeoPending(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setGeoPending(false)
      },
      () => {
        setGeoPending(false)
        setActiveMoods(moods => moods.filter(id => id !== 'near-me'))
        setError('We could not get your location, so Near me is off.')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    )
  }, [geoAvailable])

  const toggleMood = useCallback(
    (moodId: MoodId) => {
      setError(null)

      const mood = MOODS_BY_ID[moodId]
      if (mood?.clearsFilters) {
        setActiveMoods([])
        setSelectedCuisines([])
        setSelectedPriceLevel(null)
        return
      }

      setActiveMoods(current => {
        if (current.includes(moodId)) return current.filter(id => id !== moodId)
        return [...current, moodId]
      })

      if (moodId === 'near-me' && !coords) requestLocation()
    },
    [coords, requestLocation]
  )

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(current =>
      current.includes(cuisine) ? current.filter(c => c !== cuisine) : [...current, cuisine]
    )
  }

  const resetFilters = () => {
    setActiveMoods([])
    setSelectedCuisines([])
    setSelectedPriceLevel(null)
    setRadius(5)
    setError(null)
  }

  const handleSpin = useCallback(async () => {
    if (isSpinning) return

    if (segments.length < 2) {
      setError('Not enough restaurants match that mood. Loosen a filter and try again.')
      return
    }

    setError(null)
    setResult(null)
    setPendingWinner(null)

    let winner: SpinnerRestaurant | null = null

    if (favoritesOnly) {
      winner = segments[Math.floor(Math.random() * segments.length)]
    } else {
      try {
        const response = await fetch('/api/spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Restricting to the painted wedges is what lets the wheel physically
            // land on the winner instead of faking the stop.
            includeIds: segments.map(segment => segment.id),
            categories: selectedCuisines,
            terms: moodTerms,
            priceLevels,
            radius,
            lat: nearMeActive && coords ? coords.lat : undefined,
            lng: nearMeActive && coords ? coords.lng : undefined,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to spin')
        }

        const data = await response.json()
        winner = data.restaurant
      } catch (spinError: any) {
        setError(spinError?.message || 'Something went wrong. Try spinning again.')
        return
      }
    }

    if (!winner) {
      setError('The wheel came up empty. Try again.')
      return
    }

    const index = segments.findIndex(segment => segment.id === winner!.id)
    if (index === -1) {
      // Should not happen now that the draw is restricted to the wedges, but the
      // reveal still has to work if the pool shifted underneath us.
      setResult(winner)
      setHistory(current => [winner!, ...current].slice(0, 6))
      setSpinCount(count => count + 1)
      return
    }

    if (soundEnabled) spinSound.play()

    setPendingWinner(winner)
    setTargetIndex(index)
    setIsSpinning(true)
  }, [
    isSpinning,
    segments,
    favoritesOnly,
    selectedCuisines,
    moodTerms,
    priceLevels,
    radius,
    nearMeActive,
    coords,
    soundEnabled,
    spinSound,
  ])

  const handleSettled = useCallback(() => {
    setIsSpinning(false)

    const winner = pendingWinner
    setPendingWinner(null)
    if (!winner) return

    setResult(winner)
    setSpinCount(count => count + 1)
    setHistory(current => [winner, ...current.filter(item => item.id !== winner.id)].slice(0, 6))

    if (soundEnabled) {
      spinSound.stop()
      winSound.play()
    }

    if (!prefersReducedMotion) fireConfetti()
  }, [pendingWinner, soundEnabled, spinSound, winSound, prefersReducedMotion])

  const handleTick = useCallback(() => {
    if (soundEnabled) playTick()
  }, [soundEnabled, playTick])

  // Closing the reveal re-racks the wheel, so "spin again" has to call whichever
  // version of handleSpin exists after that repaint rather than the captured one.
  const spinRef = useRef(handleSpin)
  spinRef.current = handleSpin

  const handleSpinAgain = useCallback(() => {
    setResult(null)
    window.setTimeout(() => void spinRef.current(), 400)
  }, [])

  const moodTagline = activeMoods.length > 0 ? MOODS_BY_ID[activeMoods[activeMoods.length - 1]]?.tagline : null

  const poolSummary = poolLoading
    ? 'Shuffling the deck…'
    : poolTotal === 0
      ? 'Nothing matches that mood yet'
      : `${poolTotal} Katy restaurant${poolTotal === 1 ? '' : 's'} in play · ${segments.length} on the wheel`

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 text-white">
      {/* Ambient stage lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.35),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(249,115,22,0.22),transparent_60%)]"
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-stone-950/60 transition-opacity duration-700 ${
          isSpinning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        {favoritesOnly && (
          <div className="mb-6 rounded-2xl border border-pink-400/40 bg-pink-500/15 px-4 py-3 text-center">
            <p className="font-semibold">
              ❤️ Spinning from your {favorites.length} favourite{favorites.length === 1 ? '' : 's'}
            </p>
            <Link href="/spinner" className="text-sm text-pink-200 underline hover:no-underline">
              Spin the whole directory instead
            </Link>
          </div>
        )}

        <header className="mb-5 text-center">
          <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.35em] text-amber-300/90 sm:text-xs">
            eKaty · Katy, TX
          </p>
          <h1 className="text-4xl font-black leading-none sm:text-6xl">
            Grub <span className="text-red-500">Roulette</span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/70 sm:mt-3 sm:text-lg">
            {moodTagline || 'Tell us what you\u2019re in the mood for. The wheel handles the rest.'}
          </p>
        </header>

        <div className="mb-5">
          <MoodChips
            activeMoods={activeMoods}
            onToggle={toggleMood}
            geoAvailable={geoAvailable}
            geoPending={geoPending}
            disabled={isSpinning}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="flex flex-col items-center">
            {poolLoading && segments.length === 0 ? (
              <div className="flex aspect-square w-full max-w-[min(88vw,30rem)] items-center justify-center rounded-full border border-white/10 bg-white/5">
                <p className="animate-pulse text-sm font-semibold text-white/60">Loading the wheel…</p>
              </div>
            ) : segments.length === 0 ? (
              <div className="flex aspect-square w-full max-w-[min(88vw,30rem)] flex-col items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-10 text-center">
                <span className="text-4xl" aria-hidden>
                  🫙
                </span>
                <p className="text-sm font-semibold text-white/70">
                  No Katy restaurants match that combination yet.
                </p>
                <button onClick={resetFilters} className="text-sm font-bold text-amber-300 underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <RouletteWheel
                segments={wheelSegments}
                targetIndex={targetIndex}
                spinning={isSpinning}
                spinDurationMs={SPIN_DURATION_MS}
                reducedMotion={prefersReducedMotion}
                onSettled={handleSettled}
                onTick={handleTick}
              />
            )}

            <p className="mt-5 text-center text-sm font-medium text-white/55" aria-live="polite">
              {poolSummary}
            </p>

            <button
              onClick={handleSpin}
              disabled={isSpinning || segments.length < 2}
              className={`mt-4 min-h-[60px] w-full max-w-sm rounded-2xl px-10 text-xl font-black uppercase tracking-wide transition-all ${
                isSpinning || segments.length < 2
                  ? 'cursor-not-allowed bg-white/15 text-white/45'
                  : 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-[0_10px_40px_-8px_rgba(239,68,68,0.85)] hover:brightness-110 active:scale-[0.98]'
              } ${isSpinning || prefersReducedMotion || segments.length < 2 ? '' : 'animate-spin-cta-pulse'}`}
            >
              {isSpinning ? 'Spinning…' : result ? 'Spin again' : 'Spin the wheel'}
            </button>

            <p className="mt-3 text-center text-xs text-white/40">
              {spinCount > 0
                ? `${spinCount} spin${spinCount === 1 ? '' : 's'} this session`
                : 'Every wedge is a real Katy listing.'}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 w-full max-w-sm rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-center text-sm font-medium text-red-100"
              >
                {error}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <button
                onClick={() => setShowFilters(current => !current)}
                aria-expanded={showFilters}
                className="flex w-full items-center justify-between text-left text-sm font-bold uppercase tracking-wider text-white/80 lg:cursor-default"
              >
                <span>
                  Fine tune
                  {activeFilterCount > 0 && (
                    <span className="ml-2 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-black text-stone-900">
                      {activeFilterCount}
                    </span>
                  )}
                </span>
                <span aria-hidden className={`transition-transform lg:hidden ${showFilters ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>

              <div className={`${showFilters ? 'block' : 'hidden'} mt-4 space-y-5 lg:block`}>
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">Cuisine</h3>
                  <div className="flex flex-wrap gap-2">
                    {CUISINES.map(cuisine => (
                      <button
                        key={cuisine}
                        onClick={() => toggleCuisine(cuisine)}
                        disabled={isSpinning}
                        aria-pressed={selectedCuisines.includes(cuisine)}
                        className={`min-h-[36px] rounded-full px-3 text-sm font-semibold transition disabled:opacity-50 ${
                          selectedCuisines.includes(cuisine)
                            ? 'bg-red-600 text-white'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        {cuisine}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">Budget</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {PRICE_LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() =>
                          setSelectedPriceLevel(current => (current === level.value ? null : level.value))
                        }
                        disabled={isSpinning}
                        aria-pressed={selectedPriceLevel === level.value}
                        className={`min-h-[48px] rounded-lg text-center transition disabled:opacity-50 ${
                          selectedPriceLevel === level.value
                            ? 'bg-amber-300 text-stone-900'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        <span className="block text-sm font-black">{level.label}</span>
                        <span className="block text-[0.6rem] uppercase tracking-wide opacity-75">
                          {level.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {nearMeActive && coords && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">
                      Within {radius} miles
                    </h3>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={radius}
                      onChange={event => setRadius(parseInt(event.target.value, 10))}
                      disabled={isSpinning}
                      aria-label="Maximum distance in miles"
                      className="w-full accent-red-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-white/75">
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={event => setSoundEnabled(event.target.checked)}
                      className="h-4 w-4 rounded border-white/30 accent-red-500"
                    />
                    {soundEnabled ? '🔊' : '🔇'} Sound
                  </label>
                  <button onClick={resetFilters} className="text-sm font-semibold text-white/50 hover:text-white">
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {history.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Recent spins</h2>
                <ul className="space-y-2">
                  {history.map((restaurant, index) => (
                    <li key={`${restaurant.id}-${index}`}>
                      <Link
                        href={`/restaurants/${restaurant.slug || restaurant.id}`}
                        className="flex items-center justify-between gap-3 text-sm text-white/75 transition hover:text-amber-300"
                      >
                        <span className="truncate">{restaurant.name}</span>
                        <span className="shrink-0 text-xs text-white/40">{priceSymbol(restaurant.priceLevel)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 backdrop-blur">
              <p className="mb-2 font-semibold text-white/80">Not feeling lucky?</p>
              <Link href="/discover" className="font-semibold text-amber-300 hover:underline">
                Browse the full Katy directory →
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {result && (
        <SpinRevealCard
          restaurant={result}
          spinNumber={spinCount}
          reducedMotion={prefersReducedMotion}
          onSpinAgain={handleSpinAgain}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  )
}

/** Favourites come straight from Prisma, so the string columns need expanding. */
function normalizeRestaurant(restaurant: any): SpinnerRestaurant {
  const toList = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.map(String)
      : typeof value === 'string'
        ? value.split(',').map(part => part.trim()).filter(Boolean)
        : []

  return {
    ...restaurant,
    categories: toList(restaurant.categories),
    cuisineTypes: toList(restaurant.cuisineTypes),
    photos: toList(restaurant.photos),
    reviewCount: restaurant.reviewCount ?? 0,
  }
}

export default function SpinnerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-950 text-white">
          <p className="animate-pulse text-lg font-semibold">Warming up the wheel…</p>
        </div>
      }
    >
      <SpinnerPageContent />
    </Suspense>
  )
}
