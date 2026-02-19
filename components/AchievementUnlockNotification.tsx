'use client'

import { useState, useEffect, useCallback } from 'react'
import { useGamification } from '@/contexts/GamificationContext'
import TierIcon from '@/components/TierIcon'

export default function AchievementUnlockNotification() {
  const {
    newlyUnlockedAchievement,
    newlyUnlockedReward,
    acknowledgeUnlock,
  } = useGamification()

  const [visible, setVisible] = useState(false)
  const [paused, setPaused] = useState(false)

  const item = newlyUnlockedAchievement || newlyUnlockedReward
  const itemType: 'achievement' | 'reward' = newlyUnlockedAchievement ? 'achievement' : 'reward'

  const dismiss = useCallback(() => {
    setVisible(false)
    if (item) {
      acknowledgeUnlock(itemType, item.id)
    }
  }, [item, itemType, acknowledgeUnlock])

  // Show notification when a new item is unlocked
  useEffect(() => {
    if (item) {
      setVisible(true)
    }
  }, [item])

  // Auto-dismiss after 6s (pauses on hover)
  useEffect(() => {
    if (!visible || paused) return

    const timer = setTimeout(dismiss, 6000)
    return () => clearTimeout(timer)
  }, [visible, paused, dismiss])

  if (!visible || !item) return null

  const isAchievement = itemType === 'achievement'
  const tier = isAchievement && 'tier' in item ? (item as any).tier : null

  const handleShare = () => {
    const label = isAchievement ? 'Achievement' : 'Reward'
    const text = `I just unlocked "${item.title}" on eKaty — Katy's premier restaurant guide.`
    const url = 'https://ekaty.com'

    if (navigator.share) {
      navigator.share({ title: `eKaty ${label}: ${item.title}`, text, url }).catch(() => {})
    } else {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        '_blank',
        'width=600,height=400'
      )
    }
    window.dispatchEvent(new CustomEvent('ekaty:share'))
    dismiss()
  }

  return (
    <div
      className="fixed bottom-24 right-6 z-50 animate-achievement-slide-in"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="bg-secondary-900 text-white rounded-lg shadow-2xl border-l-4 border-primary-500 max-w-xs w-full overflow-hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.672c-.996 0-1.933-.223-2.77-.672" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">
              {isAchievement ? 'Achievement Unlocked' : 'Reward Unlocked'}
            </span>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3">
            {tier && <TierIcon tier={tier} className="w-8 h-8 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight">{item.title}</h4>
              <p className="text-xs text-secondary-400 mt-0.5">{item.description}</p>
            </div>
            <button
              onClick={dismiss}
              className="text-secondary-500 hover:text-secondary-300 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Share action */}
          <button
            onClick={handleShare}
            className="mt-3 text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            Share this {isAchievement ? 'achievement' : 'reward'}
          </button>
        </div>
      </div>
    </div>
  )
}
