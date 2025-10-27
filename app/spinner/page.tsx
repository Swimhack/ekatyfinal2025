'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSound } from '@/hooks/useSound'

const categories = [
  'Mexican', 'BBQ', 'Asian', 'American', 
  'Seafood', 'Indian', 'Greek', 'Breakfast'
]

const priceLevels = [
  { value: 'BUDGET', label: '$', description: 'Budget-friendly' },
  { value: 'MODERATE', label: '$$', description: 'Moderate' },
  { value: 'UPSCALE', label: '$$$', description: 'Upscale' },
  { value: 'PREMIUM', label: '$$$$', description: 'Premium' }
]

export default function SpinnerPage() {
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  
  // Sound effects
  const spinSound = useSound('/sounds/spin.mp3', { volume: 0.5 })
  const winSound = useSound('/sounds/win.mp3', { volume: 0.7 })
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<string | null>(null)
  const [radius, setRadius] = useState(5)

  const handleSpin = async () => {
    if (isSpinning) return
    
    setIsSpinning(true)
    setError(null)
    setResult(null)
    
    // Play spin sound
    if (soundEnabled) {
      spinSound.play()
    }
    
    // Prepare the request
    const spinData = {
      categories: selectedCategories,
      priceLevel: selectedPriceLevel,
      radius,
      excludeIds: history.map(h => h.id), // Don't repeat recent results
      openNow: false, // Could add time-based logic
    }
    
    try {
      const response = await fetch('/api/spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(spinData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to spin')
      }
      
      const data = await response.json()
      
      // Simulate spinning animation
      setTimeout(() => {
        setResult(data.restaurant)
        setHistory(prev => [data.restaurant, ...prev.slice(0, 4)])
        setIsSpinning(false)
        
        // Play win sound
        if (soundEnabled) {
          spinSound.stop()
          winSound.play()
        }
      }, 3000)
      
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setIsSpinning(false)
    }
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const resetFilters = () => {
    setSelectedCategories([])
    setSelectedPriceLevel(null)
    setRadius(5)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🎰 Grub Roulette
          </h1>
          <p className="text-xl text-gray-600">
            Can't decide where to eat? Let the wheel decide!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Filters Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Spin Filters</h2>
              
              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedCategories.includes(cat)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Price Level */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Price Level</h3>
                <div className="grid grid-cols-2 gap-2">
                  {priceLevels.map(level => (
                    <button
                      key={level.value}
                      onClick={() => setSelectedPriceLevel(
                        selectedPriceLevel === level.value ? null : level.value
                      )}
                      className={`p-2 rounded text-center transition-colors ${
                        selectedPriceLevel === level.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-bold">{level.label}</div>
                      <div className="text-xs">{level.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Distance */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Max Distance: {radius} miles
                </h3>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <button
                onClick={resetFilters}
                className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Reset Filters
              </button>
              
              {/* Sound Toggle */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {soundEnabled ? '🔊' : '🔇'} Sound Effects
                  </span>
                </label>
              </div>
            </div>
            
            {/* Recent Spins */}
            {history.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                <h2 className="text-lg font-semibold mb-4">Recent Spins</h2>
                <div className="space-y-2">
                  {history.map((restaurant, index) => (
                    <Link
                      key={`${restaurant.id}-${index}`}
                      href={`/restaurants/${restaurant.slug || restaurant.id}`}
                      className="block text-sm text-gray-700 hover:text-primary-600 transition-colors"
                    >
                      {restaurant.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Spinner Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Spinner Wheel */}
              <div className="relative mb-8">
                <div className="w-64 h-64 mx-auto relative">
                  {/* Wheel */}
                  <div data-testid="spinner-wheel" className={`absolute inset-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-2xl ${
                    isSpinning ? 'animate-spin' : ''
                  }`}>
                    <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                      <span className="text-6xl">
                        {isSpinning ? '🎰' : result ? '🎉' : '🍽️'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Pointer */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-4xl">
                    ⬇️
                  </div>
                </div>
              </div>
              
              {/* Spin Button */}
              <div className="text-center mb-8">
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className={`px-12 py-4 rounded-lg font-bold text-xl transition-all transform ${
                    isSpinning
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isSpinning ? 'Spinning...' : 'SPIN!'}
                </button>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              
              {/* Result */}
              {result && !isSpinning && (
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      🎉 Winner! 🎉
                    </h2>
                    <h3 className="text-3xl font-bold text-primary-600">
                      {result.name}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Categories:</span>
                      <p className="text-gray-900">{result.categories?.join(', ')}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Price:</span>
                      <p className="text-gray-900">
                        {result.priceLevel === 'BUDGET' && '$'}
                        {result.priceLevel === 'MODERATE' && '$$'}
                        {result.priceLevel === 'UPSCALE' && '$$$'}
                        {result.priceLevel === 'PREMIUM' && '$$$$'}
                      </p>
                    </div>
                    {result.rating && (
                      <div>
                        <span className="font-medium text-gray-600">Rating:</span>
                        <p className="text-gray-900">⭐ {result.rating.toFixed(1)}</p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-600">Address:</span>
                      <p className="text-gray-900">{result.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 justify-center">
                    <Link
                      href={`/restaurants/${result.slug || result.id}`}
                      className="btn-primary"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={handleSpin}
                      className="btn-secondary"
                    >
                      Spin Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}