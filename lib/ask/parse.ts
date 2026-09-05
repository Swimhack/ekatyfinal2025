// Ask eKaty — natural language request parser.
//
// Deterministic and dependency-free: the same sentence always produces the same
// schema, which is what makes the ranker testable. An LLM may later be layered
// on top of this for parsing or phrasing, but never for facts, and never as the
// only path — this parser stays the fallback.

import { brandTextForms } from './chains'
import type { AskSchema, Budget, BudgetTier, PriceLevel } from './types'
import { AREAS, AREA_ALIASES, CUISINES, KNOWN_CHAIN_BRANDS, VIBES } from './vocabulary'

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  couple: 2,
}

/** Cues that flip whatever follows them into an exclusion. */
const NEGATION_CUES = [
  'not in the mood for',
  'anything except',
  'anything but',
  'do not want',
  "don't want",
  'dont want',
  'other than',
  'not into',
  'nothing',
  'without',
  'sick of',
  'tired of',
  'except',
  'avoid',
  'hates',
  'hate',
  'skip',
  'non',
  'not',
  'no',
]

/** How many words after a negation cue stay inside the exclusion. */
const NEGATION_SCOPE_WORDS = 3

const LOW_BUDGET_PHRASES = [
  'dont want to spend much',
  "don't want to spend much",
  'without breaking the bank',
  'on a tight budget',
  'as cheap as possible',
  'inexpensive',
  'on a budget',
  'cheap eats',
  'affordable',
  'budget',
  'cheap',
  'value',
]

const MID_BUDGET_PHRASES = [
  'nothing too expensive',
  'not too expensive',
  'nothing too fancy',
  'not too fancy',
  'middle of the road',
  'reasonably priced',
  'reasonable price',
  'mid range',
  'mid-range',
  'moderate',
  'midrange',
  'reasonable',
]

const HIGH_BUDGET_PHRASES = [
  'treat ourselves',
  'special occasion',
  'money is no object',
  'fine dining',
  'white tablecloth',
  'high end',
  'high-end',
  'expensive',
  'splurge',
  'upscale',
  'fancy',
  'nice place',
  'nicer place',
]

const OPEN_NOW_PHRASES = [
  'open right now',
  'whats open now',
  "what's open now",
  'anything open',
  'still open',
  'open now',
  'open late',
  'open at this hour',
]

const SURPRISE_PHRASES = [
  'try something different',
  'somewhere different',
  'something different',
  'somewhere new',
  'something new',
  'never been',
  "haven't tried",
  'havent tried',
  'surprise me',
  'surprise us',
  'adventurous',
  'off the beaten path',
  'random',
]

const FAMILIAR_PHRASES = [
  'tried and true',
  'safe bet',
  'the usual',
  'reliable',
  'familiar',
  'go-to',
  'go to spot',
  'crowd pleaser',
  'crowd-pleaser',
  'top rated',
  'top-rated',
  'best rated',
  'highest rated',
]

const CHAIN_WORDS = ['chain', 'chains', 'franchise', 'franchises', 'fast food']

const LOCAL_ONLY_PHRASES = [
  'locally owned',
  'locally-owned',
  'local only',
  'local spots',
  'local spot',
  'local places',
  'independent',
  'mom and pop',
  'mom-and-pop',
  'non chain',
  'non-chain',
  'hole in the wall',
  'hole-in-the-wall',
]

const KID_WORDS = [
  'family friendly',
  'family-friendly',
  'good for families',
  'with the family',
  'high chair',
  'highchair',
  'kid friendly',
  'kid-friendly',
  'kiddos',
  'children',
  'toddler',
  'stroller',
  'my son',
  'my daughter',
  'my kids',
  'the kids',
  'child',
  'kids',
  'kid',
  'baby',
]

const SOLO_PHRASES = ['just me', 'by myself', 'eating alone', 'table for one', 'solo']

const COUPLE_PHRASES = [
  'me and my wife',
  'me and my husband',
  'me and my partner',
  'me and my girlfriend',
  'me and my boyfriend',
  'my wife and i',
  'my husband and i',
  'my partner and i',
  'two of us',
  'just the two of us',
  'the two of us',
]

