'use client'

import { useEffect, useMemo, useRef } from 'react'

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

const VIEWBOX = 200
const CENTER = VIEWBOX / 2
const RADIUS = 94
const HUB_RADIUS = 26

/** Alternating wedge fills, tuned to the eKaty red/amber palette. */
const WEDGE_FILLS = [
  '#dc2626', '#f97316', '#b91c1c', '#fb923c',
  '#991b1b', '#f59e0b', '#ef4444', '#ea580c',
  '#7f1d1d', '#fbbf24', '#c2410c', '#f87171',
]

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

/** Keeps long restaurant names from overflowing their wedge. */
function truncate(label: string, max: number): string {
  const trimmed = label.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
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
  const { fontSize, maxChars } = useMemo(() => {
    if (segmentCount <= 8) return { fontSize: 7, maxChars: 18 }
    if (segmentCount <= 10) return { fontSize: 6.2, maxChars: 16 }
    return { fontSize: 5.6, maxChars: 14 }
  }, [segmentCount])

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
      {/* Ambient glow that intensifies mid-spin */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.55),transparent_68%)] transition-opacity duration-700 ${
          spinning ? 'opacity-100' : 'opacity-40'
        }`}
      />

      {/* Pointer */}
      <div
        aria-hidden
        className={`absolute left-1/2 top-[-0.35rem] z-20 -translate-x-1/2 ${
          spinning && !reducedMotion ? 'animate-pointer-bounce' : ''
        }`}
      >
        <div className="h-0 w-0 border-l-[13px] border-r-[13px] border-t-[26px] border-l-transparent border-r-transparent border-t-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)]" />
        <div className="mx-auto -mt-[3px] h-2.5 w-2.5 rounded-full bg-white shadow-md" />
      </div>

      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="relative z-10 h-full w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        role="img"
        aria-label={
          segments.length > 0
            ? `Grub Roulette wheel with ${segments.length} restaurants: ${segments.map(s => s.label).join(', ')}`
            : 'Grub Roulette wheel'
        }
      >
        {/* Rim */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 5} fill="#1c1917" />
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 2.5} fill="none" stroke="#fbbf24" strokeWidth="1.5" />

        <g
          ref={wheelRef}
          style={{
            transformBox: 'view-box',
            transformOrigin: '50% 50%',
            filter: spinning && !reducedMotion ? 'blur(0.55px)' : 'none',
            transition: 'filter 300ms ease-out',
          }}
        >
          {segments.map((segment, index) => {
            const startAngle = index * segmentAngle
            const endAngle = startAngle + segmentAngle
            const midAngle = startAngle + segmentAngle / 2
            const textAnchorPoint = polarToCartesian(midAngle, RADIUS - 8)

            return (
              <g key={`${segment.id}-${index}`}>
                <path
                  d={wedgePath(startAngle, endAngle)}
                  fill={WEDGE_FILLS[index % WEDGE_FILLS.length]}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.6"
                />
                <text
                  x={textAnchorPoint.x}
                  y={textAnchorPoint.y}
                  fill="#fff7ed"
                  fontSize={fontSize}
                  fontWeight={700}
                  textAnchor="end"
                  dominantBaseline="middle"
                  transform={`rotate(${midAngle - 90} ${textAnchorPoint.x} ${textAnchorPoint.y})`}
                  style={{ letterSpacing: '0.01em', paintOrder: 'stroke' }}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth="0.7"
                >
                  {truncate(segment.label, maxChars)}
                </text>
              </g>
            )
          })}
        </g>

        {/* Hub */}
        <circle cx={CENTER} cy={CENTER} r={HUB_RADIUS + 3} fill="rgba(28,25,23,0.85)" />
        <circle cx={CENTER} cy={CENTER} r={HUB_RADIUS} fill="#fffbeb" stroke="#dc2626" strokeWidth="2" />
        <text
          x={CENTER}
          y={CENTER - 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8"
          fontWeight={800}
          fill="#dc2626"
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
          fill="#78350f"
          letterSpacing="0.14em"
        >
          ROULETTE
        </text>
      </svg>
    </div>
  )
}
