import {
  budgetCeiling,
  budgetMaxPriceLevel,
  budgetTier,
  normalizeQuery,
  parseAskQuery,
} from '../../lib/ask/parse'

describe('parseAskQuery', () => {
  describe('cuisine', () => {
    it('reads a requested cuisine', () => {
      const schema = parseAskQuery('cheap mexican near 77493')
      expect(schema.cuisine_include).toEqual(['Mexican'])
      expect(schema.cuisine_exclude).toEqual([])
    })

    it('maps dish words onto their cuisine', () => {
      expect(parseAskQuery('somewhere for tacos').cuisine_include).toEqual(['Mexican'])
      expect(parseAskQuery('brisket please').cuisine_include).toEqual(['BBQ'])
      expect(parseAskQuery('i want pho').cuisine_include).toEqual(['Vietnamese'])
    })

    it('reads multiple cuisines', () => {
      const schema = parseAskQuery('sushi or thai')
      expect(schema.cuisine_include).toEqual(['Sushi', 'Thai'])
    })

    it('prefers the longer cuisine phrase over a substring of it', () => {
      const schema = parseAskQuery('korean bbq tonight')
      expect(schema.cuisine_include).toEqual(['Korean'])
      expect(schema.cuisine_include).not.toContain('BBQ')
    })

    it('does not match a cuisine glued inside another word', () => {
      expect(parseAskQuery('answer my phone').cuisine_include).toEqual([])
    })

    it.each([
      ['no sushi tonight', 'Sushi'],
      ['not italian please', 'Italian'],
      ['dinner without seafood', 'Seafood'],
      ['anything but indian', 'Indian'],
      ['we are sick of pizza', 'Pizza'],
      ['avoid thai food', 'Thai'],
    ])('treats %j as excluding %s', (query, expected) => {
      const schema = parseAskQuery(query)
      expect(schema.cuisine_exclude).toContain(expected)
      expect(schema.cuisine_include).not.toContain(expected)
    })

    it('keeps an include and an exclude apart in one sentence', () => {
      const schema = parseAskQuery('thai food, no seafood')
      expect(schema.cuisine_include).toEqual(['Thai'])
      expect(schema.cuisine_exclude).toEqual(['Seafood'])
    })

    it('stops a negation at punctuation', () => {
      const schema = parseAskQuery('no sushi, we want bbq')
      expect(schema.cuisine_exclude).toEqual(['Sushi'])
      expect(schema.cuisine_include).toEqual(['BBQ'])
    })

    it('never lists a cuisine as both wanted and ruled out', () => {
      const schema = parseAskQuery('mexican but no mexican chains')
      expect(schema.cuisine_include).not.toContain('Mexican')
      expect(schema.cuisine_exclude).toContain('Mexican')
    })
  })

  describe('chains', () => {
    it.each([
      'date night not chains',
      'no chains please',
      'somewhere local only',
      'non-chain spots',
      'nothing but mom and pop places',
      'avoid fast food',
    ])('flags %j as excluding chains', (query) => {
      expect(parseAskQuery(query).exclude_chains).toBe(true)
    })

    it('does not flag chains when the diner never mentioned them', () => {
      expect(parseAskQuery('cheap mexican near 77493').exclude_chains).toBe(false)
    })
  })

  describe('budget', () => {
    it.each([
      ['cheap eats tonight', 'low'],
      ['somewhere affordable', 'low'],
      ['a moderate spot', 'mid'],
      ['nothing too expensive', 'mid'],
      ['fancy dinner', 'high'],
      ['upscale please', 'high'],
    ])('reads %j as %s', (query, expected) => {
      expect(parseAskQuery(query).budget).toBe(expected)
    })

    it('reads an explicit dollar ceiling', () => {
      expect(parseAskQuery('dinner under $30').budget).toBe('under_30')
      expect(parseAskQuery('less than 20 a head').budget).toBe('under_20')
    })

    it('prefers an explicit ceiling over a vague word', () => {
      expect(parseAskQuery('cheap tacos under $15').budget).toBe('under_15')
    })

    it('leaves budget unset when nothing was said about price', () => {
      expect(parseAskQuery('tacos near me').budget).toBeUndefined()
    })
  })

  describe('party size and kids', () => {
    it.each([
      ['bbq for a party of 8', 8],
      ['table for 4', 4],
      ['six of us are going', 6],
      ['dinner for 2', 2],
      ['just me tonight', 1],
      ['just the two of us', 2],
    ])('reads %j as a party of %i', (query, expected) => {
      expect(parseAskQuery(query).party_size).toBe(expected)
    })

    it('does not read a price ceiling as a party size', () => {
      const schema = parseAskQuery('dinner for under 20 dollars')
      expect(schema.party_size).toBeUndefined()
      expect(schema.budget).toBe('under_20')
    })

    it('flags kids and adds the matching vibe', () => {
      const schema = parseAskQuery('somewhere with the kids')
      expect(schema.kids).toBe(true)
      expect(schema.vibe).toContain('family friendly')
    })

    it('reads "no kids" as an adults-only outing', () => {
      const schema = parseAskQuery('date night, no kids')
      expect(schema.kids).toBe(false)
      expect(schema.vibe).not.toContain('family friendly')
    })
  })

  describe('location', () => {
    it('reads a zip code', () => {
      expect(parseAskQuery('cheap mexican near 77493').zip).toBe('77493')
    })

    it('does not read a dollar amount as a zip code', () => {
      expect(parseAskQuery('keep it under $10000').zip).toBeUndefined()
    })

    it('reads a named Katy area', () => {
      expect(parseAskQuery('sushi in Cinco Ranch').area).toBe('Cinco Ranch')
    })

    it('reads an abbreviated street name as its area', () => {
      expect(parseAskQuery('bbq on Mason Rd').area).toBe('Mason Road')
    })
  })

  describe('vibe, open now and novelty', () => {
    it('reads a date night vibe', () => {
      expect(parseAskQuery('date night not chains').vibe).toContain('date night')
    })

    it('reads a patio vibe', () => {
      expect(parseAskQuery('anywhere with a patio').vibe).toContain('patio')
    })

    it.each(["what's open now", 'anything open late', 'is anywhere still open'])(
      'flags %j as open now',
      (query) => {
        expect(parseAskQuery(query).open_now).toBe(true)
      }
    )

    it('leaves open_now unset otherwise', () => {
      expect(parseAskQuery('tacos tomorrow').open_now).toBeUndefined()
    })

    it.each([
      ['surprise me', 'surprise'],
      ['somewhere new', 'surprise'],
      ['our go-to spot', 'familiar'],
      ['top rated please', 'familiar'],
      ['cheap tacos', 'mixed'],
    ])('reads %j as novelty %s', (query, expected) => {
      expect(parseAskQuery(query).novelty).toBe(expected)
    })
  })

  describe('robustness', () => {
    it('returns an empty schema for an empty query', () => {
      const schema = parseAskQuery('')
      expect(schema).toEqual({
        cuisine_include: [],
        cuisine_exclude: [],
        exclude_chains: false,
        vibe: [],
        novelty: 'mixed',
      })
    })

    it('is deterministic', () => {
      const query = 'bbq for 8 people with kids under $30 near 77494'
      expect(parseAskQuery(query)).toEqual(parseAskQuery(query))
    })

    it('reads a whole sentence end to end', () => {
      const schema = parseAskQuery(
        "Date night for the two of us, somewhere upscale in Cinco Ranch, no chains and no sushi"
      )
      expect(schema).toMatchObject({
        party_size: 2,
        budget: 'high',
        area: 'Cinco Ranch',
        exclude_chains: true,
        cuisine_exclude: ['Sushi'],
      })
      expect(schema.vibe).toContain('date night')
    })

    it('normalizes curly quotes and stray whitespace', () => {
      expect(normalizeQuery('  Don\u2019t   want   SUSHI ')).toBe("don't want sushi")
    })
  })
})

describe('budget helpers', () => {
  it('separates tiers from dollar ceilings', () => {
    expect(budgetTier('low')).toBe('low')
    expect(budgetTier('under_25')).toBeNull()
    expect(budgetCeiling('under_25')).toBe(25)
    expect(budgetCeiling('high')).toBeNull()
  })

  it('maps a budget onto the highest price tier it tolerates', () => {
    expect(budgetMaxPriceLevel('low')).toBe('BUDGET')
    expect(budgetMaxPriceLevel('mid')).toBe('MODERATE')
    expect(budgetMaxPriceLevel('under_12')).toBe('BUDGET')
    expect(budgetMaxPriceLevel('under_30')).toBe('MODERATE')
    expect(budgetMaxPriceLevel('under_60')).toBe('UPSCALE')
    expect(budgetMaxPriceLevel(undefined)).toBeNull()
  })
})
