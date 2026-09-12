/**
 * Regression tests for the restaurant-dashboard API auth gate.
 *
 * These routes were reachable anonymously, which let anyone rewrite a listing
 * with PATCH /api/restaurant-dashboard/[id].
 */
import { NextRequest } from 'next/server'

const getCurrentUser = jest.fn()

const prismaMock = {
  restaurantOwner: { findUnique: jest.fn() },
  restaurant: { findUnique: jest.fn(), update: jest.fn() },
  review: { findFirst: jest.fn(), update: jest.fn() },
  event: { create: jest.fn() }
}

jest.mock('@/lib/auth', () => ({
  getCurrentUser: () => getCurrentUser()
}))

jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock
}))

import { GET, PATCH } from '@/app/api/restaurant-dashboard/[id]/route'
import { POST as CREATE_EVENT } from '@/app/api/restaurant-dashboard/[id]/events/route'
import { POST as RESPOND_TO_REVIEW } from '@/app/api/restaurant-dashboard/[id]/reviews/[reviewId]/route'

const RESTAURANT_ID = 'restaurant-shipley-donuts'

const OWNER = { id: 'user-owner', email: 'owner@example.com', name: 'Owner', role: 'USER' }
const OTHER_USER = { id: 'user-other', email: 'other@example.com', name: 'Other', role: 'USER' }
const ADMIN = { id: 'user-admin', email: 'admin@ekaty.com', name: 'Admin', role: 'ADMIN' }

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/restaurant-dashboard/${RESTAURANT_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function postRequest(path: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  getCurrentUser.mockResolvedValue(null)
  prismaMock.restaurantOwner.findUnique.mockResolvedValue(null)
  prismaMock.restaurant.findUnique.mockResolvedValue({ id: RESTAURANT_ID })
  prismaMock.restaurant.update.mockResolvedValue({ id: RESTAURANT_ID, name: 'Shipley Donuts' })
  prismaMock.review.findFirst.mockResolvedValue({ id: 'review-1' })
  prismaMock.review.update.mockResolvedValue({ id: 'review-1' })
  prismaMock.event.create.mockResolvedValue({ id: 'event-1' })
})

describe('PATCH /api/restaurant-dashboard/[id]', () => {
  it('returns 401 and writes nothing without a session', async () => {
    const response = await PATCH(patchRequest({ description: 'hacked' }), {
      params: { id: RESTAURANT_ID }
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(prismaMock.restaurant.update).not.toHaveBeenCalled()
  })

  it('returns 403 and writes nothing for a signed-in non-owner', async () => {
    getCurrentUser.mockResolvedValue(OTHER_USER)

    const response = await PATCH(patchRequest({ description: 'hacked' }), {
      params: { id: RESTAURANT_ID }
    })

    expect(response.status).toBe(403)
    expect(prismaMock.restaurant.update).not.toHaveBeenCalled()
  })

  it('returns 403 when the ownership claim is not verified yet', async () => {
    getCurrentUser.mockResolvedValue(OWNER)
    prismaMock.restaurantOwner.findUnique.mockResolvedValue({ verified: false })

    const response = await PATCH(patchRequest({ description: 'pending claim' }), {
      params: { id: RESTAURANT_ID }
    })

    expect(response.status).toBe(403)
    expect(prismaMock.restaurant.update).not.toHaveBeenCalled()
  })

  it('updates the listing for a verified owner', async () => {
    getCurrentUser.mockResolvedValue(OWNER)
    prismaMock.restaurantOwner.findUnique.mockResolvedValue({ verified: true })

    const response = await PATCH(patchRequest({ description: 'Fresh donuts daily' }), {
      params: { id: RESTAURANT_ID }
    })

    expect(response.status).toBe(200)
    expect(prismaMock.restaurantOwner.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_restaurantId: { userId: OWNER.id, restaurantId: RESTAURANT_ID }
        }
      })
    )
    expect(prismaMock.restaurant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: RESTAURANT_ID },
        data: expect.objectContaining({ description: 'Fresh donuts daily' })
      })
    )
  })

  it('updates the listing for platform staff without an ownership row', async () => {
    getCurrentUser.mockResolvedValue(ADMIN)

    const response = await PATCH(patchRequest({ description: 'Admin edit' }), {
      params: { id: RESTAURANT_ID }
    })

    expect(response.status).toBe(200)
    expect(prismaMock.restaurantOwner.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.restaurant.update).toHaveBeenCalled()
  })

  it('returns 404 for a verified owner when the listing is gone', async () => {
    getCurrentUser.mockResolvedValue(OWNER)
    prismaMock.restaurantOwner.findUnique.mockResolvedValue({ verified: true })
    prismaMock.restaurant.findUnique.mockResolvedValue(null)

    const response = await PATCH(patchRequest({ description: 'nope' }), {
      params: { id: RESTAURANT_ID }
    })

    expect(response.status).toBe(404)
    expect(prismaMock.restaurant.update).not.toHaveBeenCalled()
  })
})

