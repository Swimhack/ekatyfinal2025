import {
  assessPhotoUrl,
  filterDisplayPhotos,
  isBrandMarketingImageUrl,
  pickDisplayPhoto,
} from '../../lib/photos/photo-policy'

// The URL that put the same Starbucks tile on thirteen cards of
// https://ekaty.com/categories/cafe.
const STARBUCKS_OG = 'https://www.starbucks.com/weblx/images/social/summary_square.png'

describe('brand marketing imagery', () => {
  it('rejects the Starbucks social square', () => {
    expect(isBrandMarketingImageUrl(STARBUCKS_OG)).toBe(true)
    expect(assessPhotoUrl(STARBUCKS_OG)).toEqual({
      url: STARBUCKS_OG,
      ok: false,
      reason: 'brand_marketing',
    })
  })

  it('rejects it on a Starbucks listing too, not just other brands', () => {
    // The rule is about what the image is, not whose row it sits on: a
    // corporate square is not a photograph of a particular store.
    const starbucksRow = {
      name: 'Starbucks',
      photos: STARBUCKS_OG,
      logoUrl: STARBUCKS_OG,
    }
    expect(pickDisplayPhoto(starbucksRow)).toBeNull()
  })

  it('rejects the other Open Graph and social cards found in the directory', () => {
    const found = [
      'https://clutchcitycluckers.com/wp-content/uploads/2023/11/Social-Share-Image.png',
      'https://www.buffetkingtx.com/f4s8dg3n/opengraph-image-959cal/og-image?0b56cf29834ff804',
      'https://littlewoodrows.com/wp-content/uploads/2025/02/Woodrows-OG-Image.png',
      'https://www.lifetime.life/content/dam/lifetime/images/social/club-home-social.png',
      'https://freshmonkee.com/wp-content/uploads/2025/05/open-graph.png',
      'https://www.portillos.com/assets/1/6/Open-graph-new.jpg',
      'https://5starac.com/__static/ogimage-jdj5jdewjhdvy2z3rwmuqxrfqlrkrejr/Image-for-Homepage-Cache.png',
    ]
    for (const url of found) {
      expect(assessPhotoUrl(url).reason).toBe('brand_marketing')
    }
  })

  it('rejects press kit and brand asset directories', () => {
    expect(isBrandMarketingImageUrl('https://example.com/press-kit/exterior.jpg')).toBe(true)
    expect(isBrandMarketingImageUrl('https://example.com/brand-assets/wordmark.svg')).toBe(true)
    expect(isBrandMarketingImageUrl('https://example.com/img/twitter-card.png')).toBe(true)
  })

  it('rejects app-store badge artwork', () => {
    // What all sixteen McDonald's rows were holding.
    expect(
      assessPhotoUrl(
        'https://www.mcdonalds.com/content/dam/sites/usa/nfl/images/RestaurantLocator_Googleplay_236x76.png'
      ).reason
    ).toBe('brand_marketing')
  })

  it('rejects any image served from a corporate marketing host', () => {
    expect(isBrandMarketingImageUrl('https://www.starbucks.com/img/store-front.jpg')).toBe(true)
    expect(isBrandMarketingImageUrl('https://www.mcdonalds.com/content/dam/x.png')).toBe(true)
  })

  it('keeps a chain CDN that serves real per-store photography', () => {
    // Chick-fil-A publishes a photograph per store number. Rejecting the host
    // would delete genuine venue photos, which is the opposite of the point.
    expect(
      assessPhotoUrl('https://static.cfacdn.com/photos/restaurants/00943/large.jpg').ok
    ).toBe(true)
  })

  it('leaves genuine venue photography alone', () => {
    const keep = [
      // The bulk of the directory: Google Places photos of the actual venue.
      'https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=abc',
      // An independent's own site, with the comma-heavy Wix transform intact.
      'https://static.wixstatic.com/media/abc~mv2.jpg/v1/fill/w_286,h_335,al_c/abc~mv2.jpg',
      'https://images.squarespace-cdn.com/content/v1/abc/dining-room.jpg',
      'https://a.mktgcdn.com/p/photo-of-the-patio.jpg',
      '/uploads/harlem-road-bbq-hero.jpg',
    ]
    for (const url of keep) {
      expect(assessPhotoUrl(url).ok).toBe(true)
    }
  })

  it('does not treat a social handle in a filename as marketing collateral', () => {
    // '/social/' is a directory rule; a dish that happens to be named for one
    // should still be shown.
    expect(assessPhotoUrl('https://example.com/menu/socialite-burger.jpg').ok).toBe(true)
  })

  it('still rejects what it rejected before', () => {
    expect(assessPhotoUrl('https://images.unsplash.com/photo-1517248135467').reason).toBe(
      'stock_unsplash'
    )
    expect(assessPhotoUrl('https://example.com/favicon.ico').reason).toBe('logo_or_favicon')
    expect(assessPhotoUrl('https://example.com/assets/logo-dark.png').reason).toBe(
      'logo_or_favicon'
    )
    expect(assessPhotoUrl('  ').reason).toBe('empty')
    expect(assessPhotoUrl('not a url').reason).toBe('invalid_url')
  })
})

describe('display selection', () => {
  it('drops brand artwork from a photo list but keeps the real photo', () => {
    const real = 'https://a.mktgcdn.com/p/interior.jpg'
    expect(filterDisplayPhotos([STARBUCKS_OG, real])).toEqual([real])
  })

  it('prefers a venue photo over a brand tile regardless of order', () => {
    const real = 'https://a.mktgcdn.com/p/interior.jpg'
    expect(pickDisplayPhoto({ photos: `${STARBUCKS_OG},${real}` })).toBe(real)
  })

  it('rejects a brand tile arriving as an already-split array', () => {
    // The Grub Roulette reveal hands over a string[] from a naive split, so the
    // guard has to hold for that shape too, not just the raw column.
    expect(filterDisplayPhotos([STARBUCKS_OG])).toEqual([])
  })

  it('will not fall back to a brand logo in logoUrl', () => {
    expect(
      pickDisplayPhoto({ photos: '', logoUrl: 'https://example.com/logos/brand.png' })
    ).toBeNull()
  })
})
