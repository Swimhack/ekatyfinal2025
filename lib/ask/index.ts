// Ask eKaty — request orchestration.
//
// `runAsk` is deliberately database-free: it takes a pool of candidates that
// already came out of our inventory and turns them into exactly three picks (or
// an honest shortfall). Keeping it pure is what lets the ranking rules be unit
// tested without a database, and it makes it structurally impossible for this
// layer to conjure a restaurant that is not in the pool it was handed.

import { parseAskQuery } from './parse'
import { DEFAULT_PICK_COUNT, rankCandidates, type RankOptions } from './rank'
import {
  PRICE_TIER_SYMBOL,
  type AskCandidate,
  type AskPick,
  type AskResult,
  type AskSchema,
  type AskShortfall,
  type AskSource,
} from './types'

export * from './types'
export { parseAskQuery, budgetCeiling, budgetMaxPriceLevel, budgetTier, normalizeQuery } from './parse'
export {
  rankCandidates,
  applyHardFilters,
  scoreCandidate,
  suppressesChainsForSurprise,
  zipCentroid,
  DEFAULT_PICK_COUNT,
} from './rank'
export { buildChainIndex, findBrandMentions, isChain } from './chains'
export { isOpenAt, katyLocalNow } from './hours'
export { buildWhyLine } from './why'

import { buildWhyLine } from './why'

/** Human labels for the hard filters, used in shortfall copy. */
const FILTER_LABELS: Record<string, string> = {
  cuisine_include: 'the cuisine you asked for',
  cuisine_exclude: 'the cuisines you ruled out',
  exclude_chains: 'no chains',
  surprise_chains: 'skipping the multi-location brands for a surprise',
  budget_ceiling: 'your price ceiling',
  open_now: 'open right now',
}

export interface RunAskOptions extends RankOptions {
  source?: AskSource
  /** Pre-parsed schema, e.g. from chip selections instead of free text. */
  schema?: AskSchema
  /** `metadata.isChain` overrides, keyed by candidate id. */
  explicitChainFlags?: Map<string, boolean>
}

/** Deep link to the existing listing route. */
export function listingUrl(candidate: Pick<AskCandidate, 'slug' | 'id'>): string {
  return `/restaurants/${candidate.slug || candidate.id}`
}

/**
 * Cuisine label to seed the spinner with, taken from the listing's own
 * `categories` / `cuisine_types` so the seeded filter is guaranteed to match at
 * least this restaurant.
 */
export function primaryCuisine(candidate: AskCandidate): string | null {
  const fromCategories = candidate.categories.find((value) => value.trim().length > 0)
  if (fromCategories) return fromCategories.trim()
  const fromCuisines = candidate.cuisineTypes.find((value) => value.trim().length > 0)
  return fromCuisines ? fromCuisines.trim() : null
}

/** Spinner URL seeded with a cuisine, or null when we have no cuisine to seed. */
export function buildSpinSimilarUrl(cuisine: string | null, source: AskSource = 'ask'): string | null {
  if (!cuisine) return null
  return `/spinner?cuisine=${encodeURIComponent(cuisine)}&source=${source}`
}

function buildShortfall(
  requested: number,
  returned: number,
  removedBy: Record<string, number>,
  inventoryConsidered: number
): AskShortfall {
  const limiting_filters = Object.entries(removedBy)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => FILTER_LABELS[key] || key)

  const filterText =
    limiting_filters.length > 0 ? ` The tightest constraints were ${limiting_filters.join(', ')}.` : ''

  const message =
    returned === 0
      ? inventoryConsidered === 0
        ? 'We have no active Katy listings matching that request in our directory yet.'
        : `Nothing in our Katy directory clears that ask, so we would rather show you nothing than pad the list.${filterText}`
      : `Only ${returned} listing${returned === 1 ? '' : 's'} in our Katy directory clears that ask, so we are showing ${returned} instead of ${requested} rather than padding the list.${filterText}`

  return { requested, returned, message, limiting_filters }
}

/**
 * Parses the request, ranks the supplied inventory and returns the picks.
 *
 * Always returns at most `limit` picks and never more than the pool supports.
 * When fewer than `limit` candidates clear the hard filters, `shortfall`
 * explains which constraints did the cutting.
 */
export function runAsk(
  query: string,
  candidates: AskCandidate[],
  options: RunAskOptions = {}
): AskResult {
  const limit = options.limit ?? DEFAULT_PICK_COUNT
  const source = options.source || 'ask'
  const schema = options.schema || parseAskQuery(query)

  const { ranked, removedBy } = rankCandidates(
    candidates,
    schema,
    {
      now: options.now,
      seed: options.seed ?? query,
      limit,
    },
    options.explicitChainFlags
  )

  const picks: AskPick[] = ranked.map((entry) => {
    const { candidate } = entry
    const cuisine = primaryCuisine(candidate)
    return {
      id: candidate.id,
      name: candidate.name,
      slug: candidate.slug,
      url: listingUrl(candidate),
      why: buildWhyLine(candidate, entry.reasons, schema),
      reasons: entry.reasons,
      score: entry.score,
      priceLevel: candidate.priceLevel,
      priceTier: PRICE_TIER_SYMBOL[candidate.priceLevel],
      cuisineTypes: candidate.cuisineTypes,
      categories: candidate.categories,
      address: candidate.address,
      zipCode: candidate.zipCode,
      rating: candidate.rating,
      reviewCount: candidate.reviewCount,
      spin_similar_url: buildSpinSimilarUrl(cuisine, source),
    }
  })

  const seedCuisine =
    schema.cuisine_include[0] || (ranked.length > 0 ? primaryCuisine(ranked[0].candidate) : null)

  return {
    query,
    schema,
    picks,
    spin_similar_url: buildSpinSimilarUrl(seedCuisine, source),
    shortfall:
      picks.length < limit
        ? buildShortfall(limit, picks.length, removedBy, candidates.length)
        : null,
    meta: {
      inventory_considered: candidates.length,
      candidates_matched: candidates.length - Object.values(removedBy).reduce((a, b) => a + b, 0),
      source,
    },
  }
}
