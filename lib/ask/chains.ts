// Ask eKaty — chain classification for the "no chains" filter.
//
// Evidence order, strongest first:
//   1. An explicit `metadata.isChain` on the listing.
//   2. The same restaurant name listed at more than one address in our own
//      inventory — a multi-location brand as far as our data is concerned.
//   3. A reviewable list of known multi-location brands (lib/ask/vocabulary.ts).
//
// The result is only ever used to remove candidates, and the why-line for a
// "no chains" request is phrased as clearing the diner's filter rather than as
// a claim that a restaurant is independently owned.

import type { AskCandidate } from './types'
import { KNOWN_CHAIN_BRANDS } from './vocabulary'

export interface ChainIndex {
  /** Candidate ids classified as chains. */
  ids: Set<string>
  /** Why each id was classified, for logging and debugging. */
  evidence: Map<string, 'metadata' | 'multi_location' | 'known_brand'>
}

/** Lowercases and strips punctuation so "Pappas Bar-B-Q" ≈ "pappas bar b q". */
export function normalizeBrandText(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * The spellings a brand can appear in once punctuation is gone.
 *
 * "Wendy's" reduces to "wendy s", but diners and listings both write "Wendys",
 * so an apostrophe-free form is carried alongside it.
 */
export function brandTextForms(value: string): string[] {
  const spaced = normalizeBrandText(value)
  const contracted = normalizeBrandText(value.replace(/['\u2018\u2019\u02bc]/g, ''))
  return spaced === contracted ? [spaced] : [spaced, contracted]
}

function matchesKnownBrand(name: string): boolean {
  const nameForms = brandTextForms(name)
  return KNOWN_CHAIN_BRANDS.some((brand) =>
    brandTextForms(brand).some((needle) => nameForms.some((form) => form.includes(needle)))
  )
}

/**
 * Classifies a candidate pool. Multi-location detection needs the whole pool,
 * so this is built once per request rather than per candidate.
 */
export function buildChainIndex(
  candidates: AskCandidate[],
  explicitFlags: Map<string, boolean> = new Map()
): ChainIndex {
  const addressesByName = new Map<string, Set<string>>()
  for (const candidate of candidates) {
    const key = normalizeBrandText(candidate.name)
    const addresses = addressesByName.get(key) || new Set<string>()
    addresses.add(`${candidate.address.toLowerCase().trim()}|${candidate.zipCode}`)
    addressesByName.set(key, addresses)
  }

  const index: ChainIndex = { ids: new Set(), evidence: new Map() }

  for (const candidate of candidates) {
    const explicit = explicitFlags.get(candidate.id)
    if (explicit === true) {
      index.ids.add(candidate.id)
      index.evidence.set(candidate.id, 'metadata')
      continue
    }
    if (explicit === false) continue

    const locations = addressesByName.get(normalizeBrandText(candidate.name))
    if (locations && locations.size > 1) {
      index.ids.add(candidate.id)
      index.evidence.set(candidate.id, 'multi_location')
      continue
    }

    if (matchesKnownBrand(candidate.name)) {
      index.ids.add(candidate.id)
      index.evidence.set(candidate.id, 'known_brand')
    }
  }

  return index
}

export function isChain(index: ChainIndex, candidateId: string): boolean {
  return index.ids.has(candidateId)
}

/**
 * Whether a listing is the brand the diner named.
 *
 * Whole-word against the punctuation-stripped name, so "Burger King #4" and
 * "McDonald's (To Go only)" both answer to the brand while "Build-a-Burger"
 * and "Smashburger" do not. This is the promotion path for an explicit brand
 * request, so it is deliberately stricter than the substring test the chain
 * classifier uses to decide what a "no chains" filter should remove.
 */
export function nameCarriesBrand(name: string, brand: string): boolean {
  const nameForms = brandTextForms(name).map((form) => ` ${form} `)
  return brandTextForms(brand).some((needle) =>
    nameForms.some((form) => form.includes(` ${needle} `))
  )
}

/**
 * Which known brands a diner named in their request.
 *
 * Matching is whole-word against the punctuation-stripped request, so "bk" does
 * not stand in for Burger King and "burger" alone stays a cuisine word. A hit
 * is the diner asking for that brand by name, which is what tells the surprise
 * filter to stand down.
 */
export function findBrandMentions(text: string): string[] {
  const forms = brandTextForms(text).map((form) => ` ${form} `)
  return KNOWN_CHAIN_BRANDS.filter((brand) =>
    brandTextForms(brand).some((needle) => forms.some((form) => form.includes(` ${needle} `)))
  )
}
