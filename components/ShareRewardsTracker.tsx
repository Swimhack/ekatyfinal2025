'use client'

import { useState } from 'react'
import { useGamification } from '@/contexts/GamificationContext'
import TierIcon from '@/components/TierIcon'
import AchievementUnlockNotification from '@/components/AchievementUnlockNotification'

function RewardAction({ reward, onActivate }: {
  reward: { id: string; actionLabel: string }
  onActivate: (id: string, payload?: string) => void
}) {
  const [titleInput, setTitleInput] = useState('')

  if (reward.id === 'early-access') {
    return <span className="text-xs text-primary-600 font-medium">Auto-activated</span>
  }

  if (reward.id === 'custom-title') {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={titleInput}
          onChange={e => setTitleInput(e.target.value)}
          placeholder="Your title..."
          maxLength={30}
          className="flex-1 text-xs border border-secondary-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          onClick={() => titleInput.trim() && onActivate(reward.id, titleInput.trim())}
          disabled={!titleInput.trim()}
          className="text-xs bg-primary-600 text-white px-3 py-1 rounded font-medium hover:bg-primary-700 transition-colors disabled:opacity-40"
        >
          Save
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => onActivate(reward.id)}
      className="text-xs bg-secondary-900 text-white px-3 py-1.5 rounded font-medium hover:bg-secondary-800 transition-colors"
    >
      {reward.actionLabel}
    </button>
  )
}

