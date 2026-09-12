import { mkdir, writeFile, readFile } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import path from 'path'
import { uploadToR2, isR2Configured } from './r2-storage'

export const PUBLIC_UPLOAD_PREFIX = '/uploads'

export type UploadStorage = 'r2' | 'local'

export interface SaveUploadResult {
  url: string
  key: string
  storage: UploadStorage
  writtenPaths: string[]
}

/**
 * Raster formats only. SVG is deliberately absent: uploads are served from the
 * site's own origin, and an SVG served as image/svg+xml executes its embedded
 * script there, which would let anyone who can upload an image run script as
 * ekaty.com (stored XSS). Every raster type here is inert when rendered.
 */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
}

export const ALLOWED_UPLOAD_CONTENT_TYPES = Object.keys(EXTENSION_BY_CONTENT_TYPE)

const SAFE_INLINE_CONTENT_TYPES = new Set(Object.values(CONTENT_TYPE_BY_EXTENSION))

export class UploadStorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'UploadStorageError'
    // Keeps `instanceof` working when this file is downlevelled to ES5.
    Object.setPrototypeOf(this, UploadStorageError.prototype)
  }
}

/**
 * Directories that together make an upload publicly reachable.
 *
 * `output: 'standalone'` builds serve static assets out of
 * `.next/standalone/public`, so a file written only to `public/uploads` 404s on
 * the deployed site. Writing to every root that exists keeps the file reachable
 * no matter which tree the running server was started from.
 */
export function getUploadRoots(cwd: string = process.cwd()): string[] {
  const roots: string[] = []
  const add = (dir: string | null | undefined) => {
    if (dir && !roots.includes(dir)) roots.push(dir)
  }

  if (process.env.UPLOADS_DIR) {
    add(path.resolve(process.env.UPLOADS_DIR))
  }

  add(path.join(cwd, 'public', 'uploads'))

  if (existsSync(path.join(cwd, '.next', 'standalone'))) {
    add(path.join(cwd, '.next', 'standalone', 'public', 'uploads'))
  }

  const standaloneSuffix = path.join('.next', 'standalone')
  if (cwd.endsWith(standaloneSuffix)) {
    add(path.join(cwd, '..', '..', 'public', 'uploads'))
  }

  return roots.map((dir) => path.normalize(dir))
}

/** Rejects traversal and normalises to `folder/name.ext`. */
export function sanitizeUploadKey(key: string): string {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '')
  const segments = normalized.split('/').filter(Boolean)

  if (segments.length === 0) {
    throw new UploadStorageError('Upload key is empty')
  }

  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !/^[A-Za-z0-9._-]+$/.test(segment)) {
      throw new UploadStorageError(`Invalid upload key: ${key}`)
    }
  }

  return segments.join('/')
}

/**
 * The stored extension comes from the validated content type, never from the
 * uploaded filename. Trusting the filename let `xss.html` (declared as a JPEG)
 * be stored as `.html` and then served as active content from this origin.
 */
export function extensionForContentType(contentType: string): string {
  const normalized = (contentType || '').toLowerCase().split(';')[0].trim()
  const extension = EXTENSION_BY_CONTENT_TYPE[normalized]

  if (!extension) {
    throw new UploadStorageError(`Unsupported image type${normalized ? ` (${normalized})` : ''}`)
  }

  return extension
}

export function contentTypeForKey(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPE_BY_EXTENSION[extension] || 'application/octet-stream'
}

/** True only for types a browser renders without being able to run script. */
export function isSafeInlineContentType(contentType: string): boolean {
  return SAFE_INLINE_CONTENT_TYPES.has(contentType.toLowerCase().split(';')[0].trim())
}

const FRIENDLY_TYPE_LIST = 'JPEG, PNG, WebP, GIF or AVIF'

/**
 * Gate for incoming uploads. Accepts only inert raster images, checking the
 * declared type and the filename, so neither a mislabelled SVG nor a file named
 * `xss.html` can get through.
 */
