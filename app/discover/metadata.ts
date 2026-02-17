import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discover Restaurants in Katy TX | Browse 500+ Local Dining Options',
  description: 'Browse all restaurants in Katy, Texas. Filter by cuisine (Mexican, BBQ, Asian), price, and ratings. Find your perfect dining spot in Katy TX today!',
  keywords: 'restaurants Katy TX, Katy Texas dining, browse restaurants Katy, restaurant search Katy, find restaurants Katy TX',
  openGraph: {
    title: 'Discover All Restaurants in Katy TX',
    description: 'Browse 500+ restaurants in Katy, Texas. Filter by cuisine, price & location.',
    url: 'https://ekaty.fly.dev/discover',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover All Restaurants in Katy TX',
    description: 'Browse 500+ restaurants in Katy, Texas. Filter by cuisine, price & location.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://ekaty.fly.dev/discover'
  }
}
