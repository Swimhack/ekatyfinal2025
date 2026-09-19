/**
 * "Spin Similar" seeding for Grub Roulette.
 *
 * A listing's "Spin Similar" button has to arrive at /spinner with the wheel
 * already narrowed to the same kind of food. That means translating whatever the
 * directory happens to store on a row into the eight cuisine chips the spinner
 * shows.
 *
 * The data is messy on purpose: Google-sourced rows keep "Food,Restaurant" in
 * `categories` and the real cuisine in `cuisineTypes` ("mexican_restaurant"),
 * seeded rows do the opposite, and hand-entered rows use loose tags like
 * "tacos" or "smokehouse". The alias table below is what bridges those shapes
 * onto the chip list without adding new columns or a taxonomy table.
 */

export const SPINNER_CUISINES = [
  'Mexican',
  'BBQ',
  'Asian',
  'American',
  'Seafood',
  'Indian',
  'Italian',
  'Breakfast',
] as const

export type SpinnerCuisine = (typeof SPINNER_CUISINES)[number]

/**
 * Extra words that mean the same food as a chip. Kept deliberately food-specific
 * — vibe words like "casual" belong to the mood chips, not to cuisine.
 */
const CUISINE_ALIASES: Record<SpinnerCuisine, string[]> = {
  Mexican: [
    'tex mex', 'texmex', 'taco', 'taqueria', 'taquería', 'burrito', 'quesadilla',
    'enchilada', 'fajita', 'tortilla', 'cantina', 'salsa', 'queso', 'latin',
    'tamale', 'birria', 'elote',
  ],
  BBQ: [
    'bbq', 'b b q', 'barbecue', 'barbeque', 'smokehouse', 'smoke house', 'smoked',
    'brisket', 'rib', 'pitmaster', 'pit bbq', 'texas bbq',
  ],
  Asian: [
    'chinese', 'japanese', 'sushi', 'thai', 'vietnamese', 'pho', 'banh mi',
    'korean', 'ramen', 'noodle', 'dumpling', 'dim sum', 'hibachi', 'teriyaki',
    'boba', 'bubble tea', 'poke', 'wok', 'szechuan', 'sichuan', 'filipino',
    'malaysian', 'indonesian', 'hot pot',
  ],
  American: [
    'burger', 'cheeseburger', 'sandwich', 'sub', 'deli', 'diner', 'steak',
    'steakhouse', 'wing', 'hot dog', 'fried chicken', 'chicken tender', 'southern',
    'comfort food', 'soul food', 'cajun', 'creole', 'pub food', 'grill house',
  ],
  Seafood: [
    'fish', 'shrimp', 'crawfish', 'crab', 'oyster', 'lobster', 'catfish',
    'seafood boil', 'fish fry', 'ceviche', 'poboy', 'po boy',
  ],
  Indian: [
    'curry', 'tandoori', 'biryani', 'masala', 'naan', 'desi', 'pakistani',
    'nepali', 'south indian', 'dosa', 'chaat',
  ],
  Italian: [
    'pizza', 'pizzeria', 'pasta', 'spaghetti', 'lasagna', 'calzone', 'trattoria',
    'ristorante', 'sicilian', 'neapolitan',
  ],
  Breakfast: [
    'brunch', 'bakery', 'cafe', 'café', 'coffee', 'espresso', 'donut', 'doughnut',
    'bagel', 'pancake', 'waffle', 'kolache', 'creperie', 'crepe', 'patisserie',
    'biscuit', 'omelette',
  ],
}

/**
 * Directory noise and vibe adjectives. These never identify a cuisine, so they
 * are dropped before we fall back to free-text matching.
 */
const NON_CUISINE_LABELS = new Set([
  'food', 'foods', 'restaurant', 'restaurants', 'dining', 'diner food', 'eatery',
  'establishment', 'point of interest', 'business', 'local business', 'store',
  'meal takeaway', 'meal delivery', 'takeout', 'takeaway', 'delivery', 'catering',
  'casual', 'quick', 'fast', 'creative', 'trendy', 'popular', 'local', 'new',
  'best', 'top', 'favorite', 'affordable', 'cheap', 'expensive', 'upscale',
  'fine dining', 'family', 'family friendly', 'kid friendly', 'place', 'other',
])

/** Loose input: rows arrive as arrays from the API and as CSV strings from Prisma. */
export interface SimilarSource {
  id?: string | null
  name?: string | null
  categories?: string[] | string | null
  cuisineTypes?: string[] | string | null
  primaryCategory?: string | null
  cuisine?: string | null
}

export interface SimilarSeed {
  /** Spinner chips to pre-select. */
  cuisines: SpinnerCuisine[]
  /** Free-text fallback used when nothing maps onto a chip. */
  terms: string[]
  /** Human-readable summary for the "spinning similar to…" banner. */
  label: string
}

export function toLabelList(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(part => part.trim()).filter(Boolean)
  return []
}

/** "mexican_restaurant" / "Tex-Mex" -> "mexican restaurant" / "tex mex". */
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9À-ÿ]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Whole-word match so "pit" never matches "pita" and "taco" still matches "tacos". */
function labelContainsTerm(normalizedLabel: string, term: string): boolean {
  const normalizedTerm = normalizeLabel(term)
  if (!normalizedTerm) return false
  return new RegExp(`\\b${escapeRegExp(normalizedTerm)}(?:s|es)?\\b`).test(normalizedLabel)
}

