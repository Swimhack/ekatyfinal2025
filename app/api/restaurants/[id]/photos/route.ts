import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadRestaurantPhoto } from '@/lib/services/photo-upload-service'
import {
  canManageRestaurantPhotos,
  OWNER_ATTESTATION,
} from '@/lib/photos/authorization'
import {
  parsePhotos,
  serializePhotos,
} from '@/lib/photos/parse-photos'
import {
  filterDisplayPhotos,
  readPhotoRights,
  writePhotoRights,
  type PhotoRightsRecord,
} from '@/lib/photos/photo-policy'

export const runtime = 'nodejs'

/**
 * GET — list photo submissions for a restaurant (owner/admin).
 * POST — submit a rights-attested photo (pending until admin approval unless
 *        an admin opts into immediate publish).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true, photos: true, metadata: true },
    })
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const access = await canManageRestaurantPhotos(user, restaurant.id)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const submissions = await prisma.restaurantPhotoSubmission.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json({
      restaurantId: restaurant.id,
      livePhotos: filterDisplayPhotos(parsePhotos(restaurant.photos)),
      photoRights: readPhotoRights(restaurant.metadata),
      submissions,
    })
  } catch (error) {
    console.error('GET restaurant photos failed:', error)
    return NextResponse.json({ error: 'Failed to load photos' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true, photos: true, metadata: true },
    })
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const access = await canManageRestaurantPhotos(user, restaurant.id)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const form = await request.formData()
    const file = form.get('file')
    const credit = String(form.get('credit') || '').trim() || null
    const license = String(form.get('license') || '').trim() || null
    const sourceUrl = String(form.get('sourceUrl') || '').trim() || null
    const attested = String(form.get('attested') || '') === 'true'
    const publishNow =
      access.asAdmin && String(form.get('publishNow') || '') === 'true'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    if (!attested) {
      return NextResponse.json(
        {
          error:
            'You must attest that you own or are authorized to license this photo',
        },
        { status: 400 }
      )
    }

    const upload = await uploadRestaurantPhoto(file, restaurant.id, 'photo')
    if (!upload.success || !upload.url) {
      return NextResponse.json(
        { error: upload.error || 'Upload failed' },
        { status: 400 }
      )
    }

    const rightsBasis = access.asAdmin ? 'admin_license' : 'owner_attestation'
    const status = publishNow ? 'approved' : 'pending'
    const now = new Date()

    const submission = await prisma.restaurantPhotoSubmission.create({
      data: {
        restaurantId: restaurant.id,
        submittedById: user.id,
        url: upload.url,
        status,
        rightsBasis,
        attestationText: OWNER_ATTESTATION,
        credit,
        license,
        sourceUrl,
        reviewedBy: publishNow ? user.id : null,
        reviewedAt: publishNow ? now : null,
      },
    })

    if (publishNow) {
      const existing = parsePhotos(restaurant.photos)
      const nextPhotos = serializePhotos([...existing, upload.url])
      const rights: PhotoRightsRecord[] = [
        ...readPhotoRights(restaurant.metadata),
        {
          url: upload.url,
          origin: 'admin_upload',
          sourceUrl: sourceUrl || undefined,
          rightsBasis: 'admin_license',
          credit: credit || undefined,
          license: license || undefined,
          obtainedAt: now.toISOString(),
          verifiedAt: now.toISOString(),
          status: 'active',
          submittedBy: user.id,
        },
      ]

      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          photos: nextPhotos,
          metadata: writePhotoRights(restaurant.metadata, rights),
        },
      })
    }

    return NextResponse.json(
      {
        submission,
        published: publishNow,
        message: publishNow
          ? 'Photo uploaded and published to the listing'
          : 'Photo submitted for review. It will appear after admin approval.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST restaurant photos failed:', error)
    return NextResponse.json({ error: 'Failed to submit photo' }, { status: 500 })
  }
}
