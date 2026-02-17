'use client'

import { useState, useEffect } from 'react'

interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  requirement: number
  unlocked: boolean
  progress: number
}

export default function ShareRewardsTracker() {
  const [shareCount, setShareCount] = useState(0)
  const [showTracker, setShowTracker] = useState(false)

  const achievements: Achievement[] = [
    {
      id: 'first-share',
      icon: '🎯',
      title: 'First Discovery',
      description: 'Share your first restaurant',
      requirement: 1,
      unlocked: shareCount >= 1,
      progress: Math.min(shareCount, 1),
    },
    {
      id: 'foodie-explorer',
      icon: '🗺️',
      title: 'Foodie Explorer',
      description: 'Share 3 different restaurants',
      requirement: 3,
      unlocked: shareCount >= 3,
      progress: Math.min(shareCount, 3),
    },
    {
      id: 'taste-maker',
      icon: '👑',
      title: 'Taste Maker',
      description: 'Share 10 restaurants',
      requirement: 10,
      unlocked: shareCount >= 10,
      progress: Math.min(shareCount, 10),
    },
    {
      id: 'influencer',
      icon: '🌟',
      title: 'Food Influencer',
      description: 'Share 25 restaurants',
      requirement: 25,
      unlocked: shareCount >= 25,
      progress: Math.min(shareCount, 25),
    },
    {
      id: 'legend',
      icon: '💎',
      title: 'Katy Food Legend',
      description: 'Share 50 restaurants',
      requirement: 50,
      unlocked: shareCount >= 50,
      progress: Math.min(shareCount, 50),
    },
  ]

  const rewards = [
    {
      id: 'featured',
      icon: '⭐',
      title: 'Featured Profile',
      description: 'Get featured on our homepage',
      requiredShares: 5,
      unlocked: shareCount >= 5,
    },
    {
      id: 'early-access',
      icon: '🚀',
      title: 'Early Access',
      description: 'Beta test new features first',
      requiredShares: 10,
      unlocked: shareCount >= 10,
    },
    {
      id: 'custom-badge',
      icon: '🎨',
      title: 'Custom Badge',
      description: 'Create your own profile badge',
      requiredShares: 15,
      unlocked: shareCount >= 15,
    },
    {
      id: 'vip',
      icon: '👑',
      title: 'VIP Status',
      description: 'Exclusive access to restaurant deals',
      requiredShares: 25,
      unlocked: shareCount >= 25,
    },
  ]

  useEffect(() => {
    // Load share count from localStorage
    const stored = localStorage.getItem('ekaty_share_count')
    if (stored) {
      setShareCount(parseInt(stored, 10))
    }

    // Listen for share events
    const handleShare = () => {
      setShareCount(prev => {
        const newCount = prev + 1
        localStorage.setItem('ekaty_share_count', newCount.toString())
        return newCount
      })
    }

    window.addEventListener('ekaty:share', handleShare)
    return () => window.removeEventListener('ekaty:share', handleShare)
  }, [])

  const unlockedAchievements = achievements.filter(a => a.unlocked).length
  const totalAchievements = achievements.length

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowTracker(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-transform z-40"
      >
        <div className="relative">
          <span className="text-2xl">🎁</span>
          {unlockedAchievements > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unlockedAchievements}
            </span>
          )}
        </div>
      </button>

      {/* Rewards Tracker Modal */}
      {showTracker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowTracker(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-8 relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowTracker(false)
              }}
              className="absolute -top-3 -right-3 bg-gray-800 hover:bg-gray-900 text-white transition-all p-2.5 rounded-full shadow-xl border-2 border-white z-50 cursor-pointer group"
              aria-label="Close rewards modal"
              type="button"
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                🎁 Your Rewards
              </h2>
              <p className="text-gray-600">
                Share restaurants to unlock awesome rewards!
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{shareCount}</div>
                <div className="text-sm text-blue-700 font-medium">Shares</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {unlockedAchievements}/{totalAchievements}
                </div>
                <div className="text-sm text-purple-700 font-medium">Achievements</div>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-pink-600">
                  {rewards.filter(r => r.unlocked).length}/{rewards.length}
                </div>
                <div className="text-sm text-pink-700 font-medium">Rewards</div>
              </div>
            </div>

            {/* Achievements */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                🏆 Achievements
              </h3>
              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`
                      p-4 rounded-xl border-2 transition-all
                      ${achievement.unlocked
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`text-3xl ${achievement.unlocked ? 'scale-110' : 'grayscale opacity-50'}`}>
                          {achievement.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {achievement.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                      {achievement.unlocked ? (
                        <div className="text-green-600 font-semibold">
                          ✓ Unlocked
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {achievement.progress}/{achievement.requirement}
                        </div>
                      )}
                    </div>
                    {!achievement.unlocked && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${(achievement.progress / achievement.requirement) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rewards */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                🎁 Unlockable Rewards
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className={`
                      p-4 rounded-xl border-2 text-center transition-all
                      ${reward.unlocked
                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                      }
                    `}
                  >
                    <div className={`text-4xl mb-2 ${reward.unlocked ? '' : 'grayscale opacity-50'}`}>
                      {reward.icon}
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {reward.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {reward.description}
                    </p>
                    {reward.unlocked ? (
                      <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                        Unlocked!
                      </span>
                    ) : (
                      <span className="inline-block bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                        {reward.requiredShares} shares needed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl p-6 text-white text-center">
              <h4 className="text-xl font-bold mb-2">
                Keep Sharing to Unlock More! 🚀
              </h4>
              <p className="text-sm opacity-90">
                Every restaurant you share helps others discover amazing food in Katy!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
