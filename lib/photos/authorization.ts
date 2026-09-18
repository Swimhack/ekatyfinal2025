import { prisma } from '@/lib/prisma'
import type { AuthUser } from '@/lib/auth'
import { OWNER_ATTESTATION } from './attestation'

export { OWNER_ATTESTATION }

export async function canManageRestaurantPhotos(
  user: AuthUser,
  restaurantId: string
): Promise<{ allowed: boolean; asAdmin: boolean; asOwner: boolean }> {
  if (user.role === 'ADMIN' || user.role === 'EDITOR') {
    return { allowed: true, asAdmin: true, asOwner: false }
  }

  const ownership = await prisma.restaurantOwner.findFirst({
    where: {
      userId: user.id,
      restaurantId,
      verified: true,
    },
  })

  if (ownership) {
    return { allowed: true, asAdmin: false, asOwner: true }
  }

  return { allowed: false, asAdmin: false, asOwner: false }
}
