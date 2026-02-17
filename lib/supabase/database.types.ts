/**
 * Shared types for the application.
 * These match the Prisma schema output after API transformation
 * (categories/photos are split into arrays by the API layer).
 */

// Stub Database type for legacy compatibility with old Supabase files
export type Database = any

export type Restaurant = {
  id: string
  name: string
  description?: string | null
  address: string
  city?: string
  state?: string
  zipCode?: string | null
  lat: number
  lng: number
  latitude?: number
  longitude?: number
  phone?: string | null
  website?: string | null
  categories: string[]
  cuisineTypes?: string[]
  hours?: Record<string, any> | null
  priceLevel: number
  photos: string[]
  featured: boolean
  active?: boolean
  source?: string | null
  googlePlaceId?: string | null
  rating?: number | null
  reviewCount?: number
  createdAt?: string
  updatedAt?: string
  distance?: number
  _count?: {
    reviews: number
    favorites: number
  }
}

export type Review = {
  id: string
  restaurantId: string
  userId: string
  rating: number
  text?: string | null
  title?: string | null
  photos?: string
  createdAt: string
}

export type User = {
  id: string
  name: string
  email: string
  createdAt: string
  role: string
  avatarUrl?: string | null
}

export type Favorite = {
  id: string
  userId: string
  restaurantId: string
  createdAt: string
}

export type Spin = {
  id: string
  userId?: string | null
  restaurantId: string
  spinParams?: Record<string, any> | null
  createdAt: string
}
