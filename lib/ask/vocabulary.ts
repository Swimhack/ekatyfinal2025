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
  /**
   * Substrings that corroborate the vibe without establishing it.
   *
   * "wine" is the case this exists for. A wine list is shared by a candlelit
   * dining room and by a drive-up daiquiri window, so on its own it says
   * nothing about whether there is a table to sit at. lib/ask/rank.ts counts
   * these only once something else about the listing reads as a sit-down room,
   * and then only faintly.
   */
  weakTokens?: string[]
  /** Price tiers that also support this vibe, used as a weaker signal. */
  priceTiers?: BudgetTier[]
}

export const VIBES: VibeDef[] = [
  {
    label: 'date night',
    synonyms: ['date night', 'date', 'romantic', 'anniversary', 'just us two', 'my wife', 'my husband', 'my girlfriend', 'my boyfriend', 'my partner'],
    tokens: ['date-night', 'date night', 'romantic', 'intimate', 'candlelit'],
    weakTokens: ['wine', 'cocktail'],
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

export interface ServiceFormatDef {
  /** Canonical label used on `schema.formats`. */
  label: string
  /** Phrases a diner might type to ask for this format. */
  synonyms: string[]
  /** Substrings matched against a listing's name, categories and cuisines. */
  tokens: string[]
}

/**
 * Formats that decide the shape of a visit rather than what is on the menu.
 *
 * Each of these is a counter, a window or a truck: there is no table to sit at,
 * so none of them can host the dinner a "date night" ask is for. lib/ask/rank.ts
 * screens them out of that one request and leaves every other ask alone, and a
 * diner who names a format outright ("date night at a food truck") switches
 * their own screen off.
 *
 * `tokens` are matched whole-word against fields that say what a listing *is*,
 * never against tags or a description, so "Daiquiris To Go" in a name is a
 * match while a sit-down room that happens to list takeout is not.
 */
export const SERVICE_FORMATS: ServiceFormatDef[] = [
  {
    label: 'to-go',
    synonyms: ['to go', 'to-go', 'takeout', 'take out', 'take-out', 'carryout', 'carry out', 'curbside'],
    tokens: ['to go', 'to-go'],
  },
  {
    label: 'drive-thru',
    synonyms: ['drive thru', 'drive-thru', 'drive through', 'drive in', 'drive-in'],
    tokens: ['drive thru', 'drive-thru', 'drive through', 'drive in', 'drive-in'],
  },
  {
    label: 'daiquiri',
    synonyms: ['daiquiri', 'daiquiris', 'frozen drinks'],
    tokens: ['daiquiri'],
  },
  {
    label: 'snow cone',
    synonyms: [
      'snow cone',
      'snow cones',
      'snowcone',
      'snowcones',
      'sno cone',
      'sno cones',
      'raspado',
      'raspados',
      'shaved ice',
    ],
    tokens: ['snow cone', 'snowcone', 'sno cone', 'raspado'],
  },
  {
    label: 'food truck',
    synonyms: ['food truck', 'food trucks', 'taco truck', 'taco trucks', 'food trailer', 'food trailers'],
    tokens: ['food truck', 'food trailer'],
  },
]

/**
 * Stored words that read as a dining room rather than a counter.
 *
 * These are the sit-down signals our own listings already carry, and they are
 * the evidence a date-night pick is ranked on. Matching one is cited as our
 * reading of that stored word, not as a claim about a room we have seen.
 */
export const SIT_DOWN_TOKENS: string[] = [
  'fine dining',
  'fine-dining',
  'white tablecloth',
  'upscale',
  'steakhouse',
  'chophouse',
  'italian',
  'trattoria',
  'ristorante',
  'osteria',
  'cucina',
  'bistro',
  'brasserie',
  'seafood',
  'oyster bar',
  'sushi',
  'tapas',
  'wine bar',
  'dining room',
  'private dining',
]

/**
 * Brands whose entire format is a walk-up or drive-up window.
 *
 * Like KNOWN_CHAIN_BRANDS this is a reviewable list in code, not a claim
 * written onto any restaurant record, and membership only ever removes a
 * candidate from one kind of request. An entry belongs here when the brand has
 * no dining room at all, so no wording of a date-night ask should answer with
 * it however its categories happen to be filled in. Eskimo Hut sells daiquiris
 * through a drive-up window.
 */
export const NON_SIT_DOWN_BRANDS: string[] = ['eskimo hut']

/**
 * Name/slug/description tokens that mean the listing is not a place to eat.
 *
 * Reviewable code list only — never written into Neon. Ask hard-filters these
 * out of every pick so lodging, rentals and other non-restaurants that were
 * miscategorized as Restaurant cannot answer a dining ask. Prefer specific
 * tokens ("rentals", "motel") over broad ones ("farm") so real kitchens stay.
 */
export const NON_RESTAURANT_TOKENS: string[] = [
  'rentals',
  'rental',
  'vacation rental',
  'vacation rentals',
  'bed and breakfast',
  'bed & breakfast',
  'hotel',
  'motel',
  'apartments',
  'apartment',
  'self storage',
  'storage units',
  'real estate',
  'car wash',
  'daycare',
  'day care',
  'rv park',
  'trailer park',
  'airbnb',
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
 * Brands treated as chains for the "no chains" filter and for surprise picks.
 *
 * This is a reviewable list of multi-location brands, not a claim stored on any
 * restaurant record. The chain classifier in lib/ask/chains.ts prefers
 * evidence from our own inventory (an explicit `metadata.isChain`, or the same
 * name listed at more than one address) and falls back to this list. Because
 * membership here only ever removes or demotes candidates, a wrong entry costs
 * a diner one option rather than producing a false statement about a
 * restaurant.
 *
 * The same list doubles as the brand vocabulary for requests: when a diner
 * types one of these names, lib/ask/parse.ts records it on `schema.brands` and
 * the surprise filter stands down, because asking for Burger King by name is
 * not a request to be surprised.
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
  // National fast-food and casual-dining brands. A "surprise me" ask that
  // returns one of these is the bug this list exists to close. Each entry is
  // written the way the brand spells itself; lib/ask/chains.ts strips
  // punctuation on both sides before comparing, so "wendy's" matches a stored
  // "Wendy's #1234".
  'burger king',
  "wendy's",
  'kfc',
  'kentucky fried chicken',
  "arby's",
  'jack in the box',
  "hardee's",
  "carl's jr",
  'del taco',
  'taco cabana',
  'el pollo loco',
  "church's chicken",
  "zaxby's",
  'dairy queen',
  'little caesars',
  "jersey mike's",
  'firehouse subs',
  "mcalister's deli",
  "schlotzsky's",
  'potbelly',
  'qdoba',
  "moe's southwest",
  'waffle house',
  'cracker barrel',
  'first watch',
  'longhorn steakhouse',
  'red robin',
  "cheddar's",
  'golden corral',
  'golden chick',
  'hooters',
  'twin peaks',
  "chuy's",
  "fuzzy's taco shop",
  'smashburger',
  'mooyah',
  'long john silver',
  "joe's crab shack",
  'bonefish grill',
  "maggiano's",
  'cicis',
  'blaze pizza',
  "papa murphy's",
  'peter piper pizza',
  'einstein bros',
  'corner bakery',
  'nothing bundt cakes',
  'crumbl',
  'baskin-robbins',
  'cold stone creamery',
  'smoothie king',
  'jamba',
  'tropical smoothie',
  'dutch bros',
  'krispy kreme',
  'shipley do-nuts',
  'jollibee',
  'yard house',
  'dave & buster',
  'texas de brazil',
  'fogo de chao',
  "ruth's chris",
  'benihana',
  'kura sushi',
  'pf chang',
  'genghis grill',
  'which wich',
]
