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
import {
  SPINNER_CUISINES,
  deriveSimilarSeed,
  expandCuisineTerms,
  matchesCuisines,
  matchesTerms,
} from '@/lib/spinner/similar'
import type { SpinnerRestaurant } from '@/lib/spinner/candidates'

/** How long the wheel glides before it settles. */
const SPIN_DURATION_MS = 4600
/**
 * Wedge counts are capped for legibility rather than spectacle: eight names fit
 * on a desktop wheel at a readable size, six on a phone. The pool caps it
 * further when the directory is thin.
 */
const WHEEL_SEGMENTS = 8
const WHEEL_SEGMENTS_COMPACT = 6
const MIN_SEGMENTS = 3

interface Coordinates {
  lat: number
  lng: number
}

function fireConfetti() {
  const base = { spread: 78, ticks: 220, gravity: 0.9, scalar: 1.05, zIndex: 60 }
  const colors = ['#cfa267', '#f7f1e6', '#5e7a4e', '#b91c1c', '#e6d5b6']

  confetti({ ...base, colors, particleCount: 90, origin: { x: 0.5, y: 0.45 } })
  window.setTimeout(() => confetti({ ...base, colors, particleCount: 55, angle: 60, origin: { x: 0, y: 0.7 } }), 160)
  window.setTimeout(() => confetti({ ...base, colors, particleCount: 55, angle: 120, origin: { x: 1, y: 0.7 } }), 260)
}

