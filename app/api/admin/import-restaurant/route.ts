import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Search for a restaurant by name using Google Places API
async function searchRestaurantByName(name: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('Google Maps API key not configured')

  // Text search for the restaurant in Katy, TX area
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name + ' Katy TX')}&key=${apiKey}`

  // Add timeout to prevent 502 errors
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(searchUrl, { signal: controller.signal })
    clearTimeout(timeoutId)
    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null
    }

    return data.results[0] // Return the first (best) match
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Google Places search timed out')
    }
    throw error
  }
}

// Get detailed information about a place
async function getPlaceDetails(placeId: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('Google Maps API key not configured')

  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'geometry',
    'formatted_phone_number',
    'website',
    'opening_hours',
    'price_level',
    'rating',
    'user_ratings_total',
    'types',
    'photos',
    'business_status',
    'url'
  ].join(',')

  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`

  // Add timeout to prevent 502 errors
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(detailsUrl, { signal: controller.signal })
    clearTimeout(timeoutId)
    const data = await response.json()

    if (data.status !== 'OK' || !data.result) {
      throw new Error(`Failed to get place details: ${data.status}`)
    }

    return data.result
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Google Places details fetch timed out')
    }
    throw error
  }
}

// Transform Google Place data to our restaurant format
function transformPlaceToRestaurant(place: any) {
  // Parse address
  const addressParts = place.formatted_address?.split(',') || []
  const address = addressParts[0] || ''
  const city = addressParts[1]?.trim() || 'Katy'
  const stateZip = addressParts[2]?.trim() || 'TX 77494'
  const [state, zipCode] = stateZip.split(' ')

  // Parse hours
  let hours: any = {}
  if (place.opening_hours?.weekday_text) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    place.opening_hours.weekday_text.forEach((text: string, index: number) => {
      const [, hoursText] = text.split(': ')
      hours[days[index]] = hoursText || 'Closed'
    })
  }

  // Get photos
  const photos = place.photos?.slice(0, 10).map((photo: any) => 
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&maxheight=800&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
  ) || []

  // Determine cuisine types
  const cuisineTypes = place.types
    ?.filter((t: string) => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t))
    .map((t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()))
    .join(',') || 'Restaurant'

  return {
    name: place.name,
    slug: place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: `${place.name} is a popular restaurant in ${city}, Texas.`,
    address,
    city,
    state: state || 'TX',
    zipCode: zipCode || '77494',
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    phone: place.formatted_phone_number || null,
    website: place.website || null,
    categories: 'Food,Restaurant',
    cuisineTypes,
    hours: JSON.stringify(hours),
    priceLevel: place.price_level ? ['BUDGET', 'MODERATE', 'UPSCALE', 'PREMIUM'][place.price_level - 1] : 'MODERATE',
    photos: photos.join(','),
    logoUrl: photos[0] || null,
    rating: place.rating || null,
    reviewCount: place.user_ratings_total || 0,
    source: 'google_places',
    sourceId: place.place_id,
    verified: true,
    active: true,
    metadata: JSON.stringify({
      google_url: place.url,
      google_rating: place.rating,
      google_user_ratings_total: place.user_ratings_total,
      google_business_status: place.business_status,
      google_types: place.types,
      last_google_update: new Date().toISOString()
    })
  }
}

// POST - Import a restaurant by name
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_API_KEY
    
    if (!authHeader || !adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { restaurantName } = body

    if (!restaurantName || typeof restaurantName !== 'string') {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Searching for restaurant: "${restaurantName}"`)

    // Step 1: Search for the restaurant
    const searchResult = await searchRestaurantByName(restaurantName)
    
    if (!searchResult) {
      return NextResponse.json(
        { 
          error: 'Restaurant not found',
          message: `Could not find "${restaurantName}" in Katy, TX area. Try a different search term.`
        },
        { status: 404 }
      )
    }

    console.log(`✅ Found: ${searchResult.name} (${searchResult.place_id})`)

    // Step 2: Get detailed information
    const placeDetails = await getPlaceDetails(searchResult.place_id)
    
    console.log(`📊 Retrieved detailed information for ${placeDetails.name}`)

    // Step 3: Check if restaurant already exists
    const existing = await prisma.restaurant.findFirst({
      where: {
        OR: [
          { sourceId: placeDetails.place_id },
          { 
            AND: [
              { name: { contains: placeDetails.name.split(' ')[0] } },
              { address: { contains: placeDetails.formatted_address?.split(',')[0] || '' } }
            ]
          }
        ]
      }
    })

    // Step 4: Transform and save
    const restaurantData = transformPlaceToRestaurant(placeDetails)

    let restaurant
    if (existing) {
      console.log(`🔄 Updating existing restaurant: ${existing.name}`)
      restaurant = await prisma.restaurant.update({
        where: { id: existing.id },
        data: {
          ...restaurantData,
          lastVerified: new Date(),
          updatedAt: new Date()
        }
      })
    } else {
      console.log(`✨ Creating new restaurant: ${restaurantData.name}`)
      restaurant = await prisma.restaurant.create({
        data: {
          ...restaurantData,
          lastVerified: new Date()
        }
      })
    }

    console.log(`✅ Successfully imported: ${restaurant.name}`)

    // Verify the restaurant was saved correctly
    const verification = await prisma.restaurant.findUnique({
      where: { id: restaurant.id }
    })

    if (!verification) {
      throw new Error('Restaurant was not saved to database')
    }

    console.log(`✓ Verified in database: ${verification.slug}`)

    return NextResponse.json({
      success: true,
      action: existing ? 'updated' : 'created',
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        rating: restaurant.rating,
        reviewCount: restaurant.reviewCount,
        cuisineTypes: restaurant.cuisineTypes,
        priceLevel: restaurant.priceLevel,
        active: restaurant.active,
        verified: restaurant.verified
      },
      url: `/restaurants/${restaurant.slug}`
    })

  } catch (error: any) {
    console.error('❌ Import failed:', error)
    return NextResponse.json(
      { error: 'Import failed', message: error.message },
      { status: 500 }
    )
  }
}

// GET - Search for restaurants without importing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({
        message: 'Restaurant import endpoint',
        usage: {
          search: 'GET /api/admin/import-restaurant?q=restaurant+name',
          import: 'POST /api/admin/import-restaurant with { "restaurantName": "name" }'
        }
      })
    }

    // Search without importing
    const searchResult = await searchRestaurantByName(query)
    
    if (!searchResult) {
      return NextResponse.json(
        { error: 'Not found', message: `No results for "${query}" in Katy, TX` },
        { status: 404 }
      )
    }

    // Check if already in database
    const existing = await prisma.restaurant.findFirst({
      where: { sourceId: searchResult.place_id }
    })

    return NextResponse.json({
      found: true,
      restaurant: {
        name: searchResult.name,
        address: searchResult.formatted_address,
        placeId: searchResult.place_id,
        rating: searchResult.rating,
        inDatabase: !!existing,
        databaseId: existing?.id
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Search failed', message: error.message },
      { status: 500 }
    )
  }
}
