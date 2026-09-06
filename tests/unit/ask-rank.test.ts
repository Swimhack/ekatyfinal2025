import { runAsk } from '../../lib/ask'
import {
  applyHardFilters,
  rankCandidates,
  scoreCandidate,
  WEAK_VIBE_WEIGHT,
} from '../../lib/ask/rank'
import { parseAskQuery } from '../../lib/ask/parse'
import type { AskCandidate } from '../../lib/ask/types'

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
    categories: [],
    cuisineTypes: [],
    tags: [],
    features: [],
    rating: 4.2,
    reviewCount: 100,
    featured: false,
    hours: null,
    ...overrides,
  }
}

/** Stand-in inventory. Shapes mirror real rows: comma-split lists and tags. */
const POOL: AskCandidate[] = [
  candidate({
    name: 'Tita Taco House',
    categories: ['Mexican', 'Tacos', 'Casual'],
    cuisineTypes: ['Street Tacos', 'Mexican'],
    priceLevel: 'BUDGET',
    zipCode: '77449',
    latitude: 29.79,
    longitude: -95.73,
    rating: 4.4,
  }),
  candidate({
    name: 'Alicia Mexican Grille',
    categories: ['Mexican', 'Family', 'Authentic'],
    cuisineTypes: ['Mexican', 'Traditional'],
    priceLevel: 'MODERATE',
    zipCode: '77494',
    rating: 4.3,
  }),
  candidate({
    name: 'Vida Mariscos',
    categories: ['Mexican', 'Seafood'],
    cuisineTypes: ['Mexican Seafood', 'Ceviche'],
    priceLevel: 'MODERATE',
    zipCode: '77450',
    rating: 4.1,
  }),
  candidate({
    name: "Torchy's Tacos",
    categories: ['Mexican'],
    cuisineTypes: ['tacos', 'casual', 'quick'],
    priceLevel: 'BUDGET',
    zipCode: '77494',
    rating: 4.3,
    reviewCount: 890,
  }),
  candidate({
    name: 'Sushi Hana',
    categories: ['Japanese', 'Sushi', 'Asian'],
    cuisineTypes: ['Sushi', 'Japanese'],
    priceLevel: 'MODERATE',
    zipCode: '77449',
    rating: 4.5,
  }),
  candidate({
    name: 'Antonia Cucina Italiana',
    categories: ['Italian'],
    cuisineTypes: ['italian', 'pasta', 'wine', 'date-night'],
    features: ['Wine Bar', 'Romantic'],
    priceLevel: 'UPSCALE',
    zipCode: '77494',
    rating: 4.6,
  }),
  candidate({
    name: 'Perry Steakhouse',
    categories: ['Steakhouse'],
    cuisineTypes: ['fine-dining', 'steakhouse', 'special-occasion'],
    features: ['Private Dining'],
    priceLevel: 'PREMIUM',
    zipCode: '77494',
    rating: 4.8,
    featured: true,
  }),
  candidate({
    name: 'Harlem Road BBQ',
    categories: ['BBQ', 'Casual', 'Family'],
    cuisineTypes: ['Barbecue', 'Texas BBQ', 'Smoked Meats'],
    priceLevel: 'MODERATE',
    zipCode: '77494',
    rating: 4.7,
  }),
  candidate({
    name: 'Midway BBQ',
    categories: ['BBQ', 'Casual'],
    cuisineTypes: ['Barbecue', 'Smoked Meats'],
    priceLevel: 'MODERATE',
    zipCode: '77494',
    rating: 4.6,
  }),
  // Same brand at two addresses: our own inventory says "multi-location".
  candidate({
    id: 'republic-katy',
    slug: 'republic-grille-katy',
    name: 'The Republic Grille',
    categories: ['American'],
    cuisineTypes: ['American', 'Pub Food'],
    zipCode: '77450',
    address: '1 Republic Way',
    rating: 4.0,
  }),
  candidate({
    id: 'republic-cinco',
    slug: 'republic-grille-cinco',
    name: 'The Republic Grille',
    categories: ['American'],
    cuisineTypes: ['texas', 'live-music', 'family'],
    zipCode: '77494',
    address: '2 Cinco Ranch Blvd',
    rating: 4.0,
  }),
  // National brands, the kind a "surprise me" ask should not lead with.
  candidate({
    name: 'Burger King',
    categories: ['Burgers', 'Fast Food'],
    cuisineTypes: ['Burgers', 'American'],
    priceLevel: 'BUDGET',
    zipCode: '77494',
    rating: 3.6,
    reviewCount: 40,
  }),
  candidate({
    name: "Carrabba's Italian Grill",
    categories: ['Italian'],
    cuisineTypes: ['Italian', 'Pasta'],
    priceLevel: 'MODERATE',
    zipCode: '77450',
    rating: 4.1,
    reviewCount: 60,
  }),
]