describe('GET /api/restaurant-dashboard/[id]', () => {
  it('returns 401 without a session', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/restaurant-dashboard/${RESTAURANT_ID}`
    )

    const response = await GET(request, { params: { id: RESTAURANT_ID } })

    expect(response.status).toBe(401)
    expect(prismaMock.restaurant.findUnique).not.toHaveBeenCalled()
  })

  it('does not expose reviewer email addresses to a verified owner', async () => {
    getCurrentUser.mockResolvedValue(OWNER)
    prismaMock.restaurantOwner.findUnique.mockResolvedValue({ verified: true })
    prismaMock.restaurant.findUnique.mockResolvedValue({
      id: RESTAURANT_ID,
      name: 'Shipley Donuts',
      reviews: [
        {
          id: 'review-1',
          rating: 5,
          text: 'Great donuts',
          createdAt: new Date('2026-01-01'),
          ownerResponse: null,
          user: { name: 'Reviewer' }
        }
      ],
      events: []
    })

    const request = new NextRequest(
      `http://localhost:3000/api/restaurant-dashboard/${RESTAURANT_ID}`
    )
    const response = await GET(request, { params: { id: RESTAURANT_ID } })

    expect(response.status).toBe(200)
    expect(JSON.stringify(await response.json())).not.toContain('@')

    const select = prismaMock.restaurant.findUnique.mock.calls[0][0].include.reviews.include.user
      .select
    expect(select).not.toHaveProperty('email')
  })
})

describe('POST /api/restaurant-dashboard/[id]/events', () => {
  it('returns 401 and creates nothing without a session', async () => {
    const response = await CREATE_EVENT(
      postRequest(`/api/restaurant-dashboard/${RESTAURANT_ID}/events`, {
        title: 'Free donuts',
        description: 'For everyone',
        startDate: '2026-02-01'
      }),
      { params: { id: RESTAURANT_ID } }
    )

    expect(response.status).toBe(401)
    expect(prismaMock.event.create).not.toHaveBeenCalled()
  })

  it('creates the event for a verified owner', async () => {
    getCurrentUser.mockResolvedValue(OWNER)
    prismaMock.restaurantOwner.findUnique.mockResolvedValue({ verified: true })

    const response = await CREATE_EVENT(
      postRequest(`/api/restaurant-dashboard/${RESTAURANT_ID}/events`, {
        title: 'Free donuts',
        description: 'For everyone',
        startDate: '2026-02-01'
      }),
      { params: { id: RESTAURANT_ID } }
    )

    expect(response.status).toBe(200)
    expect(prismaMock.event.create).toHaveBeenCalled()
  })
})

describe('POST /api/restaurant-dashboard/[id]/reviews/[reviewId]', () => {
  it('returns 401 and writes nothing without a session', async () => {
    const response = await RESPOND_TO_REVIEW(
      postRequest(`/api/restaurant-dashboard/${RESTAURANT_ID}/reviews/review-1`, {
        response: 'Thanks!'
      }),
      { params: { id: RESTAURANT_ID, reviewId: 'review-1' } }
    )

    expect(response.status).toBe(401)
    expect(prismaMock.review.update).not.toHaveBeenCalled()
  })

  it('returns 404 when the review belongs to another restaurant', async () => {
    getCurrentUser.mockResolvedValue(OWNER)
    prismaMock.restaurantOwner.findUnique.mockResolvedValue({ verified: true })
    prismaMock.review.findFirst.mockResolvedValue(null)

    const response = await RESPOND_TO_REVIEW(
      postRequest(`/api/restaurant-dashboard/${RESTAURANT_ID}/reviews/other-review`, {
        response: 'Thanks!'
      }),
      { params: { id: RESTAURANT_ID, reviewId: 'other-review' } }
    )

    expect(response.status).toBe(404)
    expect(prismaMock.review.update).not.toHaveBeenCalled()
  })

  it('posts the response for a verified owner', async () => {
    getCurrentUser.mockResolvedValue(OWNER)
    prismaMock.restaurantOwner.findUnique.mockResolvedValue({ verified: true })

    const response = await RESPOND_TO_REVIEW(
      postRequest(`/api/restaurant-dashboard/${RESTAURANT_ID}/reviews/review-1`, {
        response: 'Thanks for visiting!'
      }),
      { params: { id: RESTAURANT_ID, reviewId: 'review-1' } }
    )

    expect(response.status).toBe(200)
    expect(prismaMock.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'review-1' },
        data: expect.objectContaining({ ownerResponse: 'Thanks for visiting!' })
      })
    )
  })
})
