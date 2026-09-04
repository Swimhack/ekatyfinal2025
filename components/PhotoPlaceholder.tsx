import { RESTAURANT_CATEGORIES } from '@/lib/categories'

/**
 * Shown when a restaurant has no photograph of its own.
 *
 * The alternative was one stock image reused across dozens of unrelated
 * businesses, so this is built to be unmistakably a placeholder while still
 * looking deliberate: the colour is derived from the restaurant's name, so the
 * same listing always renders the same way and neighbouring cards in a grid
 * differ from each other.
 */

// Deep enough for white type to sit on comfortably, muted enough that a grid of
// them reads as a palette rather than a set of warning labels.
const PALETTES: Array<[string, string]> = [
  ['#7f1d1d', '#b91c1c'],
  ['#7c2d12', '#c2410c'],
  ['#78350f', '#b45309'],
  ['#3f6212', '#4d7c0f'],
  ['#14532d', '#15803d'],
  ['#134e4a', '#0f766e'],
  ['#164e63', '#0e7490'],
  ['#1e3a8a', '#1d4ed8'],
  ['#4c1d95', '#6d28d9'],
  ['#831843', '#be185d'],
  ['#422006', '#854d0e'],
  ['#334155', '#475569'],
]

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0
  return h
}

// Listing grids hand these over as comma-joined strings while the detail page
// has already parsed them into arrays, so both have to be accepted.
function toTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  return []
}

/** The cuisine mark, taken from the same category list the landing pages use. */
function markFor(restaurant: any): string {
  const tags = new Set([...toTags(restaurant?.cuisineTypes), ...toTags(restaurant?.categories)])
  // "Restaurant" and "Food" sit on almost everything, so a specific cuisine has
  // to win even though it appears later in the list.
  for (const category of RESTAURANT_CATEGORIES) {
    if (category.slug === 'american' || category.slug === 'fast-food') continue
    if (category.tags.some((tag) => tags.has(tag.toLowerCase()))) return category.emoji
  }
  if (tags.has('american') || tags.has('fast food') || tags.has('diner')) return '🍔'
  return '🍽️'
}

interface PhotoPlaceholderProps {
  restaurant: any
  /** Detail pages get a larger mark than grid cards. */
  size?: 'card' | 'hero'
  className?: string
}

export default function PhotoPlaceholder({ restaurant, size = 'card', className = '' }: PhotoPlaceholderProps) {
  const name = String(restaurant?.name || 'Restaurant')
  const [from, to] = PALETTES[hash(name) % PALETTES.length]
  const mark = markFor(restaurant)
  const isHero = size === 'hero'

  return (
    <div
      className={`relative w-full h-full overflow-hidden flex flex-col items-center justify-center ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* A soft off-centre highlight stops the flat fill looking like a failed load. */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 60%)' }}
        aria-hidden="true"
      />
      <span
        className={`relative ${isHero ? 'text-7xl' : 'text-5xl'} drop-shadow-sm`}
        style={{ opacity: 0.92 }}
        aria-hidden="true"
      >
        {mark}
      </span>
      {/* Detail pages carry the name in an h1 a few pixels below, so only the
          grid cards need it spelled out here. */}
      {!isHero && (
        <span
          className="relative mt-3 px-4 max-w-[85%] text-center text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ opacity: 0.85, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
        >
          {name}
        </span>
      )}
      <span
        className={`relative text-white ${isHero ? 'mt-4 text-xs' : 'mt-1 text-[9px]'}`}
        style={{ opacity: 0.55 }}
      >
        Photo coming soon
      </span>
    </div>
  )
}
