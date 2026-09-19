// Ask eKaty — the one module in this feature that talks to the database.
//
// Ask eKaty never sources a restaurant from anywhere else: this reads active
// rows from the existing `restaurants` table with Prisma, the same way
// /api/restaurants and /api/spin do, and normalizes them into `AskCandidate`.

import { prisma } from '@/lib/prisma'
import { PRICE_LEVEL_ORDER, type AskCandidate, type PriceLevel } from './types'

/**
 * Upper bound on rows pulled per request.
 *
 * The whole active directory is loaded rather than pre-filtered in SQL because
 * two ranking signals need the full picture: ZIP proximity is measured against
 * the real coordinates of listings in that ZIP, and chain detection looks for
 * the same name at more than one address. The Katy directory is small enough
 * that this stays a single indexed scan; existing routes such as
 * /api/restaurants/map already read the active set the same way.
 */
const MAX_INVENTORY_ROWS = 1500

const INVENTORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  address: true,
  zipCode: true,
  latitude: true,
  longitude: true,
  priceLevel: true,
  categories: true,
  cuisineTypes: true,
  hours: true,
  rating: true,
  reviewCount: true,
  featured: true,
  metadata: true,
} as const

function splitList(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function coercePriceLevel(value: string | null | undefined): PriceLevel {
  const upper = (value || '').toUpperCase()
  return (PRICE_LEVEL_ORDER as string[]).includes(upper) ? (upper as PriceLevel) : 'MODERATE'
}

function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

type InventoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  address: string
  zipCode: string
  latitude: number | null
  longitude: number | null
  priceLevel: string
  categories: string | null
  cuisineTypes: string | null
  hours: string | null
  rating: number | null
  reviewCount: number
  featured: boolean
  metadata: string | null
}

/** Maps a `restaurants` row onto the ranking shape. No field is synthesized. */
export function toAskCandidate(row: InventoryRow): AskCandidate {
  const metadata = parseMetadata(row.metadata)
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    address: row.address,
    zipCode: row.zipCode,
    latitude: row.latitude,
    longitude: row.longitude,
    priceLevel: coercePriceLevel(row.priceLevel),
    categories: splitList(row.categories),
    cuisineTypes: splitList(row.cuisineTypes),
    tags: stringArray(metadata.tags),
    features: stringArray(metadata.features),
    rating: row.rating,
    reviewCount: row.reviewCount ?? 0,
    featured: Boolean(row.featured),
    hours: row.hours,
  }
}

export interface InventorySnapshot {
  candidates: AskCandidate[]
  /** `metadata.isChain` where a listing states it explicitly. */
  explicitChainFlags: Map<string, boolean>
}

/** Reads the active Katy directory and normalizes it for ranking. */
export async function fetchAskCandidates(): Promise<InventorySnapshot> {
  const rows = await prisma.restaurant.findMany({
    where: { active: true },
    select: INVENTORY_SELECT,
    orderBy: { rating: 'desc' },
    take: MAX_INVENTORY_ROWS,
  })

  const candidates: AskCandidate[] = []
  const explicitChainFlags = new Map<string, boolean>()

  for (const row of rows as InventoryRow[]) {
    candidates.push(toAskCandidate(row))
    const metadata = parseMetadata(row.metadata)
    if (typeof metadata.isChain === 'boolean') {
      explicitChainFlags.set(row.id, metadata.isChain)
    }
  }

  return { candidates, explicitChainFlags }
}