function SpinnerPageContent() {
  const searchParams = useSearchParams()
  const favoritesOnly = searchParams?.get('favoritesOnly') === 'true'

  // "Spin Similar" arrives from a listing with the referring venue's type in the
  // URL. `category` seeds the chips, `type` carries a free-text fallback, and
  // `restaurant` names the venue to leave off the wheel.
  const categoryParam = searchParams?.get('category') || searchParams?.get('categories') || ''
  const typeParam = searchParams?.get('type') || searchParams?.get('types') || ''
  const referrerParam = searchParams?.get('restaurant') || searchParams?.get('exclude') || ''
  const hasParamSeed = Boolean(categoryParam || typeParam)

  const paramSeed = useMemo(
    () =>
      hasParamSeed
        ? deriveSimilarSeed({ categories: categoryParam, cuisineTypes: typeParam })
        : { cuisines: [], terms: [], label: '' },
    [hasParamSeed, categoryParam, typeParam]
  )

  const prefersReducedMotion = usePrefersReducedMotion()

  const [pool, setPool] = useState<SpinnerRestaurant[]>([])
  const [poolTotal, setPoolTotal] = useState(0)
  const [poolLoading, setPoolLoading] = useState(true)
  const [segments, setSegments] = useState<SpinnerRestaurant[]>([])
  const [maxSegments, setMaxSegments] = useState(WHEEL_SEGMENTS)

  const [isSpinning, setIsSpinning] = useState(false)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const [pendingWinner, setPendingWinner] = useState<SpinnerRestaurant | null>(null)
  const [result, setResult] = useState<SpinnerRestaurant | null>(null)
  const [spinCount, setSpinCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SpinnerRestaurant[]>([])

  const [activeMoods, setActiveMoods] = useState<MoodId[]>([])
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(() => paramSeed.cuisines)
  const [similarTerms, setSimilarTerms] = useState<string[]>(() => paramSeed.terms)
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<string | null>(null)
  const [radius, setRadius] = useState(5)
  const [coords, setCoords] = useState<Coordinates | null>(null)
  const [geoPending, setGeoPending] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Referring listing: resolved so we can exclude it and name it in the banner.
  const [referrer, setReferrer] = useState<{ id: string; name: string } | null>(null)
  const [seedPending, setSeedPending] = useState(() => Boolean(referrerParam) && !hasParamSeed)
  const [seedUnmapped, setSeedUnmapped] = useState(
    () => hasParamSeed && paramSeed.cuisines.length === 0 && paramSeed.terms.length === 0
  )
  const [seedBroadened, setSeedBroadened] = useState(false)
  /** True while the cuisine filter is still exactly what the listing seeded. */
  const seedOwnsFilters = useRef(paramSeed.cuisines.length > 0 || paramSeed.terms.length > 0)

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

  // Narrow screens get fewer, bigger wedges so the names stay readable.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const query = window.matchMedia('(max-width: 480px)')
    const apply = () => setMaxSegments(query.matches ? WHEEL_SEGMENTS_COMPACT : WHEEL_SEGMENTS)

    apply()
    query.addEventListener?.('change', apply)
    return () => query.removeEventListener?.('change', apply)
  }, [])

  const moodTerms = useMemo(() => termsForMoods(activeMoods), [activeMoods])
  const moodPriceLevels = useMemo(() => priceLevelsForMoods(activeMoods), [activeMoods])
  const priceLevels = useMemo(
    () => (selectedPriceLevel ? [selectedPriceLevel] : moodPriceLevels),
    [selectedPriceLevel, moodPriceLevels]
  )
  const nearMeActive = activeMoods.includes('near-me')

  /**
   * The cuisine group sent to the API. Chips are expanded into their aliases so
   * a "Mexican" spin also reaches rows tagged `taqueria` or `mexican_restaurant`.
   */
  const cuisineQueryTerms = useMemo(
    () => [...expandCuisineTerms(selectedCuisines), ...similarTerms],
    [selectedCuisines, similarTerms]
  )

  const excludedIds = useMemo(() => {
    const ids = new Set<string>()
    if (referrerParam) ids.add(referrerParam)
    if (referrer?.id) ids.add(referrer.id)
    return Array.from(ids)
  }, [referrerParam, referrer])

  const activeFilterCount =
    selectedCuisines.length +
    (similarTerms.length > 0 ? 1 : 0) +
    (selectedPriceLevel ? 1 : 0) +
    activeMoods.filter(id => id !== 'surprise').length

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

  /**
   * Resolves the referring listing. Links that already carry `category` only
   * need its name for the banner; legacy `?restaurant=<id>` links also have to
   * derive the cuisine from the row before the first pool load.
   */
  useEffect(() => {
    if (!referrerParam) return

    let cancelled = false

    fetch(`/api/restaurants/${encodeURIComponent(referrerParam)}`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (cancelled) return

        if (data?.id) setReferrer({ id: data.id, name: data.name })

        if (!hasParamSeed) {
          const seed = data ? deriveSimilarSeed(data) : { cuisines: [], terms: [], label: '' }
          if (seed.cuisines.length > 0) setSelectedCuisines(seed.cuisines)
          else if (seed.terms.length > 0) setSimilarTerms(seed.terms)
          else setSeedUnmapped(true)

          seedOwnsFilters.current = seed.cuisines.length > 0 || seed.terms.length > 0
        }

        setSeedPending(false)
      })
      .catch(() => {
        if (cancelled) return
        // Never trap the user on a dead spinner: fall back to the full directory.
        if (!hasParamSeed) setSeedUnmapped(true)
        setSeedPending(false)
      })

    return () => {
      cancelled = true
    }
  }, [referrerParam, hasParamSeed])

  /** Favourites mode filters in the browser; everything else asks the API. */
  const favoritesPool = useMemo(() => {
    if (!favoritesOnly) return []

    return favorites.filter(restaurant => {
      if (excludedIds.includes(restaurant.id)) return false
      if (!matchesCuisines(restaurant, selectedCuisines)) return false
      if (!matchesTerms(restaurant, similarTerms)) return false

      if (moodTerms.length > 0) {
        const haystack = [restaurant.name, ...restaurant.categories, ...restaurant.cuisineTypes]
          .join(' ')
          .toLowerCase()
        if (!moodTerms.some(term => haystack.includes(term))) return false
      }

      if (priceLevels.length > 0 && !priceLevels.includes(restaurant.priceLevel)) return false
      return true
    })
  }, [favoritesOnly, favorites, excludedIds, selectedCuisines, similarTerms, moodTerms, priceLevels])

  const loadPool = useCallback(async () => {
    // Legacy "Spin Similar" links have to resolve their cuisine first, otherwise
    // the wheel would flash an unfiltered directory draw.
    if (seedPending) {
      setPoolLoading(true)
      return
    }

    if (favoritesOnly) {
      setPool(favoritesPool)
      setPoolTotal(favoritesPool.length)
      setPoolLoading(false)
      return
    }

    setPoolLoading(true)

    const params = new URLSearchParams()
    if (cuisineQueryTerms.length > 0) params.set('categories', cuisineQueryTerms.join(','))
    if (moodTerms.length > 0) params.set('terms', moodTerms.join(','))
    if (priceLevels.length > 0) params.set('priceLevels', priceLevels.join(','))
    if (excludedIds.length > 0) params.set('excludeIds', excludedIds.join(','))
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
      const total = data.total ?? (data.restaurants || []).length

      // A listing whose cuisine has no peers left would leave the wheel empty,
      // which is a dead end the user did not ask for. Widen to the directory and
      // say so — but never override a filter the user chose themselves.
      if (total === 0 && seedOwnsFilters.current) {
        seedOwnsFilters.current = false
        setSelectedCuisines([])
        setSimilarTerms([])
        setSeedBroadened(true)
        return
      }

      setPool(data.restaurants || [])
      setPoolTotal(total)
      setError(null)
    } catch {
      setPool([])
      setPoolTotal(0)
      setError('We could not reach the eKaty directory. Try again in a moment.')
    } finally {
      setPoolLoading(false)
    }
  }, [
    seedPending,
    favoritesOnly,
    favoritesPool,
    cuisineQueryTerms,
    moodTerms,
    priceLevels,
    excludedIds,
    nearMeActive,
    coords,
    radius,
  ])

  useEffect(() => {
    void loadPool()
  }, [loadPool])

  // Repaint the wedges whenever the pool changes, but never mid-spin and never
  // while the reveal is open, so the landed wedge still reads correctly on close.
  useEffect(() => {
    if (isSpinning || result) return

    const candidates = pool.filter(restaurant => !excludedIds.includes(restaurant.id))
    const recentIds = new Set(history.slice(0, 3).map(item => item.id))
    const fresh = candidates.filter(restaurant => !recentIds.has(restaurant.id))
    const source = fresh.length >= MIN_SEGMENTS ? fresh : candidates

    setSegments(source.slice(0, maxSegments))
  }, [pool, history, isSpinning, result, excludedIds, maxSegments])

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

      seedOwnsFilters.current = false

      const mood = MOODS_BY_ID[moodId]
      if (mood?.clearsFilters) {
        setActiveMoods([])
        setSelectedCuisines([])
        setSimilarTerms([])
        setSelectedPriceLevel(null)
        setSeedBroadened(false)
        setSeedUnmapped(false)
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
    // Once the user picks a chip, the free-text seed has done its job.
    seedOwnsFilters.current = false
    setSimilarTerms([])
    setSelectedCuisines(current =>
      current.includes(cuisine) ? current.filter(c => c !== cuisine) : [...current, cuisine]
    )
  }

  const clearSimilarSeed = () => {
    seedOwnsFilters.current = false
    setSelectedCuisines([])
    setSimilarTerms([])
    setSeedBroadened(false)
    setSeedUnmapped(false)
    setError(null)
  }

  const resetFilters = () => {
    seedOwnsFilters.current = false
    setSeedBroadened(false)
    setSeedUnmapped(false)
    setActiveMoods([])
    setSelectedCuisines([])
    setSimilarTerms([])
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
            excludeIds: excludedIds,
            categories: cuisineQueryTerms,
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
    excludedIds,
    cuisineQueryTerms,
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

  const seededFromListing = Boolean(referrerParam || hasParamSeed)
  const seedLabel = selectedCuisines.length > 0 ? selectedCuisines.join(' · ') : similarTerms.join(' · ')

  const seedNote = seedBroadened
    ? `Nothing else in Katy matches ${referrer?.name || 'that spot'} yet, so the whole directory is in play`
    : seedUnmapped
      ? `We could not pin down what ${referrer?.name || 'that spot'} serves, so all of Katy is in play`
      : seedPending
        ? 'Reading what that spot serves…'
        : null

  // Once the user clears the seed there is nothing left to explain.
  const showSeedBanner = seededFromListing && Boolean(seedLabel || seedNote)

  const poolSummary = poolLoading
    ? 'Shuffling the deck…'
    : poolTotal === 0
      ? 'Nothing matches that mood yet'
      : `${poolTotal} Katy restaurant${poolTotal === 1 ? '' : 's'} in play · ${segments.length} on the wheel`

  return (
    <div className="spinner-stage relative min-h-screen overflow-hidden text-bone-100">
      {/* Reclaimed-wood battens behind the stage lighting */}
      <div aria-hidden className="spinner-battens pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-charcoal-950/55 transition-opacity duration-700 ${
          isSpinning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-10">
        {favoritesOnly && (
          <div className="mb-6 rounded-2xl border border-honey-400/35 bg-honey-900/35 px-4 py-3 text-center">
            <p className="font-semibold">
              ❤️ Spinning from your {favorites.length} favourite{favorites.length === 1 ? '' : 's'}
            </p>
            <Link href="/spinner" className="text-sm text-honey-200 underline hover:no-underline">
              Spin the whole directory instead
            </Link>
          </div>
        )}

        {showSeedBanner && (
          <div className="mb-4 flex flex-col items-center gap-0.5 rounded-2xl border border-sage-400/35 bg-sage-800/45 px-3 py-2.5 text-center sm:mb-6 sm:gap-1 sm:px-4 sm:py-3">
            {seedLabel ? (
              <p className="text-sm font-semibold sm:text-base">
                <span aria-hidden className="mr-1.5">
                  🎯
                </span>
                {referrer ? `Spinning similar to ${referrer.name}` : `Spinning similar to ${seedLabel}`}
                {referrer && <span className="text-bone-100/70"> · {seedLabel}</span>}
              </p>
            ) : (
              <p className="text-sm font-semibold sm:text-base">
                <span aria-hidden className="mr-1.5">
                  🤠
                </span>
                {seedNote}
              </p>
            )}
            <p className="text-xs text-bone-100/70 sm:text-sm">
              Pick a mood or cuisine to steer it, or{' '}
              <button
                onClick={clearSimilarSeed}
                className="font-semibold text-honey-200 underline hover:no-underline"
              >
                spin the whole directory
              </button>
              .
            </p>
          </div>
        )}

        <header className="mb-4 text-center sm:mb-5">
          <p className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.35em] text-honey-300 sm:mb-2 sm:text-xs">
            eKaty · Katy, TX
          </p>
          <h1 className="text-4xl font-black leading-none sm:text-6xl">
            Grub <span className="text-primary-500">Roulette</span>
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-bone-100/70 sm:mt-3 sm:text-lg">
            {moodTagline || 'Tell us what you\u2019re in the mood for. The wheel handles the rest.'}
          </p>
        </header>

        <div className="mb-4 sm:mb-5">
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
              <div className="flex aspect-square w-full max-w-[min(88vw,30rem)] items-center justify-center rounded-full border border-honey-500/20 bg-charcoal-800/60">
                <p className="animate-pulse text-sm font-semibold text-bone-100/60">Loading the wheel…</p>
              </div>
            ) : segments.length === 0 ? (
              <div className="flex aspect-square w-full max-w-[min(88vw,30rem)] flex-col items-center justify-center gap-3 rounded-full border border-honey-500/20 bg-charcoal-800/60 px-10 text-center">
                <span className="text-4xl" aria-hidden>
                  🫙
                </span>
                <p className="text-sm font-semibold text-bone-100/70">
                  No Katy restaurants match that combination yet.
                </p>
                <button onClick={resetFilters} className="text-sm font-bold text-honey-300 underline">
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

            <p className="mt-5 text-center text-sm font-medium text-bone-100/60" aria-live="polite">
              {poolSummary}
            </p>

            <button
              onClick={handleSpin}
              disabled={isSpinning || segments.length < 2}
              className={`mt-4 min-h-[60px] w-full max-w-sm rounded-2xl px-10 text-xl font-black uppercase tracking-wide transition-all ${
                isSpinning || segments.length < 2
                  ? 'cursor-not-allowed bg-charcoal-700/70 text-bone-100/40'
                  : 'bg-gradient-to-r from-primary-800 to-primary-600 text-bone-50 shadow-[0_12px_34px_-10px_rgba(153,27,27,0.85)] hover:brightness-110 active:scale-[0.98]'
              } ${isSpinning || prefersReducedMotion || segments.length < 2 ? '' : 'animate-spin-cta-pulse'}`}
            >
              {isSpinning ? 'Spinning…' : result ? 'Spin again' : 'Spin the wheel'}
            </button>

            <p className="mt-3 text-center text-xs text-bone-100/45">
              {spinCount > 0
                ? `${spinCount} spin${spinCount === 1 ? '' : 's'} this session`
                : 'Every wedge is a real Katy listing.'}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 w-full max-w-sm rounded-xl border border-primary-400/40 bg-primary-900/40 px-4 py-3 text-center text-sm font-medium text-primary-100"
              >
                {error}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-honey-500/20 bg-charcoal-800/70 p-4 backdrop-blur">
              <button
                onClick={() => setShowFilters(current => !current)}
                aria-expanded={showFilters}
                className="flex w-full items-center justify-between text-left text-sm font-bold uppercase tracking-wider text-bone-100/80 lg:cursor-default"
              >
                <span>
                  Fine tune
                  {activeFilterCount > 0 && (
                    <span className="ml-2 rounded-full bg-honey-300 px-2 py-0.5 text-xs font-black text-charcoal-900">
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
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-bone-100/55">Cuisine</h3>
                  <div className="flex flex-wrap gap-2">
                    {SPINNER_CUISINES.map(cuisine => (
                      <button
                        key={cuisine}
                        onClick={() => toggleCuisine(cuisine)}
                        disabled={isSpinning}
                        aria-pressed={selectedCuisines.includes(cuisine)}
                        className={`min-h-[36px] rounded-full px-3 text-sm font-semibold transition disabled:opacity-50 ${
                          selectedCuisines.includes(cuisine)
                            ? 'bg-sage-400 text-charcoal-900 ring-2 ring-honey-300/70'
                            : 'bg-charcoal-700/70 text-bone-100/80 hover:bg-charcoal-600'
                        }`}
                      >
                        {cuisine}
                      </button>
                    ))}
                  </div>

                  {similarTerms.length > 0 && (
                    <p className="mt-2 text-xs text-bone-100/60">
                      Matching{' '}
                      <span className="font-semibold capitalize text-honey-200">{similarTerms.join(', ')}</span> from
                      the listing you came from.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-bone-100/55">Budget</h3>
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
                            ? 'bg-honey-300 text-charcoal-900'
                            : 'bg-charcoal-700/70 text-bone-100/80 hover:bg-charcoal-600'
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
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-bone-100/55">
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
                      className="w-full accent-sage-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-honey-500/15 pt-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-bone-100/75">
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={event => setSoundEnabled(event.target.checked)}
                      className="h-4 w-4 rounded border-bone-100/30 accent-primary-600"
                    />
                    {soundEnabled ? '🔊' : '🔇'} Sound
                  </label>
                  <button
                    onClick={resetFilters}
                    className="text-sm font-semibold text-bone-100/55 hover:text-bone-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {history.length > 0 && (
              <div className="rounded-2xl border border-honey-500/20 bg-charcoal-800/70 p-4 backdrop-blur">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-bone-100/55">Recent spins</h2>
                <ul className="space-y-2">
                  {history.map((restaurant, index) => (
                    <li key={`${restaurant.id}-${index}`}>
                      <Link
                        href={`/restaurants/${restaurant.slug || restaurant.id}`}
                        className="flex items-center justify-between gap-3 text-sm text-bone-100/75 transition hover:text-honey-300"
                      >
                        <span className="truncate">{restaurant.name}</span>
                        <span className="shrink-0 text-xs text-bone-100/45">
                          {priceSymbol(restaurant.priceLevel)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-honey-500/20 bg-charcoal-800/70 p-4 text-sm text-bone-100/65 backdrop-blur">
              <p className="mb-2 font-semibold text-bone-100/85">Not feeling lucky?</p>
              <Link href="/discover" className="font-semibold text-honey-300 hover:underline">
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
        <div className="spinner-stage flex min-h-screen items-center justify-center text-bone-100">
          <p className="animate-pulse text-lg font-semibold">Warming up the wheel…</p>
        </div>
      }
    >
      <SpinnerPageContent />
    </Suspense>
  )
}
