'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * `target` picks which surface the query is handed to:
 *  - `discover` keeps the existing keyword search over the directory.
 *  - `ask` sends the sentence to Ask eKaty, which parses it and answers with
 *    three picks. Same box, smarter backend.
 *
 * Defaults to `discover` so every existing caller behaves exactly as before.
 */
interface SearchBarProps {
  target?: 'discover' | 'ask'
  placeholder?: string
}

export default function SearchBar({ target = 'discover', placeholder }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      const path = target === 'ask' ? '/ask' : '/discover'
      const source = target === 'ask' ? '&source=home' : ''
      router.push(`${path}?q=${encodeURIComponent(query)}${source}`)
    }
  }

  const defaultPlaceholder =
    target === 'ask'
      ? 'Ask eKaty: cheap Mexican near 77493 with the kids...'
      : 'Search for restaurants, cuisine, or dish...'

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          className="w-full px-6 py-4 pr-12 text-gray-900 bg-white rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-primary-300 text-lg"
        />
        <button
          type="submit"
          aria-label={target === 'ask' ? 'Ask eKaty' : 'Search restaurants'}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-600 text-white p-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </form>
  )
}
