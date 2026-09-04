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

  it('records whether the hero was added to photos or already a gallery photo', () => {
    const added = applyHeroImage({ metadata: {}, photos: [BRAND_OG], heroImage: UPLOADED_HERO })
    expect(added.metadata.heroImageAddedToPhotos).toBe(true)

    const promotedExisting = applyHeroImage({
      metadata: {},
      photos: [BRAND_OG, UPLOADED_HERO],
      heroImage: UPLOADED_HERO,
    })
    expect(promotedExisting.metadata.heroImageAddedToPhotos).toBe(false)
  })

  it('keeps the added flag when the same hero is saved twice', () => {
    const first = applyHeroImage({ metadata: {}, photos: [BRAND_OG], heroImage: UPLOADED_HERO })
    const second = applyHeroImage({
      metadata: first.metadata,
      photos: first.photos,
      heroImage: UPLOADED_HERO,
    })

    expect(second.metadata.heroImageAddedToPhotos).toBe(true)
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
      metadata: {
        heroImage: UPLOADED_HERO,
        profileImageUrl: UPLOADED_HERO,
        googlePlaceId: 'abc',
      },
    })

    expect(cleared.metadata).toEqual({ googlePlaceId: 'abc' })
  })

  it('removes the hero from photos so it cannot win via the photos[0] fallback', () => {
    const saved = applyHeroImage({
      metadata: {},
      photos: `${BRAND_OG},/b.jpg`,
      heroImage: UPLOADED_HERO,
    })

    const cleared = clearHeroImage({ metadata: saved.metadata, photos: saved.photos })

    expect(cleared.photos).toEqual([BRAND_OG, '/b.jpg'])
    expect(cleared.photosCsv).toBe(`${BRAND_OG},/b.jpg`)
    // The point of the fix: resolution no longer returns the cleared image
    expect(resolveHeroImage({ metadata: cleared.metadata, photos: cleared.photos })).toBe(BRAND_OG)
  })

  it('keeps a gallery photo but restores its original position', () => {
    const saved = applyHeroImage({
      metadata: {},
      photos: [BRAND_OG, UPLOADED_HERO],
      heroImage: UPLOADED_HERO,
    })
    expect(saved.photos).toEqual([UPLOADED_HERO, BRAND_OG])

    const cleared = clearHeroImage({ metadata: saved.metadata, photos: saved.photos })

    // Back where the admin had it, so it is no longer the primary image
    expect(cleared.photos).toEqual([BRAND_OG, UPLOADED_HERO])
    expect(resolveHeroImage({ metadata: cleared.metadata, photos: cleared.photos })).toBe(BRAND_OG)
  })

  it('tolerates photos changing between saving and clearing a hero', () => {
    const saved = applyHeroImage({
      metadata: {},
      photos: [BRAND_OG, '/b.jpg', UPLOADED_HERO],
      heroImage: UPLOADED_HERO,
    })

    // Admin deleted the other photos in the meantime
    const cleared = clearHeroImage({ metadata: saved.metadata, photos: [UPLOADED_HERO] })

    expect(cleared.photos).toEqual([UPLOADED_HERO])
  })

  it('leaves photos alone for legacy rows saved before the flag existed', () => {
    const cleared = clearHeroImage({
      metadata: { profileImageUrl: '/uploads/restaurants/legacy.jpg' },
      photos: `${BRAND_OG},/b.jpg`,
    })

    expect(cleared.photos).toEqual([BRAND_OG, '/b.jpg'])
  })

  it('clearing with no hero set is a no-op on photos', () => {
    const cleared = clearHeroImage({ metadata: {}, photos: BRAND_OG })

    expect(cleared.metadata).toEqual({})
    expect(cleared.photos).toEqual([BRAND_OG])
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
