import { PrismaClient } from '@prisma/client'
import { serializePhotos } from '../lib/photos/parse-photos'
import {
  readPhotoRights,
  writePhotoRights,
  type PhotoRightsRecord,
} from '../lib/photos/photo-policy'

const prisma = new PrismaClient()
const COMMIT = process.argv.includes('--commit')
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const LIMIT = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10)) : 300
const CONCURRENCY = 5
const MAX_HTML_BYTES = 1_000_000
const MAX_IMAGE_BYTES = 192_000

const POSITIVE =
  /food|menu|dish|meal|dining|interior|restaurant|location|hero|gallery|chicken|burger|burrito|bowl|pizza|taco|sushi|steak|fajita|breakfast|lunch|dinner|entree|wings|sandwich|dessert|ramen|noodle|grill/i
const STRONG_POSITIVE =
  /food|dish|meal|dining|interior|chicken|burger|burrito|bowl|pizza|taco|sushi|steak|fajita|breakfast|entree|wings|sandwich|dessert|ramen|noodle/i
const NEGATIVE =
  /logo|icon|favicon|sprite|badge|social|summary|avatar|brandmark|wordmark|default-og|placeholder|dummy|loading|app-store|play-store|qr-code|150x150|272x91|(?:^|[/_-])map(?:[._-])|michelin|sloppyframe|member[_-]benefits|promos?|bogo|webslider|(?:_|-)web(?:_|-)/i
