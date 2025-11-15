import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Increase timeout for long-running sync operations
// This tells Next.js/Vercel that this route can take longer
export const maxDuration = 300 // 5 minutes

// Katy, TX coordinates
const KATY_CENTER = { lat: 29.7858, lng: -95.8244 }
const SEARCH_RADIUS = 10000 // 10km radius

interface RestaurantSource {
  name: string
  fetch: () => Promise<any[]>
  transform: (data: any) => any
}

// Google Places API
async function fetchGooglePlaces() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('Google Maps API key not configured')

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${KATY_CENTER.lat},${KATY_CENTER.lng}&radius=${SEARCH_RADIUS}&type=restaurant&key=${apiKey}`

  // Add timeout to prevent 502 errors
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    const data = await response.json()

    let allResults = data.results || []
    let nextPageToken = data.next_page_token

    // Fetch additional pages
    while (nextPageToken && allResults.length < 200) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Required delay
      const nextUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${apiKey}`

      const nextController = new AbortController()
      const nextTimeoutId = setTimeout(() => nextController.abort(), 30000)

      try {
        const nextResponse = await fetch(nextUrl, { signal: nextController.signal })
        clearTimeout(nextTimeoutId)
        const nextData = await nextResponse.json()

        if (nextData.results) {
          allResults = [...allResults, ...nextData.results]
        }
        nextPageToken = nextData.next_page_token
      } catch (error) {
        clearTimeout(nextTimeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Google Places pagination request timed out')
          break
        }
        throw error
      }
    }

    return allResults
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Google Places API request timed out')
    }
    throw error
  }
}

// Yelp Fusion API
async function fetchYelpBusinesses() {
  const apiKey = process.env.YELP_API_KEY
  if (!apiKey) {
    console.log('⚠️  Yelp API key not configured, skipping Yelp data')
    return []
  }

  const results: any[] = []
  const categories = 'restaurants,food'
  
  // Yelp allows max 50 results per request, offset up to 1000
  for (let offset = 0; offset < 200; offset += 50) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const url = `https://api.yelp.com/v3/businesses/search?latitude=${KATY_CENTER.lat}&longitude=${KATY_CENTER.lng}&radius=${SEARCH_RADIUS}&categories=${categories}&limit=50&offset=${offset}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) break

      const data = await response.json()
      if (data.businesses && data.businesses.length > 0) {
        results.push(...data.businesses)
      } else {
        break
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Yelp API request timed out at offset', offset)
        break
      }
      console.error('Yelp API error:', error)
      break
    }
  }
  
  return results
}

// Foursquare Places API
async function fetchFoursquarePlaces() {
  const apiKey = process.env.FOURSQUARE_API_KEY
  if (!apiKey) {
    console.log('⚠️  Foursquare API key not configured, skipping Foursquare data')
    return []
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const url = `https://api.foursquare.com/v3/places/search?ll=${KATY_CENTER.lat},${KATY_CENTER.lng}&radius=${SEARCH_RADIUS}&categories=13000&limit=50`

    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log('⚠️  Foursquare API error, skipping')
      return []
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Foursquare API request timed out')
      return []
    }
    console.error('Foursquare API error:', error)
    return []
  }
}

