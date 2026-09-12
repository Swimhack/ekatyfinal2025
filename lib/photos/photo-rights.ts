/**
 * Per-photo rights / provenance stored on Restaurant.metadata.photoRights
 * and on RestaurantPhotoSubmission rows.
 */

export type PhotoRightsBasis = 'owner_owned' | 'licensed_to_display' | 'admin_verified'
export type PhotoRightsStatus = 'pending' | 'approved' | 'rejected' | 'cleared'

export interface PhotoRightsRecord {
  url: string
  origin: string
  sourceUrl?: string | null
  rightsBasis: PhotoRightsBasis
  credit?: string | null
  license?: string | null
  obtainedAt: string
  verifiedAt?: string | null
  status: PhotoRightsStatus
  submittedById?: string | null
}

export function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getPhotoRights(metadata: string | null | undefined): PhotoRightsRecord[] {
  const parsed = parseMetadata(metadata)
  const rights = parsed.photoRights
  return Array.isArray(rights) ? (rights as PhotoRightsRecord[]) : []
}

export function upsertPhotoRights(
  metadata: string | null | undefined,
  record: PhotoRightsRecord
): string {
  const parsed = parseMetadata(metadata)
  const existing = Array.isArray(parsed.photoRights)
    ? (parsed.photoRights as PhotoRightsRecord[]).filter((r) => r.url !== record.url)
    : []
  parsed.photoRights = [...existing, record]
  return JSON.stringify(parsed)
}

export function notePhotoClearance(
  metadata: string | null | undefined,
  cleared: Array<{ url: string; reason?: string }>,
  verifiedAt = new Date().toISOString()
): string {
  const parsed = parseMetadata(metadata)
  const history = Array.isArray(parsed.photoClearanceHistory)
    ? (parsed.photoClearanceHistory as unknown[])
    : []
  history.push({
    at: verifiedAt,
    cleared: cleared.map((c) => ({ url: c.url, reason: c.reason || 'unknown' })),
  })
  // Cap history so metadata doesn't grow without bound.
  parsed.photoClearanceHistory = history.slice(-20)

  const remainingUrls = new Set(
    (Array.isArray(parsed.photoRights) ? (parsed.photoRights as PhotoRightsRecord[]) : [])
      .filter((r) => !cleared.some((c) => c.url === r.url))
      .map((r) => r.url)
  )
  if (Array.isArray(parsed.photoRights)) {
    parsed.photoRights = (parsed.photoRights as PhotoRightsRecord[]).filter((r) =>
      remainingUrls.has(r.url)
    )
  }

  parsed.lastPhotoAuditAt = verifiedAt
  return JSON.stringify(parsed)
}
