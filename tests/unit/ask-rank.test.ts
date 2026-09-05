import { runAsk } from '../../lib/ask'
import { applyHardFilters, rankCandidates } from '../../lib/ask/rank'
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

  it('reports how much inventory it considered and matched', () => {
    const result = runAsk('mexican food', POOL)

    expect(result.meta.inventory_considered).toBe(POOL.length)
    expect(result.meta.candidates_matched).toBeGreaterThanOrEqual(result.picks.length)
    expect(result.meta.candidates_matched).toBeLessThanOrEqual(POOL.length)
  })
})
