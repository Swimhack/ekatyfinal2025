import { matchesCategory, distanceMiles, escapeRegExp } from '../../lib/search'

describe('matchesCategory', () => {
  it('matches an exact token case-insensitively', () => {
    expect(matchesCategory(['Mexican,Tex-Mex'], 'mexican')).toBe(true)
    expect(matchesCategory(['mexican'], 'Mexican')).toBe(true)
  })

  it('does not match substrings inside longer words', () => {
    expect(matchesCategory(['BBQ,Barbecue'], 'Bar')).toBe(false)
    expect(matchesCategory(['Grill,Grilled Cheese'], 'rill')).toBe(false)
  })

  it('matches whole words inside multi-word tags', () => {
    expect(matchesCategory(['Sports Bar,American'], 'Bar')).toBe(true)
    expect(matchesCategory(['Asian Fusion'], 'Asian')).toBe(true)
    expect(matchesCategory(['New American'], 'American')).toBe(true)
  })

  it('checks all provided fields', () => {
    expect(matchesCategory(['Restaurant', 'BBQ,Texas BBQ'], 'BBQ')).toBe(true)
    expect(matchesCategory([null, undefined, 'Thai'], 'Thai')).toBe(true)
    expect(matchesCategory([null, undefined], 'Thai')).toBe(false)
  })

  it('handles punctuation and regex special characters safely', () => {
    expect(matchesCategory(['Tex-Mex'], 'Tex-Mex')).toBe(true)
    expect(matchesCategory(["Mo's Irish Pub"], 'Pub')).toBe(true)
    expect(matchesCategory(['Coffee (Specialty)'], '(Specialty)')).toBe(true)
  })

  it('treats an empty category as match-all', () => {
    expect(matchesCategory(['Anything'], '')).toBe(true)
    expect(matchesCategory(['Anything'], '   ')).toBe(true)
  })
})

describe('escapeRegExp', () => {
  it('escapes regex metacharacters', () => {
    expect(new RegExp(escapeRegExp('a.b*c')).test('a.b*c')).toBe(true)
    expect(new RegExp(escapeRegExp('a.b*c')).test('axbbc')).toBe(false)
  })
})

describe('distanceMiles', () => {
  it('returns 0 for identical points', () => {
    expect(distanceMiles(29.7858, -95.8245, 29.7858, -95.8245)).toBe(0)
  })

  it('computes a known distance approximately', () => {
    // Katy city center to downtown Houston is roughly 25-30 miles
    const d = distanceMiles(29.7858, -95.8245, 29.7604, -95.3698)
    expect(d).toBeGreaterThan(24)
    expect(d).toBeLessThan(31)
  })

  it('is symmetric', () => {
    const a = distanceMiles(29.78, -95.82, 29.74, -95.77)
    const b = distanceMiles(29.74, -95.77, 29.78, -95.82)
    expect(a).toBeCloseTo(b, 10)
  })
})
