import { runAsk } from '../../lib/ask'
import { resolveCandidatePhoto } from '../../lib/ask/photo'
import type { AskCandidate } from '../../lib/ask/types'

// Real shapes from the production table: `photos` is a comma-separated string,
// the hero lives under one of three metadata keys, and `logoUrl` is whatever the
// Google Places import happened to grab first.
const REAL_PHOTO = 'https://lh3.googleusercontent.com/places/tita-taco-patio.jpg'
const ADMIN_HERO = '/uploads/restaurants/tita-taco/photo-1.jpg'
const STARBUCKS_OG = 'https://www.starbucks.com/weblx/images/social/summary_square.png'

function candidate(overrides: Partial<AskCandidate> & { name: string }): AskCandidate {
  const slug = overrides.slug || overrides.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return {
    id: overrides.id || slug,
    slug,
    description: null,
    address: '100 Main St',
    zipCode: '77494',
    latitude: 29.74,
    longitude: -95.76,
    priceLevel: 'MODERATE',
    categories: ['Mexican'],
    cuisineTypes: ['Tacos'],
    tags: [],
    features: [],
    rating: 4.3,
    reviewCount: 120,
    featured: false,
    hours: null,
    imageUrl: null,
    ...overrides,
  }
}

describe('resolveCandidatePhoto', () => {
  it('prefers the hero an admin saved over an imported photo', () => {
    expect(
      resolveCandidatePhoto({
        metadata: { heroImage: ADMIN_HERO },
        photos: REAL_PHOTO,
      })
    ).toBe(ADMIN_HERO)
  })

  it('reads the hero from whichever metadata key the row uses', () => {
    expect(resolveCandidatePhoto({ metadata: { profileImageUrl: ADMIN_HERO } })).toBe(ADMIN_HERO)
    expect(resolveCandidatePhoto({ metadata: { heroImageUrl: ADMIN_HERO } })).toBe(ADMIN_HERO)
  })

  it('falls back to the first stored photo, then the logo', () => {
    const second = 'https://lh3.googleusercontent.com/places/tita-taco-dining-room.jpg'

    expect(resolveCandidatePhoto({ photos: `${REAL_PHOTO},${second}` })).toBe(REAL_PHOTO)
    expect(resolveCandidatePhoto({ photos: '', logoUrl: REAL_PHOTO })).toBe(REAL_PHOTO)
  })

  it('is null when the row carries no imagery at all', () => {
    expect(resolveCandidatePhoto({})).toBeNull()
    expect(resolveCandidatePhoto({ photos: '', logoUrl: null, metadata: {} })).toBeNull()
    expect(resolveCandidatePhoto({ metadata: { heroImage: '   ' } })).toBeNull()
  })

  it('declines brand marketing artwork rather than showing a chain advert', () => {
    expect(resolveCandidatePhoto({ photos: STARBUCKS_OG, logoUrl: STARBUCKS_OG })).toBeNull()
    expect(resolveCandidatePhoto({ metadata: { heroImage: STARBUCKS_OG } })).toBeNull()
  })

  it('still finds a real photo on a row that also stores brand artwork', () => {
    expect(resolveCandidatePhoto({ photos: `${STARBUCKS_OG},${REAL_PHOTO}` })).toBe(REAL_PHOTO)
  })

  it('declines stock photography, which is nobody\u2019s dining room', () => {
    expect(
      resolveCandidatePhoto({ photos: 'https://images.unsplash.com/photo-1517248135467' })
    ).toBeNull()
  })
})

describe('ask picks carry the listing photo', () => {
  const withPhoto = candidate({ name: 'Tita Taco House', imageUrl: REAL_PHOTO })
  const withoutPhoto = candidate({ name: 'Alicia Mexican Grille' })

  it('includes the image URL when the listing has one', () => {
    const [pick] = runAsk('tacos', [withPhoto], { limit: 1 }).picks

    expect(pick.name).toBe('Tita Taco House')
    expect(pick.imageUrl).toBe(REAL_PHOTO)
  })

  it('returns null rather than omitting the field when the listing has none', () => {
    const [pick] = runAsk('tacos', [withoutPhoto], { limit: 1 }).picks

    expect(pick).toHaveProperty('imageUrl')
    expect(pick.imageUrl).toBeNull()
  })

  it('never invents an image for a listing that has none', () => {
    const picks = runAsk('tacos', [withPhoto, withoutPhoto], { limit: 2 }).picks
    const images = new Map(picks.map((pick) => [pick.name, pick.imageUrl]))

    expect(images.get('Tita Taco House')).toBe(REAL_PHOTO)
    expect(images.get('Alicia Mexican Grille')).toBeNull()
  })

  it('leaves why-lines and ordering untouched by the photo', () => {
    const pool = [withPhoto, withoutPhoto]
    const query = 'cheap tacos near 77494 with the kids'

    const withPhotos = runAsk(query, pool, { limit: 2 })
    const withoutPhotos = runAsk(
      query,
      pool.map((entry) => ({ ...entry, imageUrl: null })),
      { limit: 2 }
    )

    expect(withPhotos.picks.map((pick) => pick.why)).toEqual(
      withoutPhotos.picks.map((pick) => pick.why)
    )
    expect(withPhotos.picks.map((pick) => pick.id)).toEqual(
      withoutPhotos.picks.map((pick) => pick.id)
    )
    expect(withPhotos.picks.map((pick) => pick.score)).toEqual(
      withoutPhotos.picks.map((pick) => pick.score)
    )
  })
})
