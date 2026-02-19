'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// --- Types ---

export interface Achievement {
  id: string
  title: string
  description: string
  requirement: number
  tier: 'newcomer' | 'explorer' | 'tastemaker' | 'influencer' | 'legend'
  unlocked: boolean
  progress: number
}

export interface Reward {
  id: string
  title: string
  description: string
  actionLabel: string
  requiredShares: number
  unlocked: boolean
  activated: boolean
}

interface GamificationContextValue {
  shareCount: number
  achievements: Achievement[]
  rewards: Reward[]
  currentTier: string
  nextTierName: string | null
  nextTierRequirement: number | null
  ambassadorName: string
  hasBadge: boolean
  hasEarlyAccess: boolean
  isVip: boolean
  newlyUnlockedAchievement: Achievement | null
  newlyUnlockedReward: Reward | null
  acknowledgeUnlock: (type: 'achievement' | 'reward', id: string) => void
  activateReward: (rewardId: string, payload?: string) => void
  setAmbassadorName: (name: string) => void
}

// --- Constants ---

const ACHIEVEMENT_DEFS = [
  { id: 'first-share', title: 'First Discovery', description: 'Shared your first Katy restaurant', requirement: 1, tier: 'newcomer' as const },
  { id: 'explorer', title: 'Culinary Explorer', description: 'Shared 3 restaurants across Katy', requirement: 3, tier: 'explorer' as const },
  { id: 'tastemaker', title: 'Katy Tastemaker', description: 'Shared 10 restaurants with your network', requirement: 10, tier: 'tastemaker' as const },
  { id: 'influencer', title: 'Dining Influencer', description: 'Your recommendations reach 25 restaurants', requirement: 25, tier: 'influencer' as const },
  { id: 'legend', title: 'Katy Dining Legend', description: 'The definitive voice — 50 restaurants shared', requirement: 50, tier: 'legend' as const },
]

const REWARD_DEFS = [
  { id: 'ambassador-badge', title: 'Community Ambassador', description: 'Badge appears on your share cards', actionLabel: 'Activate Badge', requiredShares: 5 },
  { id: 'early-access', title: 'Early Access', description: 'Beta test new platform features first', actionLabel: 'Auto-activated', requiredShares: 10 },
  { id: 'custom-title', title: 'Custom Title', description: 'Set a personal title shown on share cards', actionLabel: 'Set Your Title', requiredShares: 15 },
  { id: 'vip-status', title: 'VIP Connoisseur', description: 'Gold visual treatment on share cards', actionLabel: 'Activate VIP', requiredShares: 25 },
]

const TIER_ORDER: Array<{ name: string; requirement: number }> = [
  { name: 'newcomer', requirement: 1 },
  { name: 'explorer', requirement: 3 },
  { name: 'tastemaker', requirement: 10 },
  { name: 'influencer', requirement: 25 },
  { name: 'legend', requirement: 50 },
]

// --- localStorage helpers ---

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(key) } catch { return null }
}

function safeSetItem(key: string, value: string) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, value) } catch { /* quota exceeded */ }
}

