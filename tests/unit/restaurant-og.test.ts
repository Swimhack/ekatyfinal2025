import {
  buildRestaurantDescription,
  buildRestaurantTitle,
  displayCuisine,
  isUsableOgImage,
  parsePhotoCandidates,
  pickOgImage,
  primaryCuisine,
  resolveOgImage,
} from '../../lib/seo/restaurant-og'

const base = {
  name: 'Raspados El Oasis',
  slug: 'raspados-el-oasis',
  city: 'Katy',
  state: 'TX',
  zipCode: '77433',
}

describe('buildRestaurantTitle', () => {
  it('names the restaurant so the page stops sharing the homepage title', () => {
    const title = buildRestaurantTitle({ ...base, categories: ['Fast Food', 'Restaurant'] })
    expect(title).toBe('Raspados El Oasis | Fast Food Restaurant in Katy, TX 77433')
  })

  it('skips cuisine tags the importer writes when it knows nothing', () => {
    const title = buildRestaurantTitle({ ...base, categories: ['Food', 'Restaurant'] })
    expect(title).toBe('Raspados El Oasis | Restaurant in Katy, TX 77433')
  })
})

describe('buildRestaurantDescription', () => {
  it('leads with the listing name when its own copy does not', () => {
    const description = buildRestaurantDescription({
      ...base,
      name: 'Burger King',
      description: 'Well-known fast-food chain serving grilled burgers, fries & shakes.',
    })
    expect(description).toBe(
      'Burger King: Well-known fast-food chain serving grilled burgers, fries & shakes.'
    )
  })

  it('writes "in Katy, TX" rather than "at Katy, TX" when there is no street', () => {
    const description = buildRestaurantDescription({ ...base, categories: ['Mexican'] })
    expect(description).toContain('is a Mexican restaurant in Katy, TX, 77433.')
  })

  it('stays inside the length a search result will show', () => {
    const description = buildRestaurantDescription({ ...base, description: 'x'.repeat(400) })
    expect(description.length).toBeLessThanOrEqual(158)
  })
})

describe('primaryCuisine', () => {
  it('prefers a cuisine tag over a generic category', () => {
    expect(primaryCuisine({ ...base, cuisineTypes: ['Burger'], categories: ['Food'] })).toBe('Burger')
  })

  it('returns null when every tag is generic', () => {
    expect(primaryCuisine({ ...base, categories: ['Restaurant', 'Food'] })).toBeNull()
  })
})

describe('displayCuisine', () => {
  it('capitalises a lower-case mood tag so the title does not read "upscale Restaurant"', () => {
    expect(displayCuisine({ ...base, cuisineTypes: ['upscale', 'date-night'] })).toBe('Upscale')
  })

  it('leaves a tag that already carries capitals alone', () => {
    expect(displayCuisine({ ...base, cuisineTypes: ['BBQ'] })).toBe('BBQ')
    expect(displayCuisine({ ...base, cuisineTypes: ['Tex-Mex'] })).toBe('Tex-Mex')
  })
})

describe('parsePhotoCandidates', () => {
  it('keeps a CDN URL whose own path contains commas', () => {
    const url = 'https://dyn.mktgcdn.com/p/abc/width=250,height=505'
    expect(parsePhotoCandidates(url)).toEqual([url])
  })

  it('separates two comma-joined URLs', () => {
    expect(parsePhotoCandidates('https://a.example/1.jpg,https://b.example/2.jpg')).toEqual([
      'https://a.example/1.jpg',
      'https://b.example/2.jpg',
    ])
  })

  it('reads URLs out of a row that a naive comma split tore into JSON fragments', () => {
    const fragments = [
      'https://a.mktgcdn.com/p/one/2389x2389.jpg',
      '["https://a.mktgcdn.com/p/one/2389x2389.jpg"',
      '"https://dyn.mktgcdn.com/p/two/width=250',
      'height=505"]',
    ]
    expect(parsePhotoCandidates(fragments)).toEqual([
      'https://a.mktgcdn.com/p/one/2389x2389.jpg',
      'https://dyn.mktgcdn.com/p/two/width=250,height=505',
    ])
  })

  it('returns nothing for an empty column', () => {
    expect(parsePhotoCandidates('')).toEqual([])
    expect(parsePhotoCandidates(null)).toEqual([])
  })
})

