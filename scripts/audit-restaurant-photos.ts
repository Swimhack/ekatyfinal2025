/**
 * Bounded restaurant photo audit.
 *
 * Dry-run by default. Clears only invalid, inaccessible, logo/favicon, or
 * known-stock URLs. Reconstructs comma-split CDN URLs when possible.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-restaurant-photos.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-restaurant-photos.ts --commit
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-restaurant-photos.ts --limit=100
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-restaurant-photos.ts --skip-network
 */

import { runPhotoAudit } from '../lib/photos/audit-photos'

const COMMIT = process.argv.includes('--commit')
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : 0
const CHECK_REACHABILITY = !process.argv.includes('--skip-network')

async function main() {
  console.log(`Photo audit starting (${COMMIT ? 'COMMIT' : 'DRY-RUN'})`)
  const summary = await runPhotoAudit({
    commit: COMMIT,
    limit: LIMIT,
    checkReachability: CHECK_REACHABILITY,
  })
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