const POOL_IDS = new Set(POOL.map((c) => c.id))

describe('applyHardFilters', () => {
  it('drops every listing tagged with a ruled-out cuisine', () => {
    const schema = parseAskQuery('dinner but no sushi')
    const { matched, removedBy } = applyHardFilters(POOL, schema)

    expect(matched.map((c) => c.name)).not.toContain('Sushi Hana')
    expect(removedBy.cuisine_exclude).toBe(1)
  })

  it('matches a ruled-out cuisine against the restaurant name as well as its tags', () => {
    const pool = [candidate({ name: 'Sushi Corner', categories: ['Asian'], cuisineTypes: ['Asian'] })]
    const { matched } = applyHardFilters(pool, parseAskQuery('no sushi'))
    expect(matched).toHaveLength(0)
  })

  it('requires a listing to match the cuisine that was asked for', () => {
    const { matched } = applyHardFilters(POOL, parseAskQuery('mexican food'))
    const names = matched.map((c) => c.name)

    expect(names).toContain('Alicia Mexican Grille')
    expect(names).not.toContain('Sushi Hana')
    expect(names).not.toContain('Harlem Road BBQ')
  })

  it('drops known chain brands when the diner said no chains', () => {
    const { matched } = applyHardFilters(POOL, parseAskQuery('tacos, no chains'))
    expect(matched.map((c) => c.name)).not.toContain("Torchy's Tacos")
  })

  it('drops a brand our own inventory lists at more than one address', () => {
    const { matched, removedBy } = applyHardFilters(POOL, parseAskQuery('somewhere local only'))

    expect(matched.map((c) => c.name)).not.toContain('The Republic Grille')
    expect(removedBy.exclude_chains).toBeGreaterThanOrEqual(2)
  })

  it('honours an explicit metadata.isChain flag over the name heuristics', () => {
    const flags = new Map([['republic-katy', false], ['republic-cinco', false]])
    const { matched } = applyHardFilters(POOL, parseAskQuery('no chains'), {}, flags)
    expect(matched.filter((c) => c.name === 'The Republic Grille')).toHaveLength(2)
  })

  describe('surprise picks', () => {
    it('drops national chains from a bare "surprise me"', () => {
      const { matched, removedBy } = applyHardFilters(POOL, parseAskQuery('surprise me'))
      const names = matched.map((c) => c.name)

      expect(names).not.toContain('Burger King')
      expect(names).not.toContain("Carrabba's Italian Grill")
      expect(names).not.toContain("Torchy's Tacos")
      expect(removedBy.surprise_chains).toBeGreaterThan(0)
    })

    it('drops the brand our own inventory lists at two addresses as well', () => {
      const { matched } = applyHardFilters(POOL, parseAskQuery('somewhere new'))
      expect(matched.map((c) => c.name)).not.toContain('The Republic Grille')
    })

    it('respects an explicit metadata.isChain override on a surprise ask', () => {
      const flags = new Map([['republic-katy', false], ['republic-cinco', false]])
      const { matched } = applyHardFilters(POOL, parseAskQuery('surprise me'), {}, flags)
      expect(matched.filter((c) => c.name === 'The Republic Grille')).toHaveLength(2)
    })

    it('still excludes chains when a surprise ask also names a cuisine', () => {
      const { matched } = applyHardFilters(POOL, parseAskQuery('surprise me, something italian'))
      const names = matched.map((c) => c.name)

      expect(names).toContain('Antonia Cucina Italiana')
      expect(names).not.toContain("Carrabba's Italian Grill")
    })

    it('keeps the chain when the diner named the brand', () => {
      const { matched, removedBy } = applyHardFilters(POOL, parseAskQuery('surprise me with burger king'))

      expect(matched.map((c) => c.name)).toContain('Burger King')
      expect(removedBy.surprise_chains).toBeUndefined()
    })

    it('leaves a non-surprise cuisine ask alone', () => {
      const { matched, removedBy } = applyHardFilters(POOL, parseAskQuery('burgers'))

      expect(matched.map((c) => c.name)).toContain('Burger King')
      expect(removedBy.surprise_chains).toBeUndefined()
    })

    it('excludes the chain even when that leaves the pool short', () => {
      const thin = [
        candidate({ name: 'Burger King', categories: ['Burgers'], cuisineTypes: ['Burgers'] }),
        candidate({ name: 'Sushi Hana', categories: ['Sushi'], cuisineTypes: ['Sushi'] }),
      ]
      const { matched, removedBy } = applyHardFilters(thin, parseAskQuery('surprise me'))

      expect(matched.map((c) => c.name)).toEqual(['Sushi Hana'])
      expect(removedBy.surprise_chains).toBe(1)
    })
  })

  it('enforces an explicit dollar ceiling as a hard cap', () => {
    const { matched, removedBy } = applyHardFilters(POOL, parseAskQuery('dinner under $15'))

    expect(matched.every((c) => c.priceLevel === 'BUDGET')).toBe(true)
    expect(removedBy.budget_ceiling).toBeGreaterThan(0)
  })

  it('keeps a vague budget soft so a near miss is demoted, not hidden', () => {
    const { matched, removedBy } = applyHardFilters(POOL, parseAskQuery('cheap dinner'))

    expect(removedBy.budget_ceiling).toBeUndefined()
    expect(matched.map((c) => c.name)).toContain('Perry Steakhouse')
  })

  describe('open now', () => {
    // Wednesday 2025-06-11, 19:00 America/Chicago.
    const wednesdayEvening = new Date('2025-06-12T00:00:00Z')

    it('drops a listing whose stored hours say it is closed', () => {
      const pool = [
        candidate({
          name: 'Closed Wednesdays',
          hours: JSON.stringify({ wednesday: { closed: true } }),
        }),
        candidate({
          name: 'Open Late',
          hours: JSON.stringify({ wednesday: { open: '11:00', close: '22:00' } }),
        }),
      ]

      const { matched, removedBy } = applyHardFilters(pool, parseAskQuery("what's open now"), {
        now: wednesdayEvening,
      })

      expect(matched.map((c) => c.name)).toEqual(['Open Late'])
      expect(removedBy.open_now).toBe(1)
    })

    it('keeps a listing whose hours we do not have rather than guessing', () => {
      const pool = [candidate({ name: 'Hours Unknown', hours: null })]
      const { matched } = applyHardFilters(pool, parseAskQuery("what's open now"), {
        now: wednesdayEvening,
      })
      expect(matched.map((c) => c.name)).toEqual(['Hours Unknown'])
    })

    it('reads 12-hour stored hours as well as 24-hour ones', () => {
      const pool = [
        candidate({
          name: 'Twelve Hour Format',
          hours: JSON.stringify({ wednesday: { open: '11:00 AM', close: '9:00 PM' } }),
        }),
      ]
      const { matched } = applyHardFilters(pool, parseAskQuery("what's open now"), {
        now: wednesdayEvening,
      })
      expect(matched).toHaveLength(1)
    })
  })
})

