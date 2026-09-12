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
  },
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AskClient />
    </Suspense>
  )
}
