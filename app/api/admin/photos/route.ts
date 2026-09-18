import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parsePhotos, serializePhotos } from '@/lib/photos/parse-photos'
import {
  readPhotoRights,
  writePhotoRights,
  type PhotoRightsRecord,
} from '@/lib/photos/photo-policy'

/**
 * GET — list photo submissions awaiting review (admin).
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const status = request.nextUrl.searchParams.get('status') || 'pending'
    const where =
      status === 'all' ? {} : { status }

    const submissions = await prisma.restaurantPhotoSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        restaurant: {
          select: { id: true, name: true, slug: true },
        },
        submittedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Admin photos GET failed:', error)
    return NextResponse.json(
      { error: 'Failed to load photo submissions' },
      { status: 500 }
    )
  }
}

/**
 * PATCH — approve or reject a photo submission.
 * Body: { id, status: 'approved' | 'rejected', adminNotes? }
 */
export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const id = String(body.id || '')
    const status = String(body.status || '')
    const adminNotes = body.adminNotes ? String(body.adminNotes) : null

    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'id and status (approved|rejected) are required' },
        { status: 400 }
      )
    }

    const submission = await prisma.restaurantPhotoSubmission.findUnique({
      where: { id },
    })
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: `Submission is already ${submission.status}` },
        { status: 409 }
      )
    }

    const now = new Date()
    const updated = await prisma.restaurantPhotoSubmission.update({
      where: { id },
      data: {
        status,
        adminNotes,
        reviewedBy: user.id,
        reviewedAt: now,
      },
    })

    if (status === 'approved') {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: submission.restaurantId },
        select: { photos: true, metadata: true },
      })
      if (restaurant) {
        const existing = parsePhotos(restaurant.photos)
        if (!existing.includes(submission.url)) {
          existing.push(submission.url)
        }
        const rights: PhotoRightsRecord[] = [
          ...readPhotoRights(restaurant.metadata).filter(
            (r) => r.url !== submission.url
          ),
          {
            url: submission.url,
            origin:
              submission.rightsBasis === 'admin_license'
                ? 'admin_upload'
                : 'owner_upload',
            sourceUrl: submission.sourceUrl || undefined,
            rightsBasis:
              (submission.rightsBasis as PhotoRightsRecord['rightsBasis']) ||
              'owner_attestation',
            credit: submission.credit || undefined,
            license: submission.license || undefined,
            obtainedAt: submission.createdAt.toISOString(),
            verifiedAt: now.toISOString(),
            status: 'active',
            submittedBy: submission.submittedById,
          },
        ]

        await prisma.restaurant.update({
          where: { id: submission.restaurantId },
          data: {
            photos: serializePhotos(existing),
            metadata: writePhotoRights(restaurant.metadata, rights),
          },
        })
      }
    }

    return NextResponse.json({ submission: updated })
  } catch (error) {
    console.error('Admin photos PATCH failed:', error)
    return NextResponse.json(
      { error: 'Failed to update photo submission' },
      { status: 500 }
    )
  }
}