/** Lowercases, straightens quotes and collapses whitespace. */
export function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Matches `phrase` only when it is not glued to surrounding letters or digits,
 * so "taco" hits "cheap tacos" but "pho" does not hit "phone".
 */
function phraseRegExp(phrase: string): RegExp {
  return new RegExp(`(?:^|[^a-z0-9])(${escapeRegExp(phrase)})(?![a-z0-9])`, 'g')
}

interface PhraseHit {
  phrase: string
  start: number
  end: number
}

/** All non-overlapping occurrences of `phrase`, with their character offsets. */
function findPhrase(text: string, phrase: string): PhraseHit[] {
  const hits: PhraseHit[] = []
  const re = phraseRegExp(phrase)
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const start = match.index + match[0].length - match[1].length
    hits.push({ phrase, start, end: start + match[1].length })
    re.lastIndex = start + match[1].length
  }
  return hits
}

function containsPhrase(text: string, phrase: string): boolean {
  return findPhrase(text, phrase).length > 0
}

function firstPresentPhrase(text: string, phrases: string[]): string | null {
  for (const phrase of phrases) {
    if (containsPhrase(text, phrase)) return phrase
  }
  return null
}

/**
 * Character mask marking regions that sit inside a negation. Everything a
 * negation cue reaches is treated as an exclusion rather than a preference.
 */
function buildNegationMask(text: string): boolean[] {
  const mask = new Array<boolean>(text.length).fill(false)

  for (const cue of NEGATION_CUES) {
    for (const hit of findPhrase(text, cue)) {
      let cursor = hit.end
      let words = 0
      while (cursor < text.length && words < NEGATION_SCOPE_WORDS) {
        while (cursor < text.length && text[cursor] === ' ') cursor++
        if (cursor >= text.length) break
        // A negation does not survive punctuation: "no sushi, somewhere warm".
        if (/[,.;:!?]/.test(text[cursor])) break
        const wordStart = cursor
        while (cursor < text.length && !/[\s,.;:!?]/.test(text[cursor])) cursor++
        for (let i = wordStart; i < cursor; i++) mask[i] = true
        words++
      }
    }
  }

  return mask
}

function isNegated(mask: boolean[], hit: PhraseHit): boolean {
  return mask[hit.start] === true
}

interface VocabHit<T> {
  value: T
  hit: PhraseHit
}

/**
 * Longest-phrase-first vocabulary matching with span consumption, so
 * "korean bbq" resolves to Korean instead of also firing BBQ.
 */
function matchVocabulary<T>(
  text: string,
  entries: Array<{ value: T; phrases: string[] }>
): Array<VocabHit<T>> {
  const flattened: Array<{ value: T; phrase: string }> = []
  for (const entry of entries) {
    for (const phrase of entry.phrases) flattened.push({ value: entry.value, phrase })
  }
  flattened.sort((a, b) => b.phrase.length - a.phrase.length)

  const consumed = new Array<boolean>(text.length).fill(false)
  const results: Array<VocabHit<T>> = []

  for (const { value, phrase } of flattened) {
    for (const hit of findPhrase(text, phrase)) {
      let overlaps = false
      for (let i = hit.start; i < hit.end; i++) {
        if (consumed[i]) {
          overlaps = true
          break
        }
      }
      if (overlaps) continue
      for (let i = hit.start; i < hit.end; i++) consumed[i] = true
      results.push({ value, hit })
    }
  }

  return results.sort((a, b) => a.hit.start - b.hit.start)
}

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function parseCount(token: string): number | null {
  const asNumber = Number.parseInt(token, 10)
  if (!Number.isNaN(asNumber)) return asNumber
  const asWord = NUMBER_WORDS[token]
  return typeof asWord === 'number' ? asWord : null
}

const COUNT_TOKEN = `\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')}`

