/**
 * Restaurant.photos is historically a comma-separated string. Many CDN URLs
 * (especially Wix) also contain commas inside the path, so naive splits produce
 * broken fragments like ".../w_286" + "h_335" + ...
 *
 * This module is the single source of truth for reading and writing that field.
 */

const URL_START = /^https?:\/\//i
const DATA_OR_RELATIVE = /^(data:image\/|\/)/i

export function parsePhotos(photos: unknown): string[] {
  if (Array.isArray(photos)) {
    // Callers sometimes pass a naive .split(',') result. Rejoin CDN fragments.
    return normalizePhotoList(reassembleParts(photos.map(String)))
  }

  if (typeof photos !== 'string') return []
  const raw = photos.trim()
  if (!raw) return []

  // Preferred modern encoding: JSON array
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return normalizePhotoList(reassembleParts(parsed.map(String)))
      }
    } catch {
      // fall through to delimiter parsers
    }
  }

  // Pipe-delimited (safe for comma-heavy CDN URLs)
  if (raw.includes('|') && !raw.includes('://') ? false : raw.includes('|')) {
    const pipeParts = raw.split('|').map((p) => p.trim()).filter(Boolean)
    if (pipeParts.every((p) => URL_START.test(p) || DATA_OR_RELATIVE.test(p))) {
      return normalizePhotoList(pipeParts)
    }
  }

  // Comma-separated with reassembly of CDN transform fragments
  return normalizePhotoList(reassembleCommaSeparated(raw))
}

function reassembleCommaSeparated(raw: string): string[] {
  return reassembleParts(raw.split(',').map((p) => p.trim()).filter(Boolean))
}

/** Rejoin Wix/CDN transform segments that were split on commas. */
function reassembleParts(parts: string[]): string[] {
  const urls: string[] = []
  let current = ''

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (URL_START.test(trimmed) || DATA_OR_RELATIVE.test(trimmed)) {
      if (current) urls.push(current)
      current = trimmed
      continue
    }

    if (current) {
      // Wix / image CDN transform segments: h_335, al_c, q_85, enc_avif, etc.
      current += `,${trimmed}`
      continue
    }

    // Orphan fragment with no URL head — ignore
  }

  if (current) urls.push(current)
  return urls
}

function normalizePhotoList(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of urls) {
    const cleaned = url.trim()
    if (!cleaned) continue
    if (!isPlausiblePhotoUrl(cleaned)) continue
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    out.push(cleaned)
  }
  return out
}

export function isPlausiblePhotoUrl(url: string): boolean {
  if (!url || url.length < 4) return false
  if (DATA_OR_RELATIVE.test(url)) return true
  if (!URL_START.test(url)) return false

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    // Reject obvious non-image fragments left over from bad splits
    if (!parsed.hostname.includes('.')) return false
    if (/^(h_\d+|w_\d+|al_[a-z]|q_\d+|enc_[a-z0-9]+|usm_[\d._]+|quality_auto)$/i.test(url)) {
      return false
    }
    return true
  } catch {
    return false
  }
}

/** Persist photos without destroying comma-containing CDN URLs. */
export function serializePhotos(urls: string[]): string {
  const clean = normalizePhotoList(urls)
  if (clean.length === 0) return ''
  if (clean.some((u) => u.includes(',') || u.includes('|'))) {
    return JSON.stringify(clean)
  }
  return clean.join(',')
}

export function firstPhoto(photos: unknown): string | null {
  const list = parsePhotos(photos)
  return list[0] || null
}
