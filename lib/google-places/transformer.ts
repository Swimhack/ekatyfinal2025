import { getPhotoUrl } from './fetcher';

// Convert Google price level (0-4) to our price levels
function convertPriceLevel(googlePriceLevel?: number): string {
  switch (googlePriceLevel) {
    case 0:
    case 1:
      return 'BUDGET';
    case 2:
      return 'MODERATE';
    case 3:
      return 'UPSCALE';
    case 4:
      return 'PREMIUM';
    default:
      return 'MODERATE';
  }
}

// Convert Google opening hours to our format
function convertOpeningHours(openingHours?: any): string {
  if (!openingHours?.weekday_text) {
    return JSON.stringify({
      monday: 'Hours not available',
      tuesday: 'Hours not available',
      wednesday: 'Hours not available',
      thursday: 'Hours not available',
      friday: 'Hours not available',
      saturday: 'Hours not available',
      sunday: 'Hours not available',
    });
  }

  const hoursMap: any = {};
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  openingHours.weekday_text.forEach((dayHours: string) => {
    const [day, ...hours] = dayHours.split(': ');
    const dayName = day.toLowerCase().replace(',', '');
    
    // Find matching day
    const matchedDay = days.find(d => dayName.includes(d.substring(0, 3)));
    if (matchedDay) {
      hoursMap[matchedDay] = hours.join(': ') || 'Closed';
    }
  });

  // Fill in any missing days
  days.forEach(day => {
    if (!hoursMap[day]) {
      hoursMap[day] = 'Hours not available';
    }
  });

  return JSON.stringify(hoursMap);
}

// Extract categories from Google types
// Also includes cuisine-based categories for better filtering
function extractCategories(types?: string[], name?: string, editorialSummary?: string): string {
  const categories = new Set<string>();
  
  if (types && types.length > 0) {
    const categoryMap: { [key: string]: string } = {
      restaurant: 'Restaurant',
      bar: 'Bar',
      cafe: 'Cafe',
      bakery: 'Bakery',
      meal_delivery: 'Delivery',
      meal_takeaway: 'Takeout',
      night_club: 'Nightlife',
      food: 'Food',
    };

    types.forEach(type => {
      const mapped = categoryMap[type];
      if (mapped) categories.add(mapped);
    });
  }

  // Also add cuisine-based categories from name + editorial summary for better discoverability
  if (name || editorialSummary) {
    const cuisineCategoryMap: { [key: string]: string } = {
      'bbq': 'BBQ',
      'barbecue': 'BBQ',
      'mexican': 'Mexican',
      'taqueria': 'Mexican',
      'taco': 'Mexican',
      'tex-mex': 'Mexican',
      'italian': 'Italian',
      'pizza': 'Italian',
      'pasta': 'Italian',
      'chinese': 'Chinese',
      'wok': 'Chinese',
      'dim sum': 'Chinese',
      'japanese': 'Japanese',
      'sushi': 'Japanese',
      'ramen': 'Japanese',
      'hibachi': 'Japanese',
      'korean': 'Korean',
      'thai': 'Thai',
      'vietnamese': 'Vietnamese',
      'pho': 'Vietnamese',
      'indian': 'Indian',
      'tandoori': 'Indian',
      'greek': 'Greek',
      'mediterranean': 'Mediterranean',
      'shawarma': 'Mediterranean',
      'falafel': 'Mediterranean',
      'seafood': 'Seafood',
      'crawfish': 'Seafood',
      'cajun': 'Cajun',
      'creole': 'Cajun',
      'southern': 'Southern',
      'soul food': 'Southern',
      'breakfast': 'Breakfast',
      'brunch': 'Breakfast',
      'waffle': 'Breakfast',
      'pancake': 'Breakfast',
      'burger': 'American',
      'steakhouse': 'Steakhouse',
      'steak house': 'Steakhouse',
      'wings': 'American',
      'chicken': 'American',
      'hot dog': 'American',
      'sandwich': 'American',
      'deli': 'Deli',
      'sub': 'Deli',
      'asian': 'Asian',
      'filipino': 'Asian',
      'hawaiian': 'Hawaiian',
      'poke': 'Hawaiian',
      'brazilian': 'Brazilian',
      'peruvian': 'Peruvian',
      'cuban': 'Cuban',
      'colombian': 'Latin American',
      'venezuelan': 'Latin American',
      'salvadoran': 'Latin American',
      'honduran': 'Latin American',
      'ethiopian': 'Ethiopian',
      'lebanese': 'Lebanese',
      'turkish': 'Turkish',
      'pakistani': 'Pakistani',
      'nepali': 'Nepali',
      'halal': 'Halal',
      'vegan': 'Vegan',
      'vegetarian': 'Vegetarian',
      'smoothie': 'Healthy',
      'juice': 'Healthy',
      'acai': 'Healthy',
      'boba': 'Cafe',
      'tea house': 'Cafe',
      'coffee': 'Cafe',
      'donut': 'Bakery',
      'bagel': 'Bakery',
    };

    const searchText = [name, editorialSummary].filter(Boolean).join(' ').toLowerCase();
    Object.entries(cuisineCategoryMap).forEach(([keyword, category]) => {
      if (searchText.includes(keyword)) {
        categories.add(category);
      }
    });
  }

  return categories.size > 0 ? Array.from(categories).join(', ') : 'Restaurant';
}

