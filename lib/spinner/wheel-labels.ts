/**
 * Wheel geometry and label fitting.
 *
 * Restaurant names are the whole point of the named wheel, so legibility wins
 * over cramming: the wedge count is capped by the page, and the type size and
 * line budget here are derived from the radial track a label actually has.
 */

export const WHEEL_GEOMETRY = {
  viewBox: 200,
  center: 100,
  radius: 94,
  hubRadius: 26,
}

/** Radial room a label has between the hub and the rim. */
export const LABEL_TRACK = WHEEL_GEOMETRY.radius - WHEEL_GEOMETRY.hubRadius - 10

export interface LabelMetrics {
  fontSize: number
  /** Character budget for a single line. */
  perLine: number
  maxLines: number
}

/** Fewer wedges buy a bigger type size and an extra line. */
export function labelMetrics(segmentCount: number): LabelMetrics {
  const fontSize = segmentCount <= 6 ? 9.4 : segmentCount <= 8 ? 8.4 : segmentCount <= 10 ? 7.2 : 6.4

  return {
    fontSize,
    // ~0.52em per character for a bold sans stack.
    perLine: Math.max(9, Math.floor(LABEL_TRACK / (fontSize * 0.52))),
    maxLines: segmentCount <= 8 ? 3 : 2,
  }
}

function truncate(label: string, max: number): string {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1).trimEnd()}…`
}

/**
 * Fits a restaurant name into a wedge across up to `maxLines` lines.
 *
 * Wedges are much wider than they are long, so wrapping shows far more of a name
 * like "Perry's Steakhouse & Grille" than truncating a single line would. Any
 * overflow past the last line is folded in and truncated there.
 */
export function wrapLabel(label: string, perLine: number, maxLines: number): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (!current || candidate.length <= perLine) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines - 1)
    kept.push(lines.slice(maxLines - 1).join(' '))
    return kept.map(line => truncate(line, perLine))
  }

  return lines.map(line => truncate(line, perLine))
}
