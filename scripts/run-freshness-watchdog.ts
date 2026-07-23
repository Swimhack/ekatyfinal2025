/**
 * Manual one-off run of the freshness watchdog.
 *
 * Usage:
 *   npm run watchdog:freshness            # default batch size
 *   npm run watchdog:freshness -- 50      # custom batch size
 */

import { runFreshnessWatchdog } from '../lib/cron/freshness-watchdog'

async function main() {
  const limitArg = process.argv[2]
  const parsed = limitArg ? parseInt(limitArg, 10) : NaN
  const limit = Number.isNaN(parsed) ? undefined : parsed

  const summary = await runFreshnessWatchdog(limit)
  console.log('\nSummary:', JSON.stringify(summary, null, 2))
  process.exit(summary.failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('Watchdog run crashed:', error)
  process.exit(1)
})
