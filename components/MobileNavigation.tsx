'use client'

import { useState } from 'react'
import Link from 'next/link'
import LanguageSwitcher from './LanguageSwitcher'

export default function MobileNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-1" onClick={closeMobileMenu}>
                <img src="/logo.png" alt="eKaty" className="h-12 w-auto" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/discover"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
              >
                Discover
              </Link>
              <Link
                href="/map"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors flex items-center space-x-1"
              >
                <span>🗺️</span>
                <span>Map</span>
              </Link>
              <Link
                href="/spinner"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors flex items-center space-x-1"
              >
                <span>🎰</span>
                <span>Grub Roulette</span>
              </Link>
              <Link
                href="/categories"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
              >
                Categories
              </Link>
              <Link
                href="/blog"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors flex items-center space-x-1"
              >
                <span>📝</span>
                <span>Blog</span>
              </Link>
              <Link
                href="/blog/ekaty-launch-celebration-flyers-deals-giveaways-join-the-buzz"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-3 py-1.5 rounded-full font-semibold text-sm hover:from-yellow-500 hover:to-orange-600 transition-all flex items-center space-x-1"
              >
                <span>🎉</span>
                <span>Launch</span>
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
              >
                Advertise
              </Link>
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <LanguageSwitcher />
              <Link
                href="/auth/signin"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="btn-primary text-sm"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="px-4 py-4 space-y-3">
              <Link
                href="/discover"
                onClick={closeMobileMenu}
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 font-medium rounded-lg transition-colors"
              >
                Discover
              </Link>
              <Link
                href="/map"
                onClick={closeMobileMenu}
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>🗺️</span>
                <span>Map</span>
              </Link>
              <Link
                href="/spinner"
                onClick={closeMobileMenu}
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>🎰</span>
                <span>Grub Roulette</span>
              </Link>
              <Link
                href="/categories"
                onClick={closeMobileMenu}
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 font-medium rounded-lg transition-colors"
              >
                Categories
              </Link>
              <Link
                href="/blog"
                onClick={closeMobileMenu}
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>📝</span>
                <span>Blog</span>
              </Link>
              <Link
                href="/blog/ekaty-launch-celebration-flyers-deals-giveaways-join-the-buzz"
                onClick={closeMobileMenu}
                className="block px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-semibold rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-all flex items-center space-x-2"
              >
                <span>🎉</span>
                <span>Launch Celebration</span>
              </Link>
              <Link
                href="/contact"
                onClick={closeMobileMenu}
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 font-medium rounded-lg transition-colors"
              >
                Advertise
              </Link>

              {/* Mobile Auth Buttons */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="px-4 py-2">
                  <LanguageSwitcher />
                </div>
                <Link
                  href="/auth/signin"
                  onClick={closeMobileMenu}
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 font-medium rounded-lg transition-colors text-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={closeMobileMenu}
                  className="block px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors text-center"
                >
                  Sign Up
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
