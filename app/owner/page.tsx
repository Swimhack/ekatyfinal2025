'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PhotoManager } from '@/components/admin/PhotoManager'

interface OwnedRestaurant {
  id: string
  name: string
  slug: string
  address: string | null
  photos?: string[] | string | null
}

interface SessionUser {
  id: string
  email: string
  name: string | null
  role: string
}

type LoadState = 'loading' | 'signed-out' | 'ready' | 'error'

function OwnerPhotosPage() {
  const searchParams = useSearchParams()
  const deepLinkId = searchParams.get('restaurantId')

  const [state, setState] = useState<LoadState>('loading')
  const [user, setUser] = useState<SessionUser | null>(null)
  const [restaurants, setRestaurants] = useState<OwnedRestaurant[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const meRes = await fetch('/api/auth/me')
        if (meRes.status === 401) {
          if (!cancelled) setState('signed-out')
          return
        }
        const meData = await meRes.json()
        if (!meRes.ok) throw new Error(meData.error || 'Failed to load your account')

        const ownedRes = await fetch('/api/owner/restaurants')
        if (ownedRes.status === 401) {
          if (!cancelled) setState('signed-out')
          return
        }
        const ownedData = await ownedRes.json()
        if (!ownedRes.ok) {
          throw new Error(ownedData.error || 'Failed to load your restaurants')
        }

        if (cancelled) return
        setUser(meData.user || null)
        setRestaurants(ownedData.restaurants || [])
        setState('ready')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setState('error')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading') {
    return (
      <Shell>
        <div className="text-gray-600">Loading your listings…</div>
      </Shell>
    )
  }

  if (state === 'signed-out') {
    return (
      <Shell>
        <div className="bg-white rounded-lg shadow-md p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Sign in to manage photos</h2>
          <p className="text-gray-600">
            Photo uploads are tied to your eKaty account so admins can see who submitted
            each image.
          </p>
          <Link
            href="/auth/signin?redirect=/owner"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    )
  }

  if (state === 'error') {
    return (
      <Shell>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
          {error || 'Failed to load your restaurants.'}
        </div>
      </Shell>
    )
  }

  if (restaurants.length === 0) {
    return (
      <Shell user={user}>
        <div className="bg-white rounded-lg shadow-md p-8 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            No verified listings on your account yet
          </h2>
          <p className="text-gray-600">
            Photo uploads open up as soon as an admin marks you as a verified owner of a
            listing. There is no paid plan required — verified owners on the free plan can
            upload photos.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>
              Find your restaurant in the{' '}
              <Link href="/restaurants" className="text-primary-600 hover:underline">
                eKaty directory
              </Link>{' '}
              and claim it from its listing page.
            </li>
            <li>
              Already claimed it? Ask an admin to verify the claim — email{' '}
              <a href="mailto:james@ekaty.com" className="text-primary-600 hover:underline">
                james@ekaty.com
              </a>{' '}
              with the restaurant name and the email on this account
              {user?.email ? ` (${user.email})` : ''}.
            </li>
            <li>Come back here and your listing will appear with an upload panel.</li>
          </ol>
        </div>
      </Shell>
    )
  }

  const deepLinked = deepLinkId
    ? restaurants.find((r) => r.id === deepLinkId || r.slug === deepLinkId)
    : undefined
  const visible = deepLinked ? [deepLinked] : restaurants
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'EDITOR'

  return (
    <Shell user={user}>
      {deepLinkId && !deepLinked && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          That listing is not on your account as a verified owner, so all of your listings
          are shown instead.
        </div>
      )}

      {deepLinked && restaurants.length > 1 && (
        <div className="mb-6">
          <Link href="/owner" className="text-sm text-primary-600 hover:underline">
            ← Show all {restaurants.length} of my listings
          </Link>
        </div>
      )}

      <div className="space-y-8">
        {visible.map((restaurant) => (
          <section key={restaurant.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{restaurant.name}</h2>
                {restaurant.address && (
                  <p className="text-sm text-gray-600">{restaurant.address}</p>
                )}
              </div>
              <Link
                href={`/restaurants/${restaurant.slug}`}
                className="text-sm text-primary-600 hover:underline"
              >
                View public listing
              </Link>
            </div>

            <PhotoManager
              restaurant={{
                id: restaurant.id,
                name: restaurant.name,
                photos: restaurant.photos ?? null,
              }}
              isAdmin={isAdmin}
            />
          </section>
        ))}
      </div>
    </Shell>
  )
}

function Shell({
  children,
  user,
}: {
  children: React.ReactNode
  user?: SessionUser | null
}) {
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'EDITOR'

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurant Photos</h1>
          <p className="text-gray-600">
            Upload photos you own or are licensed to use. Owner uploads stay private until
            an admin approves them, then they appear on your public listing.
          </p>
          {isAdmin && (
            <Link
              href="/admin/photos"
              className="inline-block mt-3 text-sm text-primary-600 hover:underline"
            >
              Open the admin photo review queue →
            </Link>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export default function OwnerPhotosPageWrapper() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="text-gray-600">Loading your listings…</div>
        </Shell>
      }
    >
      <OwnerPhotosPage />
    </Suspense>
  )
}
