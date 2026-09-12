import 'server-only'

import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { uploadToR2, isR2Configured } from '@/lib/r2-storage'

export interface PhotoUploadResult {
  success: boolean
  url?: string
  error?: string
}

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const MAX_BYTES = 5 * 1024 * 1024

function validateUploadFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'File must be JPEG, PNG, WebP, or GIF'
  }
  if (file.size > MAX_BYTES) {
    return 'File size must be less than 5MB'
  }
  return null
}

export async function uploadRestaurantPhoto(
  file: File,
  restaurantId: string,
  kind: 'photo' | 'hero' | 'logo' = 'photo'
): Promise<PhotoUploadResult> {
  const validationError = validateUploadFile(file)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const extension = (file.name.split('.').pop() || 'jpg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  const filename =
    `restaurants/${restaurantId}/${kind}-${Date.now()}-` +
    `${randomBytes(4).toString('hex')}.${extension}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  if (isR2Configured()) {
    try {
      const url = await uploadToR2(buffer, filename, file.type)
      return { success: true, url }
    } catch (error) {
      console.error('R2 upload failed; using controlled local storage:', error)
    }
  }

  try {
    const localName = filename.split('/').pop()!
    const uploadsDir = join(
      process.cwd(),
      'public',
      'uploads',
      'restaurants',
      restaurantId
    )
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(join(uploadsDir, localName), buffer)

    // PM2 runs .next/standalone/server.js with the app root as cwd. Mirror the
    // persistent file into standalone/public so the upload is immediately
    // served; the next deployment copies app/public back into standalone.
    const standaloneRoot = join(process.cwd(), '.next', 'standalone')
    if (existsSync(standaloneRoot)) {
      const standaloneDir = join(
        standaloneRoot,
        'public',
        'uploads',
        'restaurants',
        restaurantId
      )
      await mkdir(standaloneDir, { recursive: true })
      await writeFile(join(standaloneDir, localName), buffer)
    }

    return {
      success: true,
      url: `/uploads/restaurants/${restaurantId}/${localName}`,
    }
  } catch (error) {
    console.error('Controlled local photo upload failed:', error)
    return { success: false, error: 'Failed to store uploaded image' }
  }
}