describe('isUsableOgImage', () => {
  it('accepts a photo served from a CDN', () => {
    expect(isUsableOgImage('https://lh3.googleusercontent.com/places/abc=s1600')).toBe(true)
  })

  it('accepts an upload from our own origin', () => {
    expect(isUsableOgImage('/uploads/restaurants/abc/photo-1.jpg')).toBe(true)
  })

  it("rejects a chain's Open Graph tile, which is identical for every location", () => {
    expect(isUsableOgImage('https://cdn.example.com/assets/og-image.png')).toBe(false)
    expect(isUsableOgImage('https://cdn.example.com/social-share/card.jpg')).toBe(false)
    expect(isUsableOgImage('https://www.starbucks.com/whatever.jpg')).toBe(false)
  })

  it('rejects logos, favicons and app-store badges', () => {
    expect(isUsableOgImage('https://cdn.example.com/logo.png')).toBe(false)
    expect(isUsableOgImage('https://cdn.example.com/favicon.ico')).toBe(false)
    expect(isUsableOgImage('https://cdn.example.com/RestaurantLocator_Googleplay_236x76.png')).toBe(false)
  })

  it('rejects stock photography', () => {
    expect(isUsableOgImage('https://images.unsplash.com/photo-123')).toBe(false)
  })

  it('rejects formats a scraper will not render', () => {
    expect(isUsableOgImage('https://cdn.example.com/storefront.svg')).toBe(false)
  })

  it('rejects an image that declares itself smaller than Open Graph allows', () => {
    expect(isUsableOgImage('https://dynl.mktgcdn.com/p/abc/150x150.png')).toBe(false)
    expect(isUsableOgImage('https://cdn.example.com/photo.jpg?width=64&height=64')).toBe(false)
  })

  it('keeps a large image whose path or query states its size', () => {
    expect(isUsableOgImage('https://a.mktgcdn.com/p/abc/2389x2389.jpg')).toBe(true)
    expect(isUsableOgImage('https://dyn.mktgcdn.com/p/abc/width=250,height=505')).toBe(true)
  })
})

describe('pickOgImage', () => {
  it('prefers the image an admin or owner set', () => {
    const picked = pickOgImage({
      ...base,
      heroImage: 'https://cdn.example.com/hero.jpg',
      photos: 'https://cdn.example.com/other.jpg',
    })
    expect(picked).toBe('https://cdn.example.com/hero.jpg')
  })

  it('falls past a rejected hero to the next usable photo', () => {
    const picked = pickOgImage({
      ...base,
      heroImage: 'https://images.unsplash.com/photo-123',
      photos: 'https://cdn.example.com/storefront.jpg',
    })
    expect(picked).toBe('https://cdn.example.com/storefront.jpg')
  })

  it('returns null for a listing with no photos', () => {
    expect(pickOgImage({ ...base, photos: '' })).toBeNull()
  })
})

describe('resolveOgImage', () => {
  it('uses the generated card instead of the homepage image when there is no photo', () => {
    const image = resolveOgImage({ ...base, photos: '' })
    expect(image.isGeneratedCard).toBe(true)
    expect(image.url).toMatch(/\/restaurants\/raspados-el-oasis\/og$/)
    expect(image.url).not.toContain('og-image.jpg')
  })

  it('makes a relative upload absolute', () => {
    const image = resolveOgImage({ ...base, photos: '/uploads/restaurants/abc/photo-1.jpg' })
    expect(image.isGeneratedCard).toBe(false)
    expect(image.url).toMatch(/^https?:\/\/.+\/uploads\/restaurants\/abc\/photo-1\.jpg$/)
  })
})
