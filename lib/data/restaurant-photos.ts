// Restaurant photo lookup for the legacy seed path.
//
// This previously mapped restaurant names to Unsplash stock imagery, which
// misrepresented the actual establishments and was removed in the July 2026
// data audit. Authoritative photos come from the Google Places import
// (lib/google-places), which stores real Places Photo API URLs per
// restaurant and refreshes them via the nightly freshness watchdog.
// The UI renders a graceful placeholder for restaurants without photos.

export interface RestaurantPhotos {
  [restaurantName: string]: string[]
}

export const restaurantPhotos: RestaurantPhotos = {}

// Function to get photos for a restaurant
export function getRestaurantPhotos(restaurantName: string): string[] {
  return restaurantPhotos[restaurantName] || []
}

// Function to get a primary photo for a restaurant
export function getPrimaryPhoto(restaurantName: string): string | null {
  const photos = getRestaurantPhotos(restaurantName)
  return photos.length > 0 ? photos[0] : null
}