describe('rankCandidates', () => {
  it('puts the requested price tier ahead of a distant one', () => {
    const { ranked } = rankCandidates(POOL, parseAskQuery('cheap mexican'))
    expect(ranked[0].candidate.priceLevel).toBe('BUDGET')
  })

  it('puts an exact zip match ahead of a further listing', () => {
    const { ranked } = rankCandidates(POOL, parseAskQuery('mexican in 77450'))
    expect(ranked[0].candidate.zipCode).toBe('77450')
  })

  it('rewards a listing tagged for the requested vibe', () => {
    const { ranked } = rankCandidates(POOL, parseAskQuery('date night'))
    expect(ranked[0].candidate.name).toBe('Antonia Cucina Italiana')
  })

  it('never returns the same brand twice', () => {
    const { ranked } = rankCandidates(POOL, parseAskQuery('american food'), { limit: 3 })
    const names = ranked.map((entry) => entry.candidate.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('is deterministic for the same pool, schema and seed', () => {
    const schema = parseAskQuery('surprise me')
    const first = rankCandidates(POOL, schema, { seed: 'surprise me' })
    const second = rankCandidates(POOL, schema, { seed: 'surprise me' })

    expect(first.ranked.map((e) => e.candidate.id)).toEqual(second.ranked.map((e) => e.candidate.id))
  })

  it('records a reason for every point it scores', () => {
    const { ranked } = rankCandidates(POOL, parseAskQuery('cheap mexican in 77449'))
    const reasons = ranked[0].reasons

    expect(reasons.length).toBeGreaterThan(0)
    expect(reasons.every((reason) => reason.weight > 0)).toBe(true)
    expect(reasons.map((reason) => reason.kind)).toContain('cuisine')
  })
})

describe('runAsk', () => {
  it('returns exactly three picks when three listings clear the ask', () => {
    const result = runAsk('cheap mexican near 77493', POOL)

    expect(result.picks).toHaveLength(3)
    expect(result.shortfall).toBeNull()
  })

  it('only ever returns restaurants from the pool it was given', () => {
    const queries = [
      'cheap mexican near 77493',
      'date night not chains',
      'surprise me',
      'bbq for a party of 8 with kids',
      'vegan ethiopian tasting menu',
      '',
    ]

    for (const query of queries) {
      const result = runAsk(query, POOL)
      for (const pick of result.picks) {
        expect(POOL_IDS.has(pick.id)).toBe(true)
        expect(POOL.some((c) => c.name === pick.name && c.slug === pick.slug)).toBe(true)
      }
    }
  })

  describe('surprise me', () => {
    it('never answers with a national chain', () => {
      for (const query of ['surprise me', 'surprise us', 'somewhere new', 'something different']) {
        const names = runAsk(query, POOL).picks.map((pick) => pick.name)

        expect(names).not.toContain('Burger King')
        expect(names).not.toContain("Carrabba's Italian Grill")
        expect(names).not.toContain("Torchy's Tacos")
        expect(names).not.toContain('The Republic Grille')
      }
    })

    it('fills all three picks from independents', () => {
      const result = runAsk('surprise me', POOL)

      expect(result.picks).toHaveLength(3)
      expect(result.shortfall).toBeNull()
    })

    it('still answers an explicit brand ask with that brand', () => {
      const result = runAsk('burger king', POOL)
      expect(result.picks.map((pick) => pick.name)).toContain('Burger King')
    })

    it('reports a shortfall rather than padding with a chain', () => {
      const thin = [
        candidate({ name: 'Burger King', categories: ['Burgers'], cuisineTypes: ['Burgers'] }),
        candidate({ name: 'Tita Taco House', categories: ['Mexican'], cuisineTypes: ['Tacos'] }),
      ]
      const result = runAsk('surprise me', thin)

      expect(result.picks.map((pick) => pick.name)).toEqual(['Tita Taco House'])
      expect(result.shortfall?.returned).toBe(1)
      expect(result.shortfall?.limiting_filters).toContain(
        'skipping the multi-location brands for a surprise'
      )
    })

    it('ties the why-line to the filter we applied, with no social proof', () => {
      for (const pick of runAsk('surprise me', POOL).picks) {
        expect(pick.why).toMatch(/multi-location brands|off the beaten path|usual suspects/i)
        expect(pick.why).not.toMatch(/independent|locally owned|family owned|hidden gem/i)
      }
    })
  })

  it('reports a shortfall instead of padding when fewer than three match', () => {
    const result = runAsk('sushi, no chains', POOL)

    expect(result.picks).toHaveLength(1)
    expect(result.picks[0].name).toBe('Sushi Hana')
    expect(result.shortfall).not.toBeNull()
    expect(result.shortfall?.returned).toBe(1)
    expect(result.shortfall?.requested).toBe(3)
    expect(result.shortfall?.limiting_filters.length).toBeGreaterThan(0)
  })

  it('returns no picks and an honest message when nothing matches', () => {
    const result = runAsk('korean bbq under $10', POOL)

    expect(result.picks).toEqual([])
    expect(result.shortfall?.returned).toBe(0)
    expect(result.shortfall?.message).toMatch(/rather show you nothing|no active Katy listings/i)
  })

  it('returns no picks for an empty pool without inventing any', () => {
    const result = runAsk('cheap mexican', [])
    expect(result.picks).toEqual([])
    expect(result.shortfall?.message).toMatch(/no active Katy listings/i)
  })

  it('deep links each pick into the existing listing route', () => {
    const result = runAsk('mexican food', POOL)
    for (const pick of result.picks) {
      expect(pick.url).toBe(`/restaurants/${pick.slug}`)
    }
  })

  it('seeds the spinner with a cuisine from the request', () => {
    const result = runAsk('cheap mexican near 77493', POOL)
    expect(result.spin_similar_url).toBe('/spinner?cuisine=Mexican&source=ask')
    expect(result.picks[0].spin_similar_url).toMatch(/^\/spinner\?cuisine=/)
  })

  it('seeds the spinner from the top pick when no cuisine was named', () => {
    const result = runAsk('date night', POOL)
    expect(result.spin_similar_url).toBe('/spinner?cuisine=Italian&source=ask')
  })

  it('carries the source through to the response and the spinner links', () => {
    const result = runAsk('tacos', POOL, { source: 'home' })
    expect(result.meta.source).toBe('home')
    expect(result.spin_similar_url).toContain('source=home')
  })

  describe('why-lines', () => {
    it('cites the constraint that matched', () => {
      const result = runAsk('cheap mexican near 77493', POOL)
      expect(result.picks[0].why).toContain('Mexican')
      expect(result.picks[0].why).toContain('$')
    })

    it('quotes the stored tag behind a vibe match', () => {
      const result = runAsk('date night', POOL)
      expect(result.picks[0].why).toMatch(/date night/i)
      expect(result.picks[0].why).toContain('"date-night"')
    })

    it('frames a no-chains match as clearing the filter, not as a claim of independence', () => {
      const result = runAsk('date night not chains', POOL)
      const lines = result.picks.map((pick) => pick.why).join(' | ')

      expect(lines).toContain('clears your no-chains filter')
      expect(lines).not.toMatch(/independent|locally owned|family owned/i)
    })

    it('falls back to the stored price tier when only a filter cleared', () => {
      const result = runAsk('date night not chains', POOL)
      const runnerUp = result.picks[1]

      expect(runnerUp.why).toMatch(/clears your no-chains filter/i)
      expect(runnerUp.why).toContain('price tier')
      expect(runnerUp.reasons.map((reason) => reason.kind)).toContain('vibe_price')
    })

    it('never claims social proof', () => {
      const queries = ['cheap mexican', 'date night not chains', 'bbq with kids', 'surprise me']
      for (const query of queries) {
        for (const pick of runAsk(query, POOL).picks) {
          expect(pick.why).not.toMatch(/review|popular|everyone|locals love|best in|favorite/i)
        }
      }
    })

    it('says the ask was broad instead of inventing a reason', () => {
      const result = runAsk('where should we eat', POOL)
      expect(result.picks[0].why).toMatch(/broad ask/i)
    })
  })

  describe('explicit brand asks', () => {
    // Mirrors the live shape of the bug: the directory carries the brand, but
    // it is outrated and outnumbered by local listings that match the same
    // cuisine words, so soft scoring alone never surfaces it.
    const BRAND_POOL: AskCandidate[] = [
      candidate({
        id: 'bk-fm-1093',
        slug: 'burger-king',
        name: 'Burger King',
        categories: ['Food', 'Restaurant', 'American'],
        cuisineTypes: ['Burger'],
        address: '24914 FM 1093',
        priceLevel: 'BUDGET',
        rating: 3.4,
        reviewCount: 900,
      }),
      candidate({
        id: 'bk-mason',
        slug: 'burger-king-katy-3',
        name: 'Burger King',
        categories: ['Food', 'Restaurant', 'American'],
        cuisineTypes: ['Burger'],
        address: '603 South Mason Road',
        priceLevel: 'BUDGET',
        rating: 3.2,
        reviewCount: 400,
      }),
      candidate({
        id: 'mcd-fry',
        slug: 'mcdonald-s-katy',
        name: "McDonald's",
        categories: ['Fast Food', 'Restaurant'],
        cuisineTypes: ['American'],
        address: '1313 Fry Road',
        priceLevel: 'BUDGET',
        rating: 3.5,
        reviewCount: 1200,
      }),
      candidate({
        id: 'mcd-to-go',
        slug: 'mcdonald-s-to-go-only',
        name: "McDonald's (To Go only)",
        categories: ['Fast Food'],
        cuisineTypes: ['American'],
        address: '29914 Jordan Crossing Blvd',
        priceLevel: 'BUDGET',
        rating: 3.3,
        reviewCount: 80,
      }),
      candidate({
        name: 'Build-a-Burger',
        categories: ['Burgers', 'Casual'],
        cuisineTypes: ['Burgers', 'American'],
        rating: 4.8,
        reviewCount: 620,
      }),
      candidate({
        name: 'Loaded Burger',
        categories: ['Burgers'],
        cuisineTypes: ['Burgers', 'Smash Burger'],
        rating: 4.7,
        reviewCount: 480,
      }),
      candidate({
        name: "BoomerJack's Grill",
        categories: ['Burgers', 'Bar'],
        cuisineTypes: ['Burgers', 'American'],
        rating: 4.6,
        reviewCount: 510,
      }),
      candidate({
        name: "Pooja's Patisserie",
        categories: ['Bakery', 'Food'],
        cuisineTypes: ['Bakery'],
        rating: 5,
        reviewCount: 351,
      }),
      candidate({
        name: 'Citrus Blue Healthy Foods',
        categories: ['Food', 'Deli', 'Vegetarian'],
        cuisineTypes: ['Vegetarian', 'Deli'],
        rating: 5,
        reviewCount: 346,
      }),
    ]

    const BRAND_POOL_IDS = new Set(BRAND_POOL.map((c) => c.id))

    it('leads with the named brand even when local listings outrate it', () => {
      const result = runAsk('burger king', BRAND_POOL)
      expect(result.picks[0].name).toBe('Burger King')
    })

    it('answers a brand ask that names no cuisine at all', () => {
      const result = runAsk('mcdonalds', BRAND_POOL)
      expect(result.picks[0].name).toBe("McDonald's")
    })

    it('returns one location of the named brand, then other listings', () => {
      const names = runAsk('burger king', BRAND_POOL).picks.map((pick) => pick.name)

      expect(names).toHaveLength(3)
      expect(names[0]).toBe('Burger King')
      expect(names.filter((name) => name === 'Burger King')).toHaveLength(1)
    })

    it('keeps the named brand when the ask also names a cuisine it is not listed under', () => {
      const { matched } = applyHardFilters(BRAND_POOL, parseAskQuery("mcdonald's for breakfast"))
      expect(matched.map((c) => c.name)).toContain("McDonald's")
    })

    it('keeps the named brand ahead of a no-chains filter in the same breath', () => {
      const { matched } = applyHardFilters(BRAND_POOL, parseAskQuery('burger king but no chains'))
      expect(matched.map((c) => c.name)).toContain('Burger King')
    })

    it('never claims a named chain cleared the no-chains filter', () => {
      const result = runAsk('burger king but no chains', BRAND_POOL)
      const brandPick = result.picks.find((pick) => pick.name === 'Burger King')

      expect(brandPick).toBeDefined()
      expect(brandPick?.why).not.toMatch(/no-chains filter/i)
    })

    it('scores the match as the brand, citing the stored listing name', () => {
      const { ranked } = rankCandidates(BRAND_POOL, parseAskQuery('burger king'))
      const [top] = ranked

      expect(top.reasons.map((reason) => reason.kind)).toContain('brand')
      expect(top.reasons.find((reason) => reason.kind === 'brand')?.detail).toBe('Burger King')
      expect(top.candidate.name).toBe('Burger King')
    })

    it('says which listing was asked for by name, with no invented praise', () => {
      const why = runAsk('burger king', BRAND_POOL).picks[0].why

      expect(why).toContain('Burger King')
      expect(why).toMatch(/asked for by name/i)
      expect(why).not.toMatch(/review|popular|everyone|locals love|best in|favorite/i)
    })

    it('answers with listings we hold when the brand is not in the directory', () => {
      const result = runAsk('in-n-out', BRAND_POOL)

      expect(result.picks.map((pick) => pick.name)).not.toContain('In-N-Out')
      for (const pick of result.picks) {
        expect(BRAND_POOL_IDS.has(pick.id)).toBe(true)
      }
    })

    it('still keeps national chains out of a surprise ask over the same pool', () => {
      const names = runAsk('surprise me', BRAND_POOL).picks.map((pick) => pick.name)

      expect(names).not.toContain('Burger King')
      expect(names).not.toContain("McDonald's")
      expect(names).not.toContain("McDonald's (To Go only)")
      expect(names.length).toBeGreaterThan(0)
    })

    it('leaves an unrelated ask untouched by brand promotion', () => {
      const names = runAsk('burgers', BRAND_POOL).picks.map((pick) => pick.name)
      expect(names[0]).toBe('Build-a-Burger')
    })
  })

  it('reports how much inventory it considered and matched', () => {
    const result = runAsk('mexican food', POOL)

    expect(result.meta.inventory_considered).toBe(POOL.length)
    expect(result.meta.candidates_matched).toBeGreaterThanOrEqual(result.picks.length)
    expect(result.meta.candidates_matched).toBeLessThanOrEqual(POOL.length)
  })
})

describe('date night asks', () => {
  // Mirrors the live shape of the bug: to-go counters and a daytime cafe whose
  // only date-night evidence is a bare "wine" tag, sitting alongside the
  // sit-down rooms a date night is actually for.
  const DATE_NIGHT_POOL: AskCandidate[] = [
    candidate({
      name: 'Eskimo Hut',
      categories: ['Bar', 'Liquor Store'],
      cuisineTypes: ['Frozen Drinks'],
      tags: ['wine', 'beer'],
      rating: 4.7,
      reviewCount: 300,
    }),
    candidate({
      name: 'Bayou Daiquiris To Go',
      categories: ['Bar'],
      cuisineTypes: ['Daiquiris'],
      tags: ['wine'],
      rating: 4.8,
    }),
    candidate({
      name: 'Sno Shack Katy',
      categories: ['Snow Cone Stand', 'Dessert'],
      cuisineTypes: ['Raspados'],
      tags: ['wine'],
      rating: 4.9,
    }),
    candidate({
      name: 'Highway Blvd Drive-In',
      categories: ['American', 'Drive-In'],
      cuisineTypes: ['Burgers'],
      tags: ['wine', 'cocktail'],
      rating: 4.6,
    }),
    candidate({
      name: 'Cinco Taco Truck',
      categories: ['Food Truck', 'Mexican'],
      cuisineTypes: ['Tacos'],
      tags: ['wine'],
      rating: 4.9,
    }),
    candidate({
      name: 'Antonia Cucina Italiana',
      categories: ['Italian'],
      cuisineTypes: ['italian', 'pasta'],
      tags: ['date-night', 'wine'],
      features: ['Wine Bar'],
      priceLevel: 'UPSCALE',
      rating: 4.6,
    }),
    candidate({
      name: "Perry's Steakhouse & Grille",
      categories: ['Steakhouse', 'Fine Dining'],
      cuisineTypes: ['steakhouse'],
      features: ['Private Dining'],
      priceLevel: 'PREMIUM',
      rating: 4.8,
    }),
    candidate({
      name: 'Vine & Olive Ristorante',
      categories: ['Italian'],
      cuisineTypes: ['italian'],
      tags: ['wine'],
      priceLevel: 'UPSCALE',
      rating: 4.4,
    }),
    candidate({
      name: 'Cafe Benedicte',
      categories: ['Cafe', 'Bakery'],
      cuisineTypes: ['Breakfast', 'Sandwiches'],
      tags: ['wine'],
      rating: 4.9,
      reviewCount: 800,
    }),
  ]

  const DATE_NIGHT_QUERIES = [
    'date night',
    'romantic dinner',
    'anniversary dinner for two',
    'date night for the two of us',
    'date night with a good wine list',
    'romantic spot in 77494',
  ]

  /** Everything a pick says it is, which is what the format screen reads. */
  function identity(pick: { name: string; categories: string[]; cuisineTypes: string[] }): string {
    return [pick.name, ...pick.categories, ...pick.cuisineTypes].join(' | ')
  }

  it.each(DATE_NIGHT_QUERIES)('never answers %j with a to-go format', (query) => {
    const picks = runAsk(query, DATE_NIGHT_POOL).picks

    expect(picks.length).toBeGreaterThan(0)
    for (const pick of picks) {
      expect(identity(pick)).not.toMatch(/to-go|to go|daiquiri|drive-in|drive thru/i)
      expect(identity(pick)).not.toMatch(/snow cone|raspado|food truck/i)
    }
  })

  it.each(DATE_NIGHT_QUERIES)('never answers %j with Eskimo Hut', (query) => {
    const names = runAsk(query, DATE_NIGHT_POOL).picks.map((pick) => pick.name)
    expect(names).not.toContain('Eskimo Hut')
  })

  it('drops the to-go formats in the hard filter, not by out-scoring them', () => {
    const { matched, removedBy } = applyHardFilters(DATE_NIGHT_POOL, parseAskQuery('date night'))
    const names = matched.map((c) => c.name)

    expect(names).toEqual([
      'Antonia Cucina Italiana',
      "Perry's Steakhouse & Grille",
      'Vine & Olive Ristorante',
      'Cafe Benedicte',
    ])
    expect(removedBy.date_night_format).toBe(5)
  })

  it('keeps a to-go format out even when its rating would have carried it', () => {
    const thin = [
      candidate({ name: 'Eskimo Hut', tags: ['wine'], rating: 5, reviewCount: 900 }),
      candidate({ name: 'Bayou Daiquiris To Go', cuisineTypes: ['Daiquiris'], tags: ['wine'], rating: 5 }),
      candidate({
        name: 'Antonia Cucina Italiana',
        categories: ['Italian'],
        tags: ['date-night'],
        priceLevel: 'UPSCALE',
        rating: 3.9,
      }),
    ]
    const result = runAsk('date night', thin)

    expect(result.picks.map((pick) => pick.name)).toEqual(['Antonia Cucina Italiana'])
    expect(result.shortfall?.returned).toBe(1)
    expect(result.shortfall?.limiting_filters).toContain('a table to sit at for date night')
  })

  it('leaves every other ask free to answer with a to-go format', () => {
    const { matched, removedBy } = applyHardFilters(DATE_NIGHT_POOL, parseAskQuery('daiquiris to go'))

    expect(matched.map((c) => c.name)).toContain('Bayou Daiquiris To Go')
    expect(removedBy.date_night_format).toBeUndefined()

    const truckNames = runAsk('tacos', DATE_NIGHT_POOL).picks.map((pick) => pick.name)
    expect(truckNames).toContain('Cinco Taco Truck')
  })

  it('stands the screen down for the format the diner named', () => {
    const { matched } = applyHardFilters(
      DATE_NIGHT_POOL,
      parseAskQuery('date night at a food truck')
    )
    const names = matched.map((c) => c.name)

    expect(names).toContain('Cinco Taco Truck')
    expect(names).not.toContain('Bayou Daiquiris To Go')
  })

  it('gives a bare "wine" tag no vibe points without a sit-down signal', () => {
    const counter = candidate({
      name: 'Wine Window',
      categories: ['Bar'],
      cuisineTypes: ['Drinks'],
      tags: ['wine', 'cocktail'],
    })
    const { reasons } = scoreCandidate(counter, parseAskQuery('date night'))

    expect(reasons.map((reason) => reason.kind)).not.toContain('vibe')
    expect(reasons.map((reason) => reason.kind)).not.toContain('sit_down')
  })

  it('counts a "wine" tag faintly for a listing that reads as a sit-down room', () => {
    const room = candidate({
      name: 'Vine & Olive Ristorante',
      categories: ['Italian'],
      cuisineTypes: ['italian'],
      tags: ['wine'],
      priceLevel: 'UPSCALE',
    })
    const { reasons } = scoreCandidate(room, parseAskQuery('date night'))
    const vibe = reasons.find((reason) => reason.kind === 'vibe')

    expect(vibe?.evidence).toBe('wine')
    expect(vibe?.weight).toBe(WEAK_VIBE_WEIGHT)
    expect(reasons.map((reason) => reason.kind)).toContain('sit_down')
  })

  it('leads with a listing tagged for the occasion over one that just pours wine', () => {
    const { ranked } = rankCandidates(DATE_NIGHT_POOL, parseAskQuery('date night'))

    expect(ranked[0].candidate.name).toBe('Antonia Cucina Italiana')
    expect(ranked.map((entry) => entry.candidate.name)).not.toContain('Cafe Benedicte')
  })

  it('ranks every date-night pick on a sit-down signal or a stored tag', () => {
    for (const entry of rankCandidates(DATE_NIGHT_POOL, parseAskQuery('date night')).ranked) {
      const kinds = entry.reasons.map((reason) => reason.kind)
      expect(kinds.includes('sit_down') || kinds.includes('vibe')).toBe(true)
    }
  })

  it("keeps Perry's for a date night and drops it only when chains are ruled out", () => {
    const names = runAsk('date night', DATE_NIGHT_POOL).picks.map((pick) => pick.name)
    expect(names).toContain("Perry's Steakhouse & Grille")

    const noChains = runAsk('date night, no chains', DATE_NIGHT_POOL).picks.map((pick) => pick.name)
    expect(noChains).not.toContain("Perry's Steakhouse & Grille")
  })

  it('cites the stored word behind a sit-down read rather than a room we assumed', () => {
    const why = runAsk('date night', DATE_NIGHT_POOL).picks.map((pick) => pick.why).join(' | ')

    expect(why).toMatch(/read from its listed "(fine dining|italian|steakhouse)"/)
    expect(why).not.toMatch(/candlelit|white tablecloth|intimate|perfect for/i)
    expect(why).not.toMatch(/review|popular|everyone|locals love|best in|favorite/i)
  })

  it('only ever answers with listings from the pool it was given', () => {
    const ids = new Set(DATE_NIGHT_POOL.map((c) => c.id))
    for (const query of DATE_NIGHT_QUERIES) {
      for (const pick of runAsk(query, DATE_NIGHT_POOL).picks) {
        expect(ids.has(pick.id)).toBe(true)
      }
    }
  })
})
