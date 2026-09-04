import { diversifyAdjacentPhotos } from '../../lib/utils/photo-diversity'

const STARBUCKS_OG = 'https://www.starbucks.com/weblx/images/social/summary_square.png'

describe('diversifyAdjacentPhotos', () => {
  it('gives a brand tile no route to a card', () => {
    // This is what /categories/cafe did: every Starbucks row's only image was
    // the corporate square, and the grid rendered it thirteen times.
    const starbucks = Array.from({ length: 3 }, (_, i) => ({
      id: `s${i}`,
      name: 'Starbucks',
      photos: STARBUCKS_OG,
      logoUrl: STARBUCKS_OG,
    }))
    const out = diversifyAdjacentPhotos(starbucks)
    expect(out.map((r) => r.displayPhoto)).toEqual([null, null, null])
  })

  it('refuses stock photography and favicons as well', () => {
    const out = diversifyAdjacentPhotos([
      { id: '1', name: 'Stock', photos: 'https://images.unsplash.com/photo-1517248135467' },
      { id: '2', name: 'Icon', photos: 'https://example.com/favicon.png' },
    ])
    expect(out.every((r) => r.displayPhoto === null)).toBe(true)
  })

  it('shows a restaurant its own photo', () => {
    const own = 'https://a.mktgcdn.com/p/dining-room.jpg'
    const [row] = diversifyAdjacentPhotos([{ id: '1', name: 'Local Cafe', photos: own }])
    expect(row.displayPhoto).toBe(own)
  })

  it('avoids repeating a photo on neighbouring cards', () => {
    const shared = 'https://a.mktgcdn.com/p/shared.jpg'
    const other = 'https://a.mktgcdn.com/p/other.jpg'
    const out = diversifyAdjacentPhotos([
      { id: '1', name: 'One', photos: shared },
      { id: '2', name: 'Two', photos: `${shared},${other}` },
    ])
    expect(out[0].displayPhoto).toBe(shared)
    expect(out[1].displayPhoto).toBe(other)
  })

  it('shows a repeat rather than inventing a substitute', () => {
    // Two rows whose only photo is the same file: honest repetition beats
    // putting a stranger's photo on one of them.
    const shared = 'https://a.mktgcdn.com/p/shared.jpg'
    const out = diversifyAdjacentPhotos([
      { id: '1', name: 'One', photos: shared },
      { id: '2', name: 'Two', photos: shared },
    ])
    expect(out.map((r) => r.displayPhoto)).toEqual([shared, shared])
  })

  it('reads comma-heavy CDN URLs as one photo', () => {
    const wix =
      'https://static.wixstatic.com/media/abc~mv2.jpg/v1/fill/w_286,h_335,al_c/abc~mv2.jpg'
    const [row] = diversifyAdjacentPhotos([{ id: '1', name: 'Wix Cafe', photos: wix }])
    expect(row.displayPhoto).toBe(wix)
  })

  it('prefers an admin hero image over the imported photos', () => {
    const hero = '/uploads/hero.jpg'
    const [row] = diversifyAdjacentPhotos([
      { id: '1', name: 'Hero', heroImage: hero, photos: 'https://a.mktgcdn.com/p/x.jpg' },
    ])
    expect(row.displayPhoto).toBe(hero)
  })
})