// Well-known chain name to cuisine mapping
const CHAIN_CUISINE_MAP: { [key: string]: string } = {
  "chick-fil-a": "Chicken, American",
  "whataburger": "Burger, American",
  "panda express": "Chinese",
  "chipotle": "Mexican",
  "olive garden": "Italian",
  "red lobster": "Seafood",
  "texas roadhouse": "Steakhouse, American",
  "ihop": "Breakfast, American",
  "denny's": "Breakfast, American",
  "waffle house": "Breakfast, American",
  "chili's": "American, Tex-Mex",
  "applebee's": "American",
  "buffalo wild wings": "Wings, American",
  "wingstop": "Wings, American",
  "popeyes": "Cajun, Chicken",
  "raising cane's": "Chicken, American",
  "jason's deli": "Deli, American",
  "panera": "Bakery, American",
  "jimmy john's": "Deli, Sandwich",
  "firehouse subs": "Deli, Sandwich",
  "jersey mike's": "Deli, Sandwich",
  "subway": "Deli, Sandwich",
  "sonic": "American, Fast Food",
  "mcdonald's": "American, Fast Food",
  "wendy's": "American, Fast Food",
  "taco bell": "Mexican, Fast Food",
  "taco cabana": "Mexican, Tex-Mex",
  "el pollo loco": "Mexican, Chicken",
  "torchy's": "Mexican, Tacos",
  "cheddar's": "American, Southern",
  "cracker barrel": "American, Southern",
  "saltgrass": "Steakhouse, American",
  "perry's steakhouse": "Steakhouse, Upscale",
  "outback": "Steakhouse, American",
  "longhorn": "Steakhouse, American",
  "ruth's chris": "Steakhouse, Upscale",
  "p.f. chang's": "Chinese, Asian",
  "pei wei": "Asian",
  "benihana": "Japanese, Hibachi",
  "red robin": "Burger, American",
  "five guys": "Burger, American",
  "shake shack": "Burger, American",
  "in-n-out": "Burger, American",
  "culver's": "Burger, American",
  "la madeleine": "French, Bakery",
  "nothing bundt": "Bakery, Dessert",
  "starbucks": "Cafe, Coffee",
  "dunkin": "Cafe, Breakfast",
};

// Extract cuisine types from Google types, name, and editorial summary
function extractCuisineTypes(types?: string[], name?: string, editorialSummary?: string): string {
  const cuisines = new Set<string>();

  // Check chain name mapping first
  if (name) {
    const nameLower = name.toLowerCase();
    for (const [chain, cuisine] of Object.entries(CHAIN_CUISINE_MAP)) {
      if (nameLower.includes(chain)) {
        cuisine.split(', ').forEach(c => cuisines.add(c));
        break;
      }
    }
  }

  // Common cuisine keywords to look for in name + editorial summary
  const cuisineKeywords = [
    'Mexican', 'Italian', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese',
    'Indian', 'Mediterranean', 'Greek', 'French', 'American', 'BBQ', 'Barbecue',
    'Sushi', 'Pizza', 'Burger', 'Seafood', 'Steakhouse', 'Tex-Mex', 'Asian',
    'Cajun', 'Southern', 'German', 'Irish', 'Brazilian', 'Peruvian', 'Cuban',
    'Spanish', 'Ethiopian', 'Lebanese', 'Turkish', 'Halal', 'Vegan', 'Vegetarian',
    'Wings', 'Chicken', 'Pho', 'Ramen', 'Noodle', 'Crawfish', 'Taco', 'Taqueria',
    'Filipino', 'Hawaiian', 'Poke', 'Soul Food', 'Deli', 'Diner', 'Brunch',
    'Smoothie', 'Boba', 'Tea', 'Shawarma', 'Falafel', 'Gyro', 'Hookah',
    'Colombian', 'Venezuelan', 'Salvadoran', 'Honduran', 'Nepali', 'Pakistani',
    'Hot Pot', 'Dim Sum', 'Wok', 'Donut', 'Bagel', 'Sandwich', 'Acai',
  ];

  // Search both name and editorial summary for keywords
  const searchText = [name, editorialSummary].filter(Boolean).join(' ');
  if (searchText) {
    cuisineKeywords.forEach(keyword => {
      if (searchText.toLowerCase().includes(keyword.toLowerCase())) {
        cuisines.add(keyword);
      }
    });
  }

  // Add general category if no specific cuisine found
  if (cuisines.size === 0) {
    if (types?.includes('bakery')) cuisines.add('Bakery');
    else if (types?.includes('cafe')) cuisines.add('Cafe');
    else if (types?.includes('bar')) cuisines.add('Bar & Grill');
    else cuisines.add('American');
  }

  return Array.from(cuisines).join(', ');
}

