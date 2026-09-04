import { collapseChainListings, normalizeChainName } from '../../lib/listings/chain-density'

describe('normalizeChainName', () => {
  it('groups the branch-name shapes the imports actually contain', () => {
    // Every example here is a real name from the restaurants table.
    expect(normalizeChainName('Starbucks')).toBe('starbucks')
    expect(normalizeChainName('Starbucks #1234')).toBe('starbucks')
    expect(normalizeChainName("McDonald's")).toBe('mcdonalds')
    expect(normalizeChainName("McDonald's (To Go only)")).toBe('mcdonalds')
    expect(normalizeChainName('Taco Bell - Live Más Café')).toBe('taco bell')
    expect(normalizeChainName("Fajita Pete's - Firethorne")).toBe('fajita petes')
    expect(normalizeChainName('Fajita Petes')).toBe('fajita petes')
    expect(normalizeChainName("Pepperoni's Pizza - Cinco Ranch")).toBe('pepperonis pizza')
    expect(normalizeChainName('Crust Pizza Co.')).toBe('crust pizza co')
    expect(normalizeChainName('Crust Pizza Co. - Katy Park')).toBe('crust pizza co')
    expect(normalizeChainName('Chick-fil-A')).toBe('chick fil a')
  })

  it('drops trailing place names that distinguish branches', () => {
    expect(normalizeChainName('Black Rock Coffee Bar Katy')).toBe('black rock coffee bar')
    expect(normalizeChainName('Happy Lemon Cinco Ranch')).toBe('happy lemon')
  })

  it('keeps distinct brands distinct', () => {
    expect(normalizeChainName('Chama')).not.toBe(normalizeChainName('Chama Gaucha'))
    expect(normalizeChainName('Smoothie King')).not.toBe(
      normalizeChainName('Tropical Smoothie Cafe')
    )
  })

  it('refuses to group on a name too short to mean anything', () => {
    expect(normalizeChainName('')).toBe('')
    expect(normalizeChainName('A')).toBe('')
    expect(normalizeChainName(null)).toBe('')
    expect(normalizeChainName(undefined)).toBe('')
    expect(normalizeChainName(42)).toBe('')
  })
})

describe('collapseChainListings', () => {
  const rows = [
    { id: '1', name: 'Starbucks' },
    { id: '2', name: 'Starbucks' },
    { id: '3', name: 'Black Rock Coffee Bar' },
    { id: '4', name: 'Starbucks #900' },
    { id: '5', name: 'Fleurette d’Amour Coffee and Flowers' },
    { id: '6', name: 'Starbucks' },
  ]

  it('keeps one card per brand by default', () => {
    const kept = collapseChainListings(rows)
    expect(kept.map((r) => r.id)).toEqual(['1', '3', '5'])
  })

  it('keeps the best-placed location and preserves ordering', () => {
    // The input arrives already sorted, so the survivor is the first one seen.
    const kept = collapseChainListings(rows)
    expect(kept[0].id).toBe('1')
  })

  it('reports how many locations the kept card stands in for', () => {
    const kept = collapseChainListings(rows)
    expect(kept[0]).toMatchObject({ chainKey: 'starbucks', chainLocationCount: 4 })
    // A single-location independent is not a chain.
    expect(kept[1].chainLocationCount).toBe(1)
    expect(kept[2].chainLocationCount).toBe(1)
  })

  it('honours a higher cap', () => {
    const kept = collapseChainListings(rows, { maxPerChain: 2 })
    expect(kept.map((r) => r.id)).toEqual(['1', '2', '3', '5'])
  })

  it('treats a cap below one as one rather than emptying the grid', () => {
    expect(collapseChainListings(rows, { maxPerChain: 0 })).toHaveLength(3)
    expect(collapseChainListings(rows, { maxPerChain: -5 })).toHaveLength(3)
  })

  it('never drops a row it cannot name', () => {
    const unnamed = [{ id: 'a', name: '' }, { id: 'b' }, { id: 'c', name: 'X' }]
    const kept = collapseChainListings(unnamed)
    expect(kept.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(kept.every((r) => r.chainLocationCount === 1)).toBe(true)
  })

  it('leaves the original rows untouched', () => {
    const input = [{ id: '1', name: 'Starbucks' }]
    collapseChainListings(input)
    expect(input[0]).toEqual({ id: '1', name: 'Starbucks' })
  })

  it('passes through a grid with no repeats', () => {
    const locals = [
      { id: '1', name: 'Hurts Donut Co' },
      { id: '2', name: 'Coffee Fellows' },
    ]
    expect(collapseChainListings(locals)).toHaveLength(2)
  })
})
