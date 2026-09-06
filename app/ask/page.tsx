import { Suspense } from 'react'
import type { Metadata } from 'next'
import AskClient from './AskClient'

export const metadata: Metadata = {
  title: 'Ask eKaty — Where should we eat in Katy?',
  description:
    'Describe what you are in the mood for and Ask eKaty picks three real Katy restaurants from the eKaty directory — by party size, budget, area, cuisine and vibe.',
  alternates: { canonical: '/ask' },
  openGraph: {
    title: 'Ask eKaty — Where should we eat in Katy?',
    description:
      'Tell Ask eKaty what you are in the mood for and get three real Katy restaurant picks.',
    url: '/ask',
    type: 'website',
    images: [{ url: '/ask/og', width: 1200, height: 630, alt: 'Ask eKaty' }],
  },
  // Spelled out rather than left to inherit. A child that declares openGraph
  // does not inherit the parent's images, so a share had no picture at all,
  // and an unset twitter block falls through to the root layout wholesale —
  // which titled every Ask share "Best Restaurants in Katy TX | eKaty" and
  // illustrated it with the homepage card.
  twitter: {
    card: 'summary_large_image',
    title: 'Ask eKaty — Where should we eat in Katy?',
    description:
      'Tell Ask eKaty what you are in the mood for and get three real Katy restaurant picks.',
    images: ['/ask/og'],
  },
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AskClient />
    </Suspense>
  )
}
