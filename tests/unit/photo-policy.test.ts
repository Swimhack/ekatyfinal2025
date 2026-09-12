import {
  assessPhotoUrl,
  filterDisplayPhotos,
  pickDisplayPhoto,
  isStockPhotoUrl,
} from '../../lib/photos/photo-policy'

describe('photo-policy', () => {
  it('rejects Unsplash and other stock hosts', () => {
    expect(isStockPhotoUrl('https://images.unsplash.com/photo-123')).toBe(true)
    expect(assessPhotoUrl('https://images.unsplash.com/photo-123').ok).toBe(false)
    expect(assessPhotoUrl('https://picsum.photos/800/600').reason).toMatch(/stock/)
  })

  it('rejects favicon/logo heuristics', () => {
    expect(assessPhotoUrl('https://example.com/favicon.ico').ok).toBe(false)
    expect(assessPhotoUrl('https://example.com/logo.png').ok).toBe(false)
    expect(assessPhotoUrl('https://example.com/apple-touch-icon.png').ok).toBe(false)
  })

  it('keeps plausible listing photos', () => {
    const url =
      'https://static.wixstatic.com/media/abc.jpg/v1/fill/w_800,h_600,al_c/abc.jpg'
    expect(assessPhotoUrl(url).ok).toBe(true)
  })

  it('filters stock from display lists and never invents a fallback URL', () => {
    const filtered = filterDisplayPhotos([
      'https://images.unsplash.com/photo-1',
      'https://cdn.example.com/real.jpg',
    ])
    expect(filtered).toEqual(['https://cdn.example.com/real.jpg'])
    expect(
      pickDisplayPhoto({
        photos: 'https://images.unsplash.com/photo-1',
        logoUrl: 'https://example.com/favicon.ico',
      })
    ).toBeNull()
  })
})
