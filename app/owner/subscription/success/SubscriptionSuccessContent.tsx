'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SubscriptionSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) {
      // Verify the session completed successfully
      setTimeout(() => {
        setLoading(false)
      }, 2000)
    } else {
      setError('No session ID found')
      setLoading(false)
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Processing your subscription...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-100 rounded-full p-3 inline-block mb-4">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/pricing"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Success Icon */}
        <div className="bg-green-100 rounded-full p-3 inline-block mb-6">
          <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to eKaty Premium!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your subscription is now active. Let's get started!
        </p>

        {/* What's Next */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-left">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What's Next?
          </h2>

          <div className="space-y-6">
            <Step
              number={1}
              title="Complete Your Profile"
              description="Add photos, menu items, and special offers to attract more families"
              action="Go to Profile"
              href="/owner/profile"
            />
            <Step
              number={2}
              title="Set Up Kids Deals"
              description="Promote your kids eat free deals and family-friendly specials"
              action="Add Deals"
              href="/owner/deals"
            />
            <Step
              number={3}
              title="Track Your Performance"
              description="View analytics to see how many families are discovering your restaurant"
              action="View Analytics"
              href="/owner/analytics"
            />
          </div>
        </div>

        {/* Trial Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            14-Day Free Trial
          </h3>
          <p className="text-blue-800">
            Your trial starts today. You won't be charged until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
            Cancel anytime before then at no cost.
          </p>
        </div>

        {/* Support */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Have questions? We're here to help!
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="mailto:james@ekaty.com"
              className="inline-flex items-center text-primary-600 hover:underline"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Support
            </a>
            <Link
              href="/help"
              className="inline-flex items-center text-primary-600 hover:underline"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({
  number,
  title,
  description,
  action,
  href
}: {
  number: number
  title: string
  description: string
  action: string
  href: string
}) {
  return (
    <div className="flex items-start">
      <div className="flex-shrink-0 mr-4">
        <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
          {number}
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600 mb-3">{description}</p>
        <Link
          href={href}
          className="inline-block text-primary-600 font-semibold hover:underline"
        >
          {action} →
        </Link>
      </div>
    </div>
  )
}
