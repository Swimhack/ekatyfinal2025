// Ask eKaty — ranking over existing inventory.
//
// Two stages:
//   1. Hard filters that a pick must satisfy (ruled-out cuisines, "no chains",
//      a requested cuisine, an explicit dollar ceiling, provably-closed
//      kitchens). Nothing survives these by being padded or invented — if the
//      pool falls short, the caller reports a shortfall.
//   2. Soft scoring for fit (budget tier, proximity, vibe, kids, party size,
//      novelty), which only reorders what already passed.

import { buildChainIndex, type ChainIndex } from './chains'
import { isOpenAt, type OpenState } from './hours'
import { budgetCeiling, budgetMaxPriceLevel, budgetTargetPriceLevel, budgetTier } from './parse'
import {
  PRICE_LEVEL_ORDER,
  PRICE_TIER_SYMBOL,
  type AskCandidate,
  type AskSchema,
  type MatchReason,
  type PriceLevel,
} from './types'
import { AREA_ALIASES, CUISINES, VIBES } from './vocabulary'

export const DEFAULT_PICK_COUNT = 3

/** Tokens that indicate a listing can host a larger table. */
const GROUP_TOKENS = ['private dining', 'private events', 'large group', 'banquet', 'family']

/** Tokens that indicate a listing is set up for kids. */
const KID_TOKENS = ['family', 'kid', 'kids', 'high chair', 'playground']

export interface RankOptions {
  /** Evaluation time for `open_now`. Injected so tests are not clock-dependent. */
  now?: Date
  /** Seeds novelty jitter. Same seed plus same pool gives the same order. */
  seed?: string
  limit?: number
}

export interface RankedCandidate {
  candidate: AskCandidate
  score: number
  reasons: MatchReason[]
  openState: OpenState
}

export interface RankResult {
  /** Top `limit` candidates, best first. */
  ranked: RankedCandidate[]
  /** Everything that cleared the hard filters, scored and sorted. */
  scored: RankedCandidate[]
  /** How many candidates each hard filter removed, for honest shortfalls. */
  removedBy: Record<string, number>
  chainIndex: ChainIndex
}