function parsePartySize(text: string): number | undefined {
  if (firstPresentPhrase(text, SOLO_PHRASES)) return 1
  if (firstPresentPhrase(text, COUPLE_PHRASES)) return 2

  const patterns = [
    new RegExp(`\\b(?:party|table|group|room|booth)\\s+(?:of|for)\\s+(${COUNT_TOKEN})\\b`),
    new RegExp(`\\b(${COUNT_TOKEN})\\s+(?:of\\s+us|people|persons|adults|guests|folks|diners)\\b`),
    new RegExp(`\\bfor\\s+(${COUNT_TOKEN})\\s+(?:people|persons|adults|guests|folks|diners)\\b`),
    new RegExp(`\\bseat(?:s|ing)?\\s+(${COUNT_TOKEN})\\b`),
    // Bare "for 6" last, and never when it is really a price ("for under 20").
    new RegExp(`\\bfor\\s+(${COUNT_TOKEN})\\b(?!\\s*(?:dollars|bucks|\\$))`),
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (!match) continue
    const size = parseCount(match[1])
    if (size !== null && size >= 1 && size <= 40) return size
  }

  return undefined
}

function parseBudget(text: string): Budget | undefined {
  const ceilingPatterns = [
    /\bunder\s*\$?\s*(\d{1,3})\b/,
    /\bless\s+than\s*\$?\s*(\d{1,3})\b/,
    /\bbelow\s*\$?\s*(\d{1,3})\b/,
    /\bkeep\s+it\s+(?:under|below)\s*\$?\s*(\d{1,3})\b/,
    /\$\s*(\d{1,3})\s*(?:or\s+less|max|maximum|and\s+under)\b/,
    /\bmax(?:imum)?\s*(?:of\s*)?\$\s*(\d{1,3})\b/,
  ]

  for (const pattern of ceilingPatterns) {
    const match = pattern.exec(text)
    if (!match) continue
    const amount = Number.parseInt(match[1], 10)
    if (!Number.isNaN(amount) && amount > 0) return `under_${amount}` as Budget
  }

  // Longest matching phrase wins so "not too expensive" reads as mid, not high.
  const tierCandidates: Array<{ tier: BudgetTier; phrase: string }> = []
  const push = (tier: BudgetTier, phrases: string[]) => {
    for (const phrase of phrases) {
      if (containsPhrase(text, phrase)) tierCandidates.push({ tier, phrase })
    }
  }
  push('low', LOW_BUDGET_PHRASES)
  push('mid', MID_BUDGET_PHRASES)
  push('high', HIGH_BUDGET_PHRASES)

  if (containsPhrase(text, '$')) tierCandidates.push({ tier: 'low', phrase: '$' })
  if (containsPhrase(text, '$$')) tierCandidates.push({ tier: 'mid', phrase: '$$' })
  if (containsPhrase(text, '$$$')) tierCandidates.push({ tier: 'high', phrase: '$$$' })

  if (tierCandidates.length === 0) return undefined
  tierCandidates.sort((a, b) => b.phrase.length - a.phrase.length)
  return tierCandidates[0].tier
}

function parseZip(text: string): string | undefined {
  // Skip dollar amounts and anything glued to other digits.
  const match = /(?:^|[^$\d])(\d{5})(?![\d])/.exec(text)
  return match ? match[1] : undefined
}

function parseArea(text: string): string | undefined {
  for (const area of AREAS) {
    const phrases = AREA_ALIASES[area] || [area.toLowerCase()]
    for (const phrase of phrases) {
      if (containsPhrase(text, phrase)) return area
    }
  }
  return undefined
}

function parseKids(text: string, mask: boolean[]): boolean | undefined {
  let sawKidWord = false
  for (const word of KID_WORDS) {
    for (const hit of findPhrase(text, word)) {
      if (isNegated(mask, hit)) return false
      sawKidWord = true
    }
  }
  return sawKidWord ? true : undefined
}

function parseExcludeChains(text: string, mask: boolean[]): boolean {
  for (const word of CHAIN_WORDS) {
    for (const hit of findPhrase(text, word)) {
      if (isNegated(mask, hit)) return true
    }
  }
  return firstPresentPhrase(text, LOCAL_ONLY_PHRASES) !== null
}

/**
 * Known brands the diner named, e.g. "is burger king open".
 *
 * Matching runs against a punctuation-stripped copy of the request so
 * "wendy's" and "wendys" both land, and a brand sitting inside a negation
 * ("anything but burger king") is not counted as a request for it.
 */
function parseBrands(text: string): string[] {
  const forms = brandTextForms(text)
  const masks = forms.map(buildNegationMask)

  const found: string[] = []
  for (const brand of KNOWN_CHAIN_BRANDS) {
    const named = brandTextForms(brand).some((needle) =>
      forms.some((form, i) => findPhrase(form, needle).some((hit) => !isNegated(masks[i], hit)))
    )
    if (named) found.push(brand)
  }
  return uniqueInOrder(found)
}

