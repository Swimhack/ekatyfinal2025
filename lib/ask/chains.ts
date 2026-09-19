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
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function matchesKnownBrand(name: string): boolean {
  const normalized = normalizeName(name)
  return KNOWN_CHAIN_BRANDS.some((brand) => normalized.includes(normalizeName(brand)))
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
    const key = normalizeName(candidate.name)
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

    const locations = addressesByName.get(normalizeName(candidate.name))
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
