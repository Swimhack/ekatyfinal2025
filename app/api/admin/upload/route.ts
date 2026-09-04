import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  assertUploadableImage,
  buildUploadKey,
  saveUpload,
  UploadStorageError,
} from '@/lib/upload-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      console.error('Upload API - could not read form data:', error)
      return NextResponse.json(
        { error: 'Could not read the uploaded file. It may be too large or the upload was interrupted.' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'image' // 'logo', 'hero', or 'photo'

    console.log('Upload API - Received file:', file?.name, 'type:', type, 'size:', file?.size)

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Uploads are served from this origin, so SVG (which can run script) and
    // other non-raster types are refused outright.
    try {
      assertUploadableImage(file.type, file.name)
    } catch (typeError) {
      const message = typeError instanceof Error ? typeError.message : 'Unsupported image type'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = buildUploadKey({
      folder: 'restaurants',
      prefix: type,
      originalName: file.name,
      contentType: file.type,
    })

    const result = await saveUpload({ buffer, key, contentType: file.type })
    console.log(`File uploaded (${result.storage}):`, result.url)

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.key,
      storage: result.storage,
    })
  } catch (error) {
    console.error('Upload error:', error)

    if (error instanceof UploadStorageError) {
      return NextResponse.json(
        { error: `Upload storage unavailable: ${error.message}` },
        { status: 500 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
