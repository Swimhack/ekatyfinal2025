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
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Mood filters">
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
            className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-[0.82rem] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-sm ${
              active
                ? 'border-amber-300 bg-amber-300 text-stone-900 shadow-[0_0_24px_rgba(251,191,36,0.45)]'
                : 'border-white/25 bg-white/10 text-white hover:border-amber-200/70 hover:bg-white/20'
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
