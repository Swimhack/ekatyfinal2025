/**
 * CLI for lib/photos/audit-photos
 *   npx tsx scripts/run-photo-audit.ts
 *   npx tsx scripts/run-photo-audit.ts --commit --skip-network
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { runPhotoAudit } from '../lib/photos/audit-photos'

async function main() {
  const args = new Set(process.argv.slice(2))
  const commit = args.has('--commit')
  const skipNetwork = args.has('--skip-network')
  const limitArg = [...args].find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 0

  const summary = await runPhotoAudit({
    commit,
    limit,
    checkReachability: !skipNetwork,
  })
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
