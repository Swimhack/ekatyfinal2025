import { LABEL_TRACK, labelMetrics, wrapLabel } from '../../lib/spinner/wheel-labels'

describe('wrapLabel', () => {
  it('wraps a long name instead of truncating it', () => {
    expect(wrapLabel("Perry's Steakhouse & Grille", 14, 3)).toEqual(["Perry's", 'Steakhouse &', 'Grille'])
  })

  it('leaves a short name on one line', () => {
    expect(wrapLabel('Torchy\u2019s Tacos', 14, 3)).toEqual(['Torchy\u2019s Tacos'])
  })

  it('folds the overflow into the last allowed line', () => {
    const lines = wrapLabel('One Two Three Four Five Six Seven', 8, 2)

    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('One Two')
    expect(lines[1].endsWith('…')).toBe(true)
  })

  it('truncates a single word that cannot be broken', () => {
    expect(wrapLabel('Schnitzelhausbrauerei', 10, 2)).toEqual(['Schnitzel…'])
  })

  it('handles an empty label', () => {
    expect(wrapLabel('   ', 14, 3)).toEqual([])
  })
})

describe('labelMetrics', () => {
  it('gives fewer wedges bigger type and more lines', () => {
    const compact = labelMetrics(6)
    const full = labelMetrics(8)
    const crowded = labelMetrics(12)

    expect(compact.fontSize).toBeGreaterThan(full.fontSize)
    expect(full.fontSize).toBeGreaterThan(crowded.fontSize)
    expect(full.maxLines).toBe(3)
    expect(crowded.maxLines).toBe(2)
  })

  it('keeps a workable character budget at every size', () => {
    for (const count of [4, 6, 8, 10, 12]) {
      const { fontSize, perLine } = labelMetrics(count)

      expect(perLine).toBeGreaterThanOrEqual(9)
      // The budget must not claim more room than the wedge actually has.
      expect(perLine * fontSize * 0.52).toBeLessThanOrEqual(LABEL_TRACK + fontSize)
    }
  })
})
