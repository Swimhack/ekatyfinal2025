#!/usr/bin/env node

const { spawn } = require('node:child_process')

const env = { ...process.env }

async function exec(command, options = {}) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env, ...options })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed with exit code ${code}`))
      }
    })
  })
}

async function main() {
  try {
    console.log('Starting eKaty production server...')

    // Push schema to database (creates/updates tables)
    console.log('Syncing database schema...')
    await exec('npx prisma db push --accept-data-loss --skip-generate')
    console.log('Schema synchronized!')

    // Seed blog articles (upsert — safe to run repeatedly, non-fatal)
    try {
      console.log('Seeding blog articles...')
      await exec('npx tsx prisma/seed-blog-articles.ts')
      console.log('Blog articles seeded!')
    } catch (e) {
      console.log('Blog seeding skipped (non-fatal):', e.message)
    }

    // Start the Next.js server
    console.log('Starting Next.js server...')
    await exec('npm run start')

  } catch (error) {
    console.error('Startup failed:', error)
    process.exit(1)
  }
}

main()
