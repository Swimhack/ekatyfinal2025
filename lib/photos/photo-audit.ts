/**
 * Pure decisions for the restaurant photo URL audit.
 * Network I/O stays in the script; this module is unit-tested.
 */

import { isLogoOrFaviconUrl, isStockPhotoUrl } from '@/lib/photos/photo-policy'
import { parsePhotos as parsePhotoList } from '@/lib/photos/parse-photos'

const isLikelyLogoOrFavicon = isLogoOrFaviconUrl

export type PhotoClearReason =
  | 'stock'
  | 'logo_or_favicon'
  | 'invalid_url'
  | 'unreachable'
  | 'not_image'
  | 'empty'

export interface PhotoAuditDecision {
  url: string
  keep: boolean
  reason?: PhotoClearReason
}

export interface RestaurantPhotoAuditResult {
  restaurantId: string
  name: string
  source: string | null
  photosLocked: boolean
  original: string[]
  kept: string[]
  cleared: PhotoAuditDecision[]
  changed: boolean
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function photosFieldLocked(adminOverrides: string | null | undefined): boolean {
  if (!adminOverrides) return false
  try {
    const parsed = JSON.parse(adminOverrides)
    return !!parsed?.photos
  } catch {
    return false
  }
}

export function classifyPhotoUrl(url: string): PhotoAuditDecision {
  const trimmed = (url || '').trim()
  if (!trimmed) {
    return { url: trimmed, keep: false, reason: 'empty' }
  }

  if (isStockPhotoUrl(trimmed)) {
    return { url: trimmed, keep: false, reason: 'stock' }
  }

  if (isLikelyLogoOrFavicon(trimmed)) {
    return { url: trimmed, keep: false, reason: 'logo_or_favicon' }
  }

  try {
    const parsed = new URL(trimmed)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return { url: trimmed, keep: false, reason: 'invalid_url' }
    }
  } catch {
    // Relative paths under /uploads/ are allowed (local controlled storage).
    if (trimmed.startsWith('/uploads/')) {
      return { url: trimmed, keep: true }
    }
    return { url: trimmed, keep: false, reason: 'invalid_url' }
  }

  return { url: trimmed, keep: true }
}

export function applyReachability(
  decision: PhotoAuditDecision,
  reachable: boolean | null,
  contentType: string | null
): PhotoAuditDecision {
  if (!decision.keep) return decision
  if (reachable === null) return decision
  if (!reachable) {
    return { ...decision, keep: false, reason: 'unreachable' }
  }
  if (contentType && !contentType.toLowerCase().startsWith('image/')) {
    return { ...decision, keep: false, reason: 'not_image' }
  }
  return decision
}

export function auditRestaurantPhotos(input: {
  restaurantId: string
  name: string
  source?: string | null
  photos: unknown
  adminOverrides?: string | null
  /** Map of url -> { ok, contentType } from a HEAD/GET probe. Omit for offline classify-only. */
  reachability?: Record<string, { ok: boolean; contentType: string | null }>
}): RestaurantPhotoAuditResult {
  const original = parsePhotoList(input.photos)
  const locked = photosFieldLocked(input.adminOverrides)

  if (locked) {
    return {
      restaurantId: input.restaurantId,
      name: input.name,
      source: input.source ?? null,
      photosLocked: true,
      original,
      kept: original,
      cleared: [],
      changed: false,
    }
  }

  const cleared: PhotoAuditDecision[] = []
  const kept: string[] = []

  for (const url of original) {
    let decision = classifyPhotoUrl(url)
    const probe = input.reachability?.[url]
    if (probe) {
      decision = applyReachability(decision, probe.ok, probe.contentType)
    }
    if (decision.keep) {
      kept.push(url)
    } else {
      cleared.push(decision)
    }
  }

  return {
    restaurantId: input.restaurantId,
    name: input.name,
    source: input.source ?? null,
    photosLocked: false,
    original,
    kept,
    cleared,
    changed: kept.join(',') !== original.join(','),
  }
}

export function summarizeAudit(results: RestaurantPhotoAuditResult[]) {
  const byReason: Record<string, number> = {}
  let locked = 0
  let changed = 0
  let clearedUrls = 0

  for (const result of results) {
    if (result.photosLocked) locked += 1
    if (result.changed) changed += 1
    for (const cleared of result.cleared) {
      clearedUrls += 1
      const reason = cleared.reason || 'unknown'
      byReason[reason] = (byReason[reason] || 0) + 1
    }
  }

  return {
    restaurants: results.length,
    locked,
    changed,
    clearedUrls,
    byReason,
  }
}
