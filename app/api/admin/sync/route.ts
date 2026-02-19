import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { fetchAllKatyRestaurants, fetchDetailedRestaurantData } from '@/lib/google-places/fetcher'
import { importRestaurants, deduplicateRestaurants } from '@/lib/google-places/importer'
import { validateApiKey } from '@/lib/google-places/client'

const prisma = new PrismaClient()

// Verify API key from request
function verifyAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.ADMIN_API_KEY || 'your-secret-admin-key'

  return authHeader === `Bearer ${apiKey}`
}

// Streaming sync — keeps HTTP connection alive so Fly.io won't autostop
export async function POST(request: Request) {
  // Verify admin authentication
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check if Google API is configured
  if (!validateApiKey()) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured' },
      { status: 500 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg, timestamp: new Date().toISOString() })}\n\n`))
      }

      const syncPrisma = new PrismaClient()

      try {
        send('Starting comprehensive restaurant sync...')

        // Step 1: Discover all restaurants
        send('Discovering restaurants in Katy, TX area (7 types x 23 zones = 161 searches)...')
        const restaurants = await fetchAllKatyRestaurants()

        if (restaurants.length === 0) {
          send('ERROR: No restaurants found')
          controller.close()
          return
        }

        send(`Found ${restaurants.length} unique restaurants`)

        // Step 2: Fetch detailed data
        send('Fetching detailed information...')
        const detailedRestaurants = await fetchDetailedRestaurantData(
          restaurants,
          (current, total) => {
            if (current % 25 === 0 || current === total) {
              send(`Detail progress: ${current}/${total} (${Math.round(current/total * 100)}%)`)
            }
          }
        )

        send(`Fetched details for ${detailedRestaurants.length} restaurants`)

        // Step 3: Import to database
        send('Importing to database...')
        const importResults = await importRestaurants(detailedRestaurants, {
          updateExisting: true,
          onProgress: (current, total, restaurant) => {
            if (current % 50 === 0 || current === total) {
              send(`Importing: ${current}/${total} - ${restaurant?.name || 'Processing...'}`)
            }
          }
        })

        // Step 4: Clean up duplicates
        send('Cleaning up duplicates...')
        const duplicatesRemoved = await deduplicateRestaurants()

        const totalProcessed = detailedRestaurants.length
        const failureRate = totalProcessed > 0 ? importResults.failed / totalProcessed : 0
        const action = failureRate > 0.1 ? 'RESTAURANT_SYNC_FAILED' : 'RESTAURANT_SYNC'

        await syncPrisma.auditLog.create({
          data: {
            action,
            entity: 'Restaurant',
            entityId: 'system',
            changes: JSON.stringify({
              discovered: restaurants.length,
              created: importResults.created,
              updated: importResults.updated,
              failed: importResults.failed,
              failureRate: `${(failureRate * 100).toFixed(1)}%`,
              duplicatesRemoved
            }),
            userId: null
          }
        })

        const activeCount = await syncPrisma.restaurant.count({ where: { active: true } })

        send(`COMPLETE: ${importResults.created} created, ${importResults.updated} updated, ${importResults.failed} failed, ${duplicatesRemoved} dupes removed. Total active: ${activeCount}`)

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        send(`ERROR: ${errMsg}`)
        console.error('Sync failed:', error)

        await syncPrisma.auditLog.create({
          data: {
            action: 'RESTAURANT_SYNC_FAILED',
            entity: 'Restaurant',
            entityId: 'system',
            changes: JSON.stringify({ error: errMsg }),
            userId: null
          }
        }).catch(e => console.error('Failed to log sync error:', e))
      } finally {
        await syncPrisma.$disconnect()
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// GET endpoint to check last sync status
export async function GET(request: Request) {
  // Verify admin authentication
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Get the most recent sync logs
    const recentSyncs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['RESTAURANT_SYNC', 'RESTAURANT_SYNC_FAILED']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Get total restaurant count
    const totalRestaurants = await prisma.restaurant.count()
    const activeRestaurants = await prisma.restaurant.count({
      where: { active: true }
    })

    return NextResponse.json({
      totalRestaurants,
      activeRestaurants,
      recentSyncs: recentSyncs.map(log => ({
        timestamp: log.createdAt,
        action: log.action,
        details: log.changes ? JSON.parse(log.changes) : null
      }))
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
