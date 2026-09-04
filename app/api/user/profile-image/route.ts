import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { buildUploadKey, saveUpload, UploadStorageError } from '@/lib/upload-storage'

const prisma = new PrismaClient()

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 2 * 1024 * 1024

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
      console.error('Profile image upload - could not read form data:', error)
      return NextResponse.json(
        { error: 'Could not read the uploaded file. It may be too large or the upload was interrupted.' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File | null

    console.log('Profile image upload - User:', user.email, 'File:', file?.name, 'Size:', file?.size)

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 2MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = buildUploadKey({
      folder: 'profiles',
      prefix: user.id,
      originalName: file.name,
      contentType: file.type,
    })

    const result = await saveUpload({ buffer, key, contentType: file.type })
    console.log(`Profile image uploaded (${result.storage}):`, result.url)

    await prisma.user.update({
      where: { id: user.id },
      data: { profileImageUrl: result.url },
    })

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.key,
      storage: result.storage,
    })
  } catch (error) {
    console.error('Profile image upload error:', error)

    if (error instanceof UploadStorageError) {
      return NextResponse.json(
        { error: `Upload storage unavailable: ${error.message}` },
        { status: 500 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile image'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE endpoint to remove profile image
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove profile image URL from database
    await prisma.user.update({
      where: { id: user.id },
      data: { profileImageUrl: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile image delete error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove profile image'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
