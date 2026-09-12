import { describe, it, expect } from 'vitest'
import {
  applyReachability,
  auditRestaurantPhotos,
  classifyPhotoUrl,
  photosFieldLocked,
  summarizeAudit,
} from '@/lib/photos/photo-audit'
import { getDisplayPhoto } from '@/lib/services/photo-service'
import { isStockPhotoUrl } from '@/lib/photos/photo-policy'

describe('photo-service stock suppression', () => {
  it('detects Unsplash stock URLs', () => {
    expect(isStockPhotoUrl('https://images.unsplash.com/photo-123')).toBe(true)
    expect(isStockPhotoUrl('https://cdn.example.com/restaurant.jpg')).toBe(false)
  })

  it('does not return stock images as display photos', () => {
    expect(
      getDisplayPhoto([
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        'https://cdn.example.com/real.jpg',
      ])
    ).toBe('https://cdn.example.com/real.jpg')

    expect(getDisplayPhoto(['https://images.unsplash.com/photo-x'])).toBeNull()
  })
})

describe('photo-audit decisions', () => {
  it('locks when adminOverrides.photos is true', () => {
    expect(photosFieldLocked('{"photos":true}')).toBe(true)
    expect(photosFieldLocked('{"phone":true}')).toBe(false)
  })

  it('classifies stock, logo, and invalid URLs', () => {
    expect(classifyPhotoUrl('https://images.unsplash.com/x').reason).toBe('stock')
    expect(classifyPhotoUrl('https://site.com/favicon.ico').reason).toBe('logo_or_favicon')
    expect(classifyPhotoUrl('not a url').reason).toBe('invalid_url')
    expect(classifyPhotoUrl('/uploads/restaurants/a.jpg').keep).toBe(true)
  })

  it('marks unreachable and non-image URLs after probing', () => {
    const base = classifyPhotoUrl('https://cdn.example.com/a.jpg')
    expect(applyReachability(base, false, null).reason).toBe('unreachable')
    expect(applyReachability(base, true, 'text/html').reason).toBe('not_image')
    expect(applyReachability(base, true, 'image/jpeg').keep).toBe(true)
  })

  it('clears bad URLs while preserving good ones and locks', () => {
    const result = auditRestaurantPhotos({
      restaurantId: 'r1',
      name: 'Test',
      source: 'google_places',
      photos:
        'https://images.unsplash.com/photo-x,https://cdn.example.com/good.jpg,https://site.com/logo.png',
      reachability: {
        'https://cdn.example.com/good.jpg': { ok: true, contentType: 'image/jpeg' },
        'https://site.com/logo.png': { ok: true, contentType: 'image/png' },
      },
    })

    expect(result.kept).toEqual(['https://cdn.example.com/good.jpg'])
    expect(result.changed).toBe(true)
    expect(result.cleared.map((c) => c.reason).sort()).toEqual(['logo_or_favicon', 'stock'])

    const locked = auditRestaurantPhotos({
      restaurantId: 'r2',
      name: 'Locked',
      photos: 'https://images.unsplash.com/photo-x',
      adminOverrides: '{"photos":true}',
    })
    expect(locked.changed).toBe(false)
    expect(locked.photosLocked).toBe(true)
  })

  it('summarizes audit results', () => {
    const summary = summarizeAudit([
      auditRestaurantPhotos({
        restaurantId: 'a',
        name: 'A',
        photos: 'https://images.unsplash.com/x',
      }),
    ])
    expect(summary.changed).toBe(1)
    expect(summary.byReason.stock).toBe(1)
  })
})
