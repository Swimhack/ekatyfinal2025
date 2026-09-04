import {
  applyHeroImage,
  clearHeroImage,
  orderPhotosWithHeroFirst,
  parsePhotos,
  parseRestaurantMetadata,
  resolveExplicitHeroImage,
  resolveHeroImage,
  serializePhotos,
  withResolvedImages,
} from '../../lib/restaurant-images'

const BRAND_OG = 'https://cdn.example.com/brand-og.jpg'
const UPLOADED_HERO = '/uploads/restaurants/hero-1730000000000-abc123.jpg'

describe('parseRestaurantMetadata', () => {
  it('parses JSON strings and tolerates junk', () => {
    expect(parseRestaurantMetadata('{"heroImage":"/a.jpg"}')).toEqual({ heroImage: '/a.jpg' })
    expect(parseRestaurantMetadata('not json')).toEqual({})
    expect(parseRestaurantMetadata(null)).toEqual({})
    expect(parseRestaurantMetadata({ heroImage: '/a.jpg' })).toEqual({ heroImage: '/a.jpg' })
  })
})

describe('parsePhotos / serializePhotos', () => {
  it('handles comma lists, arrays and blanks', () => {
    expect(parsePhotos('/a.jpg, /b.jpg ,,')).toEqual(['/a.jpg', '/b.jpg'])
    expect(parsePhotos(['/a.jpg', ' '])).toEqual(['/a.jpg'])
    expect(parsePhotos(null)).toEqual([])
    expect(serializePhotos(['/a.jpg', '/b.jpg'])).toBe('/a.jpg,/b.jpg')
  })
})

describe('resolveHeroImage', () => {
  it('prefers metadata.heroImage', () => {
    const hero = resolveHeroImage({
      metadata: JSON.stringify({ heroImage: UPLOADED_HERO, profileImageUrl: '/other.jpg' }),
      photos: BRAND_OG,
    })

    expect(hero).toBe(UPLOADED_HERO)
  })

  it('falls back to metadata.profileImageUrl (production field split)', () => {
    const hero = resolveHeroImage({
      metadata: JSON.stringify({ heroImage: null, profileImageUrl: UPLOADED_HERO }),
      photos: BRAND_OG,
    })

    expect(hero).toBe(UPLOADED_HERO)
  })

  it('falls back to photos[0], then logoUrl, then null', () => {
    expect(resolveHeroImage({ metadata: '{}', photos: `${BRAND_OG},/b.jpg` })).toBe(BRAND_OG)
    expect(resolveHeroImage({ metadata: '{}', photos: '', logoUrl: '/logo.png' })).toBe('/logo.png')
    expect(resolveHeroImage({})).toBeNull()
  })

  it('ignores blank strings', () => {
    expect(
      resolveHeroImage({ metadata: { heroImage: '   ', profileImageUrl: '' }, photos: [BRAND_OG] })
    ).toBe(BRAND_OG)
  })
})

describe('resolveExplicitHeroImage', () => {
  it('reports only what was saved, never a photo fallback', () => {
    expect(resolveExplicitHeroImage({ profileImageUrl: UPLOADED_HERO })).toBe(UPLOADED_HERO)
    expect(resolveExplicitHeroImage({})).toBeNull()
  })
})

describe('orderPhotosWithHeroFirst', () => {
  it('moves the hero to the front and dedupes', () => {
    expect(orderPhotosWithHeroFirst([BRAND_OG, UPLOADED_HERO, BRAND_OG], UPLOADED_HERO)).toEqual([
      UPLOADED_HERO,
      BRAND_OG,
    ])
  })

  it('prepends a hero that is not in the list yet', () => {
    expect(orderPhotosWithHeroFirst(BRAND_OG, UPLOADED_HERO)).toEqual([UPLOADED_HERO, BRAND_OG])
  })

  it('leaves photos untouched when there is no hero', () => {
    expect(orderPhotosWithHeroFirst(`${BRAND_OG},/b.jpg`, null)).toEqual([BRAND_OG, '/b.jpg'])
  })
})

describe('applyHeroImage', () => {
  it('writes both metadata keys and promotes the hero to photos[0]', () => {
    const result = applyHeroImage({
      metadata: JSON.stringify({ heroImage: '/old-hero.jpg', profileImageUrl: '/old-hero.jpg', keep: 1 }),
      photos: `${BRAND_OG},/b.jpg`,
      heroImage: UPLOADED_HERO,
    })

    expect(result.metadata.heroImage).toBe(UPLOADED_HERO)
    expect(result.metadata.profileImageUrl).toBe(UPLOADED_HERO)
    expect(result.metadata.keep).toBe(1)
    expect(result.photos[0]).toBe(UPLOADED_HERO)
    expect(result.photosCsv).toBe(`${UPLOADED_HERO},${BRAND_OG},/b.jpg`)
  })

  it('never duplicates a hero that was already in photos', () => {
    const result = applyHeroImage({
      metadata: {},
      photos: [UPLOADED_HERO, BRAND_OG],
      heroImage: UPLOADED_HERO,
    })

    expect(result.photos).toEqual([UPLOADED_HERO, BRAND_OG])
  })

  it('refuses a blank hero URL', () => {
    expect(() => applyHeroImage({ metadata: {}, photos: [], heroImage: '  ' })).toThrow()
  })
})

describe('clearHeroImage', () => {
  it('drops both hero keys and keeps the rest', () => {
    const cleared = clearHeroImage({
      heroImage: UPLOADED_HERO,
      profileImageUrl: UPLOADED_HERO,
      googlePlaceId: 'abc',
    })

    expect(cleared).toEqual({ googlePlaceId: 'abc' })
  })
})

describe('withResolvedImages', () => {
  it('adds heroImage and a hero-first photos array', () => {
    const serialized = withResolvedImages({
      metadata: JSON.stringify({ profileImageUrl: UPLOADED_HERO }),
      photos: `${BRAND_OG},/b.jpg`,
      logoUrl: '/logo.png',
    })

    expect(serialized.heroImage).toBe(UPLOADED_HERO)
    expect(serialized.photos).toEqual([UPLOADED_HERO, BRAND_OG, '/b.jpg'])
  })
})
