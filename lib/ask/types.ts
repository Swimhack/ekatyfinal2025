// Ask eKaty — shared types for the natural-language dining concierge.
//
// Everything here describes either (a) what the diner asked for, or (b) what we
// found in the existing eKaty restaurant inventory. Nothing in this pipeline is
// allowed to originate a restaurant, rating, menu, hour or price: candidates
// come from the database and reasons are derived from fields that actually
// matched.

export type BudgetTier = 'low' | 'mid' | 'high'

/** `low | mid | high` for vague budgets, `under_<dollars>` for explicit ceilings. */
export type Budget = BudgetTier | `under_${number}`

export type Novelty = 'familiar' | 'mixed' | 'surprise'

/** Structured form of a free-text dining request. */
export interface AskSchema {
  party_size?: number
  kids?: boolean
  budget?: Budget
  /** Canonical cuisine labels the diner wants. Hard requirement when present. */
  cuisine_include: string[]
  /** Canonical cuisine labels the diner ruled out. Always a hard filter. */
  cuisine_exclude: string[]
  /** "no chains" / "local only". Hard filter against the chain classifier. */
  exclude_chains: boolean
  /** Named Katy area matched against listing addresses, e.g. "Cinco Ranch". */
  area?: string
  /** 5-digit ZIP mentioned in the request. */
  zip?: string
  /** Canonical vibe labels, e.g. "date night", "patio". Soft scoring only. */
  vibe: string[]
  open_now?: boolean
  novelty?: Novelty
}

/** Price tiers as stored on `Restaurant.priceLevel`. */
export type PriceLevel = 'BUDGET' | 'MODERATE' | 'UPSCALE' | 'PREMIUM'

/**
 * A restaurant from our own inventory, normalized for ranking. Every field is
 * copied from the database row — none of it is synthesized.
 */
export interface AskCandidate {
  id: string
  name: string
  slug: string
  description: string | null
  address: string
  zipCode: string
  latitude: number | null
  longitude: number | null
  priceLevel: PriceLevel
  /** Split from the comma-separated `categories` column. */
  categories: string[]
  /** Split from the comma-separated `cuisine_types` column. */
  cuisineTypes: string[]
  /** From `metadata.tags` when present. */
  tags: string[]
  /** From `metadata.features` when present. */
  features: string[]
  rating: number | null
  reviewCount: number
  featured: boolean
  /** Raw `hours` JSON string, parsed lazily by lib/ask/hours.ts. */
  hours: string | null
}

export type MatchReasonKind =
  | 'cuisine'
  | 'budget'
  | 'budget_cap'
  | 'zip'
  | 'nearby_zip'
  | 'area'
  | 'vibe'
  | 'vibe_price'
  | 'kids'
  | 'party_size'
  | 'open_now'
  | 'no_chains'
  | 'excluded_clear'

/**
 * Why a candidate scored.
 *
 * `detail` and `evidence` are the only material a why-line may draw on, and
 * both must restate something the listing actually contains — `evidence` is the
 * literal stored token that matched, so a reader can go verify it.
 */
export interface MatchReason {
  kind: MatchReasonKind
  detail: string
  weight: number
  evidence?: string
}

/** One of the three picks returned to the diner. */
export interface AskPick {
  id: string
  name: string
  slug: string
  /** Deep link into the existing listing route. */
  url: string
  /** Constraint-tied one-liner built from `reasons`. Never social proof. */
  why: string
  reasons: MatchReason[]
  score: number
  priceLevel: PriceLevel
  /** `$`–`$$$$`, derived from `priceLevel`. */
  priceTier: string
  cuisineTypes: string[]
  categories: string[]
  address: string
  zipCode: string
  /** Straight from the DB; null when we have no rating on file. */
  rating: number | null
  reviewCount: number
  /** Seeds the existing spinner with this pick's cuisine. */
  spin_similar_url: string | null
}

/** Honest accounting when we could not produce three picks. */
export interface AskShortfall {
  /** How many picks we were asked for versus how many we could stand behind. */
  requested: number
  returned: number
  /** Human-readable explanation for the empty/partial state. */
  message: string
  /** Which hard filters removed the most candidates, most restrictive first. */
  limiting_filters: string[]
}

export interface AskResult {
  query: string
  schema: AskSchema
  picks: AskPick[]
  /** Spinner URL seeded from the request's cuisine, when we know one. */
  spin_similar_url: string | null
  shortfall: AskShortfall | null
  meta: {
    /** Rows pulled from inventory before hard filtering. */
    inventory_considered: number
    /** Rows surviving every hard filter. */
    candidates_matched: number
    source: AskSource
  }
}

export type AskSource = 'home' | 'ask' | 'spinner' | 'api'

export const PRICE_LEVEL_ORDER: PriceLevel[] = ['BUDGET', 'MODERATE', 'UPSCALE', 'PREMIUM']

export const PRICE_TIER_SYMBOL: Record<PriceLevel, string> = {
  BUDGET: '$',
  MODERATE: '$$',
  UPSCALE: '$$$',
  PREMIUM: '$$$$',
}
