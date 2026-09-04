/**
 * Turns a raw search box string into structured intent.
 *
 * The directory stores cuisine as free-text comma lists ("Mexican", "Taqueria",
 * "Taco", "Tex-Mex" are four separate tags for what a human calls one thing), and
 * location only as address/zip/lat-lng. A single substring match over the raw
 * string therefore fails on anything but a one-word cuisine — "mexican 77493"
 * matched no field and returned nothing. This splits the query into the parts the
 * data can actually answer: cuisine tags, a location, a price band, and leftover
 * free text.
 */

export type PriceLevel = 'BUDGET' | 'MODERATE' | 'UPSCALE' | 'PREMIUM'

export interface ParsedQuery {
  raw: string
  /** Cuisine/category tags to match, already expanded to the DB's vocabulary. */
  cuisines: string[]
  /** 5-digit ZIPs mentioned in the query. */
  zips: string[]
  /** Leftover tokens that must all match somewhere (name, description, tags). */
  terms: string[]
  priceLevel?: PriceLevel
  openNow: boolean
  /** Human-readable chips describing how the query was understood. */
  labels: string[]
}

/**
 * Dish and alias -> the cuisine tags that actually exist in the restaurant rows.
 * Keys are matched against single tokens and against 2-3 word phrases.
 */
const CUISINE_SYNONYMS: Record<string, string[]> = {
  // Mexican family — the tags are fragmented, so every alias fans out to all of them
  mexican: ['Mexican', 'Taqueria', 'Taco', 'Tex-Mex'],
  taco: ['Taco', 'Taqueria', 'Mexican'],
  tacos: ['Taco', 'Taqueria', 'Mexican'],
  taqueria: ['Taqueria', 'Mexican', 'Taco'],
  burrito: ['Mexican', 'Taqueria', 'Taco'],
  burritos: ['Mexican', 'Taqueria', 'Taco'],
  fajitas: ['Mexican', 'Tex-Mex'],
  enchiladas: ['Mexican', 'Tex-Mex'],
  queso: ['Mexican', 'Tex-Mex'],
  nachos: ['Mexican', 'Tex-Mex'],
  salsa: ['Mexican', 'Tex-Mex'],
  'tex mex': ['Tex-Mex', 'Mexican'],
  texmex: ['Tex-Mex', 'Mexican'],
  latin: ['Mexican', 'Latin', 'Tex-Mex'],

  // Asian
  sushi: ['Sushi', 'Japanese'],
  japanese: ['Japanese', 'Sushi', 'Noodle'],
  ramen: ['Noodle', 'Japanese', 'Asian'],
  noodles: ['Noodle', 'Asian'],
  pho: ['Pho', 'Vietnamese', 'Noodle'],
  vietnamese: ['Vietnamese', 'Pho', 'Noodle'],
  'banh mi': ['Vietnamese', 'Sandwich'],
  chinese: ['Chinese', 'Asian'],
  'dim sum': ['Chinese', 'Asian'],
  thai: ['Thai', 'Asian'],
  'pad thai': ['Thai', 'Noodle'],
  korean: ['Korean', 'Asian'],
  kbbq: ['Korean', 'BBQ'],
  asian: ['Asian', 'Chinese', 'Japanese', 'Thai', 'Vietnamese', 'Korean'],
  boba: ['Tea', 'Smoothie'],
  'bubble tea': ['Tea', 'Smoothie'],

  // Indian / Mediterranean
  indian: ['Indian'],
  curry: ['Indian', 'Thai'],
  tikka: ['Indian'],
  naan: ['Indian'],
  biryani: ['Indian'],
  mediterranean: ['Mediterranean', 'Greek'],
  greek: ['Greek', 'Mediterranean'],
  gyro: ['Greek', 'Mediterranean'],
  falafel: ['Mediterranean', 'Greek'],
  shawarma: ['Mediterranean'],
  halal: ['Halal', 'Mediterranean', 'Indian'],

  // American
  bbq: ['BBQ', 'Southern'],
  barbecue: ['BBQ', 'Southern'],
  barbeque: ['BBQ', 'Southern'],
  brisket: ['BBQ'],
  ribs: ['BBQ'],
  smokehouse: ['BBQ'],
  burger: ['Burger', 'American'],
  burgers: ['Burger', 'American'],
  wings: ['Wings', 'Chicken'],
  chicken: ['Chicken', 'Wings'],
  'fried chicken': ['Chicken'],
  steak: ['Steakhouse', 'American'],
  steakhouse: ['Steakhouse', 'American'],
  american: ['American', 'Burger', 'Bar & Grill'],
  southern: ['Southern', 'BBQ'],
  cajun: ['Cajun', 'Seafood'],
  pizza: ['Pizza', 'Italian'],
  italian: ['Italian', 'Pizza'],
  pasta: ['Italian'],
  sandwich: ['Sandwich', 'Deli'],
  sandwiches: ['Sandwich', 'Deli'],
  sub: ['Sandwich', 'Deli'],
  subs: ['Sandwich', 'Deli'],
  deli: ['Deli', 'Sandwich'],
  seafood: ['Seafood', 'Cajun'],
  shrimp: ['Seafood', 'Cajun'],
  crab: ['Seafood', 'Cajun'],
  oysters: ['Seafood'],
  sportsbar: ['Bar & Grill', 'Bar'],
  'bar and grill': ['Bar & Grill', 'Bar'],
  'sports bar': ['Bar & Grill', 'Bar'],

  // Dayparts / sweets / drinks
  breakfast: ['Breakfast', 'Cafe', 'Bakery'],
  brunch: ['Breakfast', 'Cafe'],
  pancakes: ['Breakfast'],
  coffee: ['Coffee', 'Cafe', 'Tea'],
  espresso: ['Coffee', 'Cafe'],
  latte: ['Coffee', 'Cafe'],
  cafe: ['Cafe', 'Coffee'],
  bakery: ['Bakery', 'Dessert'],
  pastry: ['Bakery', 'Dessert'],
  donut: ['Donut', 'Bakery'],
  donuts: ['Donut', 'Bakery'],
  dessert: ['Dessert', 'Bakery', 'Ice Cream'],
  'ice cream': ['Ice Cream', 'Dessert'],
  smoothie: ['Smoothie', 'Healthy'],
  healthy: ['Healthy'],
  salad: ['Healthy'],
  vegan: ['Vegan', 'Vegetarian'],
  vegetarian: ['Vegetarian', 'Vegan'],
}

