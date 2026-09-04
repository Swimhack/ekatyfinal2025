export interface RestaurantCategory {
  slug: string
  /** Short label used in nav and chips. */
  name: string
  /** Plural noun phrase for headings and titles. */
  heading: string
  emoji: string
  /** Intro copy. This is the only original text on the page, so it carries the ranking. */
  blurb: string
  /** Exact tag values as they appear in `categories` / `cuisineTypes`. */
  tags: string[]
}

/**
 * The categories eKaty publishes a landing page for.
 *
 * Tags are the literal strings in the database, not search synonyms — the search
 * parser deliberately over-reaches ("steakhouse" fans out to American and returns
 * 863 rows) which is right for a search box and wrong for a page claiming to list
 * the steakhouses in Katy.
 *
 * The first sixteen slugs predate this file and are kept so existing links survive.
 */
export const RESTAURANT_CATEGORIES: RestaurantCategory[] = [
  {
    slug: 'mexican',
    name: 'Mexican',
    heading: 'Mexican Restaurants',
    emoji: '🌮',
    blurb: 'Katy\'s Mexican food runs from family taquerias along Highway 90 to sit-down Tex-Mex on the Grand Parkway. This list covers taquerias, taco shops and full Mexican kitchens across 77449, 77450, 77493 and 77494.',
    tags: ['Mexican', 'Taqueria', 'Taco', 'Tex-Mex'],
  },
  {
    slug: 'bbq',
    name: 'BBQ',
    heading: 'BBQ Restaurants',
    emoji: '🍖',
    blurb: 'Texas barbecue in Katy means brisket by the pound, sausage links and sides that matter. These are the smokehouses and barbecue joints serving the Katy area.',
    tags: ['BBQ', 'Barbecue'],
  },
  {
    slug: 'asian',
    name: 'Asian',
    heading: 'Asian Restaurants',
    emoji: '🥢',
    blurb: 'Katy has one of the most varied Asian dining scenes in west Houston, concentrated around the Grand Parkway and Westheimer Parkway. Chinese, Japanese, Thai, Vietnamese, Korean and more, all in one list.',
    tags: ['Asian', 'Chinese', 'Japanese', 'Thai', 'Vietnamese', 'Korean', 'Sushi', 'Pho', 'Noodle', 'Ramen', 'Wok', 'Malaysian', 'Filipino'],
  },
  {
    slug: 'american',
    name: 'American',
    heading: 'American Restaurants',
    emoji: '🍔',
    blurb: 'Burgers, steaks, diners and comfort food across Katy. The broadest category on eKaty, covering everything from neighbourhood grills to all-day diners.',
    tags: ['American', 'Diner'],
  },
  {
    slug: 'seafood',
    name: 'Seafood',
    heading: 'Seafood Restaurants',
    emoji: '🦐',
    blurb: 'Gulf shrimp, crawfish by the pound in season, oysters and fried baskets. Katy sits close enough to the coast that the seafood is worth ordering.',
    tags: ['Seafood', 'Crawfish', 'Poke'],
  },
  {
    slug: 'indian',
    name: 'Indian',
    heading: 'Indian Restaurants',
    emoji: '🍛',
    blurb: 'Curries, tandoori, biryani and South Indian breakfast. Katy\'s Indian restaurants cluster along Mason Road and the Grand Parkway, several with weekday lunch buffets.',
    tags: ['Indian', 'Pakistani', 'Nepali', 'Thali', 'Marathi', 'Maharashtrian'],
  },
  {
    slug: 'greek',
    name: 'Greek',
    heading: 'Greek Restaurants',
    emoji: '🥙',
    blurb: 'Gyros, souvlaki and Greek plates in Katy. A small category — if you want the wider Eastern Mediterranean spread, try Mediterranean.',
    tags: ['Greek'],
  },
  {
    slug: 'breakfast',
    name: 'Breakfast',
    heading: 'Breakfast & Brunch Restaurants',
    emoji: '🥞',
    blurb: 'Early tacos, pancake houses and weekend brunch across Katy. Opening times vary a lot in this category, so check the hours on each listing before driving out.',
    tags: ['Breakfast', 'Brunch', 'Bagel'],
  },
  {
    slug: 'italian',
    name: 'Italian',
    heading: 'Italian Restaurants',
    emoji: '🍝',
    blurb: 'Pasta, chicken parm and Italian kitchens in Katy, from strip-centre trattorias to bigger family rooms. Looking specifically for a pizza? There is a separate pizza list.',
    tags: ['Italian', 'Pasta'],
  },
  {
    slug: 'chinese',
    name: 'Chinese',
    heading: 'Chinese Restaurants',
    emoji: '🥟',
    blurb: 'Sichuan heat, Cantonese classics, hot pot and takeout counters. Katy\'s Chinese restaurants range from quick lunch boxes to full dim sum service.',
    tags: ['Chinese', 'Dim Sum', 'Hotpot', 'Hot Pot', 'Malatang'],
  },
  {
    slug: 'japanese',
    name: 'Japanese',
    heading: 'Japanese Restaurants',
    emoji: '🍱',
    blurb: 'Sushi counters, ramen bowls, hibachi and izakaya-style plates across Katy.',
    tags: ['Japanese', 'Sushi', 'Ramen', 'Taiyaki'],
  },
  {
    slug: 'thai',
    name: 'Thai',
    heading: 'Thai Restaurants',
    emoji: '🌶️',
    blurb: 'Curries, pad thai and som tam. Katy\'s Thai kitchens will usually set the heat level to order, so ask.',
    tags: ['Thai'],
  },
  {
    slug: 'vietnamese',
    name: 'Vietnamese',
    heading: 'Vietnamese Restaurants',
    emoji: '🍜',
    blurb: 'Pho, banh mi, vermicelli bowls and Vietnamese coffee. A strong category in Katy given how close it sits to Houston\'s Vietnamese community.',
    tags: ['Vietnamese', 'Pho'],
  },
  {
    slug: 'bar',
    name: 'Bars & Grills',
    heading: 'Bars & Grills',
    emoji: '🍺',
    blurb: 'Sports bars, pubs, bar-and-grills and late-night spots in Katy. Kitchens often close well before the bar does, so check the hours if you are eating.',
    tags: ['Bar', 'Bar & Grill', 'Nightlife', 'Hookah', 'Irish'],
  },
  {
    slug: 'healthy',
    name: 'Healthy',
    heading: 'Healthy Restaurants',
    emoji: '🥗',
    blurb: 'Salad bars, bowls, vegan kitchens and vegetarian-friendly menus in Katy.',
    tags: ['Healthy', 'Vegan', 'Vegetarian', 'Salad', 'Acai'],
  },
  {
    slug: 'desserts',
    name: 'Desserts',
    heading: 'Dessert Shops',
    emoji: '🍰',
    blurb: 'Ice cream, shaved ice, crepes, soft serve and dessert counters around Katy. Many keep later hours than the restaurants around them.',
    tags: ['Dessert', 'Ice Cream', 'Soft Serve', 'Crepe'],
  },
  {
    slug: 'pizza',
    name: 'Pizza',
    heading: 'Pizza Places',
    emoji: '🍕',
    blurb: 'From by-the-slice counters to Neapolitan ovens and the big delivery chains. Every pizza place currently listed in Katy.',
    tags: ['Pizza'],
  },
  {
    slug: 'sushi',
    name: 'Sushi',
    heading: 'Sushi Restaurants',
    emoji: '🍣',
    blurb: 'Nigiri, rolls, poke and omakase counters in Katy. Lunch specials are common on weekdays.',
    tags: ['Sushi', 'Poke'],
  },
  {
    slug: 'burgers',
    name: 'Burgers',
    heading: 'Burger Restaurants',
    emoji: '🍔',
    blurb: 'Smash patties, Texas-sized double stacks and drive-through classics. The burger specialists in Katy, separate from the wider American list.',
    tags: ['Burger'],
  },
  {
    slug: 'steakhouse',
    name: 'Steakhouses',
    heading: 'Steakhouses',
    emoji: '🥩',
    blurb: 'Katy\'s steakhouses, from Brazilian churrascaria to classic chophouses. A short and deliberately strict list — only places that actually serve steak as the main event.',
    tags: ['Steakhouse', 'Brazilian'],
  },
  {
    slug: 'bakery',
    name: 'Bakeries',
    heading: 'Bakeries',
    emoji: '🥐',
    blurb: 'Panaderias, Asian bakeries, pastry counters and cake shops. One of the largest categories in Katy and one of the most varied.',
    tags: ['Bakery', 'Pastry'],
  },
  {
    slug: 'cafe',
    name: 'Cafés & Coffee',
    heading: 'Cafés & Coffee Shops',
    emoji: '☕',
    blurb: 'Coffee roasters, study-friendly cafés and neighbourhood espresso bars across Katy. Wi-fi and seating vary, so the listings note hours where known.',
    tags: ['Cafe', 'Coffee'],
  },
  {
    slug: 'sandwiches',
    name: 'Sandwiches',
    heading: 'Sandwich Shops & Delis',
    emoji: '🥪',
    blurb: 'Subs, delis, bagels and lunch counters in Katy. A reliable category for a fast weekday lunch.',
    tags: ['Sandwich', 'Deli', 'Bagel'],
  },
  {
    slug: 'chicken',
    name: 'Chicken & Wings',
    heading: 'Chicken & Wing Restaurants',
    emoji: '🍗',
    blurb: 'Fried chicken, Nashville hot, rotisserie birds and wing joints. Popular for takeout across Katy on game days.',
    tags: ['Chicken', 'Wings'],
  },
  {
    slug: 'donuts',
    name: 'Donuts',
    heading: 'Donut Shops',
    emoji: '🍩',
    blurb: 'Katy\'s donut shops, most of them independent, most of them open very early and sold out by mid-morning. Kolaches are usually on the same counter.',
    tags: ['Donut'],
  },
  {
    slug: 'fast-food',
    name: 'Fast Food',
    heading: 'Fast Food Restaurants',
    emoji: '🍟',
    blurb: 'Drive-throughs and quick-service counters across Katy, including the chains along I-10 and the Grand Parkway.',
    tags: ['Fast Food'],
  },
  {
    slug: 'korean',
    name: 'Korean',
    heading: 'Korean Restaurants',
    emoji: '🍲',
    blurb: 'Korean barbecue, stews and fried chicken in Katy. A small but growing category.',
    tags: ['Korean'],
  },
  {
    slug: 'mediterranean',
    name: 'Mediterranean',
    heading: 'Mediterranean Restaurants',
    emoji: '🫒',
    blurb: 'Shawarma, falafel, kebabs, mezze and halal kitchens across Katy, spanning Greek, Lebanese and Turkish cooking.',
    tags: ['Mediterranean', 'Greek', 'Halal', 'Gyro', 'Falafel', 'Lebanese', 'Turkish', 'Shawarma', 'Pita'],
  },
  {
    slug: 'boba',
    name: 'Boba & Tea',
    heading: 'Boba & Tea Shops',
    emoji: '🧋',
    blurb: 'Bubble tea, milk tea, fruit teas and smoothie counters. A strong category in Katy and usually open late.',
    tags: ['Tea', 'Boba', 'Smoothie'],
  },
  {
    slug: 'southern',
    name: 'Southern & Cajun',
    heading: 'Southern & Cajun Restaurants',
    emoji: '🍤',
    blurb: 'Soul food, Louisiana cooking, boudin and crawfish boils. Katy sits within easy reach of the Gulf Coast Cajun tradition and it shows on these menus.',
    tags: ['Southern', 'Cajun', 'Soul Food', 'New Orleans'],
  },
  {
    slug: 'latin',
    name: 'Latin American',
    heading: 'Latin American Restaurants',
    emoji: '🫓',
    blurb: 'Colombian, Peruvian, Cuban, Salvadoran, Brazilian and Puerto Rican kitchens in Katy, beyond the Mexican and Tex-Mex mainstream.',
    tags: ['Latin American', 'Colombian', 'Peruvian', 'Cuban', 'Salvadoran', 'Puerto Rican', 'Brazilian'],
  },
  {
    slug: 'halal',
    name: 'Halal',
    heading: 'Halal Restaurants',
    emoji: '🕌',
    blurb: 'Halal-certified and halal-friendly kitchens in Katy, spanning South Asian, Middle Eastern and grill menus. Confirm certification directly with the restaurant.',
    tags: ['Halal'],
  },
]

/** Categories with fewer listings than this are published but kept out of the index. */
export const THIN_CATEGORY_THRESHOLD = 6

export function findCategory(slug: string): RestaurantCategory | undefined {
  return RESTAURANT_CATEGORIES.find((category) => category.slug === slug.toLowerCase())
}
