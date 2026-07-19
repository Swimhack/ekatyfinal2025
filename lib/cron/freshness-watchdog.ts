/**
 * Freshness Watchdog
 *
 * Rolling re-verification of restaurant profiles against Google Places.
 * Fills two gaps the daily discovery sync can't cover:
 *  - permanently closed places stop appearing in Nearby Search results,
 *    so their rows never get re-checked and stay active forever
 *  - manually seeded rows (source: 'manual', no sourceId) are never
 *    verified at all
 *
 * Each run picks the restaurants with the oldest lastVerified, re-fetches
 * their Place Details (resolving a place_id first when missing), applies
 * an admin-override-safe update, and deactivates anything Google reports
 * as no longer operational.
 */

import * as cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { fetchPlaceDetails, findPlaceIdByText } from '../google-places/fetcher'
import { transformGooglePlaceToRestaurant } from '../google-places/transformer'
import { validateApiKey } from '../google-places/client'

const prisma = new PrismaClient()

// Offset from the 3 AM full discovery sync
const CRON_SCHEDULE = process.env.WATCHDOG_CRON_SCHEDULE || '30 4 * * *'
// Profiles re-verified per run; 25/day cycles a ~700-restaurant directory monthly
const BATCH_SIZE = parseInt(process.env.WATCHDOG_BATCH_SIZE || '25', 10)
// Only touch profiles not verified within this window
const STALE_AFTER_DAYS = parseInt(process.env.WATCHDOG_STALE_AFTER_DAYS || '14', 10)

let watchdogTask: ReturnType<typeof cron.schedule> | null = null

export interface WatchdogSummary {
  checked: number
  updated: number
  deactivated: number
  placeIdResolved: number
  unresolved: number
  failed: number
}

function mergeMetadata(existing: string | null, patch: Record<string, any>): string {
  let base: Record<string, any> = {}
  try {
    base = existing ? JSON.parse(existing) : {}
  } catch {
    base = {}
  }
  return JSON.stringify({ ...base, ...patch })
}

async function auditWatchdogAction(entityId: string, action: string, changes: Record<string, any>) {
  try {
    await prisma.auditLog.create({
      data: {
        entity: 'Restaurant',
        entityId,
        action,
        changes: JSON.stringify(changes),
        metadata: JSON.stringify({ actor: 'freshness-watchdog' }),
      },
    })
  } catch (error) {
    console.error('⚠️ Watchdog audit log write failed:', error)
  }
}

export async function runFreshnessWatchdog(limit: number = BATCH_SIZE): Promise<WatchdogSummary> {
  const summary: WatchdogSummary = {
    checked: 0,
    updated: 0,
    deactivated: 0,
    placeIdResolved: 0,
    unresolved: 0,
    failed: 0,
  }

  if (!validateApiKey()) {
    console.error('❌ Watchdog skipped: Google Maps API key is not configured')
    return summary
  }

  const staleCutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000)

  const candidates = await prisma.restaurant.findMany({
    where: {
      active: true,
      OR: [{ lastVerified: null }, { lastVerified: { lt: staleCutoff } }],
    },
    orderBy: { lastVerified: { sort: 'asc', nulls: 'first' } },
    take: limit,
  })

  if (candidates.length === 0) {
    console.log('✅ Watchdog: all active restaurant profiles are fresh')
    return summary
  }

  console.log(`🔍 Watchdog: re-verifying ${candidates.length} stale profile(s)...`)

  for (const restaurant of candidates) {
    summary.checked++

    try {
      // Resolve a place_id for rows that were seeded without one
      let placeId = restaurant.sourceId
      if (!placeId) {
        const match = await findPlaceIdByText(
          `${restaurant.name}, ${restaurant.address}, ${restaurant.city}, ${restaurant.state}`
        )
        if (!match) {
          // Stamp lastVerified so one unresolvable row can't monopolize the
          // batch every night; flag it in metadata for admin follow-up
          await prisma.restaurant.update({
            where: { id: restaurant.id },
            data: {
              lastVerified: new Date(),
              metadata: mergeMetadata(restaurant.metadata, {
                watchdog: { status: 'place_id_unresolved', checkedAt: new Date().toISOString() },
              }),
            },
          })
          summary.unresolved++
          console.log(`❓ No Google Places match for: ${restaurant.name}`)
          continue
        }
        placeId = match.placeId
        summary.placeIdResolved++
      }

      let details: any
      try {
        details = await fetchPlaceDetails(placeId)
      } catch (error: any) {
        const status = error?.response?.data?.status
        if (status === 'NOT_FOUND') {
          // Place removed from Google — treat as closed, keep the row
          await prisma.restaurant.update({
            where: { id: restaurant.id },
            data: {
              active: false,
              lastVerified: new Date(),
              metadata: mergeMetadata(restaurant.metadata, {
                watchdog: { status: 'place_removed', checkedAt: new Date().toISOString() },
              }),
            },
          })
          await auditWatchdogAction(restaurant.id, 'UPDATE', {
            active: { from: true, to: false },
            reason: 'google_place_not_found',
          })
          summary.deactivated++
          console.log(`🚫 Deactivated (removed from Google): ${restaurant.name}`)
          continue
        }
        throw error
      }

      const fresh = transformGooglePlaceToRestaurant(details)

      if (!fresh.active) {
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: {
            active: false,
            sourceId: placeId,
            lastVerified: new Date(),
            metadata: mergeMetadata(restaurant.metadata, {
              watchdog: {
                status: 'closed',
                businessStatus: details.business_status,
                checkedAt: new Date().toISOString(),
              },
            }),
          },
        })
        await auditWatchdogAction(restaurant.id, 'UPDATE', {
          active: { from: true, to: false },
          reason: details.business_status,
        })
        summary.deactivated++
        console.log(`🚫 Deactivated (${details.business_status}): ${restaurant.name}`)
        continue
      }

      // Override-safe update: same lock semantics as the importer
      const overrides = restaurant.adminOverrides ? JSON.parse(restaurant.adminOverrides) : {}
      const safeUpdate = Object.keys(fresh).reduce((acc: any, key) => {
        if (!overrides[key]) {
          acc[key] = (fresh as any)[key]
        }
        return acc
      }, {})

      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          ...safeUpdate,
          slug: restaurant.slug, // never break existing URLs
          sourceId: placeId,
          adminOverrides: restaurant.adminOverrides,
          lastVerified: new Date(),
        },
      })
      summary.updated++
    } catch (error) {
      summary.failed++
      console.error(`❌ Watchdog failed for ${restaurant.name}:`, error)
      // Leave lastVerified untouched so the row is retried next run
    }
  }

  console.log(
    `✅ Watchdog run complete: ${summary.updated} updated, ${summary.deactivated} deactivated, ` +
      `${summary.placeIdResolved} place_ids resolved, ${summary.unresolved} unresolved, ${summary.failed} failed`
  )
  return summary
}

export function startFreshnessWatchdog() {
  if (watchdogTask) {
    console.log('⏰ Freshness watchdog is already running')
    return
  }

  console.log('⏰ Starting freshness watchdog cron job')
  console.log(`📅 Schedule: ${CRON_SCHEDULE} (batch: ${BATCH_SIZE}, stale after: ${STALE_AFTER_DAYS}d)`)

  watchdogTask = cron.schedule(CRON_SCHEDULE, async () => {
    console.log('🔄 Running scheduled freshness watchdog...')
    try {
      await runFreshnessWatchdog()
    } catch (error) {
      console.error('❌ Scheduled watchdog run failed:', error)
    }
  })

  console.log('✅ Freshness watchdog started successfully')
}

export function stopFreshnessWatchdog() {
  if (watchdogTask) {
    watchdogTask.stop()
    watchdogTask = null
    console.log('⏹️ Freshness watchdog stopped')
  }
}