function cuisineTokens(label: string): string[] {
  const def = CUISINES.find((cuisine) => cuisine.label === label)
  return def ? def.tokens : [label.toLowerCase()]
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Fields that identify what a restaurant *is*. Used for hard exclusions, where
 * a loose match would wrongly drop a listing.
 */
function identityText(candidate: AskCandidate): string {
  return normalizeText(
    [candidate.name, ...candidate.categories, ...candidate.cuisineTypes].join(' | ')
  )
}

/**
 * Everything we store that describes the experience. Used for positive
 * matching, where recall matters more.
 */
function fitText(candidate: AskCandidate): string {
  return normalizeText(
    [
      candidate.name,
      ...candidate.categories,
      ...candidate.cuisineTypes,
      ...candidate.tags,
      ...candidate.features,
      candidate.description || '',
    ].join(' | ')
  )
}

function containsToken(haystack: string, token: string): boolean {
  return haystack.includes(token.toLowerCase())
}

function priceIndex(level: PriceLevel): number {
  const index = PRICE_LEVEL_ORDER.indexOf(level)
  return index === -1 ? 1 : index
}

/** Miles between two points. Same formula as /api/restaurants. */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959
  const toRad = (deg: number) => deg * (Math.PI / 180)
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Average position of the listings we already have in `zip`.
 *
 * Proximity is measured against our own inventory rather than an external
 * geocoder, so a ZIP we have no listings for simply produces no proximity
 * signal instead of a made-up centroid.
 */
export function zipCentroid(
  candidates: AskCandidate[],
  zip: string
): { lat: number; lng: number } | null {
  const inZip = candidates.filter(
    (c) => c.zipCode === zip && typeof c.latitude === 'number' && typeof c.longitude === 'number'
  )
  if (inZip.length === 0) return null

  const lat = inZip.reduce((sum, c) => sum + (c.latitude as number), 0) / inZip.length
  const lng = inZip.reduce((sum, c) => sum + (c.longitude as number), 0) / inZip.length
  return { lat, lng }
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Stable pseudo-random value in [0, 1) for a (seed, id) pair. */
function seededUnit(seed: string, id: string): number {
  let state = hashString(`${seed}::${id}`)
  state = Math.imul(state ^ (state >>> 15), state | 1)
  state ^= state + Math.imul(state ^ (state >>> 7), state | 61)
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296
}

export interface HardFilterResult {
  matched: AskCandidate[]
  removedBy: Record<string, number>
  chainIndex: ChainIndex
  openStates: Map<string, OpenState>
}

/**
 * Applies every non-negotiable constraint. A candidate is removed only on
 * positive evidence: unknown hours, for instance, are never treated as closed.
 */
export function applyHardFilters(
  candidates: AskCandidate[],
  schema: AskSchema,
  options: RankOptions = {},
  explicitChainFlags?: Map<string, boolean>
): HardFilterResult {
  const now = options.now || new Date()
  const chainIndex = buildChainIndex(candidates, explicitChainFlags)
  const openStates = new Map<string, OpenState>()

  const removedBy: Record<string, number> = {}
  const remove = (key: string) => {
    removedBy[key] = (removedBy[key] || 0) + 1
  }

  const excludeTokens = schema.cuisine_exclude.flatMap(cuisineTokens)
  const includeTokenGroups = schema.cuisine_include.map(cuisineTokens)
  const maxPriceLevel = budgetCeiling(schema.budget) !== null ? budgetMaxPriceLevel(schema.budget) : null

  // Ordered so `removedBy` attributes each drop to the first constraint that
  // rejected it, with the usually-narrowest constraint checked first. That
  // keeps the shortfall message pointed at the filter worth loosening.
  const matched = candidates.filter((candidate) => {
    if (includeTokenGroups.length > 0) {
      const fit = fitText(candidate)
      const matchesAny = includeTokenGroups.some((tokens) =>
        tokens.some((token) => containsToken(fit, token))
      )
      if (!matchesAny) {
        remove('cuisine_include')
        return false
      }
    }

    if (excludeTokens.some((token) => containsToken(identityText(candidate), token))) {
      remove('cuisine_exclude')
      return false
    }

    if (schema.exclude_chains && chainIndex.ids.has(candidate.id)) {
      remove('exclude_chains')
      return false
    }

    if (maxPriceLevel && priceIndex(candidate.priceLevel) > priceIndex(maxPriceLevel)) {
      remove('budget_ceiling')
      return false
    }

    if (schema.open_now) {
      const state = isOpenAt(candidate.hours, now)
      openStates.set(candidate.id, state)
      if (state === 'closed') {
        remove('open_now')
        return false
      }
    }

    return true
  })

  return { matched, removedBy, chainIndex, openStates }
}

/**
 * Scores one candidate that has already cleared the hard filters, and records
 * exactly which stored fields produced each point of the score. Those reasons
 * are the only material the why-line is allowed to draw on.
 */
export function scoreCandidate(
  candidate: AskCandidate,
  schema: AskSchema,
  context: {
    centroid?: { lat: number; lng: number } | null
    chainIndex?: ChainIndex
    openState?: OpenState
    seed?: string
  } = {}
): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = []
  const fit = fitText(candidate)
  const address = normalizeText(candidate.address)
  const addReason = (reason: MatchReason) => {
    if (reason.weight !== 0) reasons.push(reason)
  }

  // Requested cuisine. Already guaranteed by the hard filter; scored so the
  // why-line can name it and so multi-cuisine matches edge ahead.
  const matchedCuisines = schema.cuisine_include.filter((label) =>
    cuisineTokens(label).some((token) => containsToken(fit, token))
  )
  if (matchedCuisines.length > 0) {
    addReason({
      kind: 'cuisine',
      detail: matchedCuisines.join(' + '),
      weight: Math.min(3, 2 + 0.5 * (matchedCuisines.length - 1)),
    })
  }

  // Budget. An explicit ceiling was already enforced; a vague tier stays soft
  // so a near miss is demoted rather than hidden.
  const ceiling = budgetCeiling(schema.budget)
  const tier = budgetTier(schema.budget)
  const target = budgetTargetPriceLevel(schema.budget)
  const priceSymbol = PRICE_TIER_SYMBOL[candidate.priceLevel]
  if (ceiling !== null) {
    addReason({ kind: 'budget_cap', detail: priceSymbol, weight: 2.5 })
  } else if (tier && target) {
    const distance = Math.abs(priceIndex(candidate.priceLevel) - priceIndex(target))
    if (distance === 0) {
      addReason({ kind: 'budget', detail: priceSymbol, weight: 3 })
    } else if (distance === 1) {
      addReason({ kind: 'budget', detail: priceSymbol, weight: 1 })
    } else {
      addReason({ kind: 'budget', detail: priceSymbol, weight: -1.25 * (distance - 1) })
    }
  }

  // Location. Exact ZIP beats measured proximity to that ZIP's listings.
  if (schema.zip) {
    if (candidate.zipCode === schema.zip) {
      addReason({ kind: 'zip', detail: schema.zip, weight: 3 })
    } else if (
      context.centroid &&
      typeof candidate.latitude === 'number' &&
      typeof candidate.longitude === 'number'
    ) {
      const miles = haversineMiles(
        context.centroid.lat,
        context.centroid.lng,
        candidate.latitude,
        candidate.longitude
      )
      const weight = Math.max(0, 2.2 * (1 - miles / 6))
      addReason({
        kind: 'nearby_zip',
        detail: miles.toFixed(1),
        evidence: schema.zip,
        weight,
      })
    }
  }

  if (schema.area) {
    const aliases = AREA_ALIASES[schema.area] || [schema.area.toLowerCase()]
    if (aliases.some((alias) => containsToken(address, alias))) {
      addReason({ kind: 'area', detail: schema.area, weight: 2.5 })
    } else if (aliases.some((alias) => containsToken(fit, alias))) {
      addReason({ kind: 'area', detail: schema.area, weight: 1 })
    }
  }

  // Vibe, matched against tags, features, categories and description.
  let vibeWeight = 0
  let pricedForVibe = false
  for (const label of schema.vibe) {
    const def = VIBES.find((vibe) => vibe.label === label)
    if (!def) continue

    const matchedToken = def.tokens.find((token) => containsToken(fit, token))
    if (matchedToken) {
      const weight = Math.min(2, 4 - vibeWeight)
      if (weight > 0) {
        addReason({ kind: 'vibe', detail: label, evidence: matchedToken, weight })
        vibeWeight += weight
      }
      continue
    }

    // Weaker corroboration: no tag names the vibe, but the price tier is in the
    // range the vibe usually sits in. Cited only as the stored tier, once.
    const candidateTier = ({ BUDGET: 'low', MODERATE: 'mid', UPSCALE: 'high', PREMIUM: 'high' } as const)[
      candidate.priceLevel
    ]
    if (!pricedForVibe && def.priceTiers && def.priceTiers.includes(candidateTier)) {
      pricedForVibe = true
      addReason({ kind: 'vibe_price', detail: priceSymbol, weight: 0.5 })
    }
  }

  if (schema.kids === true) {
    const kidToken = KID_TOKENS.find((token) => containsToken(fit, token))
    if (kidToken) {
      addReason({ kind: 'kids', detail: 'kids along', evidence: kidToken, weight: 2 })
    }
  }

  if (schema.party_size && schema.party_size >= 6) {
    const groupToken = GROUP_TOKENS.find((token) => containsToken(fit, token))
    if (groupToken) {
      addReason({
        kind: 'party_size',
        detail: String(schema.party_size),
        evidence: groupToken,
        weight: 1.5,
      })
    }
  }

  if (schema.open_now && context.openState === 'open') {
    addReason({ kind: 'open_now', detail: 'open now per listed hours', weight: 1 })
  }

  if (schema.exclude_chains) {
    addReason({ kind: 'no_chains', detail: 'clears your no-chains filter', weight: 0.75 })
  }

  if (schema.cuisine_exclude.length > 0) {
    addReason({
      kind: 'excluded_clear',
      detail: `nothing listed as ${schema.cuisine_exclude.join(' or ')}`,
      weight: 0.25,
    })
  }

  // Novelty shapes how much stored popularity counts. Ratings and review counts
  // come straight from the listing and are never used in the why-line copy.
  const rating = typeof candidate.rating === 'number' ? candidate.rating : null
  const novelty = schema.novelty || 'mixed'
  let noveltyWeight = 0
  if (novelty === 'familiar') {
    if (rating !== null) noveltyWeight += Math.max(0, Math.min(1.8, (rating - 3.5) * 1.2))
    if (candidate.featured) noveltyWeight += 0.4
  } else if (novelty === 'surprise') {
    if (candidate.featured) noveltyWeight -= 0.5
    noveltyWeight -= Math.min(0.8, candidate.reviewCount / 500)
    noveltyWeight += seededUnit(context.seed || 'ask', candidate.id) * 1.5
  } else {
    if (rating !== null) noveltyWeight += Math.max(0, Math.min(0.9, (rating - 3.5) * 0.6))
  }

  const score = reasons.reduce((sum, reason) => sum + reason.weight, 0) + vibeWeight + noveltyWeight

  return {
    score: Math.round(score * 1000) / 1000,
    reasons: reasons
      .filter((reason) => reason.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .map((reason) => ({ ...reason, weight: Math.round(reason.weight * 100) / 100 })),
  }
}

function normalizedName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Hard-filters, scores and orders the pool, then returns the top `limit`.
 *
 * Ordering is fully deterministic for a given pool, schema and seed, and two
 * listings sharing a name (the same brand at two addresses) never both appear.
 */
export function rankCandidates(
  candidates: AskCandidate[],
  schema: AskSchema,
  options: RankOptions = {},
  explicitChainFlags?: Map<string, boolean>
): RankResult {
  const limit = options.limit ?? DEFAULT_PICK_COUNT
  const { matched, removedBy, chainIndex, openStates } = applyHardFilters(
    candidates,
    schema,
    options,
    explicitChainFlags
  )

  const centroid = schema.zip ? zipCentroid(candidates, schema.zip) : null
  const now = options.now || new Date()

  const scored: RankedCandidate[] = matched
    .map((candidate) => {
      const openState = schema.open_now
        ? openStates.get(candidate.id) || isOpenAt(candidate.hours, now)
        : isOpenAt(candidate.hours, now)
      const { score, reasons } = scoreCandidate(candidate, schema, {
        centroid,
        chainIndex,
        openState,
        seed: options.seed,
      })
      return { candidate, score, reasons, openState }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const ratingDiff = (b.candidate.rating || 0) - (a.candidate.rating || 0)
      if (ratingDiff !== 0) return ratingDiff
      if (b.candidate.reviewCount !== a.candidate.reviewCount) {
        return b.candidate.reviewCount - a.candidate.reviewCount
      }
      return a.candidate.slug.localeCompare(b.candidate.slug)
    })

  const seenNames = new Set<string>()
  const ranked: RankedCandidate[] = []
  for (const entry of scored) {
    const key = normalizedName(entry.candidate.name)
    if (seenNames.has(key)) continue
    seenNames.add(key)
    ranked.push(entry)
    if (ranked.length >= limit) break
  }

  return { ranked, scored, removedBy, chainIndex }
}