export default function ShareRewardsTracker() {
  const {
    shareCount,
    achievements,
    rewards,
    currentTier,
    nextTierName,
    nextTierRequirement,
    ambassadorName,
    activateReward,
  } = useGamification()

  const [showTracker, setShowTracker] = useState(false)

  const unlockedAchievements = achievements.filter(a => a.unlocked).length
  const totalAchievements = achievements.length
  const unlockedRewards = rewards.filter(r => r.unlocked).length
  const totalRewards = rewards.length
  const unlockedTotal = unlockedAchievements + unlockedRewards

  const handleShareAchievement = (achievement: { title: string; description: string; tier: string }) => {
    const text = `I just earned "${achievement.title}" on eKaty — Katy's premier restaurant guide. ${achievement.description}.`
    const url = 'https://ekaty.com'

    if (navigator.share) {
      navigator.share({ title: `eKaty Achievement: ${achievement.title}`, text, url }).catch(() => {})
    } else {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        '_blank',
        'width=600,height=400'
      )
    }
    window.dispatchEvent(new CustomEvent('ekaty:share'))
  }

  // Progress percentage for the milestone timeline
  const maxRequirement = achievements[achievements.length - 1]?.requirement || 50
  const progressPct = Math.min((shareCount / maxRequirement) * 100, 100)

  return (
    <>
      <AchievementUnlockNotification />

      {/* FAB */}
      <button
        onClick={() => setShowTracker(true)}
        className="fixed bottom-6 right-6 z-40 group"
        aria-label={`Ambassador profile — ${unlockedTotal} unlocked`}
      >
        <div className="relative bg-secondary-900 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg border border-secondary-700 hover:bg-secondary-800 transition-all duration-300">
          <svg className="w-6 h-6 text-primary-400 group-hover:text-primary-300 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.672c-.996 0-1.933-.223-2.77-.672" />
          </svg>
          {unlockedTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center ring-2 ring-white">
              {unlockedTotal}
            </span>
          )}
        </div>
      </button>

      {/* Modal */}
      {showTracker && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowTracker(false)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 relative my-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowTracker(false)}
              className="absolute top-4 right-4 text-secondary-400 hover:text-secondary-600 transition-colors"
              aria-label="Close"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="border-b border-secondary-200 pb-5 mb-5">
              <h2 className="text-xl font-bold text-secondary-900 tracking-tight">
                Ambassador Profile
              </h2>
              <p className="text-secondary-500 text-sm mt-0.5">
                Your contribution to the Katy dining community
              </p>

              {/* Tier display */}
              <div className="mt-4 flex items-center gap-3">
                <TierIcon tier={currentTier} className="w-10 h-10" />
                <div>
                  <div className="font-semibold text-secondary-900 capitalize">{currentTier}</div>
                  {ambassadorName && (
                    <div className="text-sm text-secondary-500">{ambassadorName}</div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary-900">{shareCount}</div>
                  <div className="text-[10px] text-secondary-500 uppercase tracking-wider font-medium">Shares</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary-900">{unlockedAchievements}/{totalAchievements}</div>
                  <div className="text-[10px] text-secondary-500 uppercase tracking-wider font-medium">Milestones</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary-900">{unlockedRewards}/{totalRewards}</div>
                  <div className="text-[10px] text-secondary-500 uppercase tracking-wider font-medium">Rewards</div>
                </div>
              </div>

              {/* Progress to next tier */}
              {nextTierRequirement && (
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-secondary-500 mb-1">
                    <span>Progress to <span className="capitalize">{nextTierName}</span></span>
                    <span>{shareCount}/{nextTierRequirement}</span>
                  </div>
                  <div className="w-full bg-secondary-100 rounded-full h-1.5">
                    <div
                      className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(shareCount / nextTierRequirement) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Achievements - Milestones */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-4">
                Milestones
              </h3>

              {/* Desktop: horizontal timeline */}
              <div className="hidden md:block">
                <div className="flex items-start justify-between relative">
                  {/* Connection line */}
                  <div className="absolute top-[18px] left-[20px] right-[20px] h-px bg-secondary-200" />
                  <div
                    className="absolute top-[18px] left-[20px] h-px bg-primary-500 transition-all duration-500"
                    style={{ width: `calc(${progressPct}% - 40px)` }}
                  />

                  {achievements.map(achievement => (
                    <div key={achievement.id} className="relative flex flex-col items-center z-10 w-[72px]">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        achievement.unlocked
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white border-secondary-300 text-secondary-400'
                      }`}>
                        {achievement.unlocked ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        )}
                      </div>
                      <span className={`mt-1.5 text-[10px] text-center leading-tight ${
                        achievement.unlocked ? 'text-secondary-900 font-medium' : 'text-secondary-400'
                      }`}>
                        {achievement.title}
                      </span>
                      <span className="text-[9px] text-secondary-400">{achievement.requirement} shares</span>
                      {achievement.unlocked && (
                        <button
                          onClick={() => handleShareAchievement(achievement)}
                          className="mt-0.5 text-[9px] text-primary-600 hover:text-primary-700 font-medium transition-colors"
                        >
                          Share
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile: vertical list */}
              <div className="md:hidden space-y-2">
                {achievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      achievement.unlocked ? 'border-primary-200 bg-white' : 'border-secondary-100 bg-secondary-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      achievement.unlocked ? 'bg-primary-600 text-white' : 'bg-secondary-200 text-secondary-400'
                    }`}>
                      {achievement.unlocked ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${achievement.unlocked ? 'text-secondary-900' : 'text-secondary-400'}`}>
                        {achievement.title}
                      </div>
                      <div className="text-xs text-secondary-500">{achievement.description}</div>
                    </div>
                    {achievement.unlocked ? (
                      <button
                        onClick={() => handleShareAchievement(achievement)}
                        className="text-xs text-primary-600 font-medium flex-shrink-0 hover:text-primary-700 transition-colors"
                      >
                        Share
                      </button>
                    ) : (
                      <span className="text-xs text-secondary-400 flex-shrink-0">
                        {achievement.progress}/{achievement.requirement}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rewards */}
            <div>
              <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-4">
                Rewards
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rewards.map(reward => (
                  <div
                    key={reward.id}
                    className={`p-4 rounded-lg border transition-all ${
                      reward.unlocked ? 'border-primary-200 bg-white' : 'border-secondary-100 bg-secondary-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <h4 className={`font-medium text-sm ${reward.unlocked ? 'text-secondary-900' : 'text-secondary-400'}`}>
                        {reward.title}
                      </h4>
                      {reward.unlocked && reward.activated && (
                        <span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mb-3 ${reward.unlocked ? 'text-secondary-600' : 'text-secondary-400'}`}>
                      {reward.description}
                    </p>

                    {reward.unlocked ? (
                      reward.activated ? (
                        <div className="text-xs text-secondary-500">
                          {reward.id === 'custom-title' && ambassadorName
                            ? `Title: "${ambassadorName}"`
                            : 'Activated'}
                        </div>
                      ) : (
                        <RewardAction reward={reward} onActivate={activateReward} />
                      )
                    ) : (
                      <div className="text-xs text-secondary-400">
                        {reward.requiredShares - shareCount > 0
                          ? `${reward.requiredShares - shareCount} more shares to unlock`
                          : 'Ready to unlock'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-secondary-200 text-center">
              <p className="text-xs text-secondary-500">
                Every share helps the Katy dining community grow.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
