import { mkdtempSync, mkdirSync, existsSync, readFileSync, realpathSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  assertSafeUploadKey,
  assertUploadableImage,
  buildUploadKey,
  contentTypeForKey,
  extensionForContentType,
  getUploadRoots,
  isSafeInlineContentType,
  readLocalUpload,
  sanitizeUploadKey,
  saveUpload,
  UploadStorageError,
} from '../../lib/upload-storage'

const R2_ENV_KEYS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'UPLOADS_DIR']

describe('upload-storage', () => {
  const originalEnv: Record<string, string | undefined> = {}
  const originalCwd = process.cwd()
  let workDir: string

  beforeEach(() => {
    for (const key of R2_ENV_KEYS) {
      originalEnv[key] = process.env[key]
      delete process.env[key]
    }
    // realpath keeps assertions stable where /tmp is a symlink (e.g. macOS).
    workDir = realpathSync(mkdtempSync(path.join(tmpdir(), 'ekaty-uploads-')))
    process.chdir(workDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(workDir, { recursive: true, force: true })
    for (const key of R2_ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key]
      else process.env[key] = originalEnv[key]
    }
  })

  describe('sanitizeUploadKey', () => {
    it('normalises separators and strips leading slashes', () => {
      expect(sanitizeUploadKey('/restaurants/hero-1.jpg')).toBe('restaurants/hero-1.jpg')
      expect(sanitizeUploadKey('restaurants\\hero-1.jpg')).toBe('restaurants/hero-1.jpg')
    })

    it('rejects traversal and unexpected characters', () => {
      expect(() => sanitizeUploadKey('../../etc/passwd')).toThrow(UploadStorageError)
      expect(() => sanitizeUploadKey('restaurants/he ro.jpg')).toThrow(UploadStorageError)
      expect(() => sanitizeUploadKey('')).toThrow(UploadStorageError)
    })
  })

  describe('extensionForContentType', () => {
    it('derives the extension from the validated content type', () => {
      expect(extensionForContentType('image/jpeg')).toBe('jpg')
      expect(extensionForContentType('image/PNG')).toBe('png')
      expect(extensionForContentType('image/webp; charset=binary')).toBe('webp')
    })

    it('refuses types that are not inert raster images', () => {
      expect(() => extensionForContentType('image/svg+xml')).toThrow(UploadStorageError)
      expect(() => extensionForContentType('text/html')).toThrow(UploadStorageError)
      expect(() => extensionForContentType('')).toThrow(UploadStorageError)
    })
  })

  it('builds keys inside the requested folder', () => {
    const key = buildUploadKey({
      folder: 'restaurants',
      prefix: 'hero',
      contentType: 'image/jpeg',
    })

    expect(key).toMatch(/^restaurants\/hero-\d+-[a-z0-9]+\.jpg$/)
  })

  it('never derives a stored extension from the uploaded filename', () => {
    // A JPEG-typed "xss.html" must not be stored as .html and served as active content
    const key = buildUploadKey({ folder: 'restaurants', prefix: 'hero', contentType: 'image/jpeg' })

    expect(key.endsWith('.jpg')).toBe(true)
    expect(key).not.toMatch(/\.(html?|js|svg)$/)
  })

  it('maps keys back to content types', () => {
    expect(contentTypeForKey('restaurants/hero-1.jpg')).toBe('image/jpeg')
    expect(contentTypeForKey('restaurants/hero-1.unknown')).toBe('application/octet-stream')
  })

  describe('active content is never accepted or served', () => {
    it('never resolves an SVG key to image/svg+xml', () => {
      expect(contentTypeForKey('restaurants/hero-1.svg')).toBe('application/octet-stream')
      expect(ALLOWED_UPLOAD_CONTENT_TYPES).not.toContain('image/svg+xml')
    })

    it('marks only inert raster types as safe to render inline', () => {
      expect(isSafeInlineContentType('image/jpeg')).toBe(true)
      expect(isSafeInlineContentType('image/PNG')).toBe(true)
      expect(isSafeInlineContentType('image/svg+xml')).toBe(false)
      expect(isSafeInlineContentType('text/html')).toBe(false)
      expect(isSafeInlineContentType('application/octet-stream')).toBe(false)
    })

    it('rejects SVG uploads by content type and by filename', () => {
      expect(() => assertUploadableImage('image/svg+xml', 'logo.svg')).toThrow(/SVG images are not accepted/i)
      // An SVG that lies about its content type is still refused
      expect(() => assertUploadableImage('image/png', 'payload.svg')).toThrow(/SVG images are not accepted/i)
      expect(() => assertUploadableImage('image/svg', 'payload.png')).toThrow(/SVG images are not accepted/i)
      expect(() => assertUploadableImage('image/svg+xml', 'payload.svgz')).toThrow(UploadStorageError)
    })

    it('rejects other non-raster types and accepts the raster ones', () => {
      expect(() => assertUploadableImage('text/html', 'page.html')).toThrow(/Unsupported image type/i)
      expect(() => assertUploadableImage('', 'mystery')).toThrow(/Unsupported image type/i)

      for (const contentType of ALLOWED_UPLOAD_CONTENT_TYPES) {
        expect(() => assertUploadableImage(contentType, 'photo.jpg')).not.toThrow()
      }
    })

    it('rejects raster-typed uploads whose filename is executable', () => {
      expect(() => assertUploadableImage('image/jpeg', 'xss.html')).toThrow(/Unsupported image file name/i)
      expect(() => assertUploadableImage('image/jpeg', 'xss.js')).toThrow(/Unsupported image file name/i)
      expect(() => assertUploadableImage('image/png', 'sneaky.PHTML')).toThrow(/Unsupported image file name/i)
      // Extensionless names are fine: the stored extension comes from the type
      expect(() => assertUploadableImage('image/png', 'screenshot')).not.toThrow()
    })

    it('refuses to store a key whose extension is not an inert raster type', () => {
      expect(() => assertSafeUploadKey('restaurants/hero-1.jpg')).not.toThrow()
      expect(() => assertSafeUploadKey('restaurants/hero-1.html')).toThrow(/Refusing to store/i)
      expect(() => assertSafeUploadKey('restaurants/hero-1.js')).toThrow(/Refusing to store/i)
      expect(() => assertSafeUploadKey('restaurants/hero-1')).toThrow(/Refusing to store/i)
    })

    it('refuses to write an executable key even with a raster content type', async () => {
      await expect(
        saveUpload({
          buffer: Buffer.from('<script>alert(1)</script>'),
          key: 'restaurants/xss.html',
          contentType: 'image/jpeg',
        })
      ).rejects.toThrow(UploadStorageError)

      expect(existsSync(path.join(workDir, 'public', 'uploads', 'restaurants', 'xss.html'))).toBe(false)
    })

    it('refuses to write an SVG even if a route forgets to validate', async () => {
      await expect(
        saveUpload({
          buffer: Buffer.from('<svg onload="alert(1)"></svg>'),
          key: 'restaurants/hero-evil.svg',
          contentType: 'image/svg+xml',
        })
      ).rejects.toThrow(UploadStorageError)

      expect(existsSync(path.join(workDir, 'public', 'uploads', 'restaurants', 'hero-evil.svg'))).toBe(
        false
      )
    })
  })

  describe('getUploadRoots', () => {
    it('defaults to public/uploads', () => {
      expect(getUploadRoots(workDir)).toEqual([path.join(workDir, 'public', 'uploads')])
    })

    it('includes the standalone public tree when it exists', () => {
      mkdirSync(path.join(workDir, '.next', 'standalone'), { recursive: true })

      expect(getUploadRoots(workDir)).toEqual([
        path.join(workDir, 'public', 'uploads'),
        path.join(workDir, '.next', 'standalone', 'public', 'uploads'),
      ])
    })

    it('mirrors back to the repo copy when running from inside standalone', () => {
      const standaloneCwd = path.join(workDir, '.next', 'standalone')
      mkdirSync(standaloneCwd, { recursive: true })

      expect(getUploadRoots(standaloneCwd)).toContain(path.join(workDir, 'public', 'uploads'))
    })

    it('honours UPLOADS_DIR first', () => {
      process.env.UPLOADS_DIR = path.join(workDir, 'persistent')

      expect(getUploadRoots(workDir)[0]).toBe(path.join(workDir, 'persistent'))
    })
  })

  describe('saveUpload without R2 configured', () => {
    it('writes to local disk and returns a public URL', async () => {
      const result = await saveUpload({
        buffer: Buffer.from('fake-jpeg'),
        key: 'restaurants/hero-123-abc.jpg',
        contentType: 'image/jpeg',
      })

      expect(result.storage).toBe('local')
      expect(result.url).toBe('/uploads/restaurants/hero-123-abc.jpg')

      const written = path.join(workDir, 'public', 'uploads', 'restaurants', 'hero-123-abc.jpg')
      expect(existsSync(written)).toBe(true)
      expect(readFileSync(written, 'utf8')).toBe('fake-jpeg')
    })

    it('also writes into the standalone public tree when present', async () => {
      mkdirSync(path.join(workDir, '.next', 'standalone'), { recursive: true })

      const result = await saveUpload({
        buffer: Buffer.from('fake-png'),
        key: 'restaurants/hero-9.png',
        contentType: 'image/png',
      })

      expect(result.writtenPaths).toHaveLength(2)
      expect(
        existsSync(
          path.join(workDir, '.next', 'standalone', 'public', 'uploads', 'restaurants', 'hero-9.png')
        )
      ).toBe(true)
    })

    it('rejects traversal keys', async () => {
      await expect(
        saveUpload({ buffer: Buffer.from('x'), key: '../escape.jpg', contentType: 'image/jpeg' })
      ).rejects.toThrow(UploadStorageError)
    })
  })

  describe('readLocalUpload', () => {
    it('reads back a saved upload', async () => {
      await saveUpload({
        buffer: Buffer.from('bytes'),
        key: 'profiles/user-1.png',
        contentType: 'image/png',
      })

      const found = await readLocalUpload('profiles/user-1.png')
      expect(found?.contentType).toBe('image/png')
      expect(found?.buffer.toString('utf8')).toBe('bytes')
    })

    it('returns null for a missing file', async () => {
      expect(await readLocalUpload('profiles/nope.png')).toBeNull()
    })
  })
})
