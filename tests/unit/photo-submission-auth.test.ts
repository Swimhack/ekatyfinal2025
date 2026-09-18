/**
 * Authorization rules for owner/admin photo submissions.
 * Mocks Prisma ownership lookups.
 */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    restaurantOwner: {
      findFirst: jest.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { canManageRestaurantPhotos } from '../../lib/photos/authorization'

const findFirst = prisma.restaurantOwner.findFirst as jest.Mock

describe('canManageRestaurantPhotos', () => {
  beforeEach(() => {
    findFirst.mockReset()
  })

  it('allows admins without ownership row', async () => {
    const result = await canManageRestaurantPhotos(
      { id: 'u1', email: 'a@e.com', name: 'A', role: 'ADMIN' },
      'rest-1'
    )
    expect(result).toEqual({ allowed: true, asAdmin: true, asOwner: false })
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('allows verified owners', async () => {
    findFirst.mockResolvedValue({ id: 'own-1' })
    const result = await canManageRestaurantPhotos(
      { id: 'u2', email: 'o@e.com', name: 'O', role: 'USER' },
      'rest-1'
    )
    expect(result).toEqual({ allowed: true, asAdmin: false, asOwner: true })
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: 'u2', restaurantId: 'rest-1', verified: true },
    })
  })

  it('denies unverified users', async () => {
    findFirst.mockResolvedValue(null)
    const result = await canManageRestaurantPhotos(
      { id: 'u3', email: 'x@e.com', name: null, role: 'USER' },
      'rest-1'
    )
    expect(result.allowed).toBe(false)
  })
})
