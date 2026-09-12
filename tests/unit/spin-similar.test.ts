import {
  buildSpinSimilarHref,
  deriveSimilarSeed,
  expandCuisineTerms,
  matchCuisineChips,
  matchesCuisines,
  matchesTerms,
  meaningfulLabels,
  normalizeLabel,
} from '../../lib/spinner/similar'
import { buildCandidateWhere } from '../../lib/spinner/candidates'

describe('normalizeLabel', () => {
  it('flattens the separators the importers use', () => {
    expect(normalizeLabel('mexican_restaurant')).toBe('mexican restaurant')
    expect(normalizeLabel('Tex-Mex')).toBe('tex mex')
    expect(normalizeLabel('  BBQ   Joint ')).toBe('bbq joint')
  })
})

describe('matchCuisineChips', () => {
  it('matches a chip label directly', () => {
    expect(matchCuisineChips(['Mexican'])).toEqual(['Mexican'])
  })

  it('maps messy cuisine tags onto the chip list', () => {
    expect(matchCuisineChips(['tacos'])).toEqual(['Mexican'])
    expect(matchCuisineChips(['smokehouse'])).toEqual(['BBQ'])
    expect(matchCuisineChips(['pho'])).toEqual(['Asian'])
    expect(matchCuisineChips(['pizzeria'])).toEqual(['Italian'])
    expect(matchCuisineChips(['kolache'])).toEqual(['Breakfast'])
    expect(matchCuisineChips(['crawfish'])).toEqual(['Seafood'])
    expect(matchCuisineChips(['tandoori'])).toEqual(['Indian'])
    expect(matchCuisineChips(['mexican_restaurant'])).toEqual(['Mexican'])
  })

  it('respects word boundaries so short aliases do not bleed', () => {
    expect(matchCuisineChips(['pita wraps'])).toEqual([])
    expect(matchCuisineChips(['fishery supply'])).toEqual([])
    expect(matchCuisineChips(['fish and chips'])).toEqual(['Seafood'])
  })

  it('keeps label order and caps the number of chips', () => {
    expect(matchCuisineChips(['BBQ', 'burgers', 'tacos'])).toEqual(['BBQ', 'American'])
    expect(matchCuisineChips(['BBQ', 'burgers', 'tacos'], 3)).toEqual(['BBQ', 'American', 'Mexican'])
  })

  it('returns nothing for directory noise', () => {
    expect(matchCuisineChips(['Food', 'Restaurant', 'Point of interest'])).toEqual([])
  })
})

describe('deriveSimilarSeed', () => {
  it('seeds from categories when they carry the cuisine', () => {
    const seed = deriveSimilarSeed({
      categories: ['Mexican'],
      cuisineTypes: ['tacos', 'casual', 'quick', 'creative'],
    })

    expect(seed.cuisines).toEqual(['Mexican'])
    expect(seed.terms).toEqual([])
    expect(seed.label).toBe('Mexican')
  })

  it('falls back to cuisineTypes for Google-shaped rows', () => {
    const seed = deriveSimilarSeed({
      categories: ['Food', 'Restaurant'],
      cuisineTypes: ['mexican_restaurant'],
    })

    expect(seed.cuisines).toEqual(['Mexican'])
  })

  it('accepts comma-separated Prisma columns', () => {
    const seed = deriveSimilarSeed({ categories: 'Food,Restaurant', cuisineTypes: 'bbq, smoked' })
    expect(seed.cuisines).toEqual(['BBQ'])
  })

  it('keeps food-like labels as free-text terms when nothing maps to a chip', () => {
    const seed = deriveSimilarSeed({ categories: ['Greek'], cuisineTypes: ['casual'] })

    expect(seed.cuisines).toEqual([])
    expect(seed.terms).toEqual(['greek'])
    expect(seed.label).toBe('greek')
  })

  it('returns an empty seed when the row says nothing about food', () => {
    const seed = deriveSimilarSeed({ categories: ['Food', 'Restaurant'], cuisineTypes: ['casual', 'quick'] })

    expect(seed.cuisines).toEqual([])
    expect(seed.terms).toEqual([])
  })
})