function safeGetJsonArray(key: string): string[] {
  const raw = safeGetItem(key)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

// --- Context ---

const GamificationContext = createContext<GamificationContextValue | null>(null)

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext)
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider')
  return ctx
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [shareCount, setShareCount] = useState(0)
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([])
  const [activatedRewards, setActivatedRewards] = useState<string[]>([])
  const [ambassadorName, setAmbassadorNameState] = useState('')
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = safeGetItem('ekaty_share_count')
    if (stored) setShareCount(parseInt(stored, 10) || 0)

    setAcknowledgedIds(safeGetJsonArray('ekaty_acknowledged_ids'))
    setActivatedRewards(safeGetJsonArray('ekaty_activated_rewards'))
    setAmbassadorNameState(safeGetItem('ekaty_ambassador_name') || '')
    setMounted(true)
  }, [])

  // Listen for share events
  useEffect(() => {
    const handleShare = () => {
      setShareCount(prev => {
        const newCount = prev + 1
        safeSetItem('ekaty_share_count', newCount.toString())
        return newCount
      })
    }
    window.addEventListener('ekaty:share', handleShare)
    return () => window.removeEventListener('ekaty:share', handleShare)
  }, [])

  // Auto-activate early-access reward when unlocked
  useEffect(() => {
    if (shareCount >= 10 && !activatedRewards.includes('early-access')) {
      const updated = [...activatedRewards, 'early-access']
      setActivatedRewards(updated)
      safeSetItem('ekaty_activated_rewards', JSON.stringify(updated))
      safeSetItem('ekaty_early_access', 'true')
    }
  }, [shareCount, activatedRewards])

  // Compute achievements
  const achievements: Achievement[] = ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    unlocked: shareCount >= def.requirement,
    progress: Math.min(shareCount, def.requirement),
  }))

  // Compute rewards
  const rewards: Reward[] = REWARD_DEFS.map(def => ({
    ...def,
    unlocked: shareCount >= def.requiredShares,
    activated: activatedRewards.includes(def.id),
  }))

  // Current tier
  let currentTier = 'newcomer'
  for (const t of TIER_ORDER) {
    if (shareCount >= t.requirement) currentTier = t.name
  }

  // Next tier
  const currentTierIdx = TIER_ORDER.findIndex(t => t.name === currentTier)
  const nextTier = currentTierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentTierIdx + 1] : null
  const nextTierName = nextTier?.name || null
  const nextTierRequirement = nextTier?.requirement || null

  // Detect newly unlocked (not yet acknowledged)
  const allUnlockedIds = [
    ...achievements.filter(a => a.unlocked).map(a => a.id),
    ...rewards.filter(r => r.unlocked).map(r => r.id),
  ]
  const unacknowledgedIds = allUnlockedIds.filter(id => !acknowledgedIds.includes(id))

  // Find the first unacknowledged achievement or reward
  const newlyUnlockedAchievement = mounted
    ? achievements.find(a => a.unlocked && unacknowledgedIds.includes(a.id)) || null
    : null
  const newlyUnlockedReward = mounted && !newlyUnlockedAchievement
    ? rewards.find(r => r.unlocked && unacknowledgedIds.includes(r.id)) || null
    : null

  const acknowledgeUnlock = useCallback((type: 'achievement' | 'reward', id: string) => {
    setAcknowledgedIds(prev => {
      const updated = Array.from(new Set([...prev, id]))
      safeSetItem('ekaty_acknowledged_ids', JSON.stringify(updated))
      return updated
    })
  }, [])

  const activateReward = useCallback((rewardId: string, payload?: string) => {
    setActivatedRewards(prev => {
      const updated = Array.from(new Set([...prev, rewardId]))
      safeSetItem('ekaty_activated_rewards', JSON.stringify(updated))

      // Set reward-specific localStorage keys
      if (rewardId === 'ambassador-badge') safeSetItem('ekaty_badge_active', 'true')
      if (rewardId === 'early-access') safeSetItem('ekaty_early_access', 'true')
      if (rewardId === 'vip-status') safeSetItem('ekaty_vip', 'true')
      if (rewardId === 'custom-title' && payload) {
        safeSetItem('ekaty_ambassador_name', payload)
        setAmbassadorNameState(payload)
      }

      return updated
    })
  }, [])

  const setAmbassadorName = useCallback((name: string) => {
    safeSetItem('ekaty_ambassador_name', name)
    setAmbassadorNameState(name)
  }, [])

  const hasBadge = activatedRewards.includes('ambassador-badge')
  const hasEarlyAccess = activatedRewards.includes('early-access')
  const isVip = activatedRewards.includes('vip-status')

  return (
    <GamificationContext.Provider value={{
      shareCount,
      achievements,
      rewards,
      currentTier,
      nextTierName,
      nextTierRequirement,
      ambassadorName,
      hasBadge,
      hasEarlyAccess,
      isVip,
      newlyUnlockedAchievement,
      newlyUnlockedReward,
      acknowledgeUnlock,
      activateReward,
      setAmbassadorName,
    }}>
      {children}
    </GamificationContext.Provider>
  )
}
