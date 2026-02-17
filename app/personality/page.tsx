import KatyDiningPersonality from '@/components/KatyDiningPersonality'

export const metadata = {
  title: 'Discover Your Katy Dining Personality | eKaty',
  description: 'Take our fun quiz to discover your Katy dining personality! Share your results and help other families discover great restaurants in Katy, Texas.',
  openGraph: {
    title: 'Discover Your Katy Dining Personality | eKaty',
    description: 'Take our fun quiz to discover your Katy dining personality!',
    type: 'website',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover Your Katy Dining Personality | eKaty',
    description: 'Take our fun quiz to discover your Katy dining personality!',
    images: ['/og-image.jpg'],
  },
}

export default function PersonalityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <KatyDiningPersonality />
      </div>
    </div>
  )
}