/** Words that carry no matchable signal for this directory. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'of', 'for', 'and', 'or', 'with',
  'near', 'nearby', 'around', 'close', 'closest', 'by', 'me', 'my', 'some',
  'any', 'show', 'find', 'get', 'want', 'looking', 'look', 'need',
  'restaurant', 'restaurants', 'food', 'foods', 'place', 'places', 'spot',
  'spots', 'eat', 'eats', 'eating', 'dining', 'dine', 'takeout', 'delivery',
  // every row is Katy, TX — these narrow nothing
  'katy', 'tx', 'texas', 'usa',
])

/** Ranking adjectives: they shape sort order, not the filter. */
const QUALITY_WORDS = new Set(['best', 'top', 'good', 'great', 'popular', 'favorite', 'rated'])

const PRICE_WORDS: Record<string, PriceLevel> = {
  cheap: 'BUDGET', cheapest: 'BUDGET', budget: 'BUDGET', affordable: 'BUDGET',
  inexpensive: 'BUDGET', value: 'BUDGET',
  moderate: 'MODERATE', midrange: 'MODERATE',
  upscale: 'UPSCALE', fancy: 'UPSCALE', nice: 'UPSCALE', 'fine dining': 'UPSCALE',
  'date night': 'UPSCALE', classy: 'UPSCALE',
  expensive: 'PREMIUM', luxury: 'PREMIUM', 'high end': 'PREMIUM',
}

/** Approximate centroids for Katy-area ZIPs, used when the data can't supply one. */
export const ZIP_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  '77493': { lat: 29.8283, lng: -95.8244 },
  '77494': { lat: 29.7433, lng: -95.8300 },
  '77449': { lat: 29.8319, lng: -95.7361 },
  '77450': { lat: 29.7594, lng: -95.7461 },
  '77094': { lat: 29.7719, lng: -95.6819 },
  '77084': { lat: 29.8394, lng: -95.6564 },
  '77095': { lat: 29.8878, lng: -95.6539 },
  '77433': { lat: 29.9058, lng: -95.7147 },
  '77441': { lat: 29.6936, lng: -95.8783 },
  '77406': { lat: 29.6486, lng: -95.7594 },
  '77469': { lat: 29.5522, lng: -95.7344 },
  '77407': { lat: 29.6664, lng: -95.7008 },
}

const MULTIWORD_KEYS = [...Object.keys(CUISINE_SYNONYMS), ...Object.keys(PRICE_WORDS)]
  .filter((k) => k.includes(' '))
  .sort((a, b) => b.length - a.length)

