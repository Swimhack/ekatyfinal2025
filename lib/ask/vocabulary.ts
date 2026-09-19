// Ask eKaty — controlled vocabularies.
//
// `synonyms` are the phrases a diner might type. `tokens` are the substrings we
// look for in fields we actually store (name, categories, cuisine_types,
// metadata.tags, metadata.features, description). Keeping the two sides
// separate is what lets us match loose human phrasing without ever asserting an
// attribute a restaurant's record does not contain.

import type { BudgetTier } from './types'

export interface CuisineDef {
  /** Canonical label used in the schema, the why-line and the spinner seed. */
  label: string
  /** Phrases a diner might type. */
  synonyms: string[]
  /** Substrings matched against stored restaurant text. */
  tokens: string[]
}

export const CUISINES: CuisineDef[] = [
  {
    label: 'Mexican',
    synonyms: ['mexican', 'tex mex', 'tex-mex', 'texmex', 'taco', 'tacos', 'taqueria', 'enchiladas', 'fajitas', 'queso', 'burrito', 'burritos'],
    tokens: ['mexican', 'tex-mex', 'taco', 'taqueria'],
  },
  {
    label: 'BBQ',
    synonyms: ['bbq', 'b-b-q', 'barbecue', 'barbeque', 'brisket', 'smoked meat', 'smoked meats', 'smokehouse', 'ribs'],
    tokens: ['bbq', 'barbecue', 'bar-b-q', 'smoked-meats', 'smoked meats', 'brisket'],
  },
  {
    label: 'Italian',
    synonyms: ['italian', 'pasta', 'lasagna', 'trattoria', 'cucina'],
    tokens: ['italian', 'pasta', 'cucina'],
  },
  {
    label: 'Pizza',
    synonyms: ['pizza', 'pizzeria', 'slice', 'slices'],
    tokens: ['pizza', 'pizzeria'],
  },
  {
    label: 'Sushi',
    synonyms: ['sushi', 'sashimi', 'nigiri', 'omakase', 'roll', 'rolls'],
    tokens: ['sushi', 'sashimi'],
  },
  {
    label: 'Japanese',
    synonyms: ['japanese', 'ramen', 'izakaya', 'hibachi', 'teppanyaki', 'udon'],
    tokens: ['japanese', 'ramen', 'hibachi'],
  },
  {
    label: 'Chinese',
    synonyms: ['chinese', 'dim sum', 'dumplings', 'szechuan', 'sichuan', 'cantonese', 'lo mein'],
    tokens: ['chinese', 'dim sum', 'szechuan', 'sichuan'],
  },
  {
    label: 'Thai',
    synonyms: ['thai', 'pad thai', 'curry', 'tom yum'],
    tokens: ['thai', 'curry'],
  },
  {
    label: 'Vietnamese',
    synonyms: ['vietnamese', 'pho', 'banh mi', 'bahn mi'],
    tokens: ['vietnamese', 'pho', 'banh mi'],
  },
  {
    label: 'Korean',
    synonyms: ['korean', 'kbbq', 'korean bbq', 'bibimbap', 'bulgogi'],
    tokens: ['korean', 'bibimbap', 'bulgogi'],
  },
  {
    label: 'Asian',
    synonyms: ['asian', 'asian food', 'noodles'],
    tokens: ['asian', 'noodle'],
  },
  {
    label: 'Indian',
    synonyms: ['indian', 'pakistani', 'tandoori', 'biryani', 'tikka', 'naan', 'masala', 'desi'],
    tokens: ['indian', 'pakistani', 'tandoori', 'biryani', 'masala'],
  },
  {
    label: 'Mediterranean',
    synonyms: ['mediterranean', 'lebanese', 'shawarma', 'falafel', 'hummus', 'kebab', 'kabob'],
    tokens: ['mediterranean', 'lebanese', 'shawarma', 'falafel', 'kebab', 'kabob'],
  },
  {
    label: 'Greek',
    synonyms: ['greek', 'gyro', 'gyros', 'souvlaki'],
    tokens: ['greek', 'gyro', 'souvlaki'],
  },
  {
    label: 'Seafood',
    synonyms: ['seafood', 'fish', 'shrimp', 'oysters', 'crawfish', 'ceviche', 'mariscos', 'crab'],
    tokens: ['seafood', 'shrimp', 'oyster', 'crawfish', 'ceviche', 'mariscos', 'crab'],
  },
  {
    label: 'Cajun',
    synonyms: ['cajun', 'creole', 'gumbo', 'etouffee', 'boudin'],
    tokens: ['cajun', 'creole', 'gumbo'],
  },
  {
    label: 'Steakhouse',
    synonyms: ['steak', 'steaks', 'steakhouse', 'prime rib', 'ribeye'],
    tokens: ['steak', 'steakhouse', 'prime'],
  },
  {
    label: 'Burgers',
    synonyms: ['burger', 'burgers', 'cheeseburger', 'smash burger'],
    tokens: ['burger'],
  },
  {
    label: 'American',
    synonyms: ['american', 'new american', 'comfort food', 'pub food', 'bar food', 'grill'],
    tokens: ['american', 'comfort food', 'pub food', 'bar food'],
  },
  {
    label: 'French',
    synonyms: ['french', 'bistro', 'crepe', 'crepes'],
    tokens: ['french', 'bistro', 'crepe'],
  },
  {
    label: 'Breakfast',
    synonyms: ['breakfast', 'brunch', 'pancakes', 'kolache', 'kolaches', 'omelette', 'biscuits'],
    tokens: ['breakfast', 'brunch', 'kolache', 'bakery'],
  },
  {
    label: 'Bakery',
    synonyms: ['bakery', 'pastry', 'pastries', 'croissant', 'cake', 'donut', 'donuts'],
    tokens: ['bakery', 'pastry', 'donut'],
  },
  {
    label: 'Cafe',
    synonyms: ['cafe', 'coffee', 'coffee shop', 'espresso'],
    tokens: ['cafe', 'coffee'],
  },
  {
    label: 'Vegetarian',
    synonyms: ['vegetarian', 'vegan', 'plant based', 'plant-based', 'meatless'],
    tokens: ['vegetarian', 'vegan', 'plant-based'],
  },
  {
    label: 'Halal',
    synonyms: ['halal', 'zabiha'],
    tokens: ['halal', 'zabiha'],
  },
]