export function assertUploadableImage(contentType: string, originalName?: string): void {
  const normalized = (contentType || '').toLowerCase().split(';')[0].trim()
  const name = (originalName || '').toLowerCase()
  const extension = name.includes('.') ? name.split('.').pop() ?? '' : ''

  if (normalized === 'image/svg+xml' || normalized === 'image/svg' || extension === 'svg' || extension === 'svgz') {
    throw new UploadStorageError(
      `SVG images are not accepted because they can carry scripts. Please upload a ${FRIENDLY_TYPE_LIST} image.`
    )
  }

  if (!EXTENSION_BY_CONTENT_TYPE[normalized]) {
    throw new UploadStorageError(
      `Unsupported image type${normalized ? ` (${normalized})` : ''}. Please upload a ${FRIENDLY_TYPE_LIST} image.`
    )
  }

  // A raster content type with a non-raster extension is either a mistake or an
  // attempt to have the file served as something executable.
  if (extension && !CONTENT_TYPE_BY_EXTENSION[extension]) {
    throw new UploadStorageError(
      `Unsupported image file name (.${extension}). Please upload a ${FRIENDLY_TYPE_LIST} image.`
    )
  }
}

/** Rejects any storage key that would not be served as an inert raster image. */
export function assertSafeUploadKey(key: string): void {
  const extension = key.includes('.') ? key.split('.').pop()?.toLowerCase() ?? '' : ''

  if (!CONTENT_TYPE_BY_EXTENSION[extension]) {
    throw new UploadStorageError(
      `Refusing to store upload with extension "${extension || '(none)'}" — only ${FRIENDLY_TYPE_LIST} files are stored.`
    )
  }
}

export function buildUploadKey(options: {
  folder: string
  prefix: string
  contentType: string
}): string {
  const { folder, prefix, contentType } = options
  const safePrefix = prefix.replace(/[^A-Za-z0-9_-]/g, '') || 'file'
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).slice(2, 8)
  const extension = extensionForContentType(contentType)

  return sanitizeUploadKey(`${folder}/${safePrefix}-${timestamp}-${randomString}.${extension}`)
}

/**
 * Persists an upload, preferring R2 and falling back to local disk (including
 * in production, where the app runs from a writable checkout).
 */
export async function saveUpload(options: {
  buffer: Buffer
  key: string
  contentType: string
}): Promise<SaveUploadResult> {
  const key = sanitizeUploadKey(options.key)
  // Last line of defence: nothing executable is ever written to a public tree,
  // whatever a caller validated (or forgot to validate) upstream.
  assertUploadableImage(options.contentType, key)
  assertSafeUploadKey(key)

  if (isR2Configured()) {
    try {
      const url = await uploadToR2(options.buffer, key, options.contentType)
      return { url, key, storage: 'r2', writtenPaths: [] }
    } catch (error) {
      console.error('R2 upload failed, falling back to local disk:', error)
    }
  }

  const roots = getUploadRoots()
  const writtenPaths: string[] = []
  const failures: string[] = []

  for (const root of roots) {
    const destination = path.join(root, key)
    try {
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, options.buffer)
      writtenPaths.push(destination)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      failures.push(`${destination}: ${reason}`)
    }
  }

  if (writtenPaths.length === 0) {
    throw new UploadStorageError(
      `Could not write upload to disk. Tried: ${failures.join('; ') || roots.join('; ')}`
    )
  }

  if (failures.length > 0) {
    console.warn('Upload saved but some mirror locations failed:', failures.join('; '))
  }

  return { url: `${PUBLIC_UPLOAD_PREFIX}/${key}`, key, storage: 'local', writtenPaths }
}

export interface LocalUpload {
  buffer: Buffer
  contentType: string
  path: string
}

/** Reads a previously saved local upload from the first root that has it. */
export async function readLocalUpload(key: string): Promise<LocalUpload | null> {
  const safeKey = sanitizeUploadKey(key)

  for (const root of getUploadRoots()) {
    const candidate = path.join(root, safeKey)
    try {
      if (!existsSync(candidate) || !statSync(candidate).isFile()) continue
      return {
        buffer: await readFile(candidate),
        contentType: contentTypeForKey(safeKey),
        path: candidate,
      }
    } catch (error) {
      console.warn('Failed to read upload candidate', candidate, error)
    }
  }

  return null
}