function parseNovelty(text: string): AskSchema['novelty'] {
  if (firstPresentPhrase(text, SURPRISE_PHRASES)) return 'surprise'
  if (firstPresentPhrase(text, FAMILIAR_PHRASES)) return 'familiar'
  return 'mixed'
}

/**
 * Turns a free-text dining request into the structured schema the ranker
 * consumes. Unknown wording is dropped rather than guessed at.
 */
export function parseAskQuery(raw: string): AskSchema {
  const text = normalizeQuery(raw || '')
  const mask = buildNegationMask(text)

  const cuisineHits = matchVocabulary(
    text,
    CUISINES.map((cuisine) => ({ value: cuisine.label, phrases: cuisine.synonyms }))
  )
  const cuisine_include: string[] = []
  const cuisine_exclude: string[] = []
  for (const { value, hit } of cuisineHits) {
    if (isNegated(mask, hit)) cuisine_exclude.push(value)
    else cuisine_include.push(value)
  }

  const vibeHits = matchVocabulary(
    text,
    VIBES.map((vibe) => ({ value: vibe.label, phrases: vibe.synonyms }))
  )
  const vibe = uniqueInOrder(
    vibeHits.filter(({ hit }) => !isNegated(mask, hit)).map(({ value }) => value)
  )

  const kids = parseKids(text, mask)
  const excludedCuisines = uniqueInOrder(cuisine_exclude)

  const schema: AskSchema = {
    cuisine_include: uniqueInOrder(cuisine_include).filter((c) => !excludedCuisines.includes(c)),
    cuisine_exclude: excludedCuisines,
    exclude_chains: parseExcludeChains(text, mask),
    brands: parseBrands(text),
    vibe: kids === true && !vibe.includes('family friendly') ? [...vibe, 'family friendly'] : vibe,
    novelty: parseNovelty(text),
  }

  const partySize = parsePartySize(text)
  if (partySize !== undefined) schema.party_size = partySize
  if (kids !== undefined) schema.kids = kids

  const budget = parseBudget(text)
  if (budget !== undefined) schema.budget = budget

  const zip = parseZip(text)
  if (zip !== undefined) schema.zip = zip

  const area = parseArea(text)
  if (area !== undefined) schema.area = area

  if (firstPresentPhrase(text, OPEN_NOW_PHRASES)) schema.open_now = true

  return schema
}

/** `low | mid | high` for a budget, or null for an explicit dollar ceiling. */
export function budgetTier(budget: Budget | undefined): BudgetTier | null {
  if (!budget) return null
  return budget === 'low' || budget === 'mid' || budget === 'high' ? budget : null
}

/** Dollar amount for an `under_N` budget, or null for a tier. */
export function budgetCeiling(budget: Budget | undefined): number | null {
  if (!budget) return null
  const match = /^under_(\d+)$/.exec(budget)
  return match ? Number.parseInt(match[1], 10) : null
}

/**
 * Highest stored price tier a budget tolerates.
 *
 * This maps the diner's stated ceiling onto the four price tiers we already
 * store; it is not a statement about what any restaurant charges.
 */
export function budgetMaxPriceLevel(budget: Budget | undefined): PriceLevel | null {
  const tier = budgetTier(budget)
  if (tier === 'low') return 'BUDGET'
  if (tier === 'mid') return 'MODERATE'
  if (tier === 'high') return 'PREMIUM'

  const ceiling = budgetCeiling(budget)
  if (ceiling === null) return null
  if (ceiling <= 15) return 'BUDGET'
  if (ceiling <= 35) return 'MODERATE'
  if (ceiling <= 75) return 'UPSCALE'
  return 'PREMIUM'
}

/** Price tier a budget is centred on, used for soft "close enough" scoring. */
export function budgetTargetPriceLevel(budget: Budget | undefined): PriceLevel | null {
  const tier = budgetTier(budget)
  if (tier === 'low') return 'BUDGET'
  if (tier === 'mid') return 'MODERATE'
  if (tier === 'high') return 'UPSCALE'
  return budgetMaxPriceLevel(budget)
}
