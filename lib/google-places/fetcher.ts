import client, { GOOGLE_CONFIG, KATY_SEARCH_CONFIG } from './client';
import { PlaceInputType } from '@googlemaps/google-maps-services-js';
import pLimit from 'p-limit';
import { checkAndIncrementUsage } from './rate-limiter';

// Rate limiter to respect API limits
const rateLimiter = pLimit(GOOGLE_CONFIG.rateLimit);

// All food-related Google Places types to search
const FOOD_PLACE_TYPES = [
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'meal_delivery',
  'meal_takeaway',
  'food',
];

// Fetch all food places near a specific point for a given type
export async function fetchNearbyRestaurants(
  location: { lat: number; lng: number },
  radius: number = 5000,
  placeType: string = 'restaurant'
): Promise<any[]> {
  await checkAndIncrementUsage();

  try {
    const response = await rateLimiter(() =>
      client.placesNearby({
        params: {
          location,
          radius,
          type: placeType,
          key: GOOGLE_CONFIG.apiKey,
        },
        timeout: 10000,
      })
    );

    const places = response.data.results || [];

    // Handle pagination if there are more results
    let allPlaces = [...places];
    let nextPageToken = response.data.next_page_token;

    while (nextPageToken) {
      // Wait 2 seconds before requesting next page (Google requirement)
      await new Promise(resolve => setTimeout(resolve, 2000));

      await checkAndIncrementUsage();

      const nextResponse = await rateLimiter(() =>
        client.placesNearby({
          params: {
            location: location, // Required by type definition
            pagetoken: nextPageToken,
            key: GOOGLE_CONFIG.apiKey,
          } as any, // Type assertion to handle pagination
          timeout: 10000,
        })
      );

      allPlaces = [...allPlaces, ...(nextResponse.data.results || [])];
      nextPageToken = nextResponse.data.next_page_token;
    }

    return allPlaces;
  } catch (error) {
    console.error(`Error fetching nearby ${placeType}:`, error);
    throw error;
  }
}

// Fetch detailed information about a specific place
export async function fetchPlaceDetails(placeId: string): Promise<any> {
  await checkAndIncrementUsage();

  try {
    const response = await rateLimiter(() =>
      client.placeDetails({
        params: {
          place_id: placeId,
          fields: [
            'name',
            'formatted_address',
            'geometry',
            'formatted_phone_number',
            'international_phone_number',
            'website',
            'opening_hours',
            'price_level',
            'rating',
            'user_ratings_total',
            'reviews',
            'photos',
            'types',
            'business_status',
            'url',
            'vicinity',
            'editorial_summary',
          ],
          key: GOOGLE_CONFIG.apiKey,
        },
        timeout: 10000,
      })
    );
    
    return response.data.result;
  } catch (error) {
    console.error(`Error fetching details for place ${placeId}:`, error);
    throw error;
  }
}

// Resolve a place_id for a restaurant we only know by name/address
// (e.g. manually seeded rows that were never linked to Google Places)
export async function findPlaceIdByText(
  query: string
): Promise<{ placeId: string; businessStatus?: string } | null> {
  await checkAndIncrementUsage();

  const response = await rateLimiter(() =>
    client.findPlaceFromText({
      params: {
        input: query,
        inputtype: PlaceInputType.textQuery,
        fields: ['place_id', 'business_status', 'name', 'formatted_address'],
        locationbias: `circle:${KATY_SEARCH_CONFIG.radius}@${KATY_SEARCH_CONFIG.center.lat},${KATY_SEARCH_CONFIG.center.lng}`,
        key: GOOGLE_CONFIG.apiKey,
      },
      timeout: 10000,
    })
  );

  const candidate: any = response.data.candidates?.[0];
  if (!candidate?.place_id) {
    return null;
  }
  return { placeId: candidate.place_id, businessStatus: candidate.business_status };
}

// Fetch photo URL for a photo reference
export function getPhotoUrl(
  photoReference: string,
  maxWidth: number = 800,
  maxHeight: number = 600
): string {
  return `https://maps.googleapis.com/maps/api/place/photo?` +
    `maxwidth=${maxWidth}&maxheight=${maxHeight}&` +
    `photoreference=${photoReference}&key=${GOOGLE_CONFIG.apiKey}`;
}

// Fetch all food establishments in the Katy area (all types × all zones)
export async function fetchAllKatyRestaurants(): Promise<any[]> {
  const allRestaurants = new Map(); // Use Map to deduplicate by place_id

  const totalSearches = KATY_SEARCH_CONFIG.searchPoints.length * FOOD_PLACE_TYPES.length;
  let searchCount = 0;

  console.log(`Starting comprehensive food establishment search...`);
  console.log(`${KATY_SEARCH_CONFIG.searchPoints.length} zones × ${FOOD_PLACE_TYPES.length} types = ${totalSearches} searches`);

  for (const placeType of FOOD_PLACE_TYPES) {
    const beforeCount = allRestaurants.size;
    console.log(`\n--- Searching type: ${placeType} ---`);

    for (const point of KATY_SEARCH_CONFIG.searchPoints) {
      searchCount++;

      try {
        const restaurants = await fetchNearbyRestaurants(
          { lat: point.lat, lng: point.lng },
          5000, // 5km radius per point
          placeType
        );

        // Add to map using place_id as key to avoid duplicates
        restaurants.forEach(restaurant => {
          allRestaurants.set(restaurant.place_id, restaurant);
        });

        console.log(`[${searchCount}/${totalSearches}] ${placeType} @ ${point.name}: ${restaurants.length} results (total unique: ${allRestaurants.size})`);

        if (restaurants.length >= 60) {
          console.warn(`⚠️ SATURATION: ${placeType} @ ${point.name} hit 60-result cap. Some may be missed.`);
        }

        // Wait between searches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching ${placeType} near ${point.name}:`, error);
      }
    }

    const newFromType = allRestaurants.size - beforeCount;
    console.log(`Type "${placeType}" added ${newFromType} new unique places`);
  }

  const uniqueRestaurants = Array.from(allRestaurants.values());
  console.log(`\nTotal unique food establishments found: ${uniqueRestaurants.length}`);

  return uniqueRestaurants;
}

// Fetch detailed data for a list of restaurants
export async function fetchDetailedRestaurantData(
  restaurants: any[],
  onProgress?: (current: number, total: number) => void
): Promise<any[]> {
  const detailedData = [];
  
  for (let i = 0; i < restaurants.length; i++) {
    try {
      const details = await fetchPlaceDetails(restaurants[i].place_id);
      detailedData.push({
        ...restaurants[i],
        details,
      });
      
      if (onProgress) {
        onProgress(i + 1, restaurants.length);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to fetch details for ${restaurants[i].name}:`, error);
      // Continue with basic data if details fetch fails
      detailedData.push(restaurants[i]);
    }
  }
  
  return detailedData;
}

// Export daily usage stats (async now - uses database)
export async function getApiUsageStats() {
  const { getUsageStats } = await import('./rate-limiter');
  return getUsageStats();
}