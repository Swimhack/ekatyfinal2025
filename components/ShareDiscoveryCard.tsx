'use client'

import { useState, useEffect } from 'react'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'
import { useGamification } from '@/contexts/GamificationContext'
import TierIcon from '@/components/TierIcon'

interface ShareDiscoveryCardProps {
  restaurant: {
    id: number
    name: string
    cuisine: string
    address: string
    rating?: number
    imageUrl?: string
  }
}

export default function ShareDiscoveryCard({ restaurant }: ShareDiscoveryCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const { hasBadge, isVip, currentTier, ambassadorName } = useGamification()

  const vibes = [
    { emoji: '🔥', label: 'Fire', color: 'from-red-500 to-orange-500' },
    { emoji: '💎', label: 'Hidden Gem', color: 'from-blue-500 to-purple-500' },
    { emoji: '🎯', label: 'Must Try', color: 'from-green-500 to-teal-500' },
    { emoji: '👑', label: 'Top Tier', color: 'from-yellow-500 to-amber-500' },
    { emoji: '😋', label: 'Comfort Food', color: 'from-pink-500 to-rose-500' },
    { emoji: '🌟', label: 'Date Night', color: 'from-indigo-500 to-violet-500' },
  ]

  // Generate QR code when component shows
  useEffect(() => {
    if (showCard && restaurant.id) {
      const restaurantUrl = `https://ekaty.com/restaurants/${restaurant.id}`
      QRCode.toDataURL(restaurantUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR Code generation error:', err))
    }
  }, [showCard, restaurant.id])

  const generateCaption = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-share-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: restaurant.name,
          cuisine: restaurant.cuisine,
          vibe: selectedVibe,
        }),
      })
      const data = await response.json()
      setCaption(data.caption)
    } catch (error) {
      setCaption(`Just discovered ${restaurant.name} on eKaty! 🍴✨`)
    } finally {
      setIsGenerating(false)
    }
  }

  const trackShare = async (shareType: string) => {
    window.dispatchEvent(new CustomEvent('ekaty:share'))
    await fetch('/api/track-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        shareType,
        vibe: selectedVibe,
      }),
    }).catch(() => {})
  }

  const downloadCard = async () => {
    const cardElement = document.getElementById('discovery-card')
    if (!cardElement) return

    try {
      const dataUrl = await toPng(cardElement, {
        quality: 1.0,
        pixelRatio: 2,
        width: 1080,
        height: 1080,
      })

      const link = document.createElement('a')
      link.download = `ekaty-${restaurant.name.toLowerCase().replace(/\s/g, '-')}.png`
      link.href = dataUrl
      link.click()

      await trackShare('discovery_card')
    } catch (error) {
      console.error('Failed to generate card:', error)
    }
  }

  const shareToSocial = async (platform: 'twitter' | 'facebook' | 'instagram') => {
    const url = `https://ekaty.fly.dev/restaurants/${restaurant.id}`
    const text = caption || `Check out ${restaurant.name} on eKaty!`

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      instagram: '',
    }

    if (platform === 'instagram') {
      await downloadCard()
      return // downloadCard already tracks the share
    } else {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400')
    }

    await trackShare(platform)
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Choose Your Vibe */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          1️⃣ Choose Your Vibe
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {vibes.map((vibe) => (
            <button
              key={vibe.label}
              onClick={() => {
                setSelectedVibe(vibe.label)
                setShowCard(true)
              }}
              className={`
                p-4 rounded-xl border-2 transition-all
                ${selectedVibe === vibe.label
                  ? 'border-primary-500 bg-primary-50 scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:scale-102'
                }
              `}
            >
              <div className="text-3xl mb-1">{vibe.emoji}</div>
              <div className="text-xs font-medium text-gray-700">{vibe.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Preview & Generate Card */}
      {showCard && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              2️⃣ Generate Your Caption
            </h3>
            <button
              onClick={generateCaption}
              disabled={isGenerating}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {isGenerating ? '🤖 AI Thinking...' : '✨ Generate AI Caption'}
            </button>
            {caption && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">{caption}</p>
              </div>
            )}
          </div>

          {/* Discovery Card Preview */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              3️⃣ Preview Your Card
            </h3>
            <div className="relative">
              <div
                id="discovery-card"
                className="relative w-full aspect-square max-w-md mx-auto overflow-hidden rounded-2xl shadow-2xl"
                style={{
                  background: vibes.find(v => v.label === selectedVibe)?.color
                    ? `linear-gradient(135deg, ${vibes.find(v => v.label === selectedVibe)?.color})`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              >
                {/* Restaurant Image */}
                <div className="absolute inset-0">
                  {restaurant.imageUrl ? (
                    <img
                      src={restaurant.imageUrl}
                      alt={restaurant.name}
                      className="w-full h-full object-cover opacity-40"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-black/20 to-black/40" />
                  )}
                </div>

                {/* Content Overlay */}
                <div className={`absolute inset-0 flex flex-col justify-between p-8 text-white ${isVip ? 'ring-2 ring-inset ring-yellow-400/60' : ''}`}>
                  {/* Top: Logo & Vibe */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <img src="/logo.png" alt="eKaty" className="h-12 w-auto drop-shadow-lg" />
                      {hasBadge && (
                        <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                          <TierIcon tier={currentTier} className="w-4 h-4" />
                          {ambassadorName && (
                            <span className="text-xs font-medium">{ambassadorName}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-6xl drop-shadow-lg">
                      {vibes.find(v => v.label === selectedVibe)?.emoji}
                    </div>
                  </div>

                  {/* Middle: Restaurant Info */}
                  <div className="space-y-2">
                    <h2 className="text-4xl font-bold drop-shadow-lg leading-tight">
                      {restaurant.name}
                    </h2>
                    <p className="text-xl font-medium opacity-90 drop-shadow">
                      {restaurant.cuisine}
                    </p>
                    {selectedVibe && (
                      <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                        <span className="text-sm font-semibold">{selectedVibe}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: CTA & QR Code */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm opacity-90 mb-1">Discover More at</p>
                      <p className="text-2xl font-bold">eKaty.com</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl shadow-lg">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="QR Code to restaurant page"
                          className="w-20 h-20"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 text-center animate-pulse">
                          Loading...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Share Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              4️⃣ Share Your Discovery
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => shareToSocial('twitter')}
                className="flex items-center justify-center space-x-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <span>Twitter</span>
              </button>

              <button
                onClick={() => shareToSocial('facebook')}
                className="flex items-center justify-center space-x-2 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>

              <button
                onClick={() => shareToSocial('instagram')}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                </svg>
                <span>Instagram</span>
              </button>

              <button
                onClick={downloadCard}
                className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Sharing Stats & Rewards */}
          <div className="bg-secondary-50 rounded-xl p-6 border border-secondary-200">
            <h4 className="font-semibold text-secondary-900 mb-3 text-sm">
              Community Ambassador Rewards
            </h4>
            <ul className="space-y-2 text-sm text-secondary-600">
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                <span>5 shares — Ambassador badge on your share cards</span>
              </li>
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                <span>10 shares — Early access to new features</span>
              </li>
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                <span>25 shares — VIP gold treatment on share cards</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
