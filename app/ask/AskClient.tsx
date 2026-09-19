'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { trackAskPickClick, trackAskQuery, trackAskSpinSimilar } from '@/lib/analytics'
import type { AskPick, AskResult, AskSchema, AskSource } from '@/lib/ask/types'

/** Starter asks. Each one is a real sentence so the parser is what runs. */
const QUICK_ASKS = [
  { emoji: '💸', label: 'Cheap eats tonight', query: 'cheap eats tonight' },
  { emoji: '🌮', label: 'Tacos near 77494', query: 'tacos near 77494' },
  { emoji: '🕯️', label: 'Date night, no chains', query: 'date night, no chains' },
  { emoji: '👨‍👩‍👧', label: 'Family dinner with kids', query: 'family dinner with the kids' },
  { emoji: '🍖', label: 'BBQ for a party of 8', query: 'bbq for a party of 8' },
  { emoji: '🥗', label: 'Something healthy under $20', query: 'something healthy under $20' },
  { emoji: '🎲', label: 'Surprise me', query: 'surprise me' },
  { emoji: '🕒', label: "What's open now?", query: "what's open now" },
]

/** Renders the parsed schema so the diner can see how we read their sentence. */
function SchemaChips({ schema }: { schema: AskSchema }) {
  const chips: string[] = []

  if (schema.cuisine_include.length > 0) chips.push(schema.cuisine_include.join(' + '))
  for (const cuisine of schema.cuisine_exclude) chips.push(`no ${cuisine}`)
  if (schema.exclude_chains) chips.push('no chains')
  if (schema.budget) {
    const ceiling = /^under_(\d+)$/.exec(schema.budget)
    chips.push(ceiling ? `under $${ceiling[1]}` : `${schema.budget} budget`)
  }
  if (schema.party_size) chips.push(`party of ${schema.party_size}`)
  if (schema.kids === true) chips.push('kids along')
  if (schema.zip) chips.push(schema.zip)
  if (schema.area) chips.push(schema.area)
  for (const vibe of schema.vibe) chips.push(vibe)
  if (schema.open_now) chips.push('open now')
  if (schema.novelty && schema.novelty !== 'mixed') chips.push(schema.novelty)

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500">Heard:</span>
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700"
        >
          {chip}
        </span>
      ))}
    </div>
  )
}

