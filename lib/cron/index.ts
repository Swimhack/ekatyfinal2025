/**
 * Cron Job Manager
 * Initializes and manages all scheduled tasks
 */

import { startDailySync } from './restaurant-sync'
import { startHourlyMonitoring } from './hourly-monitoring'
import { startFreshnessWatchdog } from './freshness-watchdog'

/**
 * Start all cron jobs
 */
export function startAllCronJobs() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 STARTING CRON JOBS')
  console.log('='.repeat(60))

  // Start daily sync (3 AM CST)
  startDailySync()

  // Start hourly monitoring
  startHourlyMonitoring()

  // Start freshness watchdog (4:30 AM, re-verifies stale profiles
  // and deactivates permanently closed restaurants)
  startFreshnessWatchdog()

  console.log('='.repeat(60))
  console.log('✅ All cron jobs started successfully')
  console.log('='.repeat(60) + '\n')
}

/**
 * Initialize cron jobs when server starts
 * Call this in your Next.js server initialization
 */
export function initializeCronJobs() {
  if (process.env.NODE_ENV === 'production') {
    console.log('📋 Initializing cron jobs in production mode...')
    startAllCronJobs()
  } else {
    console.log('ℹ️  Cron jobs disabled in development mode')
    console.log('   To enable: Run `npm run cron` in a separate terminal')
  }
}

// Export individual cron jobs for manual testing
export * from './restaurant-sync'
export * from './hourly-monitoring'
export * from './freshness-watchdog'
