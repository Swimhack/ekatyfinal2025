'use client'

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Tracks the user's reduced-motion preference.
 *
 * Starts as `false` so server and first client render agree, then syncs on mount.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia(QUERY)
    setPrefersReducedMotion(mediaQuery.matches)

    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches)

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', onChange)
      return () => mediaQuery.removeEventListener('change', onChange)
    }

    mediaQuery.addListener(onChange)
    return () => mediaQuery.removeListener(onChange)
  }, [])

  return prefersReducedMotion
}

export default usePrefersReducedMotion