function PickCard({
  pick,
  position,
  source,
  query,
}: {
  pick: AskPick
  position: number
  source: AskSource
  query: string
}) {
  const trackedSource = source === 'api' ? 'ask' : source

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-600 font-bold text-white">
          {position}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              href={pick.url}
              onClick={() =>
                trackAskPickClick({
                  restaurantId: pick.id,
                  restaurantName: pick.name,
                  position,
                  source: trackedSource,
                  query,
                })
              }
              className="text-xl font-bold text-gray-900 hover:text-primary-600"
            >
              {pick.name}
            </Link>
            <span className="text-sm font-semibold text-gray-500">{pick.priceTier}</span>
            {typeof pick.rating === 'number' && (
              <span className="text-sm text-gray-500">
                {pick.rating.toFixed(1)} ★ ({pick.reviewCount})
              </span>
            )}
          </div>

          <p className="mt-2 text-gray-700">{pick.why}</p>

          <p className="mt-2 text-sm text-gray-500">
            {pick.address}, Katy TX {pick.zipCode}
            {pick.cuisineTypes.length > 0 && <> · {pick.cuisineTypes.slice(0, 3).join(', ')}</>}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={pick.url}
              onClick={() =>
                trackAskPickClick({
                  restaurantId: pick.id,
                  restaurantName: pick.name,
                  position,
                  source: trackedSource,
                  query,
                })
              }
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              See the listing
            </Link>
            {pick.spin_similar_url && (
              <Link
                href={pick.spin_similar_url}
                onClick={() =>
                  trackAskSpinSimilar({
                    source: trackedSource,
                    cuisine: pick.categories[0],
                  })
                }
                className="rounded-lg border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                🎰 Spin similar
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AskClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlQuery = searchParams?.get('q') || ''
  const sourceParam = searchParams?.get('source')
  const source: AskSource = sourceParam === 'home' || sourceParam === 'spinner' ? sourceParam : 'ask'

  const [query, setQuery] = useState(urlQuery)
  const [result, setResult] = useState<AskResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Guards against re-asking the same question on every render or re-mount. */
  const lastAsked = useRef<string | null>(null)

  const ask = useCallback(
    async (rawQuery: string, askSource: AskSource) => {
      const trimmed = rawQuery.trim()
      if (!trimmed) return

      lastAsked.current = trimmed
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed, source: askSource }),
        })

        if (!response.ok) throw new Error('Ask request failed')

        const data: AskResult = await response.json()
        setResult(data)
        trackAskQuery({
          query: trimmed,
          source: askSource === 'api' ? 'ask' : askSource,
          resultCount: data.picks.length,
          schema: data.schema,
        })
      } catch (err) {
        console.error('Ask eKaty request failed:', err)
        setError("We couldn't reach the Katy directory just now. Try that again in a moment.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Answer straight away when arriving with a question in the URL, which is how
  // the homepage search box hands off.
  useEffect(() => {
    const trimmed = urlQuery.trim()
    if (!trimmed || lastAsked.current === trimmed) return
    setQuery(urlQuery)
    ask(trimmed, source)
  }, [urlQuery, source, ask])

  const submit = (nextQuery: string) => {
    const trimmed = nextQuery.trim()
    if (!trimmed) return
    setQuery(nextQuery)
    router.push(`/ask?q=${encodeURIComponent(trimmed)}`, { scroll: false })
    ask(trimmed, source)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold sm:text-5xl">Ask eKaty</h1>
          <p className="mt-3 text-lg text-primary-100">
            Tell us what you are in the mood for and we will pick three places in Katy. Real
            listings from our directory, every time.
          </p>

          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault()
              submit(query)
            }}
          >
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cheap Mexican near 77493 with the kids..."
                aria-label="Describe what you are in the mood for"
                className="w-full rounded-lg bg-white px-5 py-4 pr-32 text-lg text-gray-900 shadow-lg focus:outline-none focus:ring-4 focus:ring-primary-300"
              />
              <button
                type="submit"
                disabled={loading || query.trim().length === 0}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Thinking…' : 'Ask'}
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_ASKS.map((quick) => (
              <button
                key={quick.query}
                type="button"
                onClick={() => submit(quick.query)}
                className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/25"
              >
                <span className="mr-1.5">{quick.emoji}</span>
                {quick.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error}</div>
        )}

        {loading && !result && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <SchemaChips schema={result.schema} />

            {result.picks.length > 0 && (
              <div className="space-y-4">
                {result.picks.map((pick, index) => (
                  <PickCard
                    key={pick.id}
                    pick={pick}
                    position={index + 1}
                    source={result.meta.source}
                    query={result.query}
                  />
                ))}
              </div>
            )}

            {result.shortfall && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                <h2 className="font-semibold text-amber-900">
                  {result.picks.length === 0 ? 'No honest match yet' : 'That is everything we have'}
                </h2>
                <p className="mt-2 text-amber-800">{result.shortfall.message}</p>
                <p className="mt-3 text-sm text-amber-700">
                  We would rather come up short than invent a restaurant.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/discover"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    Browse the full directory
                  </Link>
                  <Link
                    href="/spinner"
                    className="rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                  >
                    🎰 Spin the wheel instead
                  </Link>
                </div>
              </div>
            )}

            {result.picks.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-500">
                  Picked from {result.meta.candidates_matched} matching{' '}
                  {result.meta.candidates_matched === 1 ? 'listing' : 'listings'} in the eKaty
                  directory.
                </p>
                <div className="flex flex-wrap gap-3">
                  {result.spin_similar_url && (
                    <Link
                      href={result.spin_similar_url}
                      onClick={() =>
                        trackAskSpinSimilar({
                          source: result.meta.source === 'api' ? 'ask' : result.meta.source,
                          cuisine: result.schema.cuisine_include[0],
                        })
                      }
                      className="text-sm font-semibold text-primary-700 hover:text-primary-800"
                    >
                      🎰 Spin something similar →
                    </Link>
                  )}
                  <Link
                    href="/discover"
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                  >
                    Browse everything →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !loading && !error && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Ask like you would ask a neighbor
            </h2>
            <p className="mt-2 text-gray-600">
              &ldquo;Somewhere cheap for tacos near 77493&rdquo;, &ldquo;date night but not a
              chain&rdquo;, &ldquo;BBQ for eight with kids&rdquo;. We read the party size, budget,
              area, cuisine and vibe out of your sentence, then match it against restaurants that
              are actually listed in Katy.
            </p>
            <p className="mt-3 text-sm text-gray-500">
              Prefer to browse?{' '}
              <Link href="/discover" className="font-semibold text-primary-700 hover:underline">
                Search the full directory
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
