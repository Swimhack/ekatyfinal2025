/**
 * Bounded restaurant photo audit shared by CLI and admin API.
 * Clears only invalid, inaccessible, logo/favicon, or known-stock URLs.
 */

import { PrismaClient } from '@prisma/client'
import { parsePhotos, serializePhotos } from './parse-photos'
import { assessPhotoUrl, PhotoRejectReason } from './photo-policy'

export type ChangeReason = PhotoRejectReason | 'reassembled' | 'unchanged_ok'

export interface PhotoAuditRowReport {
  id: string
  name: string
  source: string | null
  before: string[]
  after: string[]
  removed: Array<{ url: string; reason: ChangeReason }>
  changed: boolean
}

export interface PhotoAuditSummary {
  mode: 'commit' | 'dry-run'
  scanned: number
  changed: number
  skippedAdminOverride: number
  reasonCounts: Record<string, number>
  sourceCounts: Record<string, number>
  samples: Array<{
    id: string
    name: string
    source: string | null
    beforeCount: number
    afterCount: number
    removed: Array<{ url: string; reason: ChangeReason }>
    before: string[]
    after: string[]
  }>
}

export interface RunPhotoAuditOptions {
  commit?: boolean
  limit?: number
  checkReachability?: boolean
  prisma?: PrismaClient
}

async function urlReachable(url: string): Promise<boolean> {
  if (url.startsWith('/')) return true
  try {
    const head = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    if (head.ok) {
      const ct = head.headers.get('content-type') || ''
      if (!ct || ct.startsWith('image/') || ct.includes('octet-stream')) return true
    }
  } catch {
    // try GET range
  }
  try {
    const get = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    return get.ok || get.status === 206
  } catch {
    return false
  }
}

export async function runPhotoAudit(
  options: RunPhotoAuditOptions = {}
): Promise<PhotoAuditSummary> {
  const commit = !!options.commit
  const limit = options.limit && options.limit > 0 ? options.limit : 0
  const checkReachability = options.checkReachability !== false
  const prisma = options.prisma || new PrismaClient()
  const ownsClient = !options.prisma

  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        source: true,
        photos: true,
        metadata: true,
        adminOverrides: true,
      },
      orderBy: { updatedAt: 'desc' },
      ...(limit > 0 ? { take: limit } : {}),
    })

    const reports: PhotoAuditRowReport[] = []
    const reasonCounts: Record<string, number> = {}
    const sourceCounts: Record<string, number> = {}
    let skippedAdminOverride = 0

    for (const row of restaurants) {
      let overrides: Record<string, boolean> = {}
      try {
        overrides = row.adminOverrides ? JSON.parse(row.adminOverrides) : {}
      } catch {
        overrides = {}
      }
      if (overrides.photos) {
        skippedAdminOverride += 1
        continue
      }

      const before = parsePhotos(row.photos)
      const after: string[] = []
      const removed: PhotoAuditRowReport['removed'] = []

      for (const url of before) {
        const assessment = assessPhotoUrl(url)
        if (!assessment.ok) {
          removed.push({ url, reason: assessment.reason || 'invalid_url' })
          reasonCounts[assessment.reason || 'invalid_url'] =
            (reasonCounts[assessment.reason || 'invalid_url'] || 0) + 1
          continue
        }

        if (checkReachability) {
          const ok = await urlReachable(url)
          if (!ok) {
            removed.push({ url, reason: 'unreachable' })
            reasonCounts.unreachable = (reasonCounts.unreachable || 0) + 1
            continue
          }
        }

        after.push(url)
      }

      const beforeSerialized = row.photos || ''
      const afterSerialized = serializePhotos(after)
      const reassembled =
        before.length === after.length &&
        before.every((u, i) => u === after[i]) &&
        beforeSerialized !== afterSerialized &&
        after.length > 0

      const changed = beforeSerialized !== afterSerialized
      if (changed) {
        sourceCounts[row.source || 'unknown'] =
          (sourceCounts[row.source || 'unknown'] || 0) + 1
        if (reassembled && removed.length === 0) {
          reasonCounts.reassembled = (reasonCounts.reassembled || 0) + 1
        }
      }

      reports.push({
        id: row.id,
        name: row.name,
        source: row.source,
        before,
        after,
        removed,
        changed,
      })

      if (commit && changed) {
        let metadata: Record<string, unknown> = {}
        try {
          metadata = row.metadata ? JSON.parse(row.metadata) : {}
        } catch {
          metadata = {}
        }
        metadata.photoAudit = {
          at: new Date().toISOString(),
          removed: removed.map((r) => ({ url: r.url, reason: r.reason })),
          kept: after.length,
        }

        await prisma.restaurant.update({
          where: { id: row.id },
          data: {
            photos: afterSerialized,
            metadata: JSON.stringify(metadata),
          },
        })
      }
    }

    const changedRows = reports.filter((r) => r.changed)
    return {
      mode: commit ? 'commit' : 'dry-run',
      scanned: restaurants.length,
      changed: changedRows.length,
      skippedAdminOverride,
      reasonCounts,
      sourceCounts,
      samples: changedRows.slice(0, 25).map((r) => ({
        id: r.id,
        name: r.name,
        source: r.source,
        beforeCount: r.before.length,
        afterCount: r.after.length,
        removed: r.removed,
        before: r.before.slice(0, 2),
        after: r.after.slice(0, 2),
      })),
    }
  } finally {
    if (ownsClient) {
      await prisma.$disconnect()
    }
  }
}
