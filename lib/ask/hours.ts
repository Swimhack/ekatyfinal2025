// Ask eKaty — open/closed evaluation over the hours we already store.
//
// `Restaurant.hours` is a JSON string whose shape varies by import source
// (24-hour `{open, close}` objects, 12-hour `{open, close}` objects, plain
// "11:00 AM - 9:00 PM" strings, and `{closed: true}`). We read all of them and
// return `unknown` whenever we cannot be certain. `unknown` never removes a
// restaurant from the results: an "open now" ask should not silently hide
// places whose hours we simply do not have.

export type OpenState = 'open' | 'closed' | 'unknown'

const DAY_KEYS = [
  ['sunday', 'sun'],
  ['monday', 'mon'],
  ['tuesday', 'tue', 'tues'],
  ['wednesday', 'wed'],
  ['thursday', 'thu', 'thur', 'thurs'],
  ['friday', 'fri'],
  ['saturday', 'sat'],
]

/** Katy, TX. Restaurant hours are local wall-clock time. */
const KATY_TIME_ZONE = 'America/Chicago'

interface LocalNow {
  /** 0 = Sunday, matching DAY_KEYS. */
  dayIndex: number
  /** Minutes since local midnight. */
  minutes: number
}

/** Current wall-clock day and time in Katy, without pulling in a date library. */
export function katyLocalNow(now: Date = new Date()): LocalNow {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: KATY_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const weekday = (parts.find((p) => p.type === 'weekday')?.value || '').toLowerCase()
  const hour = Number.parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
  const minute = Number.parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)

  const dayIndex = DAY_KEYS.findIndex((aliases) => aliases.includes(weekday))

  return {
    dayIndex: dayIndex === -1 ? now.getUTCDay() : dayIndex,
    // Intl renders midnight as 24 with hour12: false in some runtimes.
    minutes: (hour % 24) * 60 + minute,
  }
}

/** Minutes since midnight for "17:30", "5:30 PM", "5 pm"; null if unparseable. */
export function parseClockTime(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase()
  if (!value) return null

  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(value)
  if (!match) return null

  let hour = Number.parseInt(match[1], 10)
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0
  const meridiem = match[3]

  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) return null

  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  if (hour > 24) return null

  return hour * 60 + minute
}

interface DayWindow {
  open: number
  close: number
}

/** Reads one day's entry in any of the stored shapes. */
function parseDayEntry(entry: unknown): DayWindow | 'closed' | null {
  if (entry === null || entry === undefined) return null

  if (typeof entry === 'string') {
    const value = entry.trim().toLowerCase()
    if (!value) return null
    if (value === 'closed') return 'closed'
    if (value.includes('24 hour') || value.includes('open 24')) return { open: 0, close: 1440 }
    const rangeMatch = /^(.+?)\s*(?:-|–|—|to)\s*(.+)$/.exec(value)
    if (!rangeMatch) return null
    const open = parseClockTime(rangeMatch[1])
    const close = parseClockTime(rangeMatch[2])
    if (open === null || close === null) return null
    return { open, close }
  }

  if (typeof entry === 'object') {
    const record = entry as Record<string, unknown>
    if (record.closed === true) return 'closed'
    const open = parseClockTime(record.open)
    const close = parseClockTime(record.close)
    if (open === null || close === null) return null
    return { open, close }
  }

  return null
}

function lookupDay(hours: Record<string, unknown>, dayIndex: number): unknown {
  for (const alias of DAY_KEYS[dayIndex]) {
    if (alias in hours) return hours[alias]
    const capitalized = alias.charAt(0).toUpperCase() + alias.slice(1)
    if (capitalized in hours) return hours[capitalized]
  }
  return undefined
}

/**
 * Whether a listing is open at `now` according to its stored hours.
 *
 * Returns `unknown` for missing, malformed or unrecognized hours rather than
 * guessing in either direction.
 */
export function isOpenAt(hoursJson: string | null | undefined, now: Date = new Date()): OpenState {
  if (!hoursJson) return 'unknown'

  let parsed: unknown
  try {
    parsed = JSON.parse(hoursJson)
  } catch {
    return 'unknown'
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'unknown'

  const hours = parsed as Record<string, unknown>
  const { dayIndex, minutes } = katyLocalNow(now)

  const today = parseDayEntry(lookupDay(hours, dayIndex))
  if (today === 'closed') {
    // Still open if yesterday's hours run past midnight into right now.
    return spilloverFromPreviousDay(hours, dayIndex, minutes) ? 'open' : 'closed'
  }
  if (today === null) return 'unknown'

  if (today.close > today.open) {
    if (minutes >= today.open && minutes < today.close) return 'open'
    return spilloverFromPreviousDay(hours, dayIndex, minutes) ? 'open' : 'closed'
  }

  // Closing time at or before opening time means the day runs past midnight.
  if (minutes >= today.open || minutes < today.close) return 'open'
  return 'closed'
}

function spilloverFromPreviousDay(
  hours: Record<string, unknown>,
  dayIndex: number,
  minutes: number
): boolean {
  const previous = parseDayEntry(lookupDay(hours, (dayIndex + 6) % 7))
  if (previous === null || previous === 'closed') return false
  if (previous.close > previous.open) return false
  return minutes < previous.close
}
