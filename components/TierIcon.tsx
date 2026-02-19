interface TierIconProps {
  tier: string
  className?: string
}

const tierColors: Record<string, string> = {
  newcomer: 'text-gray-400',
  explorer: 'text-gray-600',
  tastemaker: 'text-primary-500',
  influencer: 'text-primary-400',
  legend: 'text-yellow-500',
}

export default function TierIcon({ tier, className = 'w-6 h-6' }: TierIconProps) {
  const colorClass = tierColors[tier] || tierColors.newcomer

  return (
    <svg
      className={`${className} ${colorClass}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2L3.5 7v5c0 5.55 3.84 10.74 8.5 12 4.66-1.26 8.5-6.45 8.5-12V7L12 2zm0 2.18l6.5 3.64V12c0 4.52-3.15 8.76-6.5 9.93C8.65 20.76 5.5 16.52 5.5 12V7.82L12 4.18z" />
      <path d="M12 6.5L8.5 8.5V12c0 2.76 1.56 5.34 3.5 6.5 1.94-1.16 3.5-3.74 3.5-6.5V8.5L12 6.5z" opacity="0.3" />
    </svg>
  )
}
