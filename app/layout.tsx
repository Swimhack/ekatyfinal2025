import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import ConditionalNav from '@/components/ConditionalNav'
import ClientProviders from '@/components/ClientProviders'
import ShareRewardsTracker from '@/components/ShareRewardsTracker'
import { SITE_URL, KATY_GEO, serializeJsonLd } from '@/lib/seo'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://ekaty.fly.dev'),
  title: 'Best Restaurants in Katy TX | Katy Texas Restaurant Guide | eKaty',
  description: 'Find the best restaurants in Katy, Texas! Explore 500+ local dining options including Katy Asian Town, Mexican, BBQ, seafood & more. Try our Grub Roulette restaurant picker!',
  keywords: 'restaurants in Katy TX, Katy Texas restaurants, best restaurants Katy, Katy Asian Town restaurants, where to eat Katy TX, Mexican restaurants Katy, BBQ Katy Texas, Asian restaurants Katy, restaurant guide Katy, dining Katy TX',
  authors: [{ name: 'Strickland Technology' }],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Best Restaurants in Katy TX | Complete Dining Guide',
    description: 'Discover 500+ restaurants in Katy, Texas. From Katy Asian Town to local BBQ favorites. AI-powered recommendations & Grub Roulette picker!',
    url: 'https://ekaty.fly.dev',
    siteName: 'eKaty - Katy TX Restaurant Guide',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'eKaty - Discover Katy\'s Best Restaurants',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Restaurants in Katy TX | eKaty',
    description: 'Discover 500+ restaurants in Katy, Texas. AI-powered recommendations & Grub Roulette picker!',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://ekaty.fly.dev',
    types: {
      'application/rss+xml': 'https://ekaty.fly.dev/feed.xml',
    },
  },
  other: {
    'geo.region': 'US-TX',
    'geo.placename': 'Katy',
    'geo.position': `${KATY_GEO.lat};${KATY_GEO.lng}`,
    ICBM: `${KATY_GEO.lat}, ${KATY_GEO.lng}`,
  },
}

// Site-wide structured data: WebSite (with sitelinks search box action)
// and the Organization publishing the directory
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: 'eKaty.com',
  url: SITE_URL,
  description: 'Restaurant directory and dining guide for Katy, Texas',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/discover?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'eKaty.com',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  areaServed: {
    '@type': 'City',
    name: 'Katy',
    containedInPlace: { '@type': 'State', name: 'Texas' },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }}
        />
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
                     bg-primary-600 text-white px-4 py-2 rounded-lg z-50 focus:outline-none focus:ring-2 focus:ring-primary-700"
        >
          Skip to main content
        </a>

        <ClientProviders>
          {/* Conditional Navigation - Hidden on auth pages */}
          <ConditionalNav />

          {/* Main Content */}
          <main id="main-content" className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>

          {/* Share Rewards Tracker - Floating Button */}
          <ShareRewardsTracker />
          
          {/* Footer */}
        <footer className="bg-secondary-900 text-white py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand Column */}
              <div>
                <div className="mb-4">
                  <img src="/logo.png" alt="eKaty" className="h-8 w-auto" />
                </div>
                <p className="text-gray-400 text-sm">
                  Your AI-powered guide to the best restaurants in Katy, Texas.
                </p>
                <p className="text-gray-500 text-xs mt-4">
                  Powered by Strickland Technology
                </p>
              </div>
              
              {/* Explore Column */}
              <div>
                <h3 className="font-semibold mb-4">Explore</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/discover" className="text-gray-400 hover:text-white">All Restaurants</Link></li>
                  <li><Link href="/map" className="text-gray-400 hover:text-white">🗺️ Interactive Map</Link></li>
                  <li><Link href="/spinner" className="text-gray-400 hover:text-white">Grub Roulette</Link></li>
                  <li><Link href="/categories" className="text-gray-400 hover:text-white">Categories</Link></li>
                  <li><Link href="/featured" className="text-gray-400 hover:text-white">Featured</Link></li>
                  <li><Link href="/blog" className="text-gray-400 hover:text-white">📝 Family Dining Blog</Link></li>
                  <li><Link href="/personality" className="text-gray-400 hover:text-white">🎯 Dining Personality Quiz</Link></li>
                </ul>
              </div>
              
              {/* Popular Categories */}
              <div>
                <h3 className="font-semibold mb-4">Popular Categories</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/categories/mexican" className="text-gray-400 hover:text-white">Mexican</Link></li>
                  <li><Link href="/categories/bbq" className="text-gray-400 hover:text-white">BBQ</Link></li>
                  <li><Link href="/categories/asian" className="text-gray-400 hover:text-white">Asian</Link></li>
                  <li><Link href="/categories/american" className="text-gray-400 hover:text-white">American</Link></li>
                </ul>
              </div>
              
              {/* Business Column */}
              <div>
                <h3 className="font-semibold mb-4">For Businesses</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/pitch" className="text-gray-400 hover:text-white">Restaurant Partners</Link></li>
                  <li><Link href="/pitch" className="text-gray-400 hover:text-white">Investor Relations</Link></li>
                  <li><Link href="/contact" className="text-gray-400 hover:text-white">Advertise With Us</Link></li>
                  <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  &copy; {new Date().getFullYear()} eKaty.com. All rights reserved.
                </div>
                <Link
                  href="/blog/ekaty-launch-celebration-flyers-deals-giveaways-join-the-buzz"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-4 py-2 rounded-full font-semibold text-sm hover:from-yellow-500 hover:to-orange-600 transition-all"
                >
                  <span>🎉</span>
                  <span>Join the Launch Celebration!</span>
                </Link>
              </div>
            </div>
          </div>
        </footer>
        </ClientProviders>
      </body>
    </html>
  )
}