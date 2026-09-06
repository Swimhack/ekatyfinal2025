// Ask eKaty — why-line composition.
//
// A why-line is assembled purely from `MatchReason`s, each of which points at a
// field that actually matched on the listing. There is no template here that
// can describe a dish, a price, a crowd, a wait time or an opinion, and none
// that implies social proof — if we cannot cite a match, we say the ask was
// broad instead of inventing a compliment.

import type { AskCandidate, AskSchema, MatchReason } from './types'

/** How many cited matches a single why-line carries. */
const MAX_CLAUSES = 3

const CLAUSE_SEPARATOR = ' · '

/** Turns one cited match into a clause. Every branch restates stored data. */
function clauseFor(reason: MatchReason): string | null {
  switch (reason.kind) {
    case 'brand':
      return `the ${reason.detail} you asked for by name`
    case 'cuisine':
      return `listed under ${reason.detail}`
    case 'budget':
    case 'budget_cap':
    case 'vibe_price':
      return `${reason.detail} price tier`
    case 'zip':
      return `in ${reason.detail}`
    case 'nearby_zip':
      return `${reason.detail} mi from ${reason.evidence}`
    case 'area':
      return `in ${reason.detail}`
    case 'vibe':
      return reason.evidence
        ? `${reason.detail}, tagged "${reason.evidence}"`
        : `${reason.detail} match`
    case 'sit_down':
      return reason.evidence
        ? `${reason.detail}, read from its listed "${reason.evidence}"`
        : reason.detail
    case 'kids':
      return reason.evidence ? `tagged "${reason.evidence}" for kids` : 'listed as kid-friendly'
    case 'party_size':
      return reason.evidence
        ? `room for ${reason.detail}, tagged "${reason.evidence}"`
        : `room for ${reason.detail}`
    case 'open_now':
      return 'open now per listed hours'
    case 'no_chains':
      return 'clears your no-chains filter'
    case 'surprise_local':
      return 'not one of the multi-location brands we skip for a surprise'
    case 'excluded_clear':
      return reason.detail
    default:
      return null
  }
}

function capitalizeFirst(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Fallback for a request with no parseable constraints. It says so plainly
 * rather than inventing a reason to recommend the place.
 */
function broadAskLine(candidate: AskCandidate, schema: AskSchema): string {
  if (schema.novelty === 'surprise') {
    return 'Nothing narrow to match, so we reached past the usual suspects in our Katy directory'
  }
  return typeof candidate.rating === 'number'
    ? `Broad ask, so we led with a ${candidate.rating.toFixed(1)}-rated listing in our Katy directory`
    : 'Broad ask, so we led with an active listing in our Katy directory'
}

/**
 * One-line explanation of why a pick fits, built from the matches that scored.
 *
 * Reasons arrive sorted by weight, so the strongest match leads. Zero-weight
 * bookkeeping reasons are filtered upstream and never reach a clause.
 */
export function buildWhyLine(
  candidate: AskCandidate,
  reasons: MatchReason[],
  schema: AskSchema
): string {
  const clauses: string[] = []
  for (const reason of reasons) {
    const clause = clauseFor(reason)
    if (clause && !clauses.includes(clause)) clauses.push(clause)
    if (clauses.length >= MAX_CLAUSES) break
  }

  if (clauses.length === 0) return broadAskLine(candidate, schema)

  const line = capitalizeFirst(clauses.join(CLAUSE_SEPARATOR))

  // A "surprise me" ask deserves an explicit nod that novelty shaped the order,
  // since that is a ranking choice rather than a matched field.
  if (schema.novelty === 'surprise' && clauses.length < MAX_CLAUSES) {
    return `${line}${CLAUSE_SEPARATOR}pulled off the beaten path for you`
  }

  return line
}