// Create a URL-friendly slug from restaurant name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// Transform Google Places data to our restaurant schema
export function transformGooglePlaceToRestaurant(place: any): any {
  const details = place.details || place;
  
  // Extract address components
  const address = details.formatted_address || details.vicinity || '';
  const addressParts = address.split(',').map((s: string) => s.trim());
  const streetAddress = addressParts[0] || '';
  const zipCode = addressParts[addressParts.length - 1]?.match(/\d{5}/)?.[0] || '77494'; // Default Katy zip
  
  // Process photos
  const photos = details.photos?.slice(0, 10).map((photo: any) => 
    getPhotoUrl(photo.photo_reference, 1200, 800)
  ) || [];
  
  // Create metadata object with additional Google data
  const metadata = {
    google_place_id: details.place_id,
    google_url: details.url,
    google_rating: details.rating,
    google_user_ratings_total: details.user_ratings_total,
    google_business_status: details.business_status,
    google_types: details.types,
    editorial_summary: details.editorial_summary?.overview,
    last_google_update: new Date().toISOString(),
  };

  // Transform to our schema
  return {
    name: details.name,
    slug: createSlug(details.name),
    description: details.editorial_summary?.overview || 
                 `${details.name} is a popular restaurant in Katy, Texas.`,
    address: streetAddress,
    city: 'Katy',
    state: 'TX',
    zipCode: zipCode,
    latitude: details.geometry?.location?.lat || 29.7858,
    longitude: details.geometry?.location?.lng || -95.8245,
    phone: details.formatted_phone_number || details.international_phone_number || null,
    website: details.website || null,
    email: null, // Google doesn't provide email
    categories: extractCategories(details.types, details.name, details.editorial_summary?.overview),
    cuisineTypes: extractCuisineTypes(details.types, details.name, details.editorial_summary?.overview),
    hours: convertOpeningHours(details.opening_hours),
    priceLevel: convertPriceLevel(details.price_level),
    photos: photos.join(','),
    logoUrl: photos[0] || null,
    featured: details.rating >= 4.5 && details.user_ratings_total >= 100, // Feature highly rated places
    verified: true, // All Google data is considered verified
    active: details.business_status === 'OPERATIONAL',
    rating: details.rating || null,
    reviewCount: details.user_ratings_total || 0,
    source: 'google_places',
    sourceId: details.place_id,
    metadata: JSON.stringify(metadata),
    lastVerified: new Date(),
  };
}

// Transform Google reviews for storage
export function transformGoogleReviews(reviews: any[], restaurantId: string): any[] {
  if (!reviews || reviews.length === 0) return [];
  
  return reviews.map(review => ({
    restaurantId,
    googleAuthorName: review.author_name,
    googleAuthorUrl: review.author_url,
    rating: review.rating,
    text: review.text,
    timeDescription: review.relative_time_description,
    timestamp: new Date(review.time * 1000), // Convert Unix timestamp
    language: review.language || 'en',
    googleProfilePhoto: review.profile_photo_url,
  }));
}

// Batch transform multiple places
export function transformGooglePlacesToRestaurants(places: any[]): any[] {
  return places.map(place => {
    try {
      return transformGooglePlaceToRestaurant(place);
    } catch (error) {
      console.error(`Error transforming place ${place.name}:`, error);
      return null;
    }
  }).filter(Boolean);
}