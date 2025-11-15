import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import LaunchBanner from '@/components/LaunchBanner'
import MobileNavigation from '@/components/MobileNavigation'

const inter = Inter({ subsets: ['latin'] })

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
    images: ['/logo.png'],
  },
  alternates: {
    canonical: 'https://ekaty.fly.dev'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        {/* Launch Banner */}
        <LaunchBanner />

        {/* Mobile Navigation Component */}
        <MobileNavigation />
        
        {/* Main Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-secondary-900 text-white py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand Column */}
              <div>
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
                </ul>
              </div>
              
              {/* Popular Categories */}
              <div>
                <h3 className="font-semibold mb-4">Popular Categories</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/discover?category=Mexican" className="text-gray-400 hover:text-white">Mexican</Link></li>
                  <li><Link href="/discover?category=BBQ" className="text-gray-400 hover:text-white">BBQ</Link></li>
                  <li><Link href="/discover?category=Asian" className="text-gray-400 hover:text-white">Asian</Link></li>
                  <li><Link href="/discover?category=American" className="text-gray-400 hover:text-white">American</Link></li>
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
      </body>
    </html>
  )
}