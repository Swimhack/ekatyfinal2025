import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadToR2, isR2Configured } from '@/lib/r2-storage'
import { upsertPhotoRights } from '@/lib/photos/photo-rights'
import { OWNER_ATTESTATION } from '@/lib/photos/attestation'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024

async function assertCanSubmit(userId: string, role: string, restaurantId: string) {
  if (role === 'ADMIN' || role === 'EDITOR') return true
  const ownership = await prisma.restaurantOwner.findFirst({
    where: { userId, restaurantId, verified: true },
  })
  return !!ownership
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const restaurantId = request.nextUrl.searchParams.get('restaurantId')
  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })
  }

  const allowed = await assertCanSubmit(user.id, user.role, restaurantId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const submissions = await prisma.restaurantPhotoSubmission.findMany({
    where: { restaurantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ submissions })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const restaurantId = String(formData.get('restaurantId') || '')
    const rightsBasis = String(formData.get('rightsBasis') || 'owner_owned')
    const attestation = String(formData.get('attestation') || '') === 'true'
    const credit = formData.get('credit') ? String(formData.get('credit')) : null
    const license = formData.get('license') ? String(formData.get('license')) : null
    const sourceUrl = formData.get('sourceUrl') ? String(formData.get('sourceUrl')) : null
    const autoApprove = String(formData.get('autoApprove') || '') === 'true'

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })
    }
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!attestation) {
      return NextResponse.json(
        { error: 'You must attest that you own or are licensed to display this photo' },
        { status: 400 }
      )
    }
    if (!['owner_owned', 'licensed_to_display', 'admin_verified'].includes(rightsBasis)) {
      return NextResponse.json({ error: 'Invalid rightsBasis' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'File must be JPEG, PNG, WebP, or GIF' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const allowed = await assertCanSubmit(user.id, user.role, restaurantId)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const filename = `restaurants/${restaurantId}/${timestamp}-${randomString}.${extension}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let url: string
    if (isR2Configured()) {
      url = await uploadToR2(buffer, filename, file.type)
    } else {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'restaurants', restaurantId)
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }
      const localName = `${timestamp}-${randomString}.${extension}`
      await writeFile(join(uploadsDir, localName), buffer)
      url = `/uploads/restaurants/${restaurantId}/${localName}`
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'EDITOR'
    const shouldApprove = isAdmin && autoApprove
    const status = shouldApprove ? 'approved' : 'pending'

    const submission = await prisma.restaurantPhotoSubmission.create({
      data: {
        restaurantId,
        submittedById: user.id,
        url,
        status,
        rightsBasis,
        attestationText: OWNER_ATTESTATION,
        credit,
        license,
        sourceUrl,
        reviewedBy: shouldApprove ? user.id : null,
        reviewedAt: shouldApprove ? new Date() : null,
      },
    })

    if (shouldApprove) {
      const existingPhotos = restaurant.photos
        ? restaurant.photos.split(',').map((p) => p.trim()).filter(Boolean)
        : []
      const photos = [url, ...existingPhotos.filter((p) => p !== url)].join(',')
      const metadata = upsertPhotoRights(restaurant.metadata, {
        url,
        origin: 'owner_upload',
        sourceUrl,
        rightsBasis: rightsBasis as any,
        credit,
        license,
        obtainedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        status: 'approved',
        submittedById: user.id,
      })
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { photos, metadata },
      })
    }

    return NextResponse.json({ success: true, submission, url, status })
  } catch (error) {
    console.error('Owner photo upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
