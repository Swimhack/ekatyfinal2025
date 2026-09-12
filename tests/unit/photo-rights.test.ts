import { describe, it, expect } from 'vitest'
import {
  getPhotoRights,
  notePhotoClearance,
  upsertPhotoRights,
} from '@/lib/photos/photo-rights'

describe('photo-rights metadata', () => {
  it('upserts rights records without dropping unrelated metadata', () => {
    const first = upsertPhotoRights('{"google_place_id":"abc"}', {
      url: '/uploads/a.jpg',
      origin: 'owner_upload',
      rightsBasis: 'owner_owned',
      obtainedAt: '2026-08-05T00:00:00.000Z',
      status: 'approved',
    })
    const parsed = JSON.parse(first)
    expect(parsed.google_place_id).toBe('abc')
    expect(getPhotoRights(first)).toHaveLength(1)

    const second = upsertPhotoRights(first, {
      url: '/uploads/b.jpg',
      origin: 'owner_upload',
      rightsBasis: 'admin_verified',
      obtainedAt: '2026-08-05T01:00:00.000Z',
      status: 'approved',
    })
    expect(getPhotoRights(second).map((r) => r.url)).toEqual([
      '/uploads/a.jpg',
      '/uploads/b.jpg',
    ])
  })

  it('records clearance history and drops cleared rights rows', () => {
    const withRights = upsertPhotoRights(null, {
      url: 'https://bad.example/stock.jpg',
      origin: 'legacy',
      rightsBasis: 'admin_verified',
      obtainedAt: '2026-08-05T00:00:00.000Z',
      status: 'approved',
    })
    const cleared = notePhotoClearance(withRights, [
      { url: 'https://bad.example/stock.jpg', reason: 'stock' },
    ], '2026-08-05T12:00:00.000Z')
    const parsed = JSON.parse(cleared)
    expect(parsed.lastPhotoAuditAt).toBe('2026-08-05T12:00:00.000Z')
    expect(parsed.photoClearanceHistory).toHaveLength(1)
    expect(getPhotoRights(cleared)).toHaveLength(0)
  })
})
