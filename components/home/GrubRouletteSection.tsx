import Link from 'next/link'
import { WEDGE_THEMES, WHEEL_CHROME } from '@/lib/spinner/palette'

const MOOD_TEASERS = ['🧒 Kids in tow', '🕯️ Date night', '💸 Cheap eats', '🌶️ Bring the heat', '🎲 Surprise me']

function wedgePath(index: number, total: number): string {
  const angle = 360 / total
  const start = index * angle
  const end = start + angle
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return `${50 + 46 * Math.cos(rad)} ${50 + 46 * Math.sin(rad)}`
  }
  return `M 50 50 L ${point(start)} A 46 46 0 0 1 ${point(end)} Z`
}

export function GrubRouletteSection() {
  return (
    <div className="spinner-stage group relative overflow-hidden rounded-3xl px-6 py-12 text-bone-100 sm:px-12">
      <div aria-hidden className="spinner-battens pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col items-center gap-10 md:flex-row md:justify-between">
        <div className="max-w-xl text-center md:text-left">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-honey-300">
            The nightly ritual
          </p>
          <h2 className="text-3xl font-black leading-tight sm:text-4xl">
            Can&apos;t decide? Let the wheel call it.
          </h2>
          <p className="mt-4 text-lg text-bone-100/70">
            Pick a mood, spin real Katy restaurants, and get a verdict in five seconds. No more
            &ldquo;I don&apos;t know, what do you want?&rdquo;
          </p>

          <ul className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
            {MOOD_TEASERS.map(mood => (
              <li
                key={mood}
                className="rounded-full border border-honey-500/25 bg-charcoal-700/60 px-3 py-1.5 text-sm font-semibold text-bone-100/85"
              >
                {mood}
              </li>
            ))}
          </ul>

          <Link
            href="/spinner"
            className="mt-8 inline-flex min-h-[56px] items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-800 to-primary-600 px-8 text-lg font-black uppercase tracking-wide text-bone-50 shadow-[0_12px_34px_-10px_rgba(153,27,27,0.85)] transition hover:brightness-110 active:scale-[0.98]"
          >
            Spin the wheel
            <span aria-hidden>→</span>
          </Link>
        </div>

        <Link
          href="/spinner"
          aria-label="Open Grub Roulette"
          className="relative block w-52 shrink-0 sm:w-64"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-5 rounded-full bg-[radial-gradient(circle,rgba(207,162,103,0.45),rgba(94,122,78,0.18)_55%,transparent_72%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100"
          />
          <svg viewBox="0 0 100 100" className="relative w-full drop-shadow-[0_16px_36px_rgba(12,10,8,0.55)]">
            <circle cx="50" cy="50" r="48.5" fill={WHEEL_CHROME.casing} />
            <circle cx="50" cy="50" r="47" fill="none" stroke={WHEEL_CHROME.brass} strokeWidth="1" />
            <g className="animate-teaser-wheel" style={{ transformBox: 'view-box', transformOrigin: '50% 50%' }}>
              {WEDGE_THEMES.map((theme, index) => (
                <path
                  key={theme.fill + index}
                  d={wedgePath(index, WEDGE_THEMES.length)}
                  fill={theme.fill}
                  stroke={WHEEL_CHROME.seam}
                  strokeWidth="0.5"
                />
              ))}
            </g>
            <circle
              cx="50"
              cy="50"
              r="14"
              fill={WHEEL_CHROME.hubFace}
              stroke={WHEEL_CHROME.hubRing}
              strokeWidth="1.5"
            />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="6"
              fontWeight="800"
              fill={WHEEL_CHROME.hubText}
              letterSpacing="0.05em"
            >
              eKaty
            </text>
          </svg>

          <div
            aria-hidden
            className="absolute left-1/2 top-[-0.3rem] -translate-x-1/2"
          >
            <div
              className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent drop-shadow"
              style={{ borderTopColor: WHEEL_CHROME.pointer }}
            />
          </div>
        </Link>
      </div>
    </div>
  )
}

export default GrubRouletteSection