const REJECTED_URL_PARTS = [
  // Visual QA: Torchy mascot/lifestyle creative, not food or restaurant space.
  '7d540a9ff2c42fe21ace7659553f071a',
  // Visual QA: KFC founder portrait, not food or restaurant space.
  '0a8XM1v5ya6zfcFzkkufaOf6K7sbAste1aGqxE93S7Y',
]
const IMAGE_EXT = /\.(?:avif|jpe?g|png|webp)(?:[?#]|$)/i

interface RawCandidate {
  url: string
  context: string
  source: 'image' | 'source' | 'background' | 'structured' | 'meta'
  hintWidth?: number
  hintHeight?: number
}

interface ContentCandidate {
  id: string
  name: string
  website: string
  image: string
  width: number
  height: number
  score: number
  source: RawCandidate['source']
  evidence: string
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&#x2F;', '/')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

function readAttribute(tag: string, name: string): string | null {
  const quoted = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i')
  )
  if (quoted) return decodeHtml(quoted[2])
  const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'))
  return bare ? decodeHtml(bare[1]) : null
}

function chooseSrcset(value: string): string {
  const options = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return options.at(-1)?.split(/\s+/)[0] || ''
}

function normalizeImageUrl(raw: string, baseUrl: string): string | null {
  const cleaned = raw.trim().replace(/^url\((.*)\)$/i, '$1').replace(/^["']|["']$/g, '')
  if (!cleaned || cleaned.startsWith('data:') || cleaned.startsWith('blob:')) {
    return null
  }
  try {
    const url = new URL(decodeHtml(cleaned), baseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.protocol === 'http:') url.protocol = 'https:'
    return url.toString()
  } catch {
    return null
  }
}

function collectCandidates(html: string, baseUrl: string): RawCandidate[] {
  const candidates: RawCandidate[] = []

  for (const match of Array.from(html.matchAll(/<img\b[^>]*>/gi))) {
    const tag = match[0]
    const srcset =
      readAttribute(tag, 'srcset') ||
      readAttribute(tag, 'data-srcset') ||
      readAttribute(tag, 'data-lazy-srcset')
    const raw =
      (srcset && chooseSrcset(srcset)) ||
      readAttribute(tag, 'src') ||
      readAttribute(tag, 'data-src') ||
      readAttribute(tag, 'data-lazy-src')
    if (!raw) continue
    const url = normalizeImageUrl(raw, baseUrl)
    if (!url) continue
    const index = match.index || 0
    candidates.push({
      url,
      context: `${html.slice(Math.max(0, index - 180), index)} ${tag} ${html.slice(index + tag.length, index + tag.length + 180)}`,
      source: 'image',
      hintWidth: Number(readAttribute(tag, 'width')) || undefined,
      hintHeight: Number(readAttribute(tag, 'height')) || undefined,
    })
  }

  for (const match of Array.from(html.matchAll(/<source\b[^>]*>/gi))) {
    const tag = match[0]
    const srcset = readAttribute(tag, 'srcset') || readAttribute(tag, 'data-srcset')
    if (!srcset) continue
    const url = normalizeImageUrl(chooseSrcset(srcset), baseUrl)
    if (url) candidates.push({ url, context: tag, source: 'source' })
  }

  for (const match of Array.from(html.matchAll(/(?:background-image\s*:|url\()\s*url?\(?\s*["']?([^"')\s]+)["']?\)?/gi))) {
    const url = normalizeImageUrl(match[1], baseUrl)
    if (url) {
      const index = match.index || 0
      candidates.push({
        url,
        context: html.slice(Math.max(0, index - 220), index + match[0].length + 120),
        source: 'background',
      })
    }
  }

  for (const match of Array.from(html.matchAll(/https?:\\?\/\\?\/[^"'\\\s<>]+/gi))) {
    const raw = match[0].replaceAll('\\/', '/')
    if (!IMAGE_EXT.test(raw)) continue
    const url = normalizeImageUrl(raw, baseUrl)
    if (url) {
      const index = match.index || 0
      candidates.push({
        url,
        context: html.slice(Math.max(0, index - 160), index + raw.length + 160),
        source: 'structured',
      })
    }
  }

  for (const match of Array.from(html.matchAll(/<meta\b[^>]*>/gi))) {
    const tag = match[0]
    const property = readAttribute(tag, 'property') || readAttribute(tag, 'name') || ''
    if (!/^(?:og:image|twitter:image)/i.test(property)) continue
    const raw = readAttribute(tag, 'content')
    const url = raw && normalizeImageUrl(raw, baseUrl)
    if (url) candidates.push({ url, context: tag, source: 'meta' })
  }

  const deduped = new Map<string, RawCandidate>()
  for (const candidate of candidates) {
    const existing = deduped.get(candidate.url)
    if (!existing || baseScore(candidate) > baseScore(existing)) {
      deduped.set(candidate.url, candidate)
    }
  }
  return Array.from(deduped.values())
}

function baseScore(candidate: RawCandidate): number {
  const text = `${candidate.url} ${candidate.context}`
  if (
    NEGATIVE.test(text) ||
    REJECTED_URL_PARTS.some((part) => candidate.url.includes(part))
  ) {
    return -200
  }
  let score = candidate.source === 'meta' ? -20 : 0
  if (POSITIVE.test(text)) score += 30
  if (STRONG_POSITIVE.test(text)) score += 50
  if (/hero|banner|gallery|carousel|slide/i.test(text)) score += 20
  if (candidate.hintWidth && candidate.hintWidth >= 600) score += 15
  if (candidate.hintHeight && candidate.hintHeight >= 350) score += 10
  return score
}

function parseDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }

  if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    const kind = buffer.toString('ascii', 12, 16)
    if (kind === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      }
    }
    if (kind === 'VP8 ' && buffer.length >= 30) {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      }
    }
    if (kind === 'VP8L' && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21)
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      }
    }
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = buffer[offset + 1]
      const size = buffer.readUInt16BE(offset + 2)
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb].includes(marker)) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
        }
      }
      if (size < 2) break
      offset += 2 + size
    }
  }
  return null
}

async function readImagePrefix(response: Response): Promise<Buffer> {
  if (!response.body) return Buffer.alloc(0)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < MAX_IMAGE_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
  }
  await reader.cancel()
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size)
}

async function validateCandidate(candidate: RawCandidate) {
  if (baseScore(candidate) < 0) return null
  try {
    const response = await fetch(candidate.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(9000),
      headers: {
        Range: `bytes=0-${MAX_IMAGE_BYTES - 1}`,
        'User-Agent': 'Mozilla/5.0 (compatible; eKatyDirectory/1.0)',
      },
    })
    const type = response.headers.get('content-type') || ''
    if (!response.ok || !type.startsWith('image/')) return null
    const dimensions = parseDimensions(await readImagePrefix(response))
    if (!dimensions) return null
    const { width, height } = dimensions
    const ratio = width / height
    if (width < 600 || height < 320 || ratio < 0.85 || ratio > 2.8) return null

    let score = baseScore(candidate)
    score += Math.min(30, Math.round((width * height) / 250_000))
    if (ratio >= 1.2 && ratio <= 2.1) score += 20
    if (score < 75) return null
    return { width, height, score }
  } catch {
    return null
  }
}

