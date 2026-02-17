'use client'

import { useState, useEffect, useRef } from 'react'
import { Restaurant } from '@/lib/supabase/database.types'
import { MapPin, Navigation, X, Star, DollarSign, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface RestaurantMapProps {
  restaurants: Restaurant[]
  filters?: {
    categories: string[]
    priceLevel: number[]
  }
}

interface MarkerData {
  restaurant: Restaurant
  position: { lat: number; lng: number }
}

export default function RestaurantMap({ restaurants, filters }: RestaurantMapProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState({ lat: 29.7858, lng: -95.8278 }) // Katy, TX
  const [zoom, setZoom] = useState(12)
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Simulate geocoding - in production, you'd use actual geocoding API
  const geocodeRestaurant = (restaurant: Restaurant): { lat: number; lng: number } => {
    // Generate pseudo-random but consistent coordinates around Katy, TX
    const hash = restaurant.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const latOffset = ((hash % 100) / 1000) - 0.05 // ±0.05 degrees
    const lngOffset = ((hash % 73) / 730) - 0.05

    return {
      lat: 29.7858 + latOffset,
      lng: -95.8278 + lngOffset
    }
  }

  useEffect(() => {
    // Generate markers for all restaurants
    const newMarkers = restaurants.map(restaurant => ({
      restaurant,
      position: geocodeRestaurant(restaurant)
    }))
    setMarkers(newMarkers)
  }, [restaurants])

  const handleGetUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setUserLocation(location)
          setMapCenter(location)
          setZoom(14)
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Unable to get your location. Please enable location services.')
        }
      )
    } else {
      alert('Geolocation is not supported by your browser')
    }
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const getNearestRestaurants = () => {
    if (!userLocation) return []

    return markers
      .map(marker => ({
        ...marker,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          marker.position.lat,
          marker.position.lng
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
  }

  const handleGetDirections = (restaurant: Restaurant, position: { lat: number; lng: number }) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${position.lat},${position.lng}&destination_place_id=${restaurant.name}`
    window.open(googleMapsUrl, '_blank')
  }

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-100 rounded-lg overflow-hidden">
      {/* Map Container - Simplified SVG Map for now */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50"
      >
        {/* Map Background Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Restaurant Markers */}
        {markers.map((marker, index) => {
          // Convert lat/lng to pixel position (simplified)
          const x = ((marker.position.lng - (mapCenter.lng - 0.1)) / 0.2) * 100
          const y = ((mapCenter.lat + 0.1 - marker.position.lat) / 0.2) * 100

          if (x < 0 || x > 100 || y < 0 || y > 100) return null

          return (
            <button
              key={marker.restaurant.id}
              onClick={() => setSelectedRestaurant(marker.restaurant)}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer group hover:z-10 transition-transform hover:scale-110"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
            >
              {/* Marker Pin */}
              <div className="relative">
                <MapPin
                  className={`w-8 h-8 ${
                    selectedRestaurant?.id === marker.restaurant.id
                      ? 'text-red-600 fill-red-500'
                      : 'text-red-500 fill-red-400'
                  } drop-shadow-lg`}
                />
                {/* Marker Label */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white px-2 py-1 rounded shadow-lg text-xs font-medium whitespace-nowrap">
                    {marker.restaurant.name}
                  </div>
                </div>
              </div>
            </button>
          )
        })}

        {/* User Location Marker */}
        {userLocation && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{
              left: `${((userLocation.lng - (mapCenter.lng - 0.1)) / 0.2) * 100}%`,
              top: `${((mapCenter.lat + 0.1 - userLocation.lat) / 0.2) * 100}%`,
            }}
          >
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
              <div className="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75"></div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col sm:flex-row gap-3">
        {/* Near Me Button */}
        <button
          onClick={handleGetUserLocation}
          className="btn-primary px-6 py-3 shadow-lg flex items-center justify-center space-x-2 min-h-[44px]"
        >
          <Navigation size={20} />
          <span>Near Me</span>
        </button>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-lg px-4 py-3 flex items-center justify-center min-h-[44px]">
          <span className="font-semibold text-gray-900">
            {markers.length} restaurant{markers.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Nearest Restaurants List (when user location is set) */}
      {userLocation && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-white rounded-lg shadow-2xl p-4 max-h-48 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Navigation size={18} className="mr-2 text-brand-500" />
            Nearest Restaurants
          </h3>
          <div className="space-y-2">
            {getNearestRestaurants().map((marker) => (
              <button
                key={marker.restaurant.id}
                onClick={() => setSelectedRestaurant(marker.restaurant)}
                className="w-full text-left p-2 hover:bg-gray-50 rounded transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {marker.restaurant.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {marker.distance.toFixed(1)} miles away
                    </p>
                  </div>
                  <MapPin size={16} className="text-red-500 ml-2 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Restaurant Detail Popup */}
      {selectedRestaurant && (
        <div className="absolute inset-0 z-20 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-slide-up max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="relative p-6 border-b border-gray-200">
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-gray-900 pr-12 mb-2">
                {selectedRestaurant.name}
              </h2>

              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center text-gray-600">
                  {selectedRestaurant.rating ? (
                    <>
                      <Star size={16} className="text-yellow-400 fill-yellow-400 mr-1" />
                      <span className="font-medium">
                        {selectedRestaurant.rating.toFixed(1)}
                      </span>
                      <span className="ml-1">
                        ({selectedRestaurant.reviewCount || 0})
                      </span>
                    </>
                  ) : (
                    <span>No reviews yet</span>
                  )}
                </div>

                <div className="flex items-center text-gray-600">
                  <DollarSign size={16} className="text-green-500 mr-1" />
                  <span>{'$'.repeat(selectedRestaurant.priceLevel)}</span>
                </div>
              </div>

              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  {selectedRestaurant.categories.join(', ')}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {selectedRestaurant.address && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                  <p className="text-gray-900">{selectedRestaurant.address}</p>
                </div>
              )}

              {selectedRestaurant.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                  <a
                    href={`tel:${selectedRestaurant.phone}`}
                    className="text-brand-600 hover:underline"
                  >
                    {selectedRestaurant.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 space-y-3">
              <Link
                href={`/restaurant/${selectedRestaurant.id}`}
                className="block w-full btn-primary py-3 text-center"
              >
                View Full Details
              </Link>

              <button
                onClick={() =>
                  handleGetDirections(
                    selectedRestaurant,
                    geocodeRestaurant(selectedRestaurant)
                  )
                }
                className="w-full px-6 py-3 border-2 border-brand-500 text-brand-600 rounded-lg hover:bg-brand-50 transition-colors font-medium flex items-center justify-center space-x-2 min-h-[44px]"
              >
                <Navigation size={18} />
                <span>Get Directions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setZoom(Math.min(zoom + 1, 18))}
          className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-xl"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(zoom - 1, 8))}
          className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-xl"
        >
          −
        </button>
      </div>
    </div>
  )
}