function termsForCuisine(cuisine: SpinnerCuisine): string[] {
  return [cuisine.toLowerCase(), ...CUISINE_ALIASES[cuisine]]
}

/** Every search term a selected chip should match in the database. */
export function expandCuisineTerms(cuisines: string[]): string[] {
  const expanded = new Set<string>()

  for (const raw of cuisines) {
    const chip = SPINNER_CUISINES.find(cuisine => cuisine.toLowerCase() === raw.trim().toLowerCase())
    if (chip) {
      termsForCuisine(chip).forEach(term => expanded.add(term))
      continue
    }
    // Unknown chip (a hand-written URL, say): still search for it verbatim.
    const fallback = raw.trim()
    if (fallback) expanded.add(fallback.toLowerCase())
  }

  return Array.from(expanded)
}

/**
 * Maps raw labels onto spinner chips, keeping the order the labels arrived in so
 * a row's primary category wins over its trailing tags.
 */
export function matchCuisineChips(labels: string[], limit = 2): SpinnerCuisine[] {
  const matched: SpinnerCuisine[] = []

  for (const label of labels) {
    const normalized = normalizeLabel(label)
    if (!normalized) continue

    for (const cuisine of SPINNER_CUISINES) {
      if (matched.includes(cuisine)) continue
      if (termsForCuisine(cuisine).some(term => labelContainsTerm(normalized, term))) {
        matched.push(cuisine)
        if (matched.length >= limit) return matched
      }
    }
  }

  return matched
}

/** Drops directory noise so the free-text fallback still means something. */
export function meaningfulLabels(labels: string[]): string[] {
  const seen = new Set<string>()
  const kept: string[] = []

  for (const label of labels) {
    const normalized = normalizeLabel(label)
    if (!normalized || NON_CUISINE_LABELS.has(normalized)) continue

    // "mexican restaurant" -> "mexican"; the suffix adds nothing to a search.
    const trimmed = normalized.replace(/\s+(restaurant|food|place|store|cuisine)$/, '')
    const key = trimmed || normalized
    if (seen.has(key) || NON_CUISINE_LABELS.has(key)) continue

    seen.add(key)
    kept.push(key)
  }

  return kept
}

function sourceLabels(source: SimilarSource): { categories: string[]; cuisines: string[] } {
  const categories = [
    ...(source.primaryCategory ? [source.primaryCategory] : []),
    ...toLabelList(source.categories),
  ]
  const cuisines = [
    ...(source.cuisine ? [source.cuisine] : []),
    ...toLabelList(source.cuisineTypes),
  ]

  return { categories, cuisines }
}

/**
 * Works out what "similar to this listing" should mean.
 *
 * Categories are tried first because that is where a curated cuisine usually
 * lives; `cuisineTypes` is the fallback for Google-shaped rows. When nothing
 * maps onto a chip we keep the most food-like labels as free-text terms so the
 * wheel is still narrowed rather than silently drawing from the whole directory.
 */
export function deriveSimilarSeed(source: SimilarSource): SimilarSeed {
  const { categories, cuisines } = sourceLabels(source)

  const fromCategories = matchCuisineChips(categories)
  const chips = fromCategories.length > 0 ? fromCategories : matchCuisineChips(cuisines)

  if (chips.length > 0) {
    return { cuisines: chips, terms: [], label: chips.join(' · ') }
  }

  const terms = meaningfulLabels([...categories, ...cuisines]).slice(0, 2)

  return {
    cuisines: [],
    terms,
    label: terms.join(' · '),
  }
}

/**
 * The href behind a listing's "Spin Similar" button.
 *
 * `category` seeds the chips, `type` carries the free-text fallback, and
 * `restaurant` lets the spinner drop the referring venue from the wheel. The id
 * is always included so legacy links keep working either way.
 */
export function buildSpinSimilarHref(source: SimilarSource): string {
  const seed = deriveSimilarSeed(source)
  const params = new URLSearchParams()

  if (seed.cuisines.length > 0) params.set('category', seed.cuisines.join(','))
  else if (seed.terms.length > 0) params.set('type', seed.terms.join(','))

  if (source.id) params.set('restaurant', String(source.id))

  const query = params.toString()
  return query ? `/spinner?${query}` : '/spinner'
}

/** Client-side equivalent of the API's cuisine filter, used in favourites mode. */
export function matchesCuisines(source: SimilarSource, cuisines: string[]): boolean {
  if (cuisines.length === 0) return true

  const haystack = normalizeLabel(
    [source.name || '', ...toLabelList(source.categories), ...toLabelList(source.cuisineTypes)].join(' ')
  )

  return expandCuisineTerms(cuisines).some(term => labelContainsTerm(haystack, term))
}

/** Client-side equivalent of the API's free-text filter. */
export function matchesTerms(source: SimilarSource, terms: string[]): boolean {
  if (terms.length === 0) return true

  const haystack = normalizeLabel(
    [source.name || '', ...toLabelList(source.categories), ...toLabelList(source.cuisineTypes)].join(' ')
  )

  return terms.some(term => labelContainsTerm(haystack, term))
}
