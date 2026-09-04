/**
 * Bounded restaurant photo audit.
 *
 * Dry-run by default. Clears only invalid, inaccessible, logo/favicon,
 * brand-marketing, or known-stock URLs, across `photos`, `logoUrl` and
 * `metadata.heroImage`. Reconstructs comma-split CDN URLs when possible.
 *
 * Every committed row keeps its previous values in `metadata.photoAudit.restore`;
 * scripts/revert-photo-audit.ts puts them back.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-restaurant-photos.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-restaurant-photos.ts --commit
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-restaurant-photos.ts --limit=100
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-restaurant-photos.ts --skip-network
 *
 * Targeted cleanup — brand artwork only, no network calls, nothing else touched:
 *   ... scripts/audit-restaurant-photos.ts --only=brand_marketing --skip-network
 */

import { runPhotoAudit } from '../lib/photos/audit-photos'
import type { PhotoRejectReason } from '../lib/photos/photo-policy'

const COMMIT = process.argv.includes('--commit')
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : 0
const CHECK_REACHABILITY = !process.argv.includes('--skip-network')
const ONLY_ARG = process.argv.find((a) => a.startsWith('--only='))
const ONLY_REASONS = ONLY_ARG
  ? (ONLY_ARG.split('=')[1].split(',').map((r) => r.trim()).filter(Boolean) as PhotoRejectReason[])
  : undefined

async function main() {
  console.log(`Photo audit starting (${COMMIT ? 'COMMIT' : 'DRY-RUN'})`)
  if (ONLY_REASONS) console.log(`Restricted to reasons: ${ONLY_REASONS.join(', ')}`)
  const summary = await runPhotoAudit({
    commit: COMMIT,
    limit: LIMIT,
    checkReachability: CHECK_REACHABILITY,
    onlyReasons: ONLY_REASONS,
  })
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
