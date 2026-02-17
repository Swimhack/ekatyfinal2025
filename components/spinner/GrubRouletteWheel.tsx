'use client'

import { useState, useRef, useEffect } from 'react'
import { Restaurant } from '@/lib/supabase/database.types'
import { useRouter } from 'next/navigation'

interface GrubRouletteWheelProps {
  restaurants: Restaurant[]
  filters: {
    categories: string[]
    priceLevel: number[]
  }
}

export default function GrubRouletteWheel({
  restaurants,
  filters,
}: GrubRouletteWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [showResult, setShowResult] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const spinWheel = async () => {
    if (spinning || restaurants.length === 0) return

    setSpinning(true)
    setShowResult(false)
    setSelectedRestaurant(null)

    try {
      // Call API to get random restaurant
      const params = new URLSearchParams()
      if (filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','))
      }
      if (filters.priceLevel.length > 0) {
        params.append('priceLevel', filters.priceLevel.join(','))
      }

      const response = await fetch(`/api/spinner?${params.toString()}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to spin')
      }

      const data = await response.json()
      const restaurant = data.restaurant

      // Calculate spins: 5 full rotations + random offset
      const fullRotations = 5
      const randomOffset = Math.random() * 360
      const totalRotation = fullRotations * 360 + randomOffset

      // Animate the wheel
      setRotation((prev) => prev + totalRotation)

      // Wait for animation to complete (3 seconds)
      setTimeout(() => {
        setSelectedRestaurant(restaurant)
        setShowResult(true)
        setSpinning(false)
      }, 3000)
    } catch (error) {
      console.error('Error spinning wheel:', error)
      setSpinning(false)
    }
  }

  const handleViewRestaurant = () => {
    if (selectedRestaurant) {
      router.push(`/restaurant/${selectedRestaurant.id}`)
    }
  }

  const handleSpinAgain = () => {
    setShowResult(false)
    setSelectedRestaurant(null)
  }

  const wheelColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
  ]

  return (
    <div className="flex flex-col items-center">
      {/* Wheel Container */}
      <div className="relative w-full max-w-md aspect-square mb-8">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-red-600 drop-shadow-lg"></div>
        </div>

        {/* Wheel */}
        <div
          ref={wheelRef}
          className="relative w-full h-full rounded-full shadow-2xl overflow-hidden border-8 border-white"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
              : 'none',
          }}
        >
          {/* Wheel Segments */}
          <div className="absolute inset-0">
            {wheelColors.map((color, index) => {
              const angle = (360 / wheelColors.length) * index
              return (
                <div
                  key={index}
                  className={`absolute inset-0 ${color} origin-center`}
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${
                      50 + 50 * Math.sin((angle * Math.PI) / 180)
                    }% ${50 - 50 * Math.cos((angle * Math.PI) / 180)}%)`,
                    transform: `rotate(${(360 / wheelColors.length) * index}deg)`,
                  }}
                >
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-white font-bold text-lg rotate-0">
                    🍽️
                  </div>
                </div>
              )
            })}
          </div>

          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full shadow-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">
              {spinning ? '🎰' : '🎲'}
            </span>
          </div>
        </div>
      </div>

      {/* Spin Button */}
      {!showResult && (
        <button
          onClick={spinWheel}
          disabled={spinning || restaurants.length === 0}
          className="btn-primary text-xl px-12 py-4 min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-transform"
        >
          {spinning ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Spinning...
            </span>
          ) : restaurants.length === 0 ? (
            'No Restaurants Available'
          ) : (
            '🎰 Spin the Wheel!'
          )}
        </button>
      )}

      {/* Result Modal */}
      {showResult && selectedRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Your Perfect Match!
              </h2>
              <p className="text-gray-600">Grub Roulette has spoken!</p>
            </div>

            <div className="card mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedRestaurant.name}
              </h3>
              <p className="text-gray-600 mb-3">
                {selectedRestaurant.categories.join(', ')} •{' '}
                {'$'.repeat(selectedRestaurant.priceLevel)}
              </p>
              <div className="flex items-center">
                {selectedRestaurant.rating ? (
                  <>
                    <span className="text-yellow-400 text-lg">
                      {'★'.repeat(Math.floor(selectedRestaurant.rating))}
                    </span>
                    <span className="text-gray-600 ml-2 text-sm">
                      ({selectedRestaurant.reviewCount || 0} reviews)
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm">No reviews yet</span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleViewRestaurant}
                className="flex-1 btn-primary py-3 min-h-[44px]"
              >
                View Restaurant
              </button>
              <button
                onClick={handleSpinAgain}
                className="flex-1 px-6 py-3 border-2 border-brand-500 text-brand-600 rounded-lg hover:bg-brand-50 transition-colors min-h-[44px] font-medium"
              >
                Spin Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Text */}
      <p className="text-center text-gray-600 mt-6 max-w-md">
        {restaurants.length > 0 ? (
          <>
            Can&apos;t decide where to eat? Let fate choose from{' '}
            <span className="font-semibold text-brand-600">
              {restaurants.length}
            </span>{' '}
            {filters.categories.length > 0 || filters.priceLevel.length > 0
              ? 'filtered '
              : ''}
            restaurants!
          </>
        ) : (
          <>No restaurants match your filters. Try adjusting your selection!</>
        )}
      </p>
    </div>
  )
}