// OpenStreetMap Overpass API (Free, no key required)
async function fetchOpenStreetMapPlaces() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 35000) // 35 second timeout (Overpass has 25s internal timeout)

  try {
    // Overpass query for restaurants in Katy area
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"](around:${SEARCH_RADIUS},${KATY_CENTER.lat},${KATY_CENTER.lng});
        way["amenity"="restaurant"](around:${SEARCH_RADIUS},${KATY_CENTER.lat},${KATY_CENTER.lng});
      );
      out body;
      >;
      out skel qt;
    `

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log('⚠️  OpenStreetMap API error, skipping')
      return []
    }

    const data = await response.json()
    return data.elements || []
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('OpenStreetMap API request timed out')
      return []
    }
    console.error('OpenStreetMap API error:', error)
    return []
  }
}

// Transform functions for each source
function transformGooglePlace(place: any) {
  return {
    source: 'google_places',
    sourceId: place.place_id,
    name: place.name,
    address: place.vicinity || '',
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    rating: place.rating,
    reviewCount: place.user_ratings_total || 0,
    priceLevel: place.price_level ? ['BUDGET', 'MODERATE', 'UPSCALE', 'PREMIUM'][place.price_level - 1] : 'MODERATE',
    cuisineTypes: place.types?.filter((t: string) => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t)).join(',') || 'Restaurant',
    phone: place.formatted_phone_number,
    website: place.website,
  }
}

function transformYelpBusiness(business: any) {
  return {
    source: 'yelp',
    sourceId: business.id,
    name: business.name,
    address: business.location?.address1 || '',
    latitude: business.coordinates?.latitude,
    longitude: business.coordinates?.longitude,
    rating: business.rating,
    reviewCount: business.review_count || 0,
    priceLevel: business.price ? (['$', '$$', '$$$', '$$$$'].includes(business.price) ? { '$': 'BUDGET', '$$': 'MODERATE', '$$$': 'UPSCALE', '$$$$': 'PREMIUM' }[business.price as '$' | '$$' | '$$$' | '$$$$'] : 'MODERATE') : 'MODERATE',
    cuisineTypes: business.categories?.map((c: any) => c.title).join(',') || 'Restaurant',
    phone: business.phone,
    website: business.url,
  }
}

function transformFoursquarePlace(place: any) {
  return {
    source: 'foursquare',
    sourceId: place.fsq_id,
    name: place.name,
    address: place.location?.formatted_address || '',
    latitude: place.geocodes?.main?.latitude,
    longitude: place.geocodes?.main?.longitude,
    rating: place.rating ? place.rating / 2 : null, // Foursquare uses 0-10 scale
    reviewCount: place.stats?.total_ratings || 0,
    priceLevel: place.price ? ['BUDGET', 'MODERATE', 'UPSCALE', 'PREMIUM'][place.price - 1] : 'MODERATE',
    cuisineTypes: place.categories?.map((c: any) => c.name).join(',') || 'Restaurant',
    phone: place.tel,
    website: place.website,
  }
}

function transformOSMPlace(element: any) {
  return {
    source: 'openstreetmap',
    sourceId: `osm_${element.id}`,
    name: element.tags?.name || 'Unknown Restaurant',
    address: [element.tags?.['addr:street'], element.tags?.['addr:housenumber']].filter(Boolean).join(' '),
    latitude: element.lat,
    longitude: element.lon,
    rating: null,
    reviewCount: 0,
    priceLevel: 'MODERATE',
    cuisineTypes: element.tags?.cuisine || 'Restaurant',
    phone: element.tags?.phone,
    website: element.tags?.website,
  }
}

// Deduplicate restaurants by name and location
function deduplicateRestaurants(restaurants: any[]) {
  const seen = new Map()
  const deduplicated: any[] = []
  
  for (const restaurant of restaurants) {
    if (!restaurant.name || !restaurant.latitude || !restaurant.longitude) continue
    
    // Create a key based on normalized name and approximate location
    const normalizedName = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const latRounded = Math.round(restaurant.latitude * 1000) / 1000
    const lngRounded = Math.round(restaurant.longitude * 1000) / 1000
    const key = `${normalizedName}_${latRounded}_${lngRounded}`
    
    if (!seen.has(key)) {
      seen.set(key, true)
      deduplicated.push(restaurant)
    } else {
      // Merge data from duplicate (prefer higher quality source)
      const existing = deduplicated.find(r => {
        const existingKey = `${r.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.round(r.latitude * 1000) / 1000}_${Math.round(r.longitude * 1000) / 1000}`
        return existingKey === key
      })
      
      if (existing) {
        // Merge missing fields
        if (!existing.phone && restaurant.phone) existing.phone = restaurant.phone
        if (!existing.website && restaurant.website) existing.website = restaurant.website
        if (!existing.rating && restaurant.rating) existing.rating = restaurant.rating
        if (restaurant.reviewCount > existing.reviewCount) existing.reviewCount = restaurant.reviewCount
      }
    }
  }
  
  return deduplicated
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_API_KEY
    
    if (!authHeader || !adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 Starting multi-source restaurant sync...')
    
    const stats = {
      sources: {} as Record<string, number>,
      discovered: 0,
      deduplicated: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Fetch from all sources in parallel
    const [googlePlaces, yelpBusinesses, foursquarePlaces, osmPlaces] = await Promise.all([
      fetchGooglePlaces().catch(err => { stats.errors.push(`Google: ${err.message}`); return [] }),
      fetchYelpBusinesses().catch(err => { stats.errors.push(`Yelp: ${err.message}`); return [] }),
      fetchFoursquarePlaces().catch(err => { stats.errors.push(`Foursquare: ${err.message}`); return [] }),
      fetchOpenStreetMapPlaces().catch(err => { stats.errors.push(`OSM: ${err.message}`); return [] })
    ])

    stats.sources['google_places'] = googlePlaces.length
    stats.sources['yelp'] = yelpBusinesses.length
    stats.sources['foursquare'] = foursquarePlaces.length
    stats.sources['openstreetmap'] = osmPlaces.length

    console.log('📊 Source counts:', stats.sources)

    // Transform all data
    const allRestaurants = [
      ...googlePlaces.map(transformGooglePlace),
      ...yelpBusinesses.map(transformYelpBusiness),
      ...foursquarePlaces.map(transformFoursquarePlace),
      ...osmPlaces.map(transformOSMPlace)
    ]

    stats.discovered = allRestaurants.length
    console.log(`📍 Total discovered: ${stats.discovered}`)

    // Deduplicate
    const uniqueRestaurants = deduplicateRestaurants(allRestaurants)
    stats.deduplicated = stats.discovered - uniqueRestaurants.length
    console.log(`🔄 Deduplicated: ${stats.deduplicated} duplicates removed`)
    console.log(`✨ Unique restaurants: ${uniqueRestaurants.length}`)

    // Import to database
    for (const restaurant of uniqueRestaurants) {
      try {
        const slug = restaurant.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        // Check if exists by source
        const existing = await prisma.restaurant.findFirst({
          where: {
            OR: [
              { sourceId: restaurant.sourceId },
              { slug: slug }
            ]
          }
        })

        if (existing) {
          // Update existing
          await prisma.restaurant.update({
            where: { id: existing.id },
            data: {
              name: restaurant.name,
              address: restaurant.address || existing.address,
              latitude: restaurant.latitude || existing.latitude,
              longitude: restaurant.longitude || existing.longitude,
              phone: restaurant.phone || existing.phone,
              website: restaurant.website || existing.website,
              rating: restaurant.rating || existing.rating,
              reviewCount: restaurant.reviewCount || existing.reviewCount,
              priceLevel: restaurant.priceLevel || existing.priceLevel,
              cuisineTypes: restaurant.cuisineTypes || existing.cuisineTypes,
              lastVerified: new Date()
            }
          })
          stats.updated++
        } else {
          // Create new
          await prisma.restaurant.create({
            data: {
              name: restaurant.name,
              slug: slug,
              address: restaurant.address || 'Katy, TX',
              city: 'Katy',
              state: 'TX',
              zipCode: '77494',
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
              phone: restaurant.phone,
              website: restaurant.website,
              categories: 'Food,Restaurant',
              cuisineTypes: restaurant.cuisineTypes,
              hours: JSON.stringify({}),
              priceLevel: restaurant.priceLevel,
              photos: '',
              rating: restaurant.rating,
              reviewCount: restaurant.reviewCount,
              source: restaurant.source,
              sourceId: restaurant.sourceId,
              verified: restaurant.source === 'google_places',
              active: true,
              lastVerified: new Date()
            }
          })
          stats.created++
        }
      } catch (error: any) {
        stats.failed++
        console.error(`Failed to import ${restaurant.name}:`, error.message)
      }
    }

    console.log('✅ Multi-source sync completed')
    console.log(`Created: ${stats.created}, Updated: ${stats.updated}, Failed: ${stats.failed}`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats
    })

  } catch (error: any) {
    console.error('❌ Multi-source sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', message: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Multi-source restaurant sync endpoint',
    sources: ['Google Places', 'Yelp', 'Foursquare', 'OpenStreetMap'],
    method: 'POST',
    authentication: 'Bearer token required'
  })
}