export function parseSearchQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {
    raw: raw.trim(),
    cuisines: [],
    zips: [],
    terms: [],
    openNow: false,
    labels: [],
  }
  if (!result.raw) return result

  let working = ` ${result.raw.toLowerCase().replace(/[^a-z0-9\s&'-]/g, ' ').replace(/\s+/g, ' ')} `

  // "open now" is a phrase, not two tokens
  if (/\bopen (now|today|late)\b/.test(working)) {
    result.openNow = true
    working = working.replace(/\bopen (now|today|late)\b/g, ' ')
  }

  // Consume multi-word aliases first so "tex mex" doesn't degrade into "tex" + "mex"
  for (const key of MULTIWORD_KEYS) {
    if (working.includes(` ${key} `)) {
      if (CUISINE_SYNONYMS[key]) result.cuisines.push(...CUISINE_SYNONYMS[key])
      if (PRICE_WORDS[key]) result.priceLevel = result.priceLevel ?? PRICE_WORDS[key]
      working = working.replace(new RegExp(`\\s${key}\\s`, 'g'), ' ')
    }
  }

  for (const token of working.trim().split(' ').filter(Boolean)) {
    if (/^\d{5}$/.test(token)) {
      result.zips.push(token)
      continue
    }
    // "77494-1234" style ZIP+4
    if (/^\d{5}-\d{4}$/.test(token)) {
      result.zips.push(token.slice(0, 5))
      continue
    }
    if (PRICE_WORDS[token]) {
      result.priceLevel = result.priceLevel ?? PRICE_WORDS[token]
      continue
    }
    if (CUISINE_SYNONYMS[token]) {
      result.cuisines.push(...CUISINE_SYNONYMS[token])
      continue
    }
    // Singular/plural tolerance: "burgers" -> "burger"
    const singular = token.replace(/s$/, '')
    if (CUISINE_SYNONYMS[singular]) {
      result.cuisines.push(...CUISINE_SYNONYMS[singular])
      continue
    }
    if (QUALITY_WORDS.has(token) || STOPWORDS.has(token)) continue
    if (token.length < 2) continue
    result.terms.push(token)
  }

  result.cuisines = Array.from(new Set(result.cuisines))
  result.zips = Array.from(new Set(result.zips))

  if (result.cuisines.length) result.labels.push(result.cuisines[0])
  if (result.priceLevel) result.labels.push(result.priceLevel.toLowerCase())
  if (result.zips.length) result.labels.push(`near ${result.zips[0]}`)
  if (result.openNow) result.labels.push('open now')

  return result
}

/**
 * Substring variants to try for a free-text token.
 *
 * People type "torchys", the row says "Torchy's Tacos", and a plain contains finds
 * nothing. Dropping the trailing "s" turns the query into "torchy", which matches
 * across the apostrophe without needing a normalised column or raw SQL.
 */
export function termVariants(term: string): string[] {
  const variants = new Set([term])
  if (term.length > 3 && term.endsWith('s')) variants.add(term.slice(0, -1))
  return Array.from(variants)
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function toMinutes(clock: string): number | null {
  const m = clock.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i)
  if (!m) return null
  let hour = parseInt(m[1], 10) % 12
  if (m[3].toLowerCase() === 'p') hour += 12
  return hour * 60 + parseInt(m[2] || '0', 10)
}

/**
 * Whether a row's stored hours say it is open at `now` (Katy is America/Chicago).
 *
 * Two shapes exist in the data — {"monday":{"open":"11:00 AM","close":"10:00 PM"}}
 * and {"monday":"11:00 AM – 10:00 PM"} with an en dash — so both are handled, and
 * a close time earlier than the open time is treated as running past midnight.
 * Anything unparseable returns null so the caller can decide rather than guess.
 */
export function isOpenAt(hoursJson: string | null | undefined, now: Date): boolean | null {
  if (!hoursJson) return null
  let parsed: any
  try {
    parsed = typeof hoursJson === 'string' ? JSON.parse(hoursJson) : hoursJson
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const local = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const minutesNow = local.getHours() * 60 + local.getMinutes()

  const readDay = (offset: number) => {
    const key = DAY_KEYS[(local.getDay() + offset + 7) % 7]
    const entry = parsed[key] ?? parsed[key[0].toUpperCase() + key.slice(1)]
    if (!entry) return null
    if (typeof entry === 'object' && entry.open && entry.close) {
      return { open: toMinutes(entry.open), close: toMinutes(entry.close) }
    }
    if (typeof entry === 'string') {
      if (/closed/i.test(entry)) return { open: null, close: null }
      if (/24\s*hours|open 24/i.test(entry)) return { open: 0, close: 1440 }
      const parts = entry.split(/[–—-]/)
      if (parts.length >= 2) {
        return { open: toMinutes(parts[0]), close: toMinutes(parts[1]) }
      }
    }
    return null
  }

  const today = readDay(0)
  if (today && today.open !== null && today.close !== null) {
    if (today.close > today.open) {
      if (minutesNow >= today.open && minutesNow < today.close) return true
    } else {
      // Closes after midnight: open from `open` until midnight.
      if (minutesNow >= today.open) return true
    }
  }

  // Still inside yesterday's post-midnight tail?
  const yesterday = readDay(-1)
  if (yesterday && yesterday.open !== null && yesterday.close !== null) {
    if (yesterday.close <= yesterday.open && minutesNow < yesterday.close) return true
  }

  return today || yesterday ? false : null
}

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