async function discoverContentPhoto(row: {
  id: string
  name: string
  website: string | null
}): Promise<ContentCandidate | null> {
  if (!row.website) return null
  try {
    const page = await fetch(row.website, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; eKatyDirectory/1.0; +https://ekaty.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!page.ok) return null
    const html = (await page.text()).slice(0, MAX_HTML_BYTES)
    const raw = collectCandidates(html, page.url)
      .filter((candidate) => baseScore(candidate) >= 0)
      .sort((a, b) => baseScore(b) - baseScore(a))
      .slice(0, 12)

    const checked = await Promise.all(raw.map(async (candidate) => ({
      candidate,
      validated: await validateCandidate(candidate),
    })))
    const best = checked
      .filter((item) => item.validated)
      .sort((a, b) => b.validated!.score - a.validated!.score)[0]
    if (!best?.validated) return null

    return {
      id: row.id,
      name: row.name,
      website: row.website,
      image: best.candidate.url,
      width: best.validated.width,
      height: best.validated.height,
      score: best.validated.score,
      source: best.candidate.source,
      evidence: best.candidate.context.replace(/\s+/g, ' ').slice(0, 180),
    }
  } catch {
    return null
  }
}

async function main() {
  const rows = await prisma.restaurant.findMany({
    where: {
      active: true,
      website: { not: null },
      source: { not: 'google_places' },
    },
    select: {
      id: true,
      name: true,
      website: true,
      photos: true,
      metadata: true,
      adminOverrides: true,
    },
    orderBy: { rating: 'desc' },
    take: LIMIT,
  })
  const eligible = rows.filter((row) => {
    try {
      const overrides = row.adminOverrides ? JSON.parse(row.adminOverrides) : {}
      return !overrides.photos
    } catch {
      return true
    }
  })

  const discovered: ContentCandidate[] = []
  for (let index = 0; index < eligible.length; index += CONCURRENCY) {
    const batch = await Promise.all(
      eligible.slice(index, index + CONCURRENCY).map(discoverContentPhoto)
    )
    discovered.push(...batch.filter((item): item is ContentCandidate => !!item))
  }

  let demoted = 0
  if (COMMIT) {
    const discoveredIds = new Set(discovered.map((candidate) => candidate.id))
    for (const candidate of discovered) {
      const row = rows.find((item) => item.id === candidate.id)!
      let metadata: Record<string, unknown> = {}
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) : {}
      } catch {
        metadata = {}
      }
      const previous = readPhotoRights(metadata).map((record) =>
        record.origin === 'website' && record.url !== candidate.image
          ? { ...record, status: 'removed' as const }
          : record
      )
      const existing = previous.find((record) => record.url === candidate.image)
      const rights: PhotoRightsRecord[] = existing
        ? previous.map((record) =>
            record.url === candidate.image
              ? { ...record, status: 'active' as const }
              : record
          )
        : [
            ...previous,
            {
              url: candidate.image,
              origin: 'website',
              sourceUrl: candidate.website,
              rightsBasis: 'unknown',
              credit: 'Official restaurant website',
              obtainedAt: new Date().toISOString(),
              status: 'active',
            },
          ]

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
                method: 'semantic_content',
                width: candidate.width,
                height: candidate.height,
                score: candidate.score,
                source: candidate.source,
              },
            },
            rights
          ),
        },
      })
    }

    for (const row of eligible) {
      if (discoveredIds.has(row.id)) continue
      let metadata: Record<string, any>
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) : {}
      } catch {
        continue
      }
      if (metadata.officialPhotoDiscovery?.method !== 'semantic_content') {
        continue
      }
      metadata.officialPhotoDiscovery = {
        ...metadata.officialPhotoDiscovery,
        method: 'rejected_content',
        rejectedAt: new Date().toISOString(),
      }
      await prisma.restaurant.update({
        where: { id: row.id },
        data: {
          metadata: writePhotoRights(metadata, readPhotoRights(metadata)),
        },
      })
      demoted += 1
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: COMMIT ? 'commit' : 'dry-run',
        checked: eligible.length,
        discovered: discovered.length,
        demoted,
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
