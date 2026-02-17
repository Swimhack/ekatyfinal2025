'use client'

import { useState } from 'react'
import confetti from 'canvas-confetti'

interface Restaurant {
  id: number
  name: string
  cuisine: string
  imageUrl?: string
}

interface GrubRouletteChallengeProps {
  restaurant: Restaurant
  spinNumber: number
}

export default function GrubRouletteChallenge({ restaurant, spinNumber }: GrubRouletteChallengeProps) {
  const [showChallenge, setShowChallenge] = useState(false)
  const [acceptedChallenge, setAcceptedChallenge] = useState(false)

  const challenges = [
    "Order something you've never tried before",
    "Try the chef's special",
    "Go there within 24 hours",
    "Bring a friend who's never been",
    "Order the spiciest item on the menu",
    "Try a dessert you've never had",
    "Order based on the waiter's recommendation",
    "Try the #1 customer favorite",
  ]

  const randomChallenge = challenges[spinNumber % challenges.length]

  const handleAcceptChallenge = () => {
    setAcceptedChallenge(true)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
  }

  const shareChallenge = (platform: 'twitter' | 'facebook') => {
    const challengeText = `🎰 I just spun the Grub Roulette and got: ${restaurant.name}!\n\n🎯 My challenge: ${randomChallenge}\n\nThink I can do it? Spin your own at eKaty.com! 🍴`

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(challengeText)}&url=${encodeURIComponent('https://ekaty.fly.dev/spinner')}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://ekaty.fly.dev/spinner')}&quote=${encodeURIComponent(challengeText)}`,
    }

    window.open(urls[platform], '_blank', 'width=600,height=400')

    // Track the share
    window.dispatchEvent(new CustomEvent('ekaty:share'))
    fetch('/api/track-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        shareType: `challenge_${platform}`,
        challenge: randomChallenge,
      }),
    })
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowChallenge(true)}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
      >
        🎯 Accept the Challenge!
      </button>

      {showChallenge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 relative">
            <button
              onClick={() => setShowChallenge(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              <div className="text-6xl mb-4">🎰</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Grub Roulette Challenge!
              </h2>
              <p className="text-gray-600 mb-6">
                The roulette gods have spoken...
              </p>

              <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-6 mb-6 border-2 border-primary-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  🎯 Your Challenge:
                </h3>
                <p className="text-lg text-gray-700 font-medium mb-4">
                  &ldquo;{randomChallenge}&rdquo;
                </p>
                <p className="text-sm text-gray-600">
                  at <span className="font-semibold">{restaurant.name}</span>
                </p>
              </div>

              {!acceptedChallenge ? (
                <div className="space-y-3">
                  <button
                    onClick={handleAcceptChallenge}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    ✅ I Accept This Challenge!
                  </button>
                  <button
                    onClick={() => setShowChallenge(false)}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all"
                  >
                    😅 Nah, I&apos;ll Pass
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-semibold">
                      🎉 Challenge Accepted!
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Now share it and make your friends jealous!
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => shareChallenge('twitter')}
                      className="flex items-center justify-center space-x-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                      <span>Twitter</span>
                    </button>

                    <button
                      onClick={() => shareChallenge('facebook')}
                      className="flex items-center justify-center space-x-2 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Facebook</span>
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    💡 Share your challenge and tag us for a chance to be featured!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