describe('buildSpinSimilarHref', () => {
  it('passes the mapped category and the referring id', () => {
    const href = buildSpinSimilarHref({
      id: 'cmlpz3jtf000mcojw4gkwg1sy',
      name: "Torchy's Tacos",
      categories: ['Mexican'],
      cuisineTypes: ['tacos', 'casual'],
    })

    expect(href).toBe('/spinner?category=Mexican&restaurant=cmlpz3jtf000mcojw4gkwg1sy')
  })

  it('carries a free-text type when no chip matches', () => {
    const href = buildSpinSimilarHref({ id: 'abc', categories: ['Greek'] })
    expect(href).toBe('/spinner?type=greek&restaurant=abc')
  })

  it('still links to the spinner when the row has no usable labels', () => {
    expect(buildSpinSimilarHref({ id: 'abc', categories: ['Food'] })).toBe('/spinner?restaurant=abc')
    expect(buildSpinSimilarHref({})).toBe('/spinner')
  })

  it('encodes values that need it', () => {
    const href = buildSpinSimilarHref({ id: 'a b/c', categories: ['Food'] })
    expect(href).toBe('/spinner?restaurant=a+b%2Fc')
  })
})

describe('expandCuisineTerms', () => {
  it('expands a chip into the tags the directory actually uses', () => {
    const terms = expandCuisineTerms(['Mexican'])

    expect(terms).toContain('mexican')
    expect(terms).toContain('taqueria')
    expect(terms).toContain('tex mex')
  })

  it('passes unknown values through so hand-written URLs still filter', () => {
    expect(expandCuisineTerms(['Greek'])).toEqual(['greek'])
  })

  it('de-duplicates overlapping chips', () => {
    const terms = expandCuisineTerms(['Mexican', 'Mexican'])
    expect(new Set(terms).size).toBe(terms.length)
  })
})

describe('client-side filters', () => {
  const torchys = {
    name: "Torchy's Tacos",
    categories: ['Food', 'Restaurant'],
    cuisineTypes: ['tacos', 'casual'],
  }

  it('matches a chip through its aliases', () => {
    expect(matchesCuisines(torchys, ['Mexican'])).toBe(true)
    expect(matchesCuisines(torchys, ['Italian'])).toBe(false)
  })

  it('treats an empty filter as "everything"', () => {
    expect(matchesCuisines(torchys, [])).toBe(true)
    expect(matchesTerms(torchys, [])).toBe(true)
  })

  it('matches free-text terms', () => {
    expect(matchesTerms(torchys, ['taco'])).toBe(true)
    expect(matchesTerms(torchys, ['sushi'])).toBe(false)
  })
})

describe('meaningfulLabels', () => {
  it('drops directory noise and vibe adjectives', () => {
    expect(meaningfulLabels(['Food', 'Restaurant', 'casual', 'Greek'])).toEqual(['greek'])
  })

  it('collapses "<cuisine> restaurant" duplicates', () => {
    expect(meaningfulLabels(['Greek restaurant', 'greek'])).toEqual(['greek'])
  })
})

describe('buildCandidateWhere', () => {
  it('keeps the referring listing out of a wedge-restricted draw', () => {
    const where = buildCandidateWhere({ includeIds: ['a', 'b'], excludeIds: ['c'] })
    expect(where.id).toEqual({ in: ['a', 'b'], notIn: ['c'] })
  })

  it('applies either side on its own', () => {
    expect(buildCandidateWhere({ includeIds: ['a'] }).id).toEqual({ in: ['a'] })
    expect(buildCandidateWhere({ excludeIds: ['c'] }).id).toEqual({ notIn: ['c'] })
  })

  it('leaves the id filter off when there is nothing to constrain', () => {
    const where = buildCandidateWhere({})
    expect(where.id).toBeUndefined()
    expect(where.active).toBe(true)
  })

  it('groups cuisine and mood terms independently', () => {
    const where = buildCandidateWhere({ categories: ['mexican'], terms: ['spicy'] })
    expect(where.AND).toHaveLength(2)
  })
})