'use client'

import { MOODS, type MoodId } from '@/lib/spinner/moods'

interface MoodChipsProps {
  activeMoods: MoodId[]
  onToggle: (moodId: MoodId) => void
  /** Hides Near me when the browser cannot provide a location. */
  geoAvailable: boolean
  geoPending: boolean
  disabled?: boolean
}

export default function MoodChips({
  activeMoods,
  onToggle,
  geoAvailable,
  geoPending,
  disabled = false,
}: MoodChipsProps) {
  const moods = MOODS.filter(mood => !mood.requiresGeo || geoAvailable)

  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2" role="group" aria-label="Mood filters">
      {moods.map(mood => {
        const active = activeMoods.includes(mood.id)
        const pending = mood.requiresGeo && geoPending

        return (
          <button
            key={mood.id}
            type="button"
            onClick={() => onToggle(mood.id)}
            disabled={disabled}
            aria-pressed={active}
            title={mood.tagline}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-[0.8rem] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-sm ${
              active
                ? 'border-honey-200 bg-honey-300 text-charcoal-900 shadow-[0_0_22px_rgba(207,162,103,0.4)]'
                : 'border-honey-500/25 bg-charcoal-700/60 text-bone-100 hover:border-honey-300/60 hover:bg-charcoal-600/70'
            }`}
          >
            <span aria-hidden>{pending ? '…' : mood.emoji}</span>
            {mood.label}
          </button>
        )
      })}
    </div>
  )
}
