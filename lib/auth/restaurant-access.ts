import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, type AuthUser } from '@/lib/auth'

// Platform staff may manage any listing, matching the checks in /api/admin/*
const STAFF_ROLES = ['ADMIN', 'EDITOR']

export type RestaurantAccessResult =
  | { authorized: true; user: AuthUser; isStaff: boolean }
  | { authorized: false; response: NextResponse }

/**
 * Authorizes the current session to manage a restaurant listing.
 *
 * Returns 401 when there is no session, 403 when the session belongs to
 * someone other than a verified owner (see the RestaurantOwner rows created by
 * /api/claims) or platform staff.
 */
export async function authorizeRestaurantAccess(
  restaurantId: string
): Promise<RestaurantAccessResult> {
  const user = await getCurrentUser()

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (STAFF_ROLES.includes(user.role)) {
    return { authorized: true, user, isStaff: true }
  }

  const ownership = await prisma.restaurantOwner.findUnique({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId
      }
    },
    select: { verified: true }
  })

  if (!ownership || !ownership.verified) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden - you do not manage this restaurant' },
        { status: 403 }
      )
    }
  }

  return { authorized: true, user, isStaff: false }
}
