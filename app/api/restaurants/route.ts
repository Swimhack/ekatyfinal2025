import { NextRequest, NextResponse } from 'next/server'
import { searchRestaurants } from '@/lib/search/search-restaurants'
import { parsePhotos } from '@/lib/photos/parse-photos'
import { filterDisplayPhotos } from '@/lib/photos/photo-policy'

export const dynamic = 'force-dynamic'

function normalizeRestaurantPhotos<T>(restaurant: T): T {
  if (!restaurant || typeof restaurant !== 'object' || !('photos' in restaurant)) {
    return restaurant
  }

  return {
    ...restaurant,
    photos: filterDisplayPhotos(parsePhotos((restaurant as { photos: unknown }).photos)),
  } as T
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const result = await searchRestaurants({
      q: searchParams.get('q'),
      category: searchParams.get('category'),
      priceLevel: searchParams.get('priceLevel'),
      featured: searchParams.get('featured') === 'true',
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radius: searchParams.get('radius'),
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: searchParams.get('sortBy'),
    })

    const normalizedResult = Array.isArray(result)
      ? result.map(normalizeRestaurantPhotos)
      : result && typeof result === 'object' && Array.isArray(result.restaurants)
        ? {
            ...result,
            restaurants: result.restaurants.map(normalizeRestaurantPhotos),
          }
        : result

    return NextResponse.json(normalizedResult)

  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    )
  }
}
