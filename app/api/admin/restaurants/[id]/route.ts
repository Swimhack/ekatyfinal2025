import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
  applyHeroImage,
  clearHeroImage,
  parseRestaurantMetadata,
  resolveExplicitHeroImage,
  resolveHeroImage,
  serializePhotos,
} from '@/lib/restaurant-images'

// GET - Fetch restaurant for editing
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // `heroImage` is the saved value the form edits; `displayImage` is what the
    // public pages currently show, so the admin can see the two agree.
    const heroImage = resolveExplicitHeroImage(restaurant.metadata)

    console.log('Restaurant metadata:', restaurant.metadata)
    console.log('Saved heroImage:', heroImage)

    return NextResponse.json({
      ...restaurant,
      heroImage,
      displayImage: resolveHeroImage(restaurant)
    })
  } catch (error) {
    console.error('Error fetching restaurant:', error)
    return NextResponse.json({ error: 'Failed to fetch restaurant' }, { status: 500 })
  }
}

// PATCH - Update restaurant
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      address,
      zipCode,
      phone,
      website,
      email,
      categories,
      cuisineTypes,
      priceLevel,
      featured,
      verified,
      active,
      logoUrl,
      heroImage,
      photos
    } = body

    // Hero images live in the metadata JSON blob, and every consumer of
    // photos[0] has to agree with them, so both are computed together.
    const currentRestaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
      select: { metadata: true, photos: true }
    })

    let metadata: Record<string, any> = parseRestaurantMetadata(currentRestaurant?.metadata)
    // Photos the request is saving, falling back to what is already stored.
    let photosValue: string | undefined = photos !== undefined ? serializePhotos(photos) : undefined

    if (heroImage !== undefined) {
      if (typeof heroImage === 'string' && heroImage.trim() !== '') {
        const applied = applyHeroImage({
          metadata,
          photos: photosValue !== undefined ? photosValue : currentRestaurant?.photos,
          heroImage
        })
        metadata = applied.metadata
        photosValue = applied.photosCsv
        console.log('Setting hero image everywhere (metadata + photos[0]):', heroImage)
      } else if (heroImage === '' || heroImage === null) {
        // Clear both hero keys and undo the photos[0] promotion, otherwise the
        // cleared image keeps winning through the photos[0] fallback.
        const cleared = clearHeroImage({
          metadata,
          photos: photosValue !== undefined ? photosValue : currentRestaurant?.photos
        })
        metadata = cleared.metadata
        photosValue = cleared.photosCsv
        console.log('Removing hero image from metadata and photos (empty value provided)')
      }
    }

    const metadataString = JSON.stringify(metadata)
    console.log('Saving metadata string:', metadataString)
    
    const restaurant = await prisma.restaurant.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(address !== undefined && { address }),
        ...(zipCode !== undefined && { zipCode }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
        ...(email !== undefined && { email }),
        ...(categories !== undefined && { categories }),
        ...(cuisineTypes !== undefined && { cuisineTypes }),
        ...(priceLevel !== undefined && { priceLevel }),
        ...(featured !== undefined && { featured }),
        ...(verified !== undefined && { verified }),
        ...(active !== undefined && { active }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(photosValue !== undefined && { photos: photosValue }),
        metadata: metadataString,
        updatedAt: new Date()
      }
    })

    console.log('Restaurant updated, metadata field:', restaurant.metadata)

    // Log the change
    await prisma.auditLog.create({
      data: {
        entity: 'Restaurant',
        entityId: params.id,
        action: 'UPDATE',
        userId: user.id,
        changes: JSON.stringify({ before: {}, after: body }),
        metadata: JSON.stringify({ userEmail: user.email })
      }
    })

    // Return with the saved hero image so the client can verify the write
    return NextResponse.json({
      success: true,
      restaurant: {
        ...restaurant,
        heroImage: resolveExplicitHeroImage(restaurant.metadata),
        displayImage: resolveHeroImage(restaurant)
      }
    })
  } catch (error) {
    console.error('Error updating restaurant:', error)
    return NextResponse.json({ error: 'Failed to update restaurant' }, { status: 500 })
  }
}
