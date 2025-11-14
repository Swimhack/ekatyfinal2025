'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SearchBar from '@/components/SearchBar'
import RestaurantCard from '@/components/RestaurantCard'
import BlogPreview from '@/components/BlogPreview'
import LaunchPromotionSection from '@/components/LaunchPromotionSection'
import Script from 'next/script'

const categories = [
  { name: 'Mexican', emoji: '🌮' },
  { name: 'BBQ', emoji: '🍖' },
  { name: 'Asian', emoji: '🥢' },
  { name: 'American', emoji: '🍔' },
  { name: 'Seafood', emoji: '🦐' },
  { name: 'Indian', emoji: '🍛' },
  { name: 'Greek', emoji: '🥙' },
  { name: 'Breakfast', emoji: '🥞' },
]

export default function HomePage() {
  const [featuredRestaurants, setFeaturedRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch featured restaurants
    fetch('/api/restaurants?featured=true&limit=6')
      .then(res => res.json())
      .then(data => {
        setFeaturedRestaurants(data.restaurants || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching featured restaurants:', err)
        setLoading(false)
      })
  }, [])

  // Local Business Schema for homepage
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "eKaty - Katy TX Restaurant Guide",
    "url": "https://ekaty.fly.dev",
    "description": "Complete guide to restaurants in Katy, Texas. Find the best local dining options.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://ekaty.fly.dev/discover?search={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "areaServed": {
      "@type": "City",
      "name": "Katy",
      "containedIn": {
        "@type": "State",
        "name": "Texas"
      }
    }
  }

  return (
    <div className="min-h-screen">
      {/* Local Business Schema */}
      <Script
        id="local-business-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {/* Launch Badge */}
            <div className="inline-flex items-center space-x-2 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full mb-6 font-semibold text-sm animate-pulse">
              <span>🎉</span>
              <span>LAUNCH CELEBRATION</span>
              <span>🎉</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              explore the best restaurants in Katy
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-primary-100">
              Your AI-powered guide to local dining experiences
            </p>
            <p className="text-lg mb-8 text-primary-200">
              🎁 Join our launch celebration with deals, coupons & giveaways!
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <SearchBar />
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/discover" 
                className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse All Restaurants
              </Link>
              <Link 
                href="/spinner" 
                className="bg-primary-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-900 transition-colors inline-flex items-center justify-center"
              >
                <span className="text-2xl mr-2">🎰</span>
                Try Grub Roulette
              </Link>
            </div>
          </div>
        </div>
        
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-12 text-gray-50" preserveAspectRatio="none" viewBox="0 0 1200 120">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
          </svg>
        </div>
      </section>

      {/* Launch Promotion Section */}
      <LaunchPromotionSection />

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/discover?category=${category.name}`}
                className="bg-white rounded-lg p-4 text-center hover:shadow-lg transition-shadow group"
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                  {category.emoji}
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {category.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Blog Section - Family Focus */}
      <section className="py-16 bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
              <span className="text-3xl">👨‍👩‍👧‍👦</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Family Dining Tips & Stories
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover the best family-friendly restaurants, dining tips, and local food stories from Katy families
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <BlogPreview limit={3} showTitle={false} familyFocused={true} />
          </div>
          
          <div className="text-center">
            <Link 
              href="/blog" 
              className="inline-flex items-center px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors text-lg"
            >
              <span className="mr-2">📝</span>
              Explore All Family Dining Articles
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Featured Restaurants
            </h2>
            <Link 
              href="/discover?featured=true" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All →
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Grub Roulette CTA */}
      <section className="py-16 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-6xl mb-4">🎰</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Can't Decide? Spin the Wheel!
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Let Grub Roulette pick your next dining adventure
          </p>
          <Link 
            href="/spinner" 
            className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center text-lg"
          >
            <span className="mr-2">Start Spinning</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Interactive Map Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🗺️ Explore Restaurants on the Map
            </h2>
            <p className="text-xl text-gray-600">
              Find restaurants near you with our interactive map
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-xl p-4">
            <Link 
              href="/map"
              className="block relative group"
            >
              <div className="h-[400px] bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center overflow-hidden">
                <div className="text-center z-10">
                  <div className="text-6xl mb-4">🗺️</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">View Interactive Map</h3>
                  <p className="text-gray-700 mb-4">Click to explore all restaurants on the map</p>
                  <span className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold group-hover:bg-primary-700 transition-colors">
                    Open Map →
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600">250+</div>
              <div className="text-gray-600 mt-2">Local Restaurants</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">10K+</div>
              <div className="text-gray-600 mt-2">Happy Diners</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">50K+</div>
              <div className="text-gray-600 mt-2">Spins Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">📝</div>
              <div className="text-gray-600 mt-2">
                <Link href="/blog" className="hover:text-primary-600 transition-colors">
                  Family Dining Articles
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-12">
            <div className="text-6xl mb-6">📝</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Share Your Family Dining Story
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Have a favorite family restaurant in Katy? Share your story and help other families discover great dining experiences!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/blog"
                className="px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors inline-flex items-center justify-center"
              >
                <span className="mr-2">📖</span>
                Read Family Dining Stories
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 bg-white text-primary-600 border-2 border-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors inline-flex items-center justify-center"
              >
                Share Your Story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Owner CTA */}
      <section className="py-12 bg-white border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🍽️</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Own a restaurant in Katy?</h3>
                <p className="text-gray-600">Join 500+ restaurants reaching thousands of local diners</p>
              </div>
            </div>
            <Link
              href="/pitch"
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 whitespace-nowrap"
            >
              Learn More →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}