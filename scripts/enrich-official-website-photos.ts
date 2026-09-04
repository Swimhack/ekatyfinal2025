import { PrismaClient } from '@prisma/client'
import { parsePhotos, serializePhotos } from '../lib/photos/parse-photos'
import {
  assessPhotoUrl,
  readPhotoRights,
  writePhotoRights,
  type PhotoRightsRecord,
} from '../lib/photos/photo-policy'

const prisma = new PrismaClient()
const COMMIT = process.argv.includes('--commit')
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const LIMIT = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10)) : 300
const CONCURRENCY = 10

const META_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i,
]

interface Candidate {
  id: string
  name: string
  website: string
  image: string
  contentType: string
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&#x2F;', '/')
    .replaceAll('&quot;', '"')
}

async function discoverOfficialImage(row: {
  id: string
  name: string
  website: string | null
}): Promise<Candidate | null> {
  if (!row.website) return null

  try {
    const page = await fetch(row.website, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; eKatyDirectory/1.0; +https://ekaty.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!page.ok) return null

    const html = (await page.text()).slice(0, 500_000)
    let rawImage: string | null = null
    for (const pattern of META_PATTERNS) {
      const match = html.match(pattern)
      if (match) {
        rawImage = match[1]
        break
      }
    }
    if (!rawImage) return null

    const imageUrl = new URL(decodeHtml(rawImage), page.url)
    if (imageUrl.protocol === 'http:') imageUrl.protocol = 'https:'
    const image = imageUrl.toString()
    if (/dummy|placeholder/i.test(image)) {
      return null
    }
    /**
     * og:image is very often the brand's social card rather than a photograph
     * of the place. Scraping it is how every Starbucks row ended up holding
     * starbucks.com/weblx/images/social/summary_square.png.
     *
     * Deferring to the display policy means this script cannot store anything
     * the listing pages would refuse to show, so a cleanup stays clean.
     */
    const assessment = assessPhotoUrl(image)
    if (!assessment.ok) {
      return null
    }

    const response = await fetch(image, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: {
        Range: 'bytes=0-1023',
        'User-Agent': 'Mozilla/5.0 (compatible; eKatyDirectory/1.0)',
      },
    })
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok || !contentType.startsWith('image/')) return null

    return {
      id: row.id,
      name: row.name,
      website: row.website,
      image,
      contentType,
    }
  } catch {
    return null
  }
}

async function findHttpsUpgrades() {
  const rows = await prisma.restaurant.findMany({
    where: {
      active: true,
      source: { not: 'google_places' },
      photos: { startsWith: 'http://' },
    },
    select: { id: true, name: true, photos: true, metadata: true },
  })

  const upgrades = []
  for (const row of rows) {
    const photos = parsePhotos(row.photos)
    const upgraded = photos.map((url) =>
      url.startsWith('http://') ? `https://${url.slice(7)}` : url
    )
    try {
      const response = await fetch(upgraded[0], {
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
        headers: {
          Range: 'bytes=0-1023',
          'User-Agent': 'Mozilla/5.0 (compatible; eKatyDirectory/1.0)',
        },
      })
      if (
        response.ok &&
        (response.headers.get('content-type') || '').startsWith('image/')
      ) {
        upgrades.push({ ...row, photos, upgraded })
      }
    } catch {
      // Keep the reachable HTTP URL in the audit trail, but never replace it
      // with an unverified HTTPS URL.
    }
  }
  return upgrades
}

async function main() {
  const rows = await prisma.restaurant.findMany({
    where: {
      active: true,
      website: { not: null },
      source: { not: 'google_places' },
      OR: [{ photos: '' }, { photos: '[]' }],
    },
    select: {
      id: true,
      name: true,
      website: true,
      metadata: true,
      adminOverrides: true,
    },
    orderBy: { rating: 'desc' },
    take: LIMIT,
  })

  const eligible = rows.filter((row) => {
    try {
      const overrides = row.adminOverrides
        ? JSON.parse(row.adminOverrides)
        : {}
      return !overrides.photos
    } catch {
      return true
    }
  })

  const discovered: Candidate[] = []
  for (let index = 0; index < eligible.length; index += CONCURRENCY) {
    const batch = await Promise.all(
      eligible.slice(index, index + CONCURRENCY).map(discoverOfficialImage)
    )
    discovered.push(...batch.filter((item): item is Candidate => !!item))
  }
  const httpsUpgrades = await findHttpsUpgrades()

  if (COMMIT) {
    for (const candidate of discovered) {
      const row = rows.find((item) => item.id === candidate.id)!
      let metadata: Record<string, unknown> = {}
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) : {}
      } catch {
        metadata = {}
      }

      const rights: PhotoRightsRecord[] = readPhotoRights(metadata)
      rights.push({
        url: candidate.image,
        origin: 'website',
        sourceUrl: candidate.website,
        rightsBasis: 'unknown',
        credit: 'Official restaurant website',
        obtainedAt: new Date().toISOString(),
        status: 'active',
      })

      await prisma.restaurant.update({
        where: { id: candidate.id },
        data: {
          photos: serializePhotos([candidate.image]),
          metadata: writePhotoRights(
            {
              ...metadata,
              officialPhotoDiscovery: {
                sourceUrl: candidate.website,
                discoveredAt: new Date().toISOString(),
                method: 'open_graph',
              },
            },
            rights
          ),
        },
      })
    }

    for (const candidate of httpsUpgrades) {
      const rights = readPhotoRights(candidate.metadata).map((record) => {
        const index = candidate.photos.indexOf(record.url)
        return index >= 0
          ? { ...record, url: candidate.upgraded[index] }
          : record
      })
      await prisma.restaurant.update({
        where: { id: candidate.id },
        data: {
          photos: serializePhotos(candidate.upgraded),
          metadata: writePhotoRights(candidate.metadata, rights),
        },
      })
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: COMMIT ? 'commit' : 'dry-run',
        checked: eligible.length,
        discovered: discovered.length,
        httpsUpgrades: httpsUpgrades.length,
        candidates: discovered,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
