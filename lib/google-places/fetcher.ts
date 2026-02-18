import client, { GOOGLE_CONFIG, KATY_SEARCH_CONFIG } from './client';
import pLimit from 'p-limit';
import { checkAndIncrementUsage } from './rate-limiter';

// Rate limiter to respect API limits
const rateLimiter = pLimit(GOOGLE_CONFIG.rateLimit);

// Fetch all restaurants near a specific point
export async function fetchNearbyRestaurants(
  location: { lat: number; lng: number },
  radius: number = 5000
): Promise<any[]> {
  await checkAndIncrementUsage();

  try {
    const response = await rateLimiter(() =>
      client.placesNearby({
        params: {
          location,
          radius,
          type: 'restaurant',
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
    console.error('Error fetching nearby restaurants:', error);
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

// Fetch all restaurants in the Katy area
export async function fetchAllKatyRestaurants(): Promise<any[]> {
  const allRestaurants = new Map(); // Use Map to avoid duplicates
  
  console.log('Starting to fetch restaurants from Katy area...');
  
  for (const point of KATY_SEARCH_CONFIG.searchPoints) {
    console.log(`Fetching restaurants near ${point.name}...`);
    
    try {
      const restaurants = await fetchNearbyRestaurants(
        { lat: point.lat, lng: point.lng },
        5000 // 5km radius for each point
      );
      
      // Add to map using place_id as key to avoid duplicates
      restaurants.forEach(restaurant => {
        allRestaurants.set(restaurant.place_id, restaurant);
      });
      
      console.log(`Found ${restaurants.length} restaurants near ${point.name}`);

      if (restaurants.length >= 60) {
        console.warn(`⚠️ SATURATION: ${point.name} returned ${restaurants.length} results (Google max). Some restaurants may be missed in this area.`);
      }

      // Wait between searches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching restaurants near ${point.name}:`, error);
    }
  }
  
  const uniqueRestaurants = Array.from(allRestaurants.values());
  console.log(`Total unique restaurants found: ${uniqueRestaurants.length}`);
  
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