export interface VibeDef {
  label: string
  synonyms: string[]
  /** Substrings matched against stored restaurant text. */
  tokens: string[]
  /** Price tiers that also support this vibe, used as a weaker signal. */
  priceTiers?: BudgetTier[]
}

export const VIBES: VibeDef[] = [
  {
    label: 'date night',
    synonyms: ['date night', 'date', 'romantic', 'anniversary', 'just us two', 'my wife', 'my husband', 'my girlfriend', 'my boyfriend', 'my partner'],
    tokens: ['date-night', 'romantic', 'wine', 'cocktail', 'intimate', 'candlelit'],
    priceTiers: ['mid', 'high'],
  },
  {
    label: 'special occasion',
    synonyms: ['special occasion', 'celebration', 'celebrating', 'birthday', 'graduation', 'promotion dinner'],
    tokens: ['special-occasion', 'fine-dining', 'private dining', 'upscale'],
    priceTiers: ['high'],
  },
  {
    label: 'casual',
    synonyms: ['casual', 'chill', 'laid back', 'laid-back', 'no fuss', 'low key', 'low-key'],
    tokens: ['casual', 'counter', 'family'],
  },
  {
    label: 'quick',
    synonyms: ['quick', 'fast', 'in a hurry', 'grab and go', 'grab-and-go', 'quick bite', 'on the go', 'takeout', 'take out', 'to go'],
    tokens: ['quick', 'casual', 'takeout', 'counter', 'snack'],
  },
  {
    label: 'family friendly',
    synonyms: ['family friendly', 'family-friendly', 'good for families', 'family'],
    tokens: ['family', 'kid', 'kids'],
  },
  {
    label: 'patio',
    synonyms: ['patio', 'outdoor', 'outdoor seating', 'outside', 'al fresco', 'dog friendly', 'dog-friendly'],
    tokens: ['patio', 'outdoor'],
  },
  {
    label: 'live music',
    synonyms: ['live music', 'music', 'band', 'bands', 'karaoke'],
    tokens: ['live-music', 'music', 'band'],
  },
  {
    label: 'bar',
    synonyms: ['drinks', 'bar', 'beer', 'brewery', 'cocktails', 'margaritas', 'whiskey', 'happy hour'],
    tokens: ['bar', 'beer', 'whiskey', 'cocktail', 'brewery', 'margarita'],
  },
  {
    label: 'brunch',
    synonyms: ['brunch', 'weekend brunch', 'bottomless'],
    tokens: ['brunch'],
  },
  {
    label: 'big group',
    synonyms: ['big group', 'large group', 'team dinner', 'whole crew', 'lots of people', 'crowd'],
    tokens: ['private dining', 'private events', 'family', 'large'],
  },
  {
    label: 'healthy',
    synonyms: ['healthy', 'light', 'salad', 'salads', 'clean eating', 'farm to table', 'farm-to-table'],
    tokens: ['healthy', 'farm to table', 'salad', 'vegetarian'],
  },
  {
    label: 'authentic',
    synonyms: ['authentic', 'legit', 'hole in the wall', 'hole-in-the-wall', 'mom and pop', 'mom-and-pop'],
    tokens: ['authentic', 'traditional', 'homemade'],
  },
]

/**
 * Katy-area place names. These are only ever matched against the `address`
 * column of existing listings, so an area that is not in our data simply does
 * not match — we never map an area to coordinates we made up.
 */
export const AREAS: string[] = [
  'Cinco Ranch',
  'Cane Island',
  'Cross Creek',
  'Firethorne',
  'Fulshear',
  'Grand Parkway',
  'Katy Mills',
  'Kingsland',
  'Mason Road',
  'Old Katy',
  'Pin Oak',
  'Fry Road',
  'Westheimer',
  'Highway Blvd',
  'Franz Road',
  'Morton Ranch',
  'Nottingham',
  'Bear Creek',
]

/** Address abbreviations so "Mason Road" also matches "1440 S Mason Rd". */
export const AREA_ALIASES: Record<string, string[]> = {
  'Mason Road': ['mason rd', 'mason road'],
  'Fry Road': ['fry rd', 'fry road'],
  'Franz Road': ['franz rd', 'franz road'],
  'Grand Parkway': ['grand pkwy', 'grand parkway', 'highway 99', 'hwy 99'],
  'Cinco Ranch': ['cinco ranch'],
  'Cross Creek': ['cross creek'],
  'Old Katy': ['old katy', 'downtown katy'],
  'Highway Blvd': ['highway blvd'],
}

/**
 * Brands treated as chains for the "no chains" filter.
 *
 * This is a reviewable list of multi-location brands, not a claim stored on any
 * restaurant record. The chain classifier in lib/ask/chains.ts prefers
 * evidence from our own inventory (an explicit `metadata.isChain`, or the same
 * name listed at more than one address) and falls back to this list. Because
 * "no chains" only ever removes candidates, a wrong entry costs a diner one
 * option rather than producing a false statement about a restaurant.
 */
export const KNOWN_CHAIN_BRANDS: string[] = [
  "applebee's",
  'black bear diner',
  'buffalo wild wings',
  "chili's",
  'chick-fil-a',
  'chipotle',
  'cheesecake factory',
  "denny's",
  'five guys',
  'freebirds',
  'gringo\'s',
  'ihop',
  'in-n-out',
  "jason's deli",
  "jimmy john's",
  'kolache factory',
  'la madeleine',
  'los cucos',
  "mcdonald's",
  'olive garden',
  'panda express',
  'panera',
  'pappadeaux',
  'pappas',
  'pappasito',
  'pei wei',
  "perry's steakhouse",
  'popeyes',
  "raising cane's",
  'saltgrass',
  'shake shack',
  'subway',
  'taco bell',
  'texas roadhouse',
  "torchy's",
  'whataburger',
  'wingstop',
  'red lobster',
  'outback',
  'carrabba',
  "bj's restaurant",
  'mod pizza',
  "marco's pizza",
  'papa john',
  "domino's",
  'pizza hut',
  'starbucks',
  'dunkin',
  'sonic drive-in',
]
