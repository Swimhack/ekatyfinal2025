/**
 * Mood presets for Grub Roulette.
 *
 * Moods are deliberately built out of data that already exists on the Restaurant
 * row: the comma separated `categories` and `cuisineTypes` strings, the `name`,
 * and `priceLevel`. Each mood is a bag of search terms that get matched with a
 * case-insensitive `contains` against those columns, so no new DB fields or
 * taxonomies are required and the presets keep working as the directory grows.
 */

export type MoodId = 'kids' | 'date-night' | 'cheap-eats' | 'spicy' | 'near-me' | 'surprise'

export interface Mood {
  id: MoodId
  label: string
  emoji: string
  /** Short line shown while this mood is active. */
  tagline: string
  /** Terms matched against categories / cuisineTypes / name. */
  terms: string[]
  /** Restricts the pool to these price levels when set. */
  priceLevels?: string[]
  /** Needs browser geolocation before it can be applied. */
  requiresGeo?: boolean
  /** Clears every other filter instead of narrowing the pool. */
  clearsFilters?: boolean
}

export const MOODS: Mood[] = [
  {
    id: 'kids',
    label: 'Kids in tow',
    emoji: '🧒',
    tagline: 'Loud, forgiving, and fast enough for a five-year-old.',
    terms: [
      'family', 'kid', 'casual', 'burger', 'pizza', 'american', 'mexican',
      'tex-mex', 'taco', 'breakfast', 'diner', 'bakery', 'ice cream', 'sandwich',
    ],
    priceLevels: ['BUDGET', 'MODERATE'],
  },
  {
    id: 'date-night',
    label: 'Date night',
    emoji: '🕯️',
    tagline: 'Dim lights, real napkins, somewhere worth dressing up for.',
    terms: [
      'date-night', 'romantic', 'upscale', 'fine', 'steak', 'italian', 'french',
      'wine', 'cocktail', 'sushi', 'japanese', 'seafood', 'special-occasion', 'bar',
    ],
    priceLevels: ['UPSCALE', 'PREMIUM'],
  },
  {
    id: 'cheap-eats',
    label: 'Cheap eats',
    emoji: '💸',
    tagline: 'Big flavour, small tab.',
    terms: [
      'affordable', 'casual', 'quick', 'taco', 'truck', 'deli', 'sandwich',
      'bakery', 'cafe', 'noodle', 'pho', 'bbq', 'burger', 'takeout',
    ],
    priceLevels: ['BUDGET'],
  },
  {
    id: 'spicy',
    label: 'Bring the heat',
    emoji: '🌶️',
    tagline: 'You asked for it. Order a milk chaser.',
    terms: [
      'spicy', 'thai', 'indian', 'curry', 'szechuan', 'sichuan', 'korean',
      'cajun', 'crawfish', 'wing', 'ramen', 'pho', 'vietnamese', 'mexican',
      'tex-mex', 'salsa', 'peri',
    ],
  },
  {
    id: 'near-me',
    label: 'Near me',
    emoji: '📍',
    tagline: 'Whatever is closest to where you are standing.',
    terms: [],
    requiresGeo: true,
  },
  {
    id: 'surprise',
    label: 'Surprise me',
    emoji: '🎲',
    tagline: 'No filters, no excuses. The whole directory is in play.',
    terms: [],
    clearsFilters: true,
  },
]

export const MOODS_BY_ID: Record<MoodId, Mood> = MOODS.reduce((acc, mood) => {
  acc[mood.id] = mood
  return acc
}, {} as Record<MoodId, Mood>)

export const PRICE_LEVELS = [
  { value: 'BUDGET', label: '$', description: 'Cheap' },
  { value: 'MODERATE', label: '$$', description: 'Everyday' },
  { value: 'UPSCALE', label: '$$$', description: 'Treat' },
  { value: 'PREMIUM', label: '$$$$', description: 'Big night' },
]

export const PRICE_SYMBOLS: Record<string, string> = {
  BUDGET: '$',
  MODERATE: '$$',
  UPSCALE: '$$$',
  PREMIUM: '$$$$',
}

export function priceSymbol(priceLevel?: string | number | null): string {
  if (typeof priceLevel === 'number') return '$'.repeat(Math.max(1, Math.min(4, priceLevel)))
  if (!priceLevel) return ''
  return PRICE_SYMBOLS[priceLevel] || ''
}

/** Terms contributed by a set of active moods, de-duplicated. */
export function termsForMoods(moodIds: MoodId[]): string[] {
  const terms = new Set<string>()
  moodIds.forEach(id => MOODS_BY_ID[id]?.terms.forEach(term => terms.add(term)))
  return Array.from(terms)
}

/**
 * Price levels allowed by the active moods. Moods intersect: picking two moods
 * that disagree on price (cheap eats + date night) would leave an empty pool, so
 * we fall back to the union in that case rather than returning nothing.
 */
export function priceLevelsForMoods(moodIds: MoodId[]): string[] {
  const constrained = moodIds
    .map(id => MOODS_BY_ID[id]?.priceLevels)
    .filter((levels): levels is string[] => Array.isArray(levels) && levels.length > 0)

  if (constrained.length === 0) return []

  const intersection = constrained.reduce((acc, levels) => acc.filter(level => levels.includes(level)))
  if (intersection.length > 0) return intersection

  return Array.from(new Set(constrained.flat()))
}
