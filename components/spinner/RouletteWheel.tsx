'use client'

import { useEffect, useMemo, useRef } from 'react'
import { WEDGE_THEMES, WHEEL_CHROME } from '@/lib/spinner/palette'
import { WHEEL_GEOMETRY, labelMetrics, wrapLabel } from '@/lib/spinner/wheel-labels'

export interface WheelSegment {
  id: string
  label: string
  sublabel?: string
}

interface RouletteWheelProps {
  segments: WheelSegment[]
  /** Index of the winning segment, or null while idle. */
  targetIndex: number | null
  spinning: boolean
  spinDurationMs: number
  reducedMotion: boolean
  /** Fired once the wheel has physically settled on the winner. */
  onSettled: () => void
  /** Fired each time a wedge boundary crosses the pointer. */
  onTick?: () => void
}

const { viewBox: VIEWBOX, center: CENTER, radius: RADIUS, hubRadius: HUB_RADIUS } = WHEEL_GEOMETRY

/** Slow start, long glide, gentle landing. */
function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

function polarToCartesian(angleDeg: number, radius: number) {
  // 0deg points at the pointer (12 o'clock) and angles grow clockwise.
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  }
}

function wedgePath(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(startAngle, RADIUS)
  const end = polarToCartesian(endAngle, RADIUS)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

export default function RouletteWheel({
  segments,
  targetIndex,
  spinning,
  spinDurationMs,
  reducedMotion,
  onSettled,
  onTick,
}: RouletteWheelProps) {
  const wheelRef = useRef<SVGGElement | null>(null)
  const rotationRef = useRef(0)
  const frameRef = useRef<number | null>(null)
  const onSettledRef = useRef(onSettled)
  const onTickRef = useRef(onTick)

  onSettledRef.current = onSettled
  onTickRef.current = onTick

  const segmentCount = Math.max(segments.length, 1)
  const segmentAngle = 360 / segmentCount

  // Label sizing has to react to how crowded the wheel is.
  const { fontSize, perLine, maxLines } = useMemo(() => labelMetrics(segmentCount), [segmentCount])

  useEffect(() => {
    if (!spinning || targetIndex === null) return

    const wheel = wheelRef.current
    if (!wheel) return

    const currentRotation = rotationRef.current
    // Land the winning wedge's centre under the pointer, plus a little jitter so
    // the needle never sits perfectly dead-centre twice in a row.
    const winningCentre = targetIndex * segmentAngle + segmentAngle / 2
    const jitter = (Math.random() - 0.5) * segmentAngle * 0.5
    const turns = reducedMotion ? 1 : 5 + Math.floor(Math.random() * 3)

    const restingAngle = (((-winningCentre + jitter) % 360) + 360) % 360
    const minimumRotation = currentRotation + turns * 360
    const finalRotation = minimumRotation + (((restingAngle - minimumRotation) % 360) + 360) % 360

    const duration = reducedMotion ? Math.min(spinDurationMs, 600) : spinDurationMs
    const start = performance.now()
    let lastSegment = Math.floor(currentRotation / segmentAngle)

    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = reducedMotion ? progress : easeOutQuint(progress)
      const rotation = currentRotation + (finalRotation - currentRotation) * eased

      wheel.style.transform = `rotate(${rotation}deg)`
      rotationRef.current = rotation

      if (!reducedMotion) {
        const segment = Math.floor(rotation / segmentAngle)
        if (segment !== lastSegment) {
          lastSegment = segment
          onTickRef.current?.()
        }
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
        return
      }

      frameRef.current = null
      onSettledRef.current()
    }

    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [spinning, targetIndex, segmentAngle, spinDurationMs, reducedMotion])

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(88vw,30rem)]">
      {/* Warm stage light on the wheel, lifted mid-spin */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(207,162,103,0.42),rgba(94,122,78,0.16)_52%,transparent_70%)] transition-opacity duration-700 ${
          spinning ? 'opacity-100' : 'opacity-45'
        }`}
      />

      {/* Pointer */}
      <div
        aria-hidden
        className={`absolute left-1/2 top-[-0.35rem] z-20 -translate-x-1/2 ${
          spinning && !reducedMotion ? 'animate-pointer-bounce' : ''
        }`}
      >
        <div
          className="h-0 w-0 border-l-[13px] border-r-[13px] border-t-[26px] border-l-transparent border-r-transparent drop-shadow-[0_3px_7px_rgba(0,0,0,0.6)]"
          style={{ borderTopColor: WHEEL_CHROME.pointer }}
        />
        <div
          className="mx-auto -mt-[3px] h-2.5 w-2.5 rounded-full shadow-md ring-1 ring-charcoal-900/60"
          style={{ backgroundColor: WHEEL_CHROME.brass }}
        />
      </div>

      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="relative z-10 h-full w-full drop-shadow-[0_18px_44px_rgba(12,10,8,0.55)]"
        role="img"
        aria-label={
          segments.length > 0
            ? `Grub Roulette wheel with ${segments.length} restaurants: ${segments.map(s => s.label).join(', ')}`
            : 'Grub Roulette wheel'
        }
      >
        {/* Rim: charcoal casing with a brass-honey band */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 6} fill={WHEEL_CHROME.casing} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 3.2} fill="none" stroke={WHEEL_CHROME.brass} strokeWidth="2" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS + 0.8}
          fill="none"
          stroke={WHEEL_CHROME.hairline}
          strokeWidth="0.7"
        />

        <g
          ref={wheelRef}
          style={{
            transformBox: 'view-box',
            transformOrigin: '50% 50%',
            // A touch of motion blur sells the spin; any more and the names
            // stop being readable as they pass the pointer.
            filter: spinning && !reducedMotion ? 'blur(0.35px)' : 'none',
            transition: 'filter 300ms ease-out',
          }}
        >
          {segments.map((segment, index) => {
            const startAngle = index * segmentAngle
            const endAngle = startAngle + segmentAngle
            const midAngle = startAngle + segmentAngle / 2
            const anchor = polarToCartesian(midAngle, RADIUS - 6)
            const lines = wrapLabel(segment.label, perLine, maxLines)
            const theme = WEDGE_THEMES[index % WEDGE_THEMES.length]
            // Wedges past the 6 o'clock mark would render their text upside down,
            // so mirror them and let the label read inward instead.
            const flipped = midAngle >= 180
            const lineHeight = fontSize * 1.06

            return (
              <g key={`${segment.id}-${index}`}>
                <path
                  d={wedgePath(startAngle, endAngle)}
                  fill={theme.fill}
                  stroke={WHEEL_CHROME.seam}
                  strokeWidth="0.5"
                />
                <text
                  x={anchor.x}
                  y={anchor.y}
                  fill={theme.text}
                  fontSize={fontSize}
                  fontWeight={800}
                  textAnchor={flipped ? 'start' : 'end'}
                  dominantBaseline="middle"
                  transform={`rotate(${flipped ? midAngle + 90 : midAngle - 90} ${anchor.x} ${anchor.y})`}
                  style={{ letterSpacing: '0.005em', paintOrder: 'stroke' }}
                  stroke={theme.halo}
                  strokeWidth="0.55"
                  strokeLinejoin="round"
                >
                  {lines.map((line, lineIndex) => (
                    <tspan
                      key={line + lineIndex}
                      x={anchor.x}
                      dy={lineIndex === 0 ? -((lines.length - 1) / 2) * lineHeight : lineHeight}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            )
          })}
        </g>

        {/* Hub keeps the eKaty red so the brand still owns the centre */}
        <circle cx={CENTER} cy={CENTER} r={HUB_RADIUS + 3.5} fill="rgba(27,24,21,0.92)" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={HUB_RADIUS}
          fill={WHEEL_CHROME.hubFace}
          stroke={WHEEL_CHROME.hubRing}
          strokeWidth="2.2"
        />
        <text
          x={CENTER}
          y={CENTER - 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8.4"
          fontWeight={800}
          fill={WHEEL_CHROME.hubText}
          letterSpacing="0.06em"
        >
          eKaty
        </text>
        <text
          x={CENTER}
          y={CENTER + 7}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="5"
          fontWeight={700}
          fill={WHEEL_CHROME.hubSubText}
          letterSpacing="0.14em"
        >
          ROULETTE
        </text>
      </svg>
    </div>
  )
}
