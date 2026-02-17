'use client'

import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gray-900">Admin</span>
              </Link>
            </div>

            <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6 overflow-x-auto">
              <Link
                href="/admin/dashboard"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors whitespace-nowrap"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/monetization/leads"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors whitespace-nowrap"
              >
                Monetization
              </Link>
              <Link
                href="/admin/analytics"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors whitespace-nowrap"
              >
                Analytics
              </Link>
              <Link
                href="/admin/restaurants"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors whitespace-nowrap"
              >
                Restaurants
              </Link>
              <Link
                href="/admin/suggestions"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors whitespace-nowrap"
              >
                Suggestions
              </Link>
              <Link
                href="/admin/blog"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors whitespace-nowrap"
              >
                Blog
              </Link>
              <Link
                href="/"
                className="text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
              >
                ← Back to Site
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden text-gray-700 hover:text-primary-600 p-2"
              onClick={() => {
                const menu = document.getElementById('mobile-admin-menu')
                if (menu) {
                  menu.classList.toggle('hidden')
                }
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          <div id="mobile-admin-menu" className="hidden lg:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2">
              <Link
                href="/admin/dashboard"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/monetization/leads"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
              >
                Monetization
              </Link>
              <Link
                href="/admin/analytics"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
              >
                Analytics
              </Link>
              <Link
                href="/admin/restaurants"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
              >
                Restaurants
              </Link>
              <Link
                href="/admin/suggestions"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
              >
                Suggestions
              </Link>
              <Link
                href="/admin/blog"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
              >
                Blog
              </Link>
              <Link
                href="/"
                className="text-gray-500 hover:text-gray-700 transition-colors py-2"
              >
                ← Back to Site
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
