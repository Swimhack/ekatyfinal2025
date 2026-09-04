/**
 * Undoes a photo audit run.
 *
 * runPhotoAudit stores the values it replaced in `metadata.photoAudit.restore`,
 * so a cleanup that turned out to be wrong can be put back without a database
 * backup. Rows written before `restore` existed cannot be reverted and are
 * reported as such rather than guessed at.
 *
 * Dry-run by default.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/revert-photo-audit.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/revert-photo-audit.ts --commit
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/revert-photo-audit.ts --commit --since=2026-09-04
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/revert-photo-audit.ts --commit --id=<restaurantId>
 */

import { PrismaClient } from '@prisma/client'

const COMMIT = process.argv.includes('--commit')
const SINCE_ARG = process.argv.find((a) => a.startsWith('--since='))
const SINCE = SINCE_ARG ? new Date(SINCE_ARG.split('=')[1]) : null
const ID_ARG = process.argv.find((a) => a.startsWith('--id='))
const ONLY_ID = ID_ARG ? ID_ARG.split('=')[1] : null

interface RestorePayload {
  photos?: string | null
  logoUrl?: string | null
  heroImage?: string | null
}

async function main() {
  const prisma = new PrismaClient()
  console.log(`Photo audit revert starting (${COMMIT ? 'COMMIT' : 'DRY-RUN'})`)

  try {
    const rows = await prisma.restaurant.findMany({
      where: {
        ...(ONLY_ID ? { id: ONLY_ID } : {}),
        metadata: { contains: '"photoAudit"' },
      },
      select: { id: true, name: true, photos: true, logoUrl: true, metadata: true },
    })

    let reverted = 0
    let skippedNoRestore = 0
    let skippedOutOfRange = 0
    const details: Array<Record<string, unknown>> = []

    for (const row of rows) {
      let metadata: Record<string, any> = {}
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) : {}
      } catch {
        continue
      }

      const audit = metadata.photoAudit
      if (!audit) continue

      if (SINCE && audit.at && new Date(audit.at) < SINCE) {
        skippedOutOfRange += 1
        continue
      }

      const restore: RestorePayload | undefined = audit.restore
      if (!restore) {
        skippedNoRestore += 1
        continue
      }

      const data: Record<string, unknown> = {}
      if (typeof restore.photos === 'string' && restore.photos !== row.photos) {
        data.photos = restore.photos
      }
      if (restore.logoUrl && restore.logoUrl !== row.logoUrl) {
        data.logoUrl = restore.logoUrl
      }
      if (restore.heroImage && metadata.heroImage !== restore.heroImage) {
        metadata.heroImage = restore.heroImage
      }

      // The audit record itself goes away, so a second revert is a no-op.
      delete metadata.photoAudit
      data.metadata = JSON.stringify(metadata)

      const changesFields = Object.keys(data).filter((k) => k !== 'metadata')
      if (changesFields.length === 0 && !restore.heroImage) continue

      reverted += 1
      details.push({ id: row.id, name: row.name, restored: changesFields })

      if (COMMIT) {
        await prisma.restaurant.update({ where: { id: row.id }, data })
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: COMMIT ? 'commit' : 'dry-run',
          candidates: rows.length,
          reverted,
          skippedNoRestore,
          skippedOutOfRange,
          samples: details.slice(0, 25),
        },
        null,
        2
      )
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
