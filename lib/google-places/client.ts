import { Client } from '@googlemaps/google-maps-services-js';

// Initialize the Google Maps client
const client = new Client({});

// Configuration
export const GOOGLE_CONFIG = {
  apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  placesApiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  rateLimit: parseInt(process.env.GOOGLE_PLACES_RATE_LIMIT || '50'),
  dailyLimit: parseInt(process.env.GOOGLE_PLACES_DAILY_LIMIT || '45000'),
};

// Katy, TX search configuration
// 24-point hex grid covering 10-mile radius around zip codes 77493, 77494, 77450
// Each point uses 5km radius with overlap to ensure complete coverage
// and stay under Google's 60-result-per-query cap
export const KATY_SEARCH_CONFIG = {
  center: { lat: 29.770, lng: -95.802 },
  radius: 16000, // 16km = ~10 miles overall coverage
  searchPoints: [
    // Row 1 (North) — lat ~29.833
    { lat: 29.833, lng: -95.875, name: 'NW Katy / Waller' },
    { lat: 29.833, lng: -95.802, name: 'North Katy / Morton Ranch' },
    { lat: 29.833, lng: -95.729, name: 'NE Katy / Bear Creek' },

    // Row 2 — lat ~29.801 (hex offset)
    { lat: 29.801, lng: -95.911, name: 'West FM 1463' },
    { lat: 29.801, lng: -95.838, name: 'Katy-Hockley / 99' },
    { lat: 29.801, lng: -95.765, name: 'Downtown Katy / I-10' },
    { lat: 29.801, lng: -95.692, name: 'East Katy / Energy Corridor' },

    // Row 3 — lat ~29.770 (center row)
    { lat: 29.770, lng: -95.875, name: 'Fulshear North' },
    { lat: 29.770, lng: -95.802, name: 'Katy Center / Katy Mills' },
    { lat: 29.770, lng: -95.729, name: 'Mason Road / LaCenterra' },
    { lat: 29.770, lng: -95.656, name: 'Barker Cypress' },

    // Row 4 — lat ~29.738 (hex offset)
    { lat: 29.738, lng: -95.911, name: 'Fulshear / FM 1093' },
    { lat: 29.738, lng: -95.838, name: 'Cinco Ranch West' },
    { lat: 29.738, lng: -95.765, name: 'Cinco Ranch Center' },
    { lat: 29.738, lng: -95.692, name: 'Seven Meadows' },

    // Row 5 — lat ~29.707
    { lat: 29.707, lng: -95.875, name: 'South Fulshear' },
    { lat: 29.707, lng: -95.802, name: 'Firethorne / Cinco SW' },
    { lat: 29.707, lng: -95.729, name: 'Cinco Ranch South' },
    { lat: 29.707, lng: -95.656, name: 'SW Houston / Westheimer' },

    // Row 6 (South) — lat ~29.675
    { lat: 29.675, lng: -95.838, name: 'South Katy / 99' },
    { lat: 29.675, lng: -95.765, name: 'Pecan Grove' },

    // Density points for known commercial hotspots
    { lat: 29.786, lng: -95.824, name: 'Old Katy / Avenue D' },
    { lat: 29.756, lng: -95.786, name: 'Cinco Ranch Blvd' },
  ],
};

// Validate API key is present
export function validateApiKey(): boolean {
  if (!GOOGLE_CONFIG.apiKey) {
    console.error('Google Maps API key is not configured');
    return false;
  }
  return true;
}

// Export configured client
export default client